/**
 * AccountabilityDashboard.js
 * Full admin dashboard for deadline / penalty / accountability.
 * Place in: frontend/src/pages/admin/AccountabilityDashboard.js
 * Add route in App.js: <Route path="/admin/accountability" element={<AccountabilityDashboard />} />
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccountability } from '../../context/AccountabilityContext';
import { useToast } from '../../context/ToastContext';

// ── Grade colour helper ───────────────────────────────────────
const gradeColor = (grade) => ({
  Excellent: { bg:'rgba(34,197,94,.12)',  color:'#22c55e', border:'rgba(34,197,94,.3)'  },
  Good:      { bg:'rgba(6,182,212,.12)',  color:'#06b6d4', border:'rgba(6,182,212,.3)'  },
  Average:   { bg:'rgba(245,158,11,.12)', color:'#f59e0b', border:'rgba(245,158,11,.3)' },
  Poor:      { bg:'rgba(239,68,68,.12)',  color:'#ef4444', border:'rgba(239,68,68,.3)'  },
}[grade] || { bg:'rgba(255,255,255,.06)', color:'#94a3b8', border:'rgba(255,255,255,.1)' });

// ── KPI Card ─────────────────────────────────────────────────
function KpiCard({ label, value, icon, color, sub }) {
  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--glass-border)', borderRadius:'var(--r)', padding:'1.25rem', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:color }} />
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', fontFamily:'var(--f-display)' }}>{label}</div>
        <span style={{ fontSize:22 }}>{icon}</span>
      </div>
      <div style={{ fontSize:28, fontWeight:900, color, fontFamily:'var(--f-display)', lineHeight:1 }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:6 }}>{sub}</div>}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function AccountabilityDashboard() {
  const { dashboard, overdueIssues, officers, loading, loadDashboard, loadOverdue, addPenalty, resetPenalty } = useAccountability();
  const { toast }    = useToast();
  const navigate     = useNavigate();
  const [tab, setTab] = useState('overview'); // overview | overdue | officers

  useEffect(() => { loadDashboard(); loadOverdue(); }, []);

  const handleResetPenalty = async (officerId, name) => {
    if (!window.confirm(`Reset all penalty points for ${name}?`)) return;
    try {
      await resetPenalty(officerId);
      toast(`✅ Penalty points reset for ${name}`);
      loadDashboard();
    } catch { toast('Failed to reset', 'error'); }
  };

  const handleAddPenalty = async (officerId, name) => {
    const pts = window.prompt(`Add penalty points to ${name}:`, '5');
    if (!pts) return;
    try {
      await addPenalty(officerId, Number(pts), 'Manual by admin');
      toast(`✅ +${pts} points added to ${name}`);
      loadDashboard();
    } catch { toast('Failed', 'error'); }
  };

  return (
    <div className="page">

      {/* Header */}
      <div className="page-header fade-up">
        <div>
          <h1>Accountability Dashboard</h1>
          <p>Deadline tracking, penalty points, compensation & officer performance</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-glass btn-sm" onClick={() => { loadDashboard(); loadOverdue(); }}>🔄 Refresh</button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/admin/issues')}>All Issues →</button>
        </div>
      </div>

      {/* KPI Summary */}
      {dashboard && (
        <div className="grid-4 fade-up" style={{ marginBottom:'1.5rem' }}>
          <KpiCard label="Total Issues"       value={dashboard.totalIssues}        icon="📋" color="#6366f1" />
          <KpiCard label="Overdue Issues"     value={dashboard.overdueIssues}      icon="🔴" color="#ef4444" sub="Past deadline" />
          <KpiCard label="Total Penalty Pts"  value={dashboard.totalPenaltyPoints} icon="⚠️" color="#f59e0b" sub="Across all officers" />
          <KpiCard label="Suggested Comp."    value={`₹${dashboard.totalCompensation?.toLocaleString()}`} icon="💰" color="#22c55e" sub="₹100 per delay day" />
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:'1.25rem' }}>
        {[['overview','📊 Overview'],['overdue','🔴 Overdue Issues'],['officers','👷 Officer Scores']].map(([key,label]) => (
          <button key={key} className={`btn btn-sm ${tab===key?'btn-primary':'btn-glass'}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && (
        <div className="card fade-up">
          <div className="section-label">📊 System Overview</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'1rem' }}>
            {[
              { label:'Resolved Today',       value: dashboard?.resolvedToday || 0,        color:'#22c55e' },
              { label:'Overdue Rate',          value: dashboard && dashboard.totalIssues > 0 ? `${Math.round((dashboard.overdueIssues/dashboard.totalIssues)*100)}%` : '0%', color:'#ef4444' },
              { label:'Total Compensation',    value: `₹${(dashboard?.totalCompensation||0).toLocaleString()}`, color:'#f59e0b' },
              { label:'Active Officers',       value: officers.length,                      color:'#06b6d4' },
            ].map(s => (
              <div key={s.label} style={{ background:'var(--hover-bg)', borderRadius:'var(--r-sm)', padding:'1rem', border:'1px solid var(--glass-border)', textAlign:'center' }}>
                <div style={{ fontSize:24, fontWeight:800, color:s.color, fontFamily:'var(--f-display)' }}>{s.value}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4, textTransform:'uppercase', letterSpacing:'.05em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── OVERDUE TAB ── */}
      {tab === 'overdue' && (
        <div className="card fade-up">
          <div className="section-label">🔴 Overdue Issues ({overdueIssues.length})</div>
          {overdueIssues.length === 0 ? (
            <div style={{ textAlign:'center', padding:'2rem', color:'var(--text-muted)' }}>
              <div style={{ fontSize:40, marginBottom:10 }}>🎉</div>
              <div>No overdue issues — great work!</div>
            </div>
          ) : overdueIssues.map(issue => (
            <div key={issue._id} style={{ display:'flex', gap:14, alignItems:'flex-start', padding:'14px 0', borderBottom:'1px solid var(--border)' }}>
              <div style={{ flex:1, minWidth:0 }}>
                {/* Overdue badge */}
                <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:6, flexWrap:'wrap' }}>
                  <span style={{ background:'rgba(239,68,68,.15)', color:'#ef4444', border:'1px solid rgba(239,68,68,.3)', borderRadius:20, padding:'2px 10px', fontSize:11, fontWeight:700 }}>
                    🔴 OVERDUE — {issue.delayDays} day{issue.delayDays!==1?'s':''} late
                  </span>
                  <span style={{ fontSize:11, fontWeight:700, color:'#818cf8', fontFamily:'var(--f-display)' }}>{issue.ticketId}</span>
                </div>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', fontFamily:'var(--f-display)', marginBottom:4 }}>{issue.title}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)' }}>
                  📍 {issue.location?.address} &nbsp;·&nbsp;
                  👷 {issue.assignedTo?.name || 'Unassigned'} &nbsp;·&nbsp;
                  📅 Deadline: {new Date(issue.deadline).toLocaleDateString()}
                </div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#f59e0b' }}>₹{issue.compensation?.toLocaleString()}</div>
                <div style={{ fontSize:10, color:'var(--text-muted)' }}>suggested comp.</div>
                <button className="btn btn-glass btn-sm" style={{ marginTop:6 }}
                  onClick={() => navigate(`/issues/${issue._id}`)}>View →</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── OFFICERS TAB ── */}
      {tab === 'officers' && (
        <div className="card fade-up">
          <div className="section-label">👷 Officer Performance Scores</div>
          {officers.length === 0 ? (
            <div style={{ textAlign:'center', padding:'2rem', color:'var(--text-muted)' }}>No officers found.</div>
          ) : officers.map(officer => {
            const gc = gradeColor(officer.grade);
            const score = officer.accountabilityScore ?? 100;
            return (
              <div key={officer._id} style={{ display:'flex', gap:14, alignItems:'center', padding:'14px 0', borderBottom:'1px solid var(--border)', flexWrap:'wrap' }}>
                {/* Avatar */}
                <div style={{ width:42, height:42, borderRadius:'50%', background:'linear-gradient(135deg,#06b6d4,#6366f1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:800, color:'#fff', flexShrink:0 }}>
                  {officer.name?.[0]?.toUpperCase()}
                </div>

                <div style={{ flex:1, minWidth:160 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', fontFamily:'var(--f-display)' }}>{officer.name}</div>
                  <div style={{ fontSize:12, color:'var(--text-muted)' }}>🏛️ {officer.department}</div>

                  {/* Score bar */}
                  <div style={{ marginTop:8 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:11, color:'var(--text-muted)' }}>Accountability Score</span>
                      <span style={{ fontSize:11, fontWeight:700, color: score>=70?'#22c55e': score>=40?'#f59e0b':'#ef4444' }}>{score}%</span>
                    </div>
                    <div style={{ height:6, background:'rgba(255,255,255,.06)', borderRadius:6, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${score}%`, background: score>=70?'#22c55e': score>=40?'#f59e0b':'#ef4444', borderRadius:6, transition:'width .8s ease' }} />
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
                  <div style={{ textAlign:'center', minWidth:52 }}>
                    <div style={{ fontSize:16, fontWeight:800, color:'#6366f1', fontFamily:'var(--f-display)' }}>{officer.totalAssigned || 0}</div>
                    <div style={{ fontSize:9, color:'var(--text-muted)', textTransform:'uppercase' }}>Assigned</div>
                  </div>
                  <div style={{ textAlign:'center', minWidth:52 }}>
                    <div style={{ fontSize:16, fontWeight:800, color:'#22c55e', fontFamily:'var(--f-display)' }}>{officer.resolvedOnTime || 0}</div>
                    <div style={{ fontSize:9, color:'var(--text-muted)', textTransform:'uppercase' }}>On Time</div>
                  </div>
                  <div style={{ textAlign:'center', minWidth:52 }}>
                    <div style={{ fontSize:16, fontWeight:800, color:'#ef4444', fontFamily:'var(--f-display)' }}>{officer.penaltyPoints || 0}</div>
                    <div style={{ fontSize:9, color:'var(--text-muted)', textTransform:'uppercase' }}>Penalty Pts</div>
                  </div>

                  {/* Grade badge */}
                  <span style={{ background:gc.bg, color:gc.color, border:`1px solid ${gc.border}`, borderRadius:20, padding:'3px 12px', fontSize:11, fontWeight:700, fontFamily:'var(--f-display)' }}>
                    {officer.grade}
                  </span>

                  {/* Actions */}
                  <button className="btn btn-glass btn-sm" onClick={() => handleAddPenalty(officer._id, officer.name)}>+Penalty</button>
                  {officer.penaltyPoints > 0 && (
                    <button className="btn btn-sm" style={{ background:'rgba(34,197,94,.12)', color:'#22c55e', border:'1px solid rgba(34,197,94,.3)', borderRadius:'var(--r-sm)', fontSize:12, padding:'4px 10px' }}
                      onClick={() => handleResetPenalty(officer._id, officer.name)}>Reset</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}