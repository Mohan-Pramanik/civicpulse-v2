import React from 'react';

const STATUS_COLOR = {
  pending:'#888', assigned:'#378ADD', in_progress:'#BA7517', resolved:'#1D9E75', closed:'#888', rejected:'#D85A30'
};
const STATUS_PCT = { pending:10, assigned:30, in_progress:65, resolved:100, closed:100, rejected:0 };

export function StatusBadge({ status }) {
  const map = { pending:'badge-gray', assigned:'badge-blue', in_progress:'badge-amber', resolved:'badge-green', closed:'badge-gray', rejected:'badge-red' };
  return <span className={`badge ${map[status]||'badge-gray'}`}>{status?.replace('_',' ')}</span>;
}

export function PriorityBadge({ priority }) {
  const map = { low:'badge-gray', medium:'badge-blue', high:'badge-amber', critical:'badge-red' };
  return <span className={`badge ${map[priority]||'badge-gray'}`}>{priority}</span>;
}

export function IssueProgress({ status }) {
  const pct   = STATUS_PCT[status] || 0;
  const color = STATUS_COLOR[status] || '#888';
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ fontSize:12, color:'var(--text-muted)', textTransform:'capitalize' }}>{status?.replace('_',' ')}</span>
        <span style={{ fontSize:13, fontWeight:600, color }}>{pct}%</span>
      </div>
      <div className="progress">
        <div className="progress-bar" style={{ width:`${pct}%`, background:color }} />
      </div>
    </div>
  );
}

export function Spinner({ sm }) {
  return <div className={sm ? 'spinner spinner-sm' : 'spinner'} />;
}

export function EmptyState({ icon, title, sub, action }) {
  return (
    <div style={{ textAlign:'center', padding:'3rem 1rem', color:'var(--text-muted)' }}>
      <div style={{ fontSize:40, marginBottom:12 }}>{icon || '📭'}</div>
      <div style={{ fontSize:16, fontWeight:600, color:'var(--text-secondary)', marginBottom:4 }}>{title}</div>
      {sub && <div style={{ fontSize:13, marginBottom:'1.25rem' }}>{sub}</div>}
      {action}
    </div>
  );
}
