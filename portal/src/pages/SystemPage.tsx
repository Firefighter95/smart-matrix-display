import { useEffect, useState, type FormEvent } from 'react';
import type { DeviceStatus, LogEntry } from '../../../shared/schemas/models';
import type { DeviceApi, WifiInfo } from '../api/deviceApi';
import { Button, SectionHeading, StatCard, StatusBadge, formatBytes, formatUptime } from '../components/Ui';

interface Props {
  api: DeviceApi;
  status: DeviceStatus;
  logs: LogEntry[];
  onReboot: () => Promise<void>;
  onNotify: (message: string, kind?: 'success' | 'error' | 'info') => void;
}

function formatLogTime(log: LogEntry) {
  if (typeof log.uptime === 'number') {
    const totalSeconds = Math.floor(log.uptime / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `+${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  const date = new Date(log.timestamp);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function SystemPage({ api, status, logs, onReboot, onNotify }: Props) {
  const [updating, setUpdating] = useState(false);
  const [wifi, setWifi] = useState<WifiInfo>();
  const [wifiForm, setWifiForm] = useState({ ssid: '', password: '', hostname: 'smartmatrix' });
  const [wifiLoading, setWifiLoading] = useState(true);
  const [wifiSaving, setWifiSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void api.getWifi().then((info) => {
      if (!active) return;
      setWifi(info);
      setWifiForm((current) => ({ ...current, ssid: info.ssid, hostname: info.hostname || current.hostname }));
    }).catch(() => {
      if (active) onNotify('WiFi-status kon niet worden opgehaald', 'error');
    }).finally(() => { if (active) setWifiLoading(false); });
    return () => { active = false; };
  }, [api, onNotify]);

  const saveWifi = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setWifiSaving(true);
    try {
      await api.updateWifi(wifiForm);
      const next = await api.getWifi();
      setWifi(next);
      setWifiForm((current) => ({ ...current, password: '', ssid: next.ssid, hostname: next.hostname || current.hostname }));
      onNotify('WiFi-configuratie opgeslagen. De verbinding kan kort wegvallen.', 'success');
    } catch (error) {
      onNotify(error instanceof Error ? error.message : 'WiFi-configuratie opslaan mislukt', 'error');
    } finally {
      setWifiSaving(false);
    }
  };

  const startOta = () => {
    setUpdating(true);
    onNotify('Firmware upload is gesimuleerd in mock mode', 'info');
    window.setTimeout(() => setUpdating(false), 1800);
  };

  return <div className="page-stack">
    <SectionHeading eyebrow="DEVICE ADMINISTRATION" title="Systeem" description="Firmware, verbinding, logging en onderhoud van de controller." action={<StatusBadge tone={status.online ? 'success' : 'danger'}>{status.online ? 'Healthy' : 'Attention'}</StatusBadge>} />
    <div className="stats-grid stats-grid--system">
      <StatCard label="Firmware" value={status.firmware} detail="ESP32-S3 build" icon="◇" tone="purple" />
      <StatCard label="Vrij heap" value={formatBytes(status.heapFree)} detail="runtime memory" icon="⌁" tone="blue" />
      <StatCard label="Vrij PSRAM" value={formatBytes(status.psramFree)} detail="DMA frame buffer" icon="▥" tone="green" />
      <StatCard label="Uptime" value={formatUptime(status.uptime)} detail="since last boot" icon="◷" tone="orange" />
    </div>
    <div className="system-grid">
      <section className="panel">
        <div className="panel-heading"><div><span className="eyebrow">FIRMWARE</span><h2>OTA update</h2></div><StatusBadge tone="neutral">Ready</StatusBadge></div>
        <div className="firmware-card"><div className="firmware-icon">⇧</div><div><strong>{status.firmware}</strong><p>Upload een firmware.bin bestand naar de ESP32 zonder configuratie te wissen.</p></div></div>
        <label className="upload-field"><input type="file" accept=".bin" onChange={startOta} /><span>Bestand kiezen</span><small>firmware.bin · max 4 MB</small></label>
        {updating && <div className="progress"><div className="progress__bar" /><span>Uploaden en valideren…</span></div>}
        <div className="form-actions"><Button variant="primary" disabled={updating}>Firmware uploaden</Button><Button onClick={() => void onReboot()}>Restart device</Button></div>
      </section>
      <section className="panel">
        <div className="panel-heading"><div><span className="eyebrow">CONNECTIVITY</span><h2>Verbinding</h2></div></div>
        <div className="details-list">
          <div><span>WiFi status</span><strong className={status.online ? 'text-success' : 'text-danger'}>{status.online ? 'Verbonden' : 'Offline'}</strong></div>
          <div><span>Hostname</span><strong>{status.hostname}</strong></div><div><span>IP adres</span><strong>{status.ip}</strong></div>
          <div><span>RSSI</span><strong>{status.wifiRssi} dBm</strong></div><div><span>NTP</span><strong>{status.timeSynced ? 'Gesynchroniseerd' : 'Niet beschikbaar'}</strong></div><div><span>Timezone</span><strong>Europe/Amsterdam</strong></div>
        </div>
      </section>
    </div>
    <section className="panel">
      <div className="panel-heading"><div><span className="eyebrow">WIFI PROVISIONING</span><h2>WiFi instellen</h2><p>Voer het thuisnetwerk in. De ESP32 bewaart dit in NVS en schakelt daarna opnieuw naar het netwerk.</p></div><StatusBadge tone={wifi?.connected ? 'success' : wifi?.apMode ? 'warning' : 'neutral'}>{wifiLoading ? 'Laden…' : wifi?.connected ? 'Verbonden' : wifi?.apMode ? 'Configuratie-AP' : 'Offline'}</StatusBadge></div>
      <form className="form-grid" onSubmit={(event) => void saveWifi(event)}>
        <label className="field"><span>SSID</span><input required maxLength={64} value={wifiForm.ssid} onChange={(event) => setWifiForm({ ...wifiForm, ssid: event.target.value })} placeholder="Naam van je WiFi-netwerk" /></label>
        <label className="field"><span>Wachtwoord</span><input type="password" maxLength={64} value={wifiForm.password} onChange={(event) => setWifiForm({ ...wifiForm, password: event.target.value })} placeholder="Laat leeg voor open netwerk" /></label>
        <label className="field"><span>Hostname</span><input required pattern="[A-Za-z0-9-]+" maxLength={31} value={wifiForm.hostname} onChange={(event) => setWifiForm({ ...wifiForm, hostname: event.target.value })} placeholder="smartmatrix" /></label>
        <div className="wifi-details"><span>Configuratie-AP</span><strong>{wifi?.apMode ? wifi.apSsid : 'Niet actief'}</strong><span>Bereikbaar op</span><strong>{wifi?.ip || status.ip || '—'}</strong></div>
        <div className="form-actions"><Button variant="primary" type="submit" disabled={wifiSaving || wifiLoading}>{wifiSaving ? 'Opslaan…' : 'WiFi opslaan'}</Button><small className="form-hint">Na opslaan kan de verbinding kort wegvallen.</small></div>
      </form>
    </section>
    <section className="panel">
      <div className="panel-heading"><div><span className="eyebrow">RINGBUFFER · 100 ITEMS</span><h2>Logs</h2></div><Button onClick={() => onNotify('Logs ververst')}>Verversen</Button></div>
      <div className="log-list">{logs.slice(0, 12).map((log) => <div className="log-row" key={log.id}><time>{formatLogTime(log)}</time><span className={`log-level log-level--${log.level.toLowerCase()}`}>{log.level}</span><code>{log.category}</code><p>{log.message}</p></div>)}</div>
    </section>
    <section className="panel danger-zone"><div><span className="eyebrow">MAINTENANCE</span><h2>Backup & reset</h2><p>Exporteer de huidige JSON-configuratie of maak de controller klaar voor een nieuwe installatie.</p></div><div className="danger-actions"><Button onClick={() => onNotify('Configuratie-export klaar', 'info')}>Config exporteren</Button><Button onClick={() => onNotify('Importeer een JSON-bestand via de ESP32 API', 'info')}>Config importeren</Button><Button variant="danger" onClick={() => onNotify('Factory reset vereist nog een fysieke bevestiging', 'info')}>Factory reset</Button></div></section>
  </div>;
}
