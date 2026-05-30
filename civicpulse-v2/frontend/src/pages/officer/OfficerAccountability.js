/**
 * OfficerAccountability.js
 * Officer's personal accountability view — shows their
 * penalty points, score, assigned issues with deadline countdowns.
 *
 * Place in: frontend/src/pages/officer/OfficerAccountability.js
 * Add route in App.js:
 *   <Route path="/officer/accountability" element={<Guard roles={['department']}><OfficerAccountability /></Guard>} />
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import OverdueBadge from '../../components/OverdueBadge';
import api from '../../api';

// ── Countdown timer display ───────────────────────────────────
function DeadlineCountdown({ deadline }) {
  if (!deadline) return <span style={{ fontSize:12, color:'var(--text-muted)' }}>No deadline</span>;

  const now       = new Date();
  const deadlineD = new Date(deadline);
  const diffMs    = deadlineD - now;

  if (diffMs <= 0) {
    const days = Math.floor(Math.abs(diffMs) / 86400000);
    return (
      <span style={{ fontSize:12, fontWeight:700, color:'#ef4444' }}>
        🔴 {days} day{days !== 1 ? 's' : ''} overdue
      </span>
    );
  }

  const days    = Math.floor(diffMs / 86400000);
  const hours   = Math.floor((diffMs % 86400000) / 3600000);
  const color   = days === 0 ? '#ef4444' : days <= 1 ? '#f59e0b' : '#22c55e';

  return (
    <span style={{ fontSize:12, fontWeight:700, color }}>
      ⏱ {days > 0 ? `${days}d ` : ''}{hours}h remaining
    </span>
  );
}

// ── Score ring display ────────────────────────────────────────
function ScoreRing({ score }) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#06b6d4' : score >= 40 ? '#f59e0b' : '#ef4444';
  const grade = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Average' : 'Poor';

  return (
    <div style={{ textAlign:'center' }}>
      <div style={{
        width:         90, height:90,
        borderRadius:  '50%',
        background:    `conic-gradient(${color} ${score}%, rgba(255,255,255,.06) 0)`,
        display:       'flex', alignItems:'center', justifyContent:'center',
        margin:        '0 auto 8px',
        boxShadow:     `0 0 24px ${color}40`,
      }}>
        <div style={{ width:70, height:70, borderRadius:'50%', background:'var(--bg-card)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
          <div style={{ fontSize:18, fontWeight:900, color, fontFamily:'var(--f-display)', lineHeight:1 }}>{score}%</div>
        </div>
      </div>
      <div style={{ fontSize:12, fontWeight:700, color, fontFamily:'var(--f-display)' }}>{grade}</div>
      <div style={{ fontSize:11, color:'var(--text-muted)' }}>Accountability</div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function OfficerAccountability() {
  const { user }   = useAuth();
  const { toast }  = useToast();
  const navigate   = useNavigate();

  const [myIssues, setMyIssues] = useState([]);
  const [profile,  setProfile]  = useState(null);
  const [busy,     setBusy]     = useState(true);
  const [filter,   setFilter]   = useState('all'); // all | overdue | ontime

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setBusy(true);
    try {
      const [issueRes, profileRes] = await Promise.all([
        api.get('/admin/issues', { params: { assignedTo: user._id, limit: 50 } }),
        api.get('/auth/me'),
      ]);
      setMyIssues(issueRes.data.data || []);
      setProfile(profileRes.data.user);
    } catch (err) {
      toast('Failed to load data', 'error');
    }
    setBusy(false);
  };

  // Compute local stats from issues
  const now           = new Date();
  const overdueIssues = myIssues.filter(i => i.deadline && new Date(i.deadline) < now && !['resolved','closed','rejected'].includes(i.status));
  const onTimeIssues  = myIssues.filter(i => !['resolved','closed','rejected'].includes(i.status) && (!i.deadline || new Date(i.deadline) >= now));
  const resolved      = myIssues.filter(i => i.status === 'resolved');

  const score = profile?.totalAssigned > 0
    ? Math.round(((profile.resolvedOnTime || 0) / profile.totalAssigned) * 100)
    : 100;

  const filteredIssues = filter === 'overdue' ? overdueIssues
    : filter === 'ontime'  ? onTimeIssues
    : myIssues;

  return (
    <div className="page page-narrow">

      {/* Header */}
      <div className="page-header fade-up">
        <div>
          <h1>My Performance</h1>
          <p>🏛️ {user?.department}</p>
        </div>
        <button className="btn btn-glass btn-sm" onClick={loadData}>🔄 Refresh</button>
      </div>

      {/* Profile + Score hero */}
      <div className="card fade-up d1" style={{ marginBottom:'1.25rem', background:'linear-gradient(135deg,rgba(6,182,212,.06),rgba(99,102,241,.04))', borderColor:'rgba(6,182,212,.2)' }}>
        <div style={{ display:'flex', gap:20, alignItems:'center', flexWrap:'wrap' }}>

          {/* Avatar */}
          <div style={{ width:64, height:64, borderRadius:'50%', background:'linear-gradient(135deg,#06b6d4,#6366f1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, fontWeight:900, color:'#fff', flexShrink:0, boxShadow:'0 8px 24px rgba(6,182,212,.4)' }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>

          {/* Info */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:'var(--f-display)', fontSize:20, fontWeight:900, color:'var(--text-primary)', marginBottom:2 }}>{user?.name}</div>
            <div style={{ fontSize:13, color:'#06b6d4', marginBottom:10 }}>🦺 Field Officer</div>
            <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
              {[
                { label:'Assigned',   value: myIssues.length,    color:'#6366f1' },
                { label:'Resolved',   value: resolved.length,    color:'#22c55e' },
                { label:'Overdue',    value: overdueIssues.length, color:'#ef4444' },
                { label:'Penalty Pts',value: profile?.penaltyPoints || 0, color:'#f59e0b' },
              ].map(s => (
                <div key={s.label} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:20, fontWeight:800, color:s.color, fontFamily:'var(--f-display)', lineHeight:1 }}>{s.value}</div>
                  <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:3, textTransform:'uppercase', letterSpacing:'.04em' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Score ring */}
          <ScoreRing score={score} />
        </div>

        {/* Penalty warning */}
        {(profile?.penaltyPoints || 0) > 0 && (
          <div style={{ marginTop:'1rem', background:'rgba(245,158,11,.08)', border:'1px solid rgba(245,158,11,.25)', borderRadius:'var(--r-sm)', padding:'10px 14px', fontSize:13, color:'#fbbf24' }}>
            ⚠️ You have <strong>{profile.penaltyPoints}</strong> penalty point{profile.penaltyPoints !== 1 ? 's' : ''}.
            Resolve overdue issues on time to avoid further penalties.
          </div>
        )}
      </div>

      {/* Penalty rules info */}
      <div className="card fade-up d2" style={{ marginBottom:'1.25rem' }}>
        <div className="section-label">📋 Penalty & Accountability Rules</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:10 }}>
          {[
            { icon:'⏱', label:'1 day late',       value:'+5 pts',    color:'#f59e0b' },
            { icon:'🔴', label:'3+ days late',     value:'+15 pts',   color:'#ef4444' },
            { icon:'💰', label:'Compensation',      value:'₹100/day',  color:'#818cf8' },
            { icon:'📊', label:'Score formula',    value:'OnTime/Total × 100', color:'#22c55e' },
          ].map(r => (
            <div key={r.label} style={{ background:'var(--hover-bg)', border:'1px solid var(--glass-border)', borderRadius:'var(--r-sm)', padding:'12px 14px', textAlign:'center' }}>
              <div style={{ fontSize:22, marginBottom:6 }}>{r.icon}</div>
              <div style={{ fontSize:13, fontWeight:700, color:r.color, fontFamily:'var(--f-display)' }}>{r.value}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>{r.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Issues list with deadlines */}
      <div className="card fade-up d3">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
          <div className="section-label" style={{ margin:0 }}>📋 My Issues ({filteredIssues.length})</div>
          <div style={{ display:'flex', gap:6 }}>
            {[['all','All'],['overdue','🔴 Overdue'],['ontime','✅ On Track']].map(([key,label]) => (
              <button key={key} className={`btn btn-sm ${filter===key?'btn-primary':'btn-glass'}`}
                onClick={() => setFilter(key)} style={{ fontSize:11 }}>{label}</button>
            ))}
          </div>
        </div>

        {busy ? (
          <div style={{ textAlign:'center', padding:'2rem', color:'var(--text-muted)' }}>Loading…</div>
        ) : filteredIssues.length === 0 ? (
          <div style={{ textAlign:'center', padding:'2rem', color:'var(--text-muted)' }}>
            <div style={{ fontSize:36, marginBottom:10 }}>🎉</div>
            <div>No {filter === 'overdue' ? 'overdue' : ''} issues found.</div>
          </div>
        ) : filteredIssues.map(issue => (
          <div key={issue._id} style={{ padding:'14px 0', borderBottom:'1px solid var(--border)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, marginBottom:8 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#818cf8', fontFamily:'var(--f-display)', marginBottom:3 }}>{issue.ticketId}</div>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', fontFamily:'var(--f-display)' }}>{issue.title}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>📍 {issue.location?.address}</div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:4, alignItems:'flex-end', flexShrink:0 }}>
                <OverdueBadge issue={issue} />
                <DeadlineCountdown deadline={issue.deadline} />
              </div>
            </div>

            {/* Deadline bar */}
            {issue.deadline && !['resolved','closed','rejected'].includes(issue.status) && (
              <div style={{ marginBottom:8 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, fontSize:11, color:'var(--text-muted)' }}>
                  <span>Assigned: {new Date(issue.createdAt).toLocaleDateString()}</span>
                  <span>Deadline: {new Date(issue.deadline).toLocaleDateString()}</span>
                </div>
                <div style={{ height:5, background:'rgba(255,255,255,.06)', borderRadius:5, overflow:'hidden' }}>
                  <div style={{
                    height:    '100%',
                    width:     (() => {
                      const total   = new Date(issue.deadline) - new Date(issue.createdAt);
                      const elapsed = new Date() - new Date(issue.createdAt);
                      return `${Math.min(Math.round((elapsed / total) * 100), 100)}%`;
                    })(),
                    background: new Date() > new Date(issue.deadline) ? '#ef4444' : '#22c55e',
                    borderRadius: 5,
                    transition: 'width .5s ease',
                  }} />
                </div>
              </div>
            )}

            {/* Action */}
            <div style={{ display:'flex', gap:6, marginTop:6 }}>
              <button className="btn btn-glass btn-sm" onClick={() => navigate(`/issues/${issue._id}`)}>View Details →</button>
              {issue.penaltyPointsAdded > 0 && (
                <span style={{ fontSize:11, color:'#f87171', display:'flex', alignItems:'center', gap:4 }}>
                  ⚠️ +{issue.penaltyPointsAdded} pts penalty
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}