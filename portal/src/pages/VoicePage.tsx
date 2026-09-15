import type { AudioStatus, AssistState } from '../../../shared/schemas/models';
import type { DeviceApi } from '../api/deviceApi';
import { Button, SectionHeading, StatCard, StatusBadge } from '../components/Ui';

interface Props {
  api: DeviceApi;
  audio?: AudioStatus;
  onNotify: (message: string, kind?: 'success' | 'error' | 'info') => void;
}

const stateLabels: Record<AssistState, string> = {
  IDLE: 'Gereed',
  LISTENING: 'Luistert',
  PROCESSING: 'Verwerkt',
  RESPONDING: 'Antwoordt',
  ERROR: 'Fout',
};

const stateTone = (state: AssistState): 'success' | 'warning' | 'danger' | 'neutral' =>
  state === 'ERROR' ? 'danger' : state === 'IDLE' ? 'neutral' : state === 'LISTENING' ? 'success' : 'warning';

export function VoicePage({ api, audio, onNotify }: Props) {
  const current = audio ?? { available: false, initialized: false, microphoneCount: 0, inputCodec: '—', outputCodec: '—', speakerConnected: false, state: 'IDLE' as const, inputLevel: 0, volume: 0, transport: 'none' as const };
  const running = current.state === 'LISTENING' || current.state === 'PROCESSING' || current.state === 'RESPONDING';
  const run = async (action: () => Promise<AudioStatus>, success: string) => {
    try { await action(); onNotify(success); } catch (error) { onNotify(error instanceof Error ? error.message : 'Audioactie mislukt', 'error'); }
  };

  return <div className="page-stack">
    <SectionHeading eyebrow="VOICE ASSIST" title="Spraak met Home Assistant" description="Test de microfoons, Assist-status en speaker rechtstreeks vanuit de portal." action={<StatusBadge tone={current.available ? stateTone(current.state) : 'warning'}>{current.available ? stateLabels[current.state] : 'Niet actief'}</StatusBadge>} />
    <div className="stats-grid">
      <StatCard label="Assist-status" value={stateLabels[current.state]} detail={current.transport === 'mock' ? 'Mock transport' : 'Home Assistant transport'} icon="◉" tone={current.state === 'ERROR' ? 'red' : 'green'} />
      <StatCard label="Microfoons" value={`${current.microphoneCount}`} detail={current.inputCodec} icon="♩" tone="blue" />
      <StatCard label="Speaker" value={current.speakerConnected ? 'Verbonden' : 'Niet getest'} detail={current.outputCodec} icon="◖" tone={current.speakerConnected ? 'green' : 'orange'} />
      <StatCard label="Ingangsniveau" value={`${current.inputLevel}%`} detail="live microfoonmeter" icon="▮" tone="purple" />
    </div>
    <div className="two-column-layout">
      <section className="panel voice-panel">
        <div className="panel-heading"><div><span className="eyebrow">ASSIST SESSION</span><h2>{stateLabels[current.state]}</h2><p>Push-to-talk simulatie voor Home Assistant Assist.</p></div><span className="voice-state-icon">{current.state === 'LISTENING' ? '◉' : current.state === 'RESPONDING' ? '♪' : current.state === 'PROCESSING' ? '…' : '○'}</span></div>
        <div className="voice-meter"><div className="voice-meter__bar" style={{ width: `${current.inputLevel}%` }} /><span>{current.state === 'LISTENING' ? 'Microfoon actief' : 'Microfoon stand-by'}</span></div>
        <div className="form-actions"><Button variant="primary" disabled={!current.available || running} onClick={() => void run(() => api.startAssist(), 'Assist-sessie gestart')}>Start luisteren</Button><Button disabled={!running} onClick={() => void run(() => api.stopAssist(), 'Assist-sessie gestopt')}>Stop</Button><Button onClick={() => void run(() => api.playAudioTest(), 'Speaker-test gestart')}>Speaker testen</Button></div>
        {current.lastTranscript && <div className="voice-transcript"><span>Laatste opdracht</span><strong>“{current.lastTranscript}”</strong></div>}
        {current.lastResponse && <div className="voice-transcript voice-transcript--response"><span>Assist antwoord</span><strong>{current.lastResponse}</strong></div>}
        {current.error && <div className="error-banner"><span>!</span><div><strong>Audio niet beschikbaar</strong><p>{current.error}</p></div></div>}
      </section>
      <section className="panel">
        <div className="panel-heading"><div><span className="eyebrow">HARDWARE</span><h2>Audio-keten</h2></div></div>
        <div className="details-list"><div><span>Codec microfoon</span><strong>{current.inputCodec}</strong></div><div><span>Codec speaker</span><strong>{current.outputCodec}</strong></div><div><span>Aantal microfoons</span><strong>{current.microphoneCount}</strong></div><div><span>Transport</span><strong>{current.transport === 'mock' ? 'Portal mock' : current.transport === 'home_assistant' ? 'Home Assistant' : 'Niet actief'}</strong></div><div><span>Volume</span><strong>{current.volume}%</strong></div></div>
        <div className="quick-note"><span className="note-icon">i</span><span>De mock gebruikt dezelfde statusflow als de toekomstige firmware: IDLE → LISTENING → PROCESSING → RESPONDING → IDLE.</span></div>
      </section>
    </div>
    <section className="panel"><div className="panel-heading"><div><span className="eyebrow">INTEGRATION STATUS</span><h2>Home Assistant koppeling</h2></div><StatusBadge tone="warning">Voorbereid</StatusBadge></div><div className="details-list"><div><span>Assist satellite entity</span><strong>Volgende firmwarefase</strong></div><div><span>Audioformaat</span><strong>16 kHz · 16-bit</strong></div><div><span>Wake word</span><strong>Na push-to-talk validatie</strong></div></div></section>
  </div>;
}
