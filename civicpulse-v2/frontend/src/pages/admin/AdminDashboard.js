import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminStats, updateStatus } from '../../api';
import { Spinner, PriorityBadge, StatusBadge } from '../../components/common';
import { useToast } from '../../context/ToastContext';
import { useLang } from '../../context/LanguageContext';

function TrendChart({ trend, t }) {
  if (!trend?.length) return <div style={{ textAlign:'center', padding:'2rem', color:'var(--text-muted)', fontSize:13 }}>{t.admin.noAreaData}</div>;
  const maxVal = Math.max(...trend.flatMap(d => [d.reported || 0, d.resolved || 0]), 1);
  return (
    <div>
      <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:120 }}>
        {trend.map((d, i) => (
          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
            <div style={{ width:'100%', display:'flex', gap:2, alignItems:'flex-end', height:100 }}>
              <div style={{ flex:1, height:`${Math.max(((d.reported||0)/maxVal)*100, (d.reported||0)>0?6:0)}%`, minHeight:(d.reported||0)>0?4:0, background:'linear-gradient(to top,#6366f1,rgba(99,102,241,0.4))', borderRadius:'4px 4px 0 0', position:'relative', transition:'height 0.8s ease' }}>
                {(d.reported||0) > 0 && <div style={{ position:'absolute', top:-16, left:'50%', transform:'translateX(-50%)', fontSize:9, color:'#818cf8', fontWeight:700 }}>{d.reported}</div>}
              </div>
              <div style={{ flex:1, height:`${Math.max(((d.resolved||0)/maxVal)*100, (d.resolved||0)>0?6:0)}%`, minHeight:(d.resolved||0)>0?4:0, background:'linear-gradient(to top,#22c55e,rgba(34,197,94,0.4))', borderRadius:'4px 4px 0 0', position:'relative', transition:'height 0.8s ease' }}>
                {(d.resolved||0) > 0 && <div style={{ position:'absolute', top:-16, left:'50%', transform:'translateX(-50%)', fontSize:9, color:'#4ade80', fontWeight:700 }}>{d.resolved}</div>}
              </div>
            </div>
            <div style={{ fontSize:9, color:'var(--text-muted)', marginTop:4 }}>{d._id?.slice(5)}</div>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', gap:16, marginTop:10 }}>
        {[['#6366f1', t.admin.reported || 'Reported'],['#22c55e', t.admin.resolved]].map(([c,l]) => (
          <span key={l} style={{ fontSize:11, display:'flex', alignItems:'center', gap:5, color:'var(--text-muted)' }}>
            <span style={{ width:10, height:10, background:c, borderRadius:2, display:'inline-block' }} />{l}
          </span>
        ))}
      </div>
    </div>
  );
}

function DeptRow({ dept, t }) {
  const total      = dept.total      || 0;
  const resolved   = dept.resolved   || 0;
  const inProgress = dept.inProgress || 0;
  const pending    = dept.pending    || 0;
  const rate       = total > 0 ? Math.round((resolved / total) * 100) : 0;

  // success rate colour + label
  const rateColor  = rate >= 70 ? '#22c55e' : rate >= 40 ? '#f59e0b' : '#ef4444';
  const rateBg     = rate >= 70 ? 'rgba(34,197,94,0.12)'  : rate >= 40 ? 'rgba(245,158,11,0.12)'  : 'rgba(239,68,68,0.12)';
  const rateBorder = rate >= 70 ? 'rgba(34,197,94,0.3)'   : rate >= 40 ? 'rgba(245,158,11,0.3)'   : 'rgba(239,68,68,0.3)';
  const rateLabel  = rate >= 70 ? '🟢 Excellent' : rate >= 40 ? '🟡 Moderate' : '🔴 Needs Attention';

  // segmented bar widths (out of total)
  const resolvedPct   = total > 0 ? (resolved   / total) * 100 : 0;
  const inProgressPct = total > 0 ? (inProgress / total) * 100 : 0;
  const pendingPct    = total > 0 ? (pending    / total) * 100 : 0;

  const STATS = [
    { label:'Resolved',    value: resolved,   color:'#22c55e', bg:'rgba(34,197,94,0.1)',   border:'rgba(34,197,94,0.25)'  },
    { label:'In Progress', value: inProgress, color:'#f59e0b', bg:'rgba(245,158,11,0.1)',  border:'rgba(245,158,11,0.25)' },
    { label:'Pending',     value: pending,    color:'#ef4444', bg:'rgba(239,68,68,0.1)',   border:'rgba(239,68,68,0.25)'  },
  ];

  return (
    <div style={{ padding:'16px 0', borderBottom:'1px solid var(--border)' }}>

      {/* ── Row 1: name + total reports badge + success rate ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, gap:8, flexWrap:'wrap' }}>
        <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', fontFamily:'var(--f-display)' }}>
          🏛️ {dept._id || 'Unknown'}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          {/* Total reports pill */}
          <div style={{ background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.25)', borderRadius:20, padding:'3px 12px', display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ fontSize:11, color:'#818cf8', fontWeight:600 }}>📋</span>
            <span style={{ fontSize:12, fontWeight:700, color:'#a5b4fc', fontFamily:'var(--f-display)' }}>{total}</span>
            <span style={{ fontSize:10, color:'var(--text-muted)' }}>reports</span>
          </div>
          {/* Success rate badge */}
          <div style={{ background:rateBg, border:`1px solid ${rateBorder}`, borderRadius:20, padding:'3px 12px', display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ fontSize:13, fontWeight:800, color:rateColor, fontFamily:'var(--f-display)' }}>{rate}%</span>
            <span style={{ fontSize:10, color:rateColor, opacity:0.8 }}>success</span>
          </div>
        </div>
      </div>

      {/* ── Row 2: stat boxes ── */}
      <div style={{ display:'flex', gap:6, marginBottom:10 }}>
        {STATS.map(s => (
          <div key={s.label} style={{ flex:1, textAlign:'center', background:s.bg, border:`1px solid ${s.border}`, borderRadius:8, padding:'8px 4px' }}>
            <div style={{ fontSize:18, fontWeight:800, color:s.color, fontFamily:'var(--f-display)', lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:9, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.05em', marginTop:3 }}>{s.label}</div>
            <div style={{ fontSize:10, color:s.color, opacity:0.7, marginTop:2, fontWeight:600 }}>
              {total > 0 ? `${Math.round((s.value/total)*100)}%` : '0%'}
            </div>
          </div>
        ))}
      </div>

      {/* ── Row 3: segmented progress bar ── */}
      <div style={{ height:8, borderRadius:8, overflow:'hidden', background:'rgba(255,255,255,0.06)', display:'flex' }}>
        {resolvedPct   > 0 && <div style={{ width:`${resolvedPct}%`,   background:'#22c55e', transition:'width 0.8s ease' }} />}
        {inProgressPct > 0 && <div style={{ width:`${inProgressPct}%`, background:'#f59e0b', transition:'width 0.8s ease' }} />}
        {pendingPct    > 0 && <div style={{ width:`${pendingPct}%`,    background:'#ef4444', transition:'width 0.8s ease' }} />}
      </div>

      {/* ── Row 4: avg resolution + status label ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:6 }}>
        {dept.avgDays
          ? <span style={{ fontSize:11, color:'var(--text-muted)' }}>⏱ avg {Number(dept.avgDays).toFixed(1)} days to resolve</span>
          : <span />
        }
        <span style={{ fontSize:10, color:rateColor, fontWeight:600 }}>{rateLabel}</span>
      </div>

    </div>
  );
}

export default function AdminDashboard() {
  const [stats,  setStats]  = useState(null);
  const [queue,  setQueue]  = useState([]);
  const [busy,   setBusy]   = useState(true);
  const { toast }  = useToast();
  const navigate   = useNavigate();
  const { t }      = useLang();

  const KPI_CONFIG = [
    { key:'total',      label: t.admin.totalReports, icon:'📊', color:'#6366f1', glow:'rgba(99,102,241,0.3)', filter:'' },
    { key:'resolved',   label: t.admin.resolved,     icon:'✅', color:'#22c55e', glow:'rgba(34,197,94,0.3)',  filter:'resolved' },
    { key:'inProgress', label: t.admin.inProgress,   icon:'⚙️', color:'#f59e0b', glow:'rgba(245,158,11,0.3)', filter:'in_progress' },
    { key:'pending',    label: t.admin.pending,       icon:'🔴', color:'#ef4444', glow:'rgba(239,68,68,0.3)',  filter:'pending' },
  ];

  useEffect(() => {
    Promise.all([
      getAdminStats(),
      import('../../api').then(m => m.getAdminIssues({ priority:'critical', status:'pending', limit:5 }))
    ]).then(([s, q]) => { setStats(s.data); setQueue(q.data.data || []); })
      .catch(() => {}).finally(() => setBusy(false));
  }, []);

  if (busy) return <div className="page"><Spinner /></div>;
  if (!stats) return null;

  const { kpis, byCategory, byDept, trend, topAreas, satisfaction } = stats;
  const maxCat = Math.max(...(byCategory||[]).map(c=>c.count), 1);

  return (
    <div className="page">
      <div className="page-header fade-up">
        <div><h1>{t.admin.dashboard}</h1><p>{t.admin.controlCentre}</p></div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <span className="badge badge-green" style={{ gap:6 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#22c55e', display:'inline-block', boxShadow:'0 0 8px rgba(34,197,94,0.8)', animation:'pulse-glow 2s infinite' }} />
            {t.admin.live}
          </span>
          <button className="btn btn-glass btn-sm" onClick={() => navigate('/admin/issues')}>{t.admin.viewAll}</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid-4" style={{ marginBottom:'1.5rem' }}>
        {KPI_CONFIG.map((k, i) => (
          <div key={k.key} className="metric-card fade-up" style={{ animationDelay:`${i*0.08}s`, cursor:'pointer' }}
            onClick={() => navigate(k.filter ? `/admin/issues?status=${k.filter}` : '/admin/issues')}
            onMouseOver={e => { e.currentTarget.style.transform='translateY(-6px)'; e.currentTarget.style.boxShadow=`var(--s-md), 0 0 30px ${k.glow}`; }}
            onMouseOut={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; }}>
            <div className="metric-card-glow" style={{ background:k.glow }} />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div className="metric-label">{k.label}</div>
              <span style={{ fontSize:22 }}>{k.icon}</span>
            </div>
            <div className="metric-value" style={{ color:k.color, textShadow:`0 0 20px ${k.glow}` }}>{kpis[k.key] ?? 0}</div>
            <div className="metric-sub">
              {k.key==='resolved'   && `${kpis.resolutionRate}${t.admin.resolutionRate}`}
              {k.key==='inProgress' && `avg ${kpis.avgResolutionDays}${t.admin.avgDays}`}
              {k.key==='pending'    && `${kpis.critical} ${t.admin.critical}`}
              {k.key==='total'      && t.admin.allTime}
            </div>
            <div style={{ fontSize:10, color:k.color, marginTop:6, opacity:0.7, fontFamily:'var(--f-display)', letterSpacing:'.05em' }}>{t.admin.clickToFilter}</div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginBottom:'1.25rem' }}>
        <div className="card fade-up d1">
          <div className="section-label">{t.admin.byCategory}</div>
          {(byCategory||[]).map(c => (
            <div key={c._id} style={{ marginBottom:12, cursor:'pointer' }} onClick={() => navigate(`/admin/issues?category=${c._id}`)}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                <span style={{ fontSize:13, color:'var(--text-secondary)', textTransform:'capitalize' }}>{c._id}</span>
                <span style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{c.count}</span>
              </div>
              <div className="progress"><div className="progress-bar" style={{ width:`${(c.count/maxCat)*100}%`, background:'linear-gradient(90deg,#6366f1,#22c55e)' }} /></div>
            </div>
          ))}
        </div>
        <div className="card fade-up d2">
          <div className="section-label">{t.admin.trend}</div>
          <TrendChart trend={trend} t={t} />
        </div>
      </div>

      {/* Department Performance */}
      <div className="card fade-up d2" style={{ marginBottom:'1.25rem' }}>
        <div className="section-label">{t.admin.deptPerformance}</div>
        {(byDept||[]).length === 0
          ? <div style={{ textAlign:'center', padding:'1.5rem', color:'var(--text-muted)', fontSize:13 }}>{t.admin.noDeptData}</div>
          : (byDept||[]).map((d,i) => <DeptRow key={i} dept={d} t={t} />)
        }
      </div>

      <div className="grid-2" style={{ marginBottom:'1.25rem' }}>
        <div className="card fade-up d2">
          <div className="section-label">{t.admin.hotspots}</div>
          {(topAreas||[]).length === 0
            ? <div style={{ textAlign:'center', padding:'1rem', color:'var(--text-muted)', fontSize:13 }}>{t.admin.noAreaData}</div>
            : (topAreas||[]).map((a,i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--border)', cursor:'pointer' }}
                onClick={() => navigate(`/admin/issues?area=${encodeURIComponent(a._id)}`)}>
                <span style={{ fontSize:13, color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:16 }}>{i===0?'🔴':i===1?'🟠':'🟡'}</span>{a._id||'Unknown'}
                </span>
                <span className="badge badge-violet">{a.count} issues</span>
              </div>
            ))
          }
        </div>
        <div className="card fade-up d3">
          <div className="section-label">{t.admin.satisfaction}</div>
          <div style={{ textAlign:'center', padding:'1.5rem 0' }}>
            {satisfaction?.avg > 0 ? (
              <>
                <div style={{ fontSize:36 }}>{'⭐'.repeat(Math.round(satisfaction.avg))}</div>
                <div style={{ fontSize:32, fontWeight:900, fontFamily:'var(--f-display)', background:'linear-gradient(135deg,#f59e0b,#22c55e)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', marginTop:8 }}>{satisfaction.avg.toFixed(1)}</div>
                <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:6 }}>Based on {satisfaction.count} ratings</div>
              </>
            ) : <div style={{ color:'var(--text-muted)', fontSize:14 }}>{t.admin.noRatings}</div>}
          </div>
        </div>
      </div>

      {/* Critical Queue */}
      <div className="card fade-up d3">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <div className="section-label" style={{ margin:0 }}>{t.admin.criticalQueue}</div>
          <button className="btn btn-glass btn-sm" onClick={() => navigate('/admin/issues?priority=critical')}>{t.admin.viewAll}</button>
        </div>
        {queue.length === 0
          ? <div style={{ textAlign:'center', padding:'1.5rem', color:'var(--text-muted)', fontSize:13 }}>{t.admin.noCritical}</div>
          : queue.map(issue => (
            <div key={issue._id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderBottom:'1px solid var(--border)' }}>
              <div style={{ flex:1, cursor:'pointer' }} onClick={() => navigate(`/issues/${issue._id}`)}>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', fontFamily:'var(--f-display)' }}>{issue.title}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>📍 {issue.location?.address} · ▲ {issue.upvoteCount||0}</div>
              </div>
              <PriorityBadge priority={issue.priority} />
              <StatusBadge status={issue.status} />
              <button className="btn btn-sm" style={{ background:'rgba(34,197,94,0.15)', color:'#22c55e', border:'1px solid rgba(34,197,94,0.3)', borderRadius:'var(--r-sm)', flexShrink:0 }}
                onClick={async () => {
                  try { await updateStatus(issue._id, {status:'in_progress',message:'Escalated via admin'}); setQueue(q=>q.filter(x=>x._id!==issue._id)); toast(`Escalated: ${issue.ticketId}`); }
                  catch { toast('Failed','error'); }
                }}>{t.admin.escalate}</button>
            </div>
          ))
        }
      </div>
    </div>
  );
}