import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

interface ErrorBoundaryState { error?: Error; }

class PortalErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = {};

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Smart Matrix portal render error', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px', background: '#070a12', color: '#f4f7ff', fontFamily: 'system-ui, sans-serif' }}>
      <section style={{ maxWidth: '560px', border: '1px solid #29334a', borderRadius: '16px', padding: '28px', background: '#101624' }}>
        <p style={{ color: '#f2b866', letterSpacing: '0.12em', fontSize: '12px' }}>SMART MATRIX PORTAL</p>
        <h1 style={{ margin: '0 0 12px' }}>Portal tijdelijk niet beschikbaar</h1>
        <p style={{ color: '#aab4c8' }}>De ontvangen deviceconfiguratie kon niet worden weergegeven. Herlaad de portal; de laatst bekende instellingen blijven op de ESP32 bewaard.</p>
        <button type="button" onClick={() => window.location.reload()} style={{ marginTop: '12px', padding: '10px 16px', border: 0, borderRadius: '8px', background: '#72e6a8', color: '#07100d', fontWeight: 700 }}>Opnieuw laden</button>
      </section>
    </main>;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><PortalErrorBoundary><App /></PortalErrorBoundary></React.StrictMode>);
