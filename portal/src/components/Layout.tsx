import { useState, type ReactNode } from 'react';
import type { DeviceStatus } from '../../../shared/schemas/models';

export type Page = 'dashboard' | 'display' | 'clock' | 'messages' | 'api' | 'system';

const navItems: { id: Page; label: string; icon: string; group?: string }[] = [
  { id: 'dashboard', label: 'Overzicht', icon: '⌂' },
  { id: 'display', label: 'Display', icon: '▣', group: 'CONFIGURATIE' },
  { id: 'clock', label: 'Klok', icon: '◷' },
  { id: 'messages', label: 'Berichten', icon: '▤' },
  { id: 'api', label: 'API', icon: '{}', group: 'ONTWIKKELING' },
  { id: 'system', label: 'Systeem', icon: '⚙' },
];

interface LayoutProps {
  page: Page;
  onNavigate: (page: Page) => void;
  status?: DeviceStatus;
  isMock: boolean;
  children: ReactNode;
}

export function Layout({ page, onNavigate, status, isMock, children }: LayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navigate = (nextPage: Page) => { setMobileNavOpen(false); onNavigate(nextPage); };
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'is-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><span /><span /><span /><span /></div>
          <div><strong>SMART MATRIX</strong><small>DISPLAY HUB</small></div>
        </div>
        <div className="sidebar-device">
          <span className={`status-dot ${status?.online ? 'is-online' : 'is-offline'}`} />
          <div><strong>{status?.hostname ?? 'smartmatrix'}</strong><span>{status?.ip ?? 'device offline'}</span></div>
        </div>
        <nav className="main-nav" aria-label="Hoofdnavigatie">
          {navItems.map((item, index) => (
            <div key={item.id}>
              {item.group && (index === 0 || navItems[index - 1].group !== item.group) && <div className="nav-group">{item.group}</div>}
              <button className={`nav-item ${page === item.id ? 'is-active' : ''}`} onClick={() => navigate(item.id)}>
                <span className="nav-icon">{item.icon}</span><span>{item.label}</span>
              </button>
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="connection-pill"><span className={`status-dot ${status?.online ? 'is-online' : 'is-offline'}`} />{status?.online ? 'Verbonden' : 'Offline'}</div>
          <span className="version-label">firmware {status?.firmware ?? '—'}</span>
        </div>
      </aside>
      {mobileNavOpen && <button className="sidebar-scrim" aria-label="Sluit navigatie" onClick={() => setMobileNavOpen(false)} />}
      <main className="main-content">
        <header className="topbar">
          <div className="mobile-brand"><button className="mobile-menu" aria-label="Open navigatie" onClick={() => setMobileNavOpen(true)}>☰</button><div className="brand-mark"><span /><span /><span /><span /></div><strong>SMART MATRIX</strong></div>
          <div className="breadcrumb"><span>SMART MATRIX</span><b>/</b><strong>{navItems.find((item) => item.id === page)?.label}</strong></div>
          <div className="topbar-actions">
            {isMock && <span className="dev-badge">DEVELOPMENT / MOCK MODE</span>}
            <span className={`top-status ${status?.online ? 'online' : 'offline'}`}><span className="status-dot" /> {status?.online ? 'Online' : 'Offline'}</span>
          </div>
        </header>
        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}
