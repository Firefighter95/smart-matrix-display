import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function Button({ variant = 'secondary', children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; children: ReactNode }) {
  return <button className={`button button--${variant} ${className}`} {...props}>{children}</button>;
}

export function StatusBadge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'success' | 'warning' | 'danger' | 'neutral' }) {
  return <span className={`badge badge--${tone}`}><span className="badge-dot" />{children}</span>;
}

export function SectionHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="section-heading"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>;
}

export function StatCard({ label, value, detail, icon, tone = 'blue' }: { label: string; value: string; detail?: string; icon: string; tone?: string }) {
  return <div className="stat-card"><div className={`stat-icon stat-icon--${tone}`}>{icon}</div><div className="stat-copy"><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div></div>;
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label?: string }) {
  return <label className="toggle-wrap">{label && <span>{label}</span>}<button type="button" role="switch" aria-checked={checked} className={`toggle ${checked ? 'is-on' : ''}`} onClick={() => onChange(!checked)}><span /></button></label>;
}

export function Toast({ message, kind = 'success' }: { message: string; kind?: 'success' | 'error' | 'info' }) {
  return <div className={`toast toast--${kind}`}><span>{kind === 'success' ? '✓' : kind === 'error' ? '!' : 'i'}</span>{message}</div>;
}

export function EmptyState({ icon, title, description }: { icon: string; title: string; description: string }) {
  return <div className="empty-state"><div className="empty-state__icon">{icon}</div><h3>{title}</h3><p>{description}</p></div>;
}

export function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return days ? `${days}d ${hours}u` : `${hours}u ${minutes}m`;
}

export function formatBytes(bytes: number) {
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

