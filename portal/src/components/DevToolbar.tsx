import type { MockDeviceApi, MockScenario } from '../api/deviceApi';
import { Button } from './Ui';

export function DevToolbar({ api }: { api: MockDeviceApi }) {
  const scenarios: { id: MockScenario; label: string }[] = [
    { id: 'wifiOffline', label: 'WiFi verliezen' },
    { id: 'ntpError', label: 'NTP fout' },
    { id: 'displayOffline', label: 'Display offline' },
    { id: 'apiError', label: 'API fout' },
  ];
  return <div className="dev-toolbar"><span className="dev-toolbar__label">DEV / MOCK</span>{scenarios.map((scenario) => <Button key={scenario.id} variant="ghost" onClick={() => api.setScenario(scenario.id, true)}>{scenario.label}</Button>)}<Button variant="ghost" onClick={() => scenarios.forEach((scenario) => api.setScenario(scenario.id, false))}>Herstellen</Button><Button variant="ghost" onClick={() => api.resetMock()}>Reset mock</Button></div>;
}

