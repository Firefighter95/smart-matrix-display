import type { DeviceConfig, DeviceStatus, Message } from '../../../shared/schemas/models';
import { MatrixPreview } from '../components/MatrixPreview';
import { Button, SectionHeading, StatCard, StatusBadge, formatBytes, formatUptime } from '../components/Ui';
import type { Page } from '../components/Layout';

interface Props {
  status: DeviceStatus;
  config: DeviceConfig;
  onNavigate: (page: Page) => void;
  onClear: () => void;
  onSendMessage: (message: Message) => void;
}

export function DashboardPage({ status, config, onNavigate, onClear, onSendMessage }: Props) {
  const activeLayout = config.layouts?.find((layout) => layout.id === status.activeLayout || layout.id === config.activeLayoutId);
  return <div className="dashboard-page">
    <SectionHeading eyebrow="DEVICE OVERVIEW" title="Goedemorgen, Smart Matrix" description="Een compact overzicht van je display-controller en de actieve weergave." action={<StatusBadge tone={status.online ? 'success' : 'danger'}>{status.online ? 'Online' : 'Offline'}</StatusBadge>} />
    <div className="stats-grid">
      <StatCard label="Verbinding" value={status.online ? 'Online' : 'Offline'} detail={`${status.hostname} · ${status.ip}`} icon="⌁" tone="green" />
      <StatCard label="Display mode" value={status.mode} detail={status.displayEnabled ? 'Actief en zichtbaar' : 'Uitgeschakeld'} icon="▣" tone="purple" />
      <StatCard label="Helderheid" value={`${status.brightness}%`} detail={`Maximum ${config.display.maxBrightness}%`} icon="☼" tone="orange" />
      <StatCard label="WiFi RSSI" value={`${status.wifiRssi} dBm`} detail={status.wifiRssi > -65 ? 'Sterk signaal' : 'Zwak signaal'} icon="◔" tone="blue" />
    </div>
    <div className="dashboard-grid">
      <section className="panel panel--preview"><div className="panel-heading"><div><span className="eyebrow">LIVE DISPLAY</span><h2>Actuele preview</h2></div><StatusBadge tone={status.timeSynced ? 'success' : 'warning'}>{status.timeSynced ? 'NTP gesynchroniseerd' : 'Wachten op NTP'}</StatusBadge></div><MatrixPreview config={config.clock} status={status} message={status.activeMessage} layout={activeLayout} /></section>
      <section className="panel"><div className="panel-heading"><div><span className="eyebrow">QUICK ACTIONS</span><h2>Snelle acties</h2></div></div><div className="quick-actions"><Button variant="primary" onClick={() => onNavigate('clock')}><span>◷</span> Naar klok</Button><Button onClick={() => onNavigate('display')}><span>☼</span> Display beheren</Button><Button onClick={() => void onSendMessage({ title: 'TEST', message: 'SMART MATRIX OK', duration: 8, color: '#72e6a8', alignment: 'center', priority: 10 })}><span>▤</span> Testbericht</Button><Button variant="danger" onClick={onClear}><span>×</span> Bericht wissen</Button></div><div className="quick-note"><span className="note-icon">i</span><span>Wijzigingen in de portal worden direct naar de controller geschreven zodra de ESP32-API actief is.</span></div></section>
      <section className="panel"><div className="panel-heading"><div><span className="eyebrow">SYSTEEM</span><h2>Gezondheid</h2></div><button className="text-button" onClick={() => onNavigate('system')}>Details →</button></div><div className="health-list"><div><span>Uptime</span><strong>{formatUptime(status.uptime)}</strong></div><div><span>Vrij heap</span><strong>{formatBytes(status.heapFree)}</strong></div><div><span>Vrij PSRAM</span><strong>{formatBytes(status.psramFree)}</strong></div><div><span>Firmware</span><strong>{status.firmware}</strong></div></div></section>
      <section className="panel"><div className="panel-heading"><div><span className="eyebrow">CONFIGURATIE</span><h2>Huidige stand</h2></div><button className="text-button" onClick={() => onNavigate('display')}>Aanpassen →</button></div><div className="config-summary"><div><span>Kloklayout</span><strong>{config.clock.layout}</strong></div><div><span>Automatisch schema</span><strong>{config.display.scheduleEnabled ? 'Aan' : 'Uit'}</strong></div><div><span>Nachtmodus</span><strong>{config.display.nightMode ? 'Aan' : 'Uit'}</strong></div><div><span>Timezone</span><strong>{config.clock.timezone}</strong></div></div></section>
    </div>
  </div>;
}
