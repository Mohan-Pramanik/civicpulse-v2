import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminStats, updateStatus, getAdminIssues } from '../../api';
import { useToast } from '../../context/ToastContext';
import { Spinner, StatusBadge, PriorityBadge } from '../../components/common';

const KPI_CONFIG = [
  { key: 'total',      label: 'Total Reports',  icon: '📊', color: '#6366f1', glow: 'rgba(99,102,241,0.3)'   },
  { key: 'resolved',   label: 'Resolved',        icon: '✅', color: '#22c55e', glow: 'rgba(34,197,94,0.3)'   },
  { key: 'inProgress', label: 'In Progress',     icon: '⚙️', color: '#f59e0b', glow: 'rgba(245,158,11,0.3)'  },
  { key: 'pending',    label: 'Pending',          icon: '🔴', color: '#ef4444', glow: 'rgba(239,68,68,0.3)'   },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [queue, setQueue] = useState([]);
  const [busy,  setBusy]  = useState(true);
  const { toast } = useToast();
  const navigate  = useNavigate();

  useEffect(() => {
    Promise.all([
      getAdminStats(),
      getAdminIssues({ priority: 'critical', status: 'pending', limit: 5 })
    ]).then(([s, q]) => {
      setStats(s.data);
      setQueue(q.data.data || []);
    }).catch(() => {}).finally(() => setBusy(false));
  }, []);

  if (busy) return <div className="page"><Spinner /></div>;
  if (!stats) return null;

  const { kpis, byCategory, trend, topAreas, satisfaction } = stats;
  const maxCat   = Math.max(...(byCategory || []).map(c => c.count), 1);
  const maxTrend = Math.max(...(trend || []).map(t => t.reported), 1);

  return (
    <div className="page fade-up">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>KMC Control Centre · Real-time analytics</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="badge badge-green" style={{ gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 8px rgba(34,197,94,0.8)' }} />
            Live
          </span>
          <button className="btn btn-glass btn-sm" onClick={() => navigate('/admin/issues')}>View All →</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        {KPI_CONFIG.map((k, i) => (
          <div key={k.key} className="metric-card fade-up" style={{ animationDelay: `${i * 0.08}s` }}>
            <div className="metric-card-glow" style={{ background: k.glow }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="metric-label">{k.label}</div>
              <span style={{ fontSize: 22 }}>{k.icon}</span>
            </div>
            <div className="metric-value" style={{ color: k.color, textShadow: `0 0 20px ${k.glow}` }}>
              {kpis[k.key] ?? 0}
            </div>
            <div className="metric-sub">
              {k.key === 'resolved' && `${kpis.resolutionRate ?? 0}% resolution rate`}
              {k.key === 'inProgress' && `avg ${kpis.avgResolutionDays ?? 0}d to resolve`}
              {k.key === 'pending' && `${kpis.critical ?? 0} critical`}
              {k.key === 'total' && 'all time reports'}
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginBottom: '1.25rem' }}>
        {/* Category Breakdown */}
        <div className="card fade-up d1">
          <div className="section-label">📂 Issues by Category</div>
          {(byCategory || []).map(c => (
            <div key={c._id} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{c._id}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{c.count}</span>
              </div>
              <div className="progress">
                <div className="progress-bar" style={{
                  width: `${(c.count / maxCat) * 100}%`,
                  background: 'linear-gradient(90deg, #6366f1, #22c55e)',
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* 7-day trend */}
        <div className="card fade-up d2">
          <div className="section-label">📈 7-Day Trend</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 130, paddingTop: 10 }}>
            {(trend || []).map((t, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{ fontSize: 9, color: '#22c55e', fontWeight: 700 }}>{t.resolved}</div>
                <div style={{ width: '100%', display: 'flex', gap: 2 }}>
                  <div style={{
                    flex: 1, borderRadius: '4px 4px 0 0',
                    height: `${(t.reported / maxTrend) * 110}px`, minHeight: 4,
                    background: 'linear-gradient(to top, #6366f1, rgba(99,102,241,0.3))',
                    boxShadow: '0 0 8px rgba(99,102,241,0.3)',
                  }} />
                  <div style={{
                    flex: 1, borderRadius: '4px 4px 0 0',
                    height: `${(t.resolved / maxTrend) * 110}px`, minHeight: 4,
                    background: 'linear-gradient(to top, #22c55e, rgba(34,197,94,0.3))',
                    boxShadow: '0 0 8px rgba(34,197,94,0.3)',
                  }} />
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{t._id?.slice(5)}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
            {[['#6366f1', 'Reported'], ['#22c55e', 'Resolved']].map(([c, l]) => (
              <span key={l} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)' }}>
                <span style={{ width: 10, height: 10, background: c, borderRadius: 2, display: 'inline-block', boxShadow: `0 0 6px ${c}` }} />
                {l}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: '1.25rem' }}>
        {/* Hotspot areas */}
        <div className="card fade-up d2">
          <div className="section-label">📍 Hotspot Areas</div>
          {(topAreas || []).map((a, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>{i === 0 ? '🔴' : i === 1 ? '🟠' : '🟡'}</span>
                {a._id || 'Unknown'}
              </span>
              <span className="badge badge-violet">{a.count} issues</span>
            </div>
          ))}
        </div>

        {/* Satisfaction */}
        <div className="card fade-up d3">
          <div className="section-label">⭐ Citizen Satisfaction</div>
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{ fontSize: 44, letterSpacing: -2 }}>{'⭐'.repeat(Math.round(satisfaction?.avg || 0))}</div>
            <div style={{ fontSize: 36, fontWeight: 900, fontFamily: 'var(--f-display)', background: 'linear-gradient(135deg, #f59e0b, #22c55e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginTop: 8 }}>
              {satisfaction?.avg ? satisfaction.avg.toFixed(1) : 'N/A'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
              Based on {satisfaction?.count ?? 0} ratings
            </div>
          </div>
        </div>
      </div>

      {/* Critical queue */}
      <div className="card fade-up d3">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div className="section-label" style={{ margin: 0 }}>🚨 Critical Queue</div>
          <button className="btn btn-glass btn-sm" onClick={() => navigate('/admin/issues?priority=critical')}>View all →</button>
        </div>
        {queue.length === 0
          ? <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: 13 }}>
              🎉 No critical issues pending
            </div>
          : queue.map(issue => (
            <div key={issue._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => navigate(`/issues/${issue._id}`)}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--f-display)' }}>{issue.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                  📍 {issue.location?.address} · ▲ {issue.upvoteCount || 0} upvotes
                </div>
              </div>
              <PriorityBadge priority={issue.priority} />
              <StatusBadge status={issue.status} />
              <button className="btn btn-emerald btn-sm" onClick={async () => {
                try {
                  await updateStatus(issue._id, { status: 'in_progress', message: 'Escalated via admin dashboard' });
                  setQueue(q => q.filter(x => x._id !== issue._id));
                  toast(`Escalated: ${issue.ticketId || issue._id}`);
                } catch { toast('Failed', 'error'); }
              }}>Escalate</button>
            </div>
          ))
        }
      </div>
    </div>
  );
}
