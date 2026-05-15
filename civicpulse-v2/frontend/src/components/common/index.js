import React from 'react';

const STATUS_COLOR = {
  pending:     '#94a3b8',
  assigned:    '#38bdf8',
  in_progress: '#fbbf24',
  resolved:    '#4ade80',
  closed:      '#6b7280',
  rejected:    '#f87171',
};
const STATUS_PCT = { pending: 10, assigned: 30, in_progress: 65, resolved: 100, closed: 100, rejected: 0 };

export function StatusBadge({ status }) {
  const map = {
    pending:     'badge-gray',
    assigned:    'badge-blue',
    in_progress: 'badge-amber',
    resolved:    'badge-green',
    closed:      'badge-gray',
    rejected:    'badge-red',
  };
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status?.replace(/_/g, ' ')}</span>;
}

export function PriorityBadge({ priority }) {
  const map = { low: 'badge-gray', medium: 'badge-blue', high: 'badge-amber', critical: 'badge-red' };
  return <span className={`badge ${map[priority] || 'badge-gray'}`}>{priority}</span>;
}

export function IssueProgress({ status }) {
  const pct   = STATUS_PCT[status] || 0;
  const color = STATUS_COLOR[status] || '#6b7280';
  const steps = ['pending', 'assigned', 'in_progress', 'resolved'];
  return (
    <div>
      {/* Step indicators */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
        {steps.map((s, i) => {
          const done    = STATUS_PCT[status] >= STATUS_PCT[s];
          const current = status === s;
          return (
            <React.Fragment key={s}>
              <div style={{
                width: 28, height: 28,
                borderRadius: '50%',
                border: `2px solid ${done ? color : 'rgba(255,255,255,0.12)'}`,
                background: done ? color : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: done ? '#000' : 'rgba(255,255,255,0.3)',
                boxShadow: current ? `0 0 12px ${color}` : 'none',
                transition: 'all 0.4s',
                flexShrink: 0,
              }}>
                {done ? '✓' : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div style={{ flex: 1, height: 2, background: STATUS_PCT[status] > STATUS_PCT[s] ? color : 'rgba(255,255,255,0.08)', borderRadius: 2, transition: 'background 0.4s' }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{status?.replace(/_/g, ' ')}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color, textShadow: `0 0 10px ${color}50` }}>{pct}%</span>
      </div>
      <div className="progress">
        <div className="progress-bar" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}99, ${color})` }} />
      </div>
    </div>
  );
}

export function Spinner({ sm }) {
  return <div className={sm ? 'spinner spinner-sm' : 'spinner'} />;
}

export function EmptyState({ icon, title, sub, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: 48, marginBottom: 14, filter: 'drop-shadow(0 0 20px rgba(99,102,241,0.3))' }}>{icon || '📭'}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6, fontFamily: 'var(--f-display)' }}>{title}</div>
      {sub && <div style={{ fontSize: 13, marginBottom: '1.5rem', color: 'var(--text-muted)' }}>{sub}</div>}
      {action}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div className="shimmer" style={{ height: 16, width: '60%', marginBottom: 10 }} />
      <div className="shimmer" style={{ height: 12, width: '40%', marginBottom: 8 }} />
      <div className="shimmer" style={{ height: 12, width: '80%' }} />
    </div>
  );
}
