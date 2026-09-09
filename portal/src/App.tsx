import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DeviceConfig, DeviceStatus, LogEntry, Message } from '../../shared/schemas/models';
import { createDeviceApi, isMockMode } from './api';
import type { DeviceApi } from './api/deviceApi';
import { isMockDeviceApi } from './api/mockDeviceApi';
import { DevToolbar } from './components/DevToolbar';
import { Layout, type Page } from './components/Layout';
import { Toast } from './components/Ui';
import { ApiPage } from './pages/ApiPage';
import { ClockPage } from './pages/ClockPage';
import { DashboardPage } from './pages/DashboardPage';
import { DisplayPage } from './pages/DisplayPage';
import { MessagesPage } from './pages/MessagesPage';
import { SystemPage } from './pages/SystemPage';

const fallbackStatus: DeviceStatus = {
  online: false, mode: 'BOOT', brightness: 0, wifiRssi: 0, uptime: 0, timeSynced: false,
  firmware: '—', resolution: '128x64', ip: '—', hostname: 'smartmatrix', heapFree: 0, psramFree: 0, displayEnabled: false,
};

const getPage = (): Page => {
  const value = window.location.hash.replace('#/', '') as Page;
  return ['dashboard', 'display', 'clock', 'messages', 'api', 'system'].includes(value) ? value : 'dashboard';
};

export default function App() {
  const api = useMemo<DeviceApi>(() => createDeviceApi(), []);
  const [page, setPage] = useState<Page>(getPage);
  const [status, setStatus] = useState<DeviceStatus>(fallbackStatus);
  const [config, setConfig] = useState<DeviceConfig>();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [toast, setToast] = useState<{ message: string; kind: 'success' | 'error' | 'info' }>();

  const refresh = useCallback(async () => {
    try {
      const [nextStatus, nextConfig, nextLogs] = await Promise.all([api.getStatus(), api.getConfig(), api.getLogs()]);
      setStatus(nextStatus); setConfig(nextConfig); setLogs(nextLogs); setError(undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Kan apparaat niet bereiken');
      setStatus((current) => ({ ...current, online: false }));
    } finally { setLoading(false); }
  }, [api]);

  useEffect(() => {
    void refresh();
    const unsubscribe = api.subscribe(() => void refresh());
    const interval = window.setInterval(() => void refresh(), 5000);
    const onHash = () => setPage(getPage());
    window.addEventListener('hashchange', onHash);
    return () => { unsubscribe(); window.clearInterval(interval); window.removeEventListener('hashchange', onHash); };
  }, [api, refresh]);

  const navigate = (nextPage: Page) => { window.location.hash = `/${nextPage}`; setPage(nextPage); };
  const notify = (message: string, kind: 'success' | 'error' | 'info' = 'success') => { setToast({ message, kind }); window.setTimeout(() => setToast(undefined), 3200); };

  const updateConfig = async (patch: Partial<DeviceConfig>) => {
    try { const next = await api.updateConfig(patch); setConfig(next); await refresh(); notify('Configuratie opgeslagen'); }
    catch (cause) { notify(cause instanceof Error ? cause.message : 'Opslaan mislukt', 'error'); }
  };

  const sendMessage = async (message: Message) => {
    try { await api.sendMessage(message); await refresh(); notify('Bericht wordt nu getoond'); }
    catch (cause) { notify(cause instanceof Error ? cause.message : 'Bericht verzenden mislukt', 'error'); }
  };

  const clearMessage = async () => { try { await api.clearDisplay(); await refresh(); notify('Display gewist'); } catch (cause) { notify(cause instanceof Error ? cause.message : 'Actie mislukt', 'error'); } };
  const reboot = async () => { try { await api.reboot(); await refresh(); notify('Device is opnieuw gestart'); } catch (cause) { notify(cause instanceof Error ? cause.message : 'Reboot mislukt', 'error'); } };

  const body = !config ? <div className="loading-panel"><div className="spinner" /><span>{loading ? 'Device laden…' : 'Geen configuratie beschikbaar'}</span></div> : (
    <>
      {error && <div className="error-banner"><span>!</span><div><strong>Verbinding niet beschikbaar</strong><p>{error}. De laatst bekende portalstaat blijft zichtbaar.</p></div><button onClick={() => void refresh()}>Opnieuw</button></div>}
      {page === 'dashboard' && <DashboardPage status={status} config={config} onNavigate={navigate} onClear={clearMessage} onSendMessage={sendMessage} />}
      {page === 'display' && <DisplayPage status={status} config={config} onUpdate={updateConfig} />}
      {page === 'clock' && <ClockPage status={status} config={config} onUpdate={updateConfig} />}
      {page === 'messages' && <MessagesPage status={status} config={config} onSend={sendMessage} onClear={clearMessage} />}
      {page === 'api' && <ApiPage api={api} status={status} config={config} onNotify={notify} />}
      {page === 'system' && <SystemPage status={status} logs={logs} onReboot={reboot} onNotify={notify} />}
    </>
  );

  return <>
    <Layout page={page} onNavigate={navigate} status={status} isMock={isMockMode}>{body}</Layout>
    {isMockMode && isMockDeviceApi(api) && <DevToolbar api={api} />}
    {toast && <Toast message={toast.message} kind={toast.kind} />}
  </>;
}

