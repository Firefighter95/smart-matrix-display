import type { EventInput } from '../../../shared/schemas/models';
import type { MockDeviceApi, MockScenario } from '../api/deviceApi';
import { Button } from './Ui';

export function DevToolbar({ api }: { api: MockDeviceApi }) {
  const scenarios: { id: MockScenario; label: string }[] = [
    { id: 'wifiOffline', label: 'WiFi verliezen' },
    { id: 'ntpError', label: 'NTP fout' },
    { id: 'displayOffline', label: 'Display offline' },
    { id: 'apiError', label: 'API fout' },
  ];
  const send = (event: EventInput) => { void api.sendEvent(event); };
  const toggleNight = async () => {
    const config = await api.getConfig();
    await api.updateConfig({ display: { ...config.display, nightMode: !config.display.nightMode } });
  };
  const fillQueue = () => {
    [1, 2, 3, 4].forEach((index) => send({
      source: 'p2000', type: 'dispatch', layoutId: 'p2000-fire', priority: 80 + index,
      duration: 30, payload: { title: `P2000 ${index}`, message: 'Testmelding voor wachtrij', discipline: 'FIRE' },
    }));
  };
  return <div className="dev-toolbar"><span className="dev-toolbar__label">DEV / MOCK</span>
    {scenarios.map((scenario) => <Button key={scenario.id} variant="ghost" onClick={() => api.setScenario(scenario.id, true)}>{scenario.label}</Button>)}
    <Button variant="ghost" onClick={() => send({ source: 'home_assistant', type: 'message', layoutId: 'generic-message', priority: 50, duration: 15, payload: { title: 'HA TEST', message: 'Bericht uit Home Assistant' } })}>HA event</Button>
    <Button variant="ghost" onClick={() => send({ source: 'home_assistant', type: 'alert', layoutId: 'doorbell', priority: 75, duration: 15, payload: { title: 'ALERT', message: 'Testalert' } })}>HA alert</Button>
    <Button variant="ghost" onClick={() => send({ source: 'p2000', type: 'dispatch', layoutId: 'p2000-fire', priority: 100, duration: 30, payload: { title: 'P1 BRANDWEER', message: 'Swifterbant · woningbrand', discipline: 'FIRE' } })}>P2000</Button>
    <Button variant="ghost" onClick={fillQueue}>Queue vullen</Button>
    <Button variant="ghost" onClick={() => void toggleNight()}>Nachtprofiel</Button>
    <Button variant="ghost" onClick={() => void api.reboot()}>Restart</Button>
    <Button variant="ghost" onClick={() => scenarios.forEach((scenario) => api.setScenario(scenario.id, false))}>Herstellen</Button>
    <Button variant="ghost" onClick={() => api.resetMock()}>Reset mock</Button>
  </div>;
}
