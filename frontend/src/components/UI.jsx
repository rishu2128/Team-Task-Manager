export function Avatar({ name, color, size = 'md' }) {
  const initials = name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  return (
    <div
      className={`avatar ${size === 'lg' ? 'avatar-lg' : ''}`}
      style={{ background: color || '#6366f1' }}
      title={name}
    >
      {initials}
    </div>
  );
}

export function StatusBadge({ status }) {
  const labels = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' };
  return <span className={`badge status-${status}`}>{labels[status] || status}</span>;
}

export function PriorityBadge({ priority }) {
  const icons = { low: '↓', medium: '→', high: '↑', urgent: '⚡' };
  return <span className={`badge priority-${priority}`}>{icons[priority]} {priority}</span>;
}

export function Spinner({ size = 'sm' }) {
  return <div className={`spinner ${size === 'lg' ? 'spinner-lg' : ''}`} />;
}

export function Modal({ title, onClose, children, footer }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>{title}</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export function ProgressBar({ value, max, color = 'var(--accent)' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: 4, display: 'block' }}>{pct}% complete</span>
    </div>
  );
}

export function ColorDot({ color, size = 10 }) {
  return <span style={{ display: 'inline-block', width: size, height: size, borderRadius: '50%', background: color, flexShrink: 0 }} />;
}

export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="empty-state">
      <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>{icon}</div>
      <h3>{title}</h3>
      <p style={{ marginBottom: 20, fontSize: '0.875rem' }}>{description}</p>
      {action}
    </div>
  );
}
