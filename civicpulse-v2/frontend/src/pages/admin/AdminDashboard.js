import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminStats, updateStatus, assignIssue, getAdminIssues } from '../../api';
import { useToast } from '../../context/ToastContext';
import { Spinner, StatusBadge, PriorityBadge } from '../../components/common';

export default function AdminDashboard() {
  const [stats,  setStats]  = useState(null);
  const [queue,  setQueue]  = useState([]);
  const [busy,   setBusy]   = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      getAdminStats(),
      getAdminIssues({ priority:'critical', status:'pending', limit:5 })
    ]).then(([s, q]) => {
      setStats(s.data);
      setQueue(q.data.data || []);
    }).catch(()=>{}).finally(()=>setBusy(false));
  }, []);

  if (busy) return <div className="page"><Spinner /></div>;
  if (!stats) return null;

  const { kpis, byCategory, byDept, trend, topAreas, satisfaction } = stats;
  const maxCat = Math.max(...(byCategory||[]).map(c=>c.count), 1);
  const maxTrend = Math.max(...(trend||[]).map(t=>t.reported), 1);

  return (
    <div className="page">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700 }}>Admin Dashboard</h1>
          <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:2 }}>KMC Control Centre · Real-time analytics</p>
        </div>
        <span className="badge badge-green" style={{ padding:'5px 12px' }}>● Live</span>
      </div>

      {/* KPI Cards */}
      <div className="grid-4" style={{ marginBottom:'1.25rem' }}>
        {[
          { label:'Total Reports', value:kpis.total, sub:'all time', color:'var(--text-primary)' },
          { label:'Resolved', value:kpis.resolved, sub:`${kpis.resolutionRate}% rate`, color:'var(--green)' },
          { label:'In Progress', value:kpis.inProgress, sub:`avg ${kpis.avgResolutionDays}d to resolve`, color:'var(--amber)' },
          { label:'Pending', value:kpis.pending, sub:`${kpis.critical} critical`, color:'var(--red)' },
        ].map(k => (
          <div key={k.label} className="card metric-card">
            <div className="metric-label">{k.label}</div>
            <div className="metric-value" style={{ color:k.color }}>{k.value}</div>
            <div className="metric-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginBottom:'1.25rem' }}>
        {/* Category breakdown */}
        <div className="card">
          <div className="section-label">Issues by Category</div>
          {(byCategory||[]).map(c => (
            <div key={c._id} style={{ marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:13, color:'var(--text-secondary)', textTransform:'capitalize' }}>{c._id}</span>
                <span style={{ fontSize:13, fontWeight:600 }}>{c.count}</span>
              </div>
              <div className="progress">
                <div className="progress-bar" style={{ width:`${(c.count/maxCat)*100}%`, background:'var(--green)' }} />
              </div>
            </div>
          ))}
        </div>

        {/* 7-day trend chart */}
        <div className="card">
          <div className="section-label">7-Day Trend</div>
          <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:120, paddingTop:10 }}>
            {(trend||[]).map((t,i) => (
              <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                <div style={{ fontSize:10, color:'var(--green)', fontWeight:600 }}>{t.resolved}</div>
                <div style={{ width:'100%', display:'flex', gap:2 }}>
                  <div style={{ flex:1, background:'var(--green)', borderRadius:'3px 3px 0 0', height:`${(t.reported/maxTrend)*90}px`, minHeight:4 }} title={`Reported: ${t.reported}`} />
                  <div style={{ flex:1, background:'var(--green-light)', borderRadius:'3px 3px 0 0', height:`${(t.resolved/maxTrend)*90}px`, minHeight:4 }} title={`Resolved: ${t.resolved}`} />
                </div>
                <div style={{ fontSize:9, color:'var(--text-muted)' }}>{t._id?.slice(5)}</div>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:16, marginTop:8 }}>
            <span style={{ fontSize:11, display:'flex', alignItems:'center', gap:4, color:'var(--text-muted)' }}>
              <span style={{ width:10, height:10, background:'var(--green)', borderRadius:2, display:'inline-block' }} /> Reported
            </span>
            <span style={{ fontSize:11, display:'flex', alignItems:'center', gap:4, color:'var(--text-muted)' }}>
              <span style={{ width:10, height:10, background:'var(--green-light)', borderRadius:2, display:'inline-block' }} /> Resolved
            </span>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom:'1.25rem' }}>
        {/* Top areas */}
        <div className="card">
          <div className="section-label">Top Hotspot Areas</div>
          {(topAreas||[]).map((a,i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid var(--border)' }}>
              <span style={{ fontSize:13, color:'var(--text-secondary)' }}>
                {i===0?'🔴':i===1?'🟠':'🟡'} {a._id || 'Unknown'}
              </span>
              <span style={{ fontSize:13, fontWeight:600 }}>{a.count} issues</span>
            </div>
          ))}
        </div>

        {/* Satisfaction */}
        <div className="card">
          <div className="section-label">Citizen Satisfaction</div>
          <div style={{ textAlign:'center', padding:'1.5rem 0' }}>
            <div style={{ fontSize:48 }}>{'⭐'.repeat(Math.round(satisfaction.avg||0))}</div>
            <div style={{ fontSize:28, fontWeight:700, color:'var(--green)', marginTop:8 }}>
              {satisfaction.avg ? satisfaction.avg.toFixed(1) : 'N/A'}
            </div>
            <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>
              Based on {satisfaction.count} ratings
            </div>
          </div>
          <div style={{ display:'flex', gap:8, marginTop:8 }}>
            <button className="btn btn-outline btn-sm btn-full" onClick={() => navigate('/admin/issues')}>
              View All Issues
            </button>
          </div>
        </div>
      </div>

      {/* High-priority queue */}
      <div className="card">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div className="section-label" style={{ margin:0 }}>🚨 High-Priority Queue</div>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/admin/issues?priority=critical')}>
            View all →
          </button>
        </div>
        {queue.length === 0
          ? <p style={{ fontSize:13, color:'var(--text-muted)', textAlign:'center', padding:'1rem' }}>No critical issues pending 🎉</p>
          : queue.map(issue => (
            <div key={issue._id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
              <div style={{ flex:1, cursor:'pointer' }} onClick={() => navigate(`/issues/${issue._id}`)}>
                <div style={{ fontSize:14, fontWeight:600 }}>{issue.title}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
                  📍 {issue.location?.address} · ▲ {issue.upvoteCount || 0} upvotes
                </div>
              </div>
              <PriorityBadge priority={issue.priority} />
              <StatusBadge status={issue.status} />
              <button className="btn btn-primary btn-sm" onClick={async () => {
                try {
                  await updateStatus(issue._id, { status:'in_progress', message:'Escalated via admin dashboard' });
                  setQueue(q => q.filter(x => x._id !== issue._id));
                  toast(`Issue escalated: ${issue.ticketId || issue._id}`);
                } catch { toast('Failed', 'error'); }
              }}>Escalate</button>
            </div>
          ))
        }
      </div>
    </div>
  );
}
