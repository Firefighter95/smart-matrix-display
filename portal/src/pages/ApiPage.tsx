import { useState } from 'react';
import type { DeviceApi } from '../api/deviceApi';
import type { DeviceConfig, DeviceStatus, Message } from '../../../shared/schemas/models';
import { Button, SectionHeading, StatusBadge } from '../components/Ui';

interface Props { api: DeviceApi; status: DeviceStatus; config: DeviceConfig; onNotify: (message: string, kind?: 'success' | 'error' | 'info') => void; }

const examples: Record<string, string> = {
  'GET /api/v1/status': '',
  'GET /api/v1/config': '',
  'POST /api/v1/message': JSON.stringify({ title: 'WASMACHINE', message: 'KLAAR', duration: 20, color: '#00FF00', priority: 50 }, null, 2),
  'POST /api/v1/clear': '',
};

export function ApiPage({ api, status: _status, config: _config, onNotify }: Props) {
  const [endpoint, setEndpoint] = useState(Object.keys(examples)[2]);
  const [body, setBody] = useState(examples[Object.keys(examples)[2]]);
  const [response, setResponse] = useState<string>();
  const [sending, setSending] = useState(false);
  const send = async () => {
    setSending(true); const started = performance.now();
    try {
      const [method, path] = endpoint.split(' ');
      let result: unknown;
      if (method === 'GET' && path.endsWith('status')) result = await api.getStatus();
      else if (method === 'GET') result = await api.getConfig();
      else if (path.endsWith('message')) result = await api.sendMessage(JSON.parse(body) as Message);
      else { await api.clearDisplay(); result = { cleared: true }; }
      setResponse(JSON.stringify({ status: 200, duration_ms: Math.round(performance.now() - started), body: result }, null, 2)); onNotify('API request uitgevoerd');
    } catch (cause) { const message = cause instanceof Error ? cause.message : 'Ongeldige request'; setResponse(JSON.stringify({ status: 400, error: message }, null, 2)); onNotify(message, 'error'); }
    finally { setSending(false); }
  };
  return <div className="page-stack"><SectionHeading eyebrow="DEVELOPER API" title="API tester" description="Test hetzelfde versioned REST-contract dat het lokale portal en de ESP32 gebruiken." action={<StatusBadge tone="success">/api/v1/</StatusBadge>} /><div className="api-layout"><section className="panel"><div className="panel-heading"><div><span className="eyebrow">REQUEST</span><h2>API request</h2></div><span className="muted">Mock adapter actief</span></div><label className="field"><span>Endpoint</span><select value={endpoint} onChange={(event) => { setEndpoint(event.target.value); setBody(examples[event.target.value]); }}>{Object.keys(examples).map((item) => <option key={item}>{item}</option>)}</select></label><label className="field field--wide"><span>JSON body</span><textarea className="code-editor" rows={14} value={body} onChange={(event) => setBody(event.target.value)} spellCheck={false} /></label><div className="form-actions"><Button variant="primary" disabled={sending} onClick={() => void send()}>{sending ? 'Verzenden…' : 'SEND REQUEST'}</Button></div></section><section className="panel"><div className="panel-heading"><div><span className="eyebrow">RESPONSE</span><h2>Response</h2></div><span className="muted">HTTP JSON</span></div><pre className="response-view">{response ?? 'Klik op SEND REQUEST om een mock response te zien.'}</pre></section></div><section className="panel"><div className="panel-heading"><div><span className="eyebrow">CONTRACT</span><h2>Endpoints</h2></div></div><div className="endpoint-list"><div><code>GET /api/v1/status</code><span>Live device status, geheugen en verbinding.</span></div><div><code>GET /api/v1/config</code><span>Volledige versioned display- en klokconfiguratie.</span></div><div><code>PUT /api/v1/config</code><span>Partiële update; onbekende velden blijven behouden.</span></div><div><code>POST /api/v1/message</code><span>Valideer en toon een tijdelijk bericht.</span></div><div><code>POST /api/v1/clear</code><span>Wis het actieve bericht en keer terug naar CLOCK.</span></div></div></section><div className="api-footnote"><span className="note-icon">i</span><span>De UI gebruikt alleen de DeviceApi-interface. Wisselen naar echte ESP32-requests vereist alleen <code>VITE_API_MODE=esp32</code>.</span></div></div>;
}
