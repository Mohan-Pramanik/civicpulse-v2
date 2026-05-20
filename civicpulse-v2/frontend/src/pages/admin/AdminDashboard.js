import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminStats } from '../../api';
import { Spinner, StatusBadge, PriorityBadge } from '../../components/common';
import { updateStatus } from '../../api';
import { useToast } from '../../context/ToastContext';

const KPI_CONFIG = [
  { key:'total',      label:'Total Reports',  icon:'📊', color:'#6366f1', glow:'rgba(99,102,241,0.3)',  filter:null },
  { key:'resolved',   label:'Resolved',        icon:'✅', color:'#22c55e', glow:'rgba(34,197,94,0.3)',  filter:'resolved' },
  { key:'inProgress', label:'In Progress',     icon:'⚙️', color:'#f59e0b', glow:'rgba(245,158,11,0.3)', filter:'in_progress' },
  { key:'pending',    label:'Pending',          icon:'🔴', color:'#ef4444', glow:'rgba(239,68,68,0.3)',  filter:'pending' },
];

// Simple bar chart component
function TrendChart({ trend }) {
  if (!trend || trend.length === 0) return (
    <div style={{ textAlign:'center', padding:'2rem', color:'var(--text-muted)', fontSize:13 }}>No trend data available</div>
  );

  const maxVal = Math.max(...trend.flatMap(t => [t.reported, t.resolved]), 1);

  return (
    <div>
      <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:120, paddingBottom:4 }}>
        {trend.map((t, i) => (
          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2, minWidth:0 }}>
            <div style={{ width:'100%', display:'flex', gap:2, alignItems:'flex-end', height:100 }}>
              {/* Reported bar */}
              <div style={{
                flex:1,
                height: `${Math.max((t.reported / maxVal) * 100, t.reported > 0 ? 8 : 0)}%`,
                minHeight: t.reported > 0 ? 6 : 0,
                background:'linear-gradient(to top, #6366f1, rgba(99,102,241,0.5))',
                borderRadius:'4px 4px 0 0',
                boxShadow:'0 0 8px rgba(99,102,241,0.4)',
                position:'relative',
                transition:'height 0.8s ease',
              }}>
                {t.reported > 0 && (
                  <div style={{ position:'absolute', top:-18, left:'50%', transform:'translateX(-50%)', fontSize:9, color:'#818cf8', fontWeight:700, whiteSpace:'nowrap' }}>{t.reported}</div>
                )}
              </div>
              {/* Resolved bar */}
              <div style={{
                flex:1,
                height: `${Math.max((t.resolved / maxVal) * 100, t.resolved > 0 ? 8 : 0)}%`,
                minHeight: t.resolved > 0 ? 6 : 0,
                background:'linear-gradient(to top, #22c55e, rgba(34,197,94,0.5))',
                borderRadius:'4px 4px 0 0',
                boxShadow:'0 0 8px rgba(34,197,94,0.4)',
                position:'relative',
                transition:'height 0.8s ease',
              }}>
                {t.resolved > 0 && (
                  <div style={{ position:'absolute', top:-18, left:'50%', transform:'translateX(-50%)', fontSize:9, color:'#4ade80', fontWeight:700, whiteSpace:'nowrap' }}>{t.resolved}</div>
                )}
              </div>
            </div>
            <div style={{ fontSize:9, color:'var(--text-muted)', marginTop:4, textAlign:'center' }}>
              {t._id?.slice(5)}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', gap:16, marginTop:12 }}>
        {[['#6366f1','Reported'],['#22c55e','Resolved']].map(([c,l]) => (
          <span key={l} style={{ fontSize:11, display:'flex', alignItems:'center', gap:5, color:'var(--text-muted)' }}>
            <span style={{ width:10, height:10, background:c, borderRadius:2, display:'inline-block', boxShadow:`0 0 6px ${c}` }} />
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

// Department performance row
function DeptRow({ dept }) {
  const rate = dept.total > 0 ? Math.round((dept.resolved / dept.total) * 100) : 0;
  const color = rate >= 70 ? '#22c55e' : rate >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ padding:'12px 0', borderBottom:'1px solid var(--border)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', fontFamily:'var(--f-display)' }}>
          {dept._id || 'Unknown'}
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          <span style={{ fontSize:11, color:'var(--text-muted)' }}>{dept.total} total</span>
          <span style={{ fontSize:12, fontWeight:700, color, fontFamily:'var(--f-display)', textShadow:`0 0 8px ${color}50` }}>{rate}%</span>
        </div>
      </div>
      <div style={{ display:'flex', gap:4, marginBottom:6 }}>
        {[
          { label:'Resolved', val:dept.resolved, color:'#22c55e' },
          { label:'Progress', val:dept.inProgress, color:'#f59e0b' },
          { label:'Pending', val:dept.pending, color:'#ef4444' },
        ].map(s => (
          <div key={s.label} style={{ flex:1, textAlign:'center', background:`${s.color}12`, border:`1px solid ${s.color}25`, borderRadius:6, padding:'4px 2px' }}>
            <div style={{ fontSize:13, fontWeight:700, color:s.color, fontFamily:'var(--f-display)' }}>{s.val || 0}</div>
            <div style={{ fontSize:9, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.04em' }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div className="progress">
        <div className="progress-bar" style={{ width:`${rate}%`, background:`linear-gradient(90deg, ${color}88, ${color})`, transition:'width 1s ease' }} />
      </div>
      {dept.avgDays && (
        <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:5 }}>
          avg {Number(dept.avgDays).toFixed(1)} days to resolve
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats,  setStats]  = useState(null);
  const [queue,  setQueue]  = useState([]);
  const [busy,   setBusy]   = useState(true);
  const [activeKpi, setActiveKpi] = useState(null);
  const { toast } = useToast();
  const navigate  = useNavigate();

  useEffect(() => {
    Promise.all([
      getAdminStats(),
      import('../../api').then(m => m.getAdminIssues({ priority:'critical', status:'pending', limit:5 }))
    ]).then(([s, q]) => {
      setStats(s.data);
      setQueue(q.data.data || []);
    }).catch(() => {}).finally(() => setBusy(false));
  }, []);

  if (busy) return <div className="page"><Spinner /></div>;
  if (!stats) return null;

  const { kpis, byCategory, byDept, trend, topAreas, satisfaction } = stats;
  const maxCat = Math.max(...(byCategory || []).map(c => c.count), 1);

  const handleKpiClick = (filter) => {
    if (!filter) { navigate('/admin/issues'); return; }
    navigate(`/admin/issues?status=${filter}`);
  };

  return (
    <div className="page">
      <div className="page-header fade-up">
        <div>
          <h1>Admin Dashboard</h1>
          <p>KMC Control Centre · Real-time analytics</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <span className="badge badge-green" style={{ gap:6 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#22c55e', display:'inline-block', boxShadow:'0 0 8px rgba(34,197,94,0.8)', animation:'pulse-glow 2s infinite' }} />
            Live
          </span>
          <button className="btn btn-glass btn-sm" onClick={() => navigate('/admin/issues')}>View All →</button>
        </div>
      </div>

      {/* Clickable KPI Cards */}
      <div className="grid-4" style={{ marginBottom:'1.5rem' }}>
        {KPI_CONFIG.map((k, i) => (
          <div key={k.key} className="metric-card fade-up" style={{ animationDelay:`${i*0.08}s`, cursor:'pointer', transition:'all 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}
            onClick={() => handleKpiClick(k.filter)}
            onMouseOver={e => { e.currentTarget.style.transform='translateY(-6px)'; e.currentTarget.style.boxShadow=`var(--s-md), 0 0 30px ${k.glow}`; }}
            onMouseOut={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; }}>
            <div className="metric-card-glow" style={{ background:k.glow }} />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div className="metric-label">{k.label}</div>
              <span style={{ fontSize:22 }}>{k.icon}</span>
            </div>
            <div className="metric-value" style={{ color:k.color, textShadow:`0 0 20px ${k.glow}` }}>{kpis[k.key] ?? 0}</div>
            <div className="metric-sub">
              {k.key==='resolved'    && `${kpis.resolutionRate ?? 0}% resolution rate`}
              {k.key==='inProgress'  && `avg ${kpis.avgResolutionDays ?? 'N/A'}d to resolve`}
              {k.key==='pending'     && `${kpis.critical ?? 0} critical`}
              {k.key==='total'       && 'click to view all'}
            </div>
            <div style={{ fontSize:10, color:k.color, marginTop:6, opacity:0.7, fontFamily:'var(--f-display)', letterSpacing:'.05em' }}>
              CLICK TO FILTER →
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginBottom:'1.25rem' }}>
        {/* Category Breakdown */}
        <div className="card fade-up d1">
          <div className="section-label">📂 Issues by Category</div>
          {(byCategory || []).map(c => (
            <div key={c._id} style={{ marginBottom:12, cursor:'pointer' }} onClick={() => navigate(`/admin/issues?category=${c._id}`)}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                <span style={{ fontSize:13, color:'var(--text-secondary)', textTransform:'capitalize' }}>{c._id}</span>
                <span style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{c.count}</span>
              </div>
              <div className="progress">
                <div className="progress-bar" style={{ width:`${(c.count/maxCat)*100}%`, background:'linear-gradient(90deg,#6366f1,#22c55e)' }} />
              </div>
            </div>
          ))}
        </div>

        {/* 7-day Trend */}
        <div className="card fade-up d2">
          <div className="section-label">📈 7-Day Trend</div>
          <TrendChart trend={trend} />
        </div>
      </div>

      {/* Department Performance */}
      <div className="card fade-up d2" style={{ marginBottom:'1.25rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <div className="section-label" style={{ margin:0 }}>🏛️ Department Performance</div>
          <span style={{ fontSize:12, color:'var(--text-muted)' }}>Click KPIs above to filter by status</span>
        </div>
        {(byDept || []).length === 0 ? (
          <div style={{ textAlign:'center', padding:'1.5rem', color:'var(--text-muted)', fontSize:13 }}>No department data yet</div>
        ) : (
          (byDept || []).map((d, i) => <DeptRow key={i} dept={d} />)
        )}
      </div>

      <div className="grid-2" style={{ marginBottom:'1.25rem' }}>
        {/* Hotspot Areas */}
        <div className="card fade-up d2">
          <div className="section-label">📍 Hotspot Areas</div>
          {(topAreas || []).length === 0 ? (
            <div style={{ textAlign:'center', padding:'1rem', color:'var(--text-muted)', fontSize:13 }}>No area data yet — add area when reporting issues</div>
          ) : (
            (topAreas || []).map((a, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--border)', cursor:'pointer' }}
                onClick={() => navigate(`/admin/issues?area=${encodeURIComponent(a._id)}`)}>
                <span style={{ fontSize:13, color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:16 }}>{i===0?'🔴':i===1?'🟠':'🟡'}</span>
                  {a._id || 'Unknown'}
                </span>
                <span className="badge badge-violet">{a.count} issues</span>
              </div>
            ))
          )}
        </div>

        {/* Satisfaction */}
        <div className="card fade-up d3">
          <div className="section-label">⭐ Citizen Satisfaction</div>
          <div style={{ textAlign:'center', padding:'1.5rem 0' }}>
            {satisfaction?.avg > 0 ? (
              <>
                <div style={{ fontSize:40, letterSpacing:-1, filter:'drop-shadow(0 0 12px rgba(245,158,11,0.5))' }}>
                  {'⭐'.repeat(Math.round(satisfaction.avg))}
                </div>
                <div style={{ fontSize:36, fontWeight:900, fontFamily:'var(--f-display)', background:'linear-gradient(135deg,#f59e0b,#22c55e)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', marginTop:8 }}>
                  {satisfaction.avg.toFixed(1)}
                </div>
                <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:6 }}>Based on {satisfaction.count} ratings</div>
              </>
            ) : (
              <div style={{ color:'var(--text-muted)', fontSize:14 }}>No ratings yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Critical Queue */}
      <div className="card fade-up d3">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <div className="section-label" style={{ margin:0 }}>🚨 Critical Queue</div>
          <button className="btn btn-glass btn-sm" onClick={() => navigate('/admin/issues?priority=critical')}>View all →</button>
        </div>
        {queue.length === 0 ? (
          <div style={{ textAlign:'center', padding:'1.5rem', color:'var(--text-muted)', fontSize:13 }}>🎉 No critical issues pending</div>
        ) : queue.map(issue => (
          <div key={issue._id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderBottom:'1px solid var(--border)' }}>
            <div style={{ flex:1, cursor:'pointer' }} onClick={() => navigate(`/issues/${issue._id}`)}>
              <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', fontFamily:'var(--f-display)' }}>{issue.title}</div>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>📍 {issue.location?.address} · ▲ {issue.upvoteCount||0}</div>
            </div>
            <PriorityBadge priority={issue.priority} />
            <StatusBadge status={issue.status} />
            <button className="btn btn-sm" style={{ background:'rgba(34,197,94,0.15)', color:'#22c55e', border:'1px solid rgba(34,197,94,0.3)', borderRadius:'var(--r-sm)', flexShrink:0 }}
              onClick={async () => {
                try {
                  await updateStatus(issue._id, { status:'in_progress', message:'Escalated via admin dashboard' });
                  setQueue(q => q.filter(x => x._id !== issue._id));
                  toast(`Escalated: ${issue.ticketId}`);
                } catch { toast('Failed','error'); }
              }}>Escalate</button>
          </div>
        ))}
      </div>
    </div>
  );
}