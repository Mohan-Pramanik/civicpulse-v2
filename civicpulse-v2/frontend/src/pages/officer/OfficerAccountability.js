/**
 * OfficerAccountability.js
 * - Dept Head → Team Accountability Dashboard (all officers in dept)
 * - Field Officer → Personal performance view
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import OverdueBadge from '../../components/OverdueBadge';
import api from '../../api';

// ─────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 90 }) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#06b6d4' : score >= 40 ? '#f59e0b' : '#ef4444';
  const grade = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Average' : 'Poor';
  const inner = size * 0.78;
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: `conic-gradient(${color} ${score}%, rgba(255,255,255,.06) 0)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 6px', boxShadow: `0 0 24px ${color}40`,
      }}>
        <div style={{ width: inner, height: inner, borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: size * 0.2, fontWeight: 900, color, fontFamily: 'var(--f-display)', lineHeight: 1 }}>{score}%</div>
        </div>
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color, fontFamily: 'var(--f-display)' }}>{grade}</div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Score</div>
    </div>
  );
}

function DeadlineCountdown({ deadline }) {
  if (!deadline) return <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No deadline</span>;
  const diffMs = new Date(deadline) - new Date();
  if (diffMs <= 0) {
    const days = Math.floor(Math.abs(diffMs) / 86400000);
    return <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444' }}>🔴 {days}d overdue</span>;
  }
  const days = Math.floor(diffMs / 86400000);
  const hours = Math.floor((diffMs % 86400000) / 3600000);
  const color = days === 0 ? '#ef4444' : days <= 1 ? '#f59e0b' : '#22c55e';
  return <span style={{ fontSize: 12, fontWeight: 700, color }}>⏱ {days > 0 ? `${days}d ` : ''}{hours}h left</span>;
}

function StatPill({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 800, color, fontFamily: 'var(--f-display)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DEPT HEAD VIEW — Team Accountability Dashboard
// ─────────────────────────────────────────────────────────────
function OfficerCard({ officer, issues, onSelect, selected }) {
  const now = new Date();
  const mine = issues.filter(i => String(i.assignedTo?._id || i.assignedTo) === String(officer._id));
  const overdue = mine.filter(i => i.deadline && new Date(i.deadline) < now && !['resolved','closed','rejected'].includes(i.status));
  const resolved = mine.filter(i => i.status === 'resolved');
  const score = officer.totalAssigned > 0 ? Math.round(((officer.resolvedOnTime || 0) / officer.totalAssigned) * 100) : 100;
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#06b6d4' : score >= 40 ? '#f59e0b' : '#ef4444';
  const owed = officer.compensationOwed || 0;

  return (
    <div
      onClick={() => onSelect(selected ? null : officer._id)}
      style={{
        background: selected ? 'rgba(99,102,241,.08)' : 'var(--bg-card)',
        border: `1px solid ${selected ? 'rgba(99,102,241,.4)' : 'var(--glass-border)'}`,
        borderRadius: 'var(--r)', padding: '1.25rem', cursor: 'pointer',
        transition: 'all .2s', position: 'relative', overflow: 'hidden',
      }}
    >
      {/* top accent */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color }} />

      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        {/* Avatar */}
        <div style={{
          width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, ${color}99, ${color}33)`,
          border: `2px solid ${color}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 900, color,
        }}>
          {officer.name?.[0]?.toUpperCase()}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--f-display)' }}>{officer.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>{officer.email}</div>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <StatPill label="Assigned" value={mine.length} color="#6366f1" />
            <StatPill label="Resolved" value={resolved.length} color="#22c55e" />
            <StatPill label="Overdue" value={overdue.length} color={overdue.length > 0 ? '#ef4444' : 'var(--text-muted)'} />
            <StatPill label="Penalty Pts" value={officer.penaltyPoints || 0} color={officer.penaltyPoints > 0 ? '#f59e0b' : 'var(--text-muted)'} />
          </div>
        </div>

        {/* Score ring */}
        <ScoreRing score={score} size={72} />
      </div>

      {/* Compensation owed warning */}
      {owed > 0 && (
        <div style={{ marginTop: 12, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 8, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#ef4444' }}>💸 Compensation owed to govt</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#ef4444', fontFamily: 'var(--f-display)' }}>₹{owed.toLocaleString('en-IN')}</span>
        </div>
      )}

      {/* Score bar */}
      <div style={{ marginTop: 12 }}>
        <div style={{ height: 5, background: 'rgba(255,255,255,.06)', borderRadius: 5, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 5, transition: 'width .8s ease' }} />
        </div>
      </div>

      {/* Expand hint */}
      <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>
        {selected ? '▲ Hide issues' : '▼ View issues'}
      </div>
    </div>
  );
}

function OfficerIssues({ officerId, issues }) {
  const now = new Date();
  const mine = issues.filter(i => String(i.assignedTo?._id || i.assignedTo) === String(officerId));
  const navigate = useNavigate();

  if (mine.length === 0) return (
    <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: 13 }}>No issues assigned.</div>
  );

  return (
    <div style={{ marginTop: 4, borderTop: '1px solid var(--border)' }}>
      {mine.map(issue => {
        const isOverdue = issue.deadline && new Date(issue.deadline) < now && !['resolved','closed','rejected'].includes(issue.status);
        return (
          <div key={issue._id} style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', marginBottom: 2 }}>{issue.ticketId}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--f-display)' }}>{issue.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>📍 {issue.location?.address}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                <OverdueBadge issue={issue} />
                <DeadlineCountdown deadline={issue.deadline} />
              </div>
            </div>

            {issue.deadline && !['resolved','closed','rejected'].includes(issue.status) && (
              <div style={{ marginTop: 8, marginBottom: 6 }}>
                <div style={{ height: 4, background: 'rgba(255,255,255,.06)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: (() => {
                      const total = new Date(issue.deadline) - new Date(issue.createdAt);
                      const elapsed = new Date() - new Date(issue.createdAt);
                      return `${Math.min(Math.round((elapsed / total) * 100), 100)}%`;
                    })(),
                    background: isOverdue ? '#ef4444' : '#22c55e',
                    borderRadius: 4, transition: 'width .5s ease',
                  }} />
                </div>
              </div>
            )}

            <button className="btn btn-glass btn-sm" style={{ marginTop: 4, fontSize: 11 }}
              onClick={(e) => { e.stopPropagation(); navigate(`/issues/${issue._id}`); }}>
              View Details →
            </button>
          </div>
        );
      })}
    </div>
  );
}

function DeptHeadView({ user }) {
  const { toast } = useToast();
  const [officers, setOfficers] = useState([]);
  const [issues, setIssues] = useState([]);
  const [busy, setBusy] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [tab, setTab] = useState('all'); // all | overdue | top

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [offRes, issRes] = await Promise.all([
        api.get('/admin/my-officers'),
        api.get('/admin/issues', { params: { limit: 200 } }),
      ]);
      setOfficers(offRes.data.data || []);
      setIssues(issRes.data.data || []);
    } catch {
      toast('Failed to load team data', 'error');
    }
    setBusy(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const now = new Date();

  // Enrich each officer with their issue counts for filtering/sorting
  const enriched = officers.map(o => {
    const mine = issues.filter(i => String(i.assignedTo?._id || i.assignedTo) === String(o._id));
    const overdue = mine.filter(i => i.deadline && new Date(i.deadline) < now && !['resolved','closed','rejected'].includes(i.status));
    const score = o.totalAssigned > 0 ? Math.round(((o.resolvedOnTime || 0) / o.totalAssigned) * 100) : 100;
    return { ...o, _mine: mine.length, _overdue: overdue.length, _score: score };
  });

  const filtered = tab === 'overdue'
    ? enriched.filter(o => o._overdue > 0).sort((a, b) => b._overdue - a._overdue)
    : tab === 'top'
    ? [...enriched].sort((a, b) => b._score - a._score)
    : enriched;

  // Team summary stats
  const totalOverdue = enriched.reduce((s, o) => s + o._overdue, 0);
  const totalOwed = enriched.reduce((s, o) => s + (o.compensationOwed || 0), 0);
  const totalPenalty = enriched.reduce((s, o) => s + (o.penaltyPoints || 0), 0);
  const avgScore = enriched.length > 0 ? Math.round(enriched.reduce((s, o) => s + o._score, 0) / enriched.length) : 100;

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header fade-up">
        <div>
          <h1>Team Accountability</h1>
          <p>🏛️ {user?.department} — {officers.length} officer{officers.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-glass btn-sm" onClick={load}>🔄 Refresh</button>
      </div>

      {/* Team KPI Summary */}
      <div className="grid-4 fade-up" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Officers', value: officers.length, icon: '👷', color: '#6366f1', glow: 'rgba(99,102,241,.3)' },
          { label: 'Overdue Issues', value: totalOverdue, icon: '🔴', color: '#ef4444', glow: 'rgba(239,68,68,.3)' },
          { label: 'Avg Score', value: `${avgScore}%`, icon: '📊', color: avgScore >= 70 ? '#22c55e' : '#f59e0b', glow: 'rgba(34,197,94,.3)' },
          { label: 'Total Compensation', value: `₹${totalOwed.toLocaleString('en-IN')}`, icon: '💸', color: totalOwed > 0 ? '#ef4444' : '#22c55e', glow: 'rgba(239,68,68,.2)' },
        ].map((k, i) => (
          <div key={k.label} className="metric-card fade-up" style={{ animationDelay: `${i * 0.08}s` }}>
            <div className="metric-card-glow" style={{ background: k.glow }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="metric-label">{k.label}</div>
              <span style={{ fontSize: 22 }}>{k.icon}</span>
            </div>
            <div className="metric-value" style={{ color: k.color, textShadow: `0 0 20px ${k.glow}`, fontSize: 28 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Total penalty info bar */}
      {totalPenalty > 0 && (
        <div className="fade-up" style={{ marginBottom: '1rem', background: 'rgba(245,158,11,.07)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 'var(--r-sm)', padding: '10px 16px', display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <span style={{ fontSize: 13, color: '#fbbf24' }}>Your team has accumulated <strong>{totalPenalty}</strong> total penalty points. Address overdue issues immediately to avoid further compensation deductions.</span>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
        {[['all', '👥 All Officers'], ['overdue', '🔴 Has Overdue'], ['top', '🏆 By Score']].map(([key, label]) => (
          <button key={key} className={`btn btn-sm ${tab === key ? 'btn-primary' : 'btn-glass'}`}
            onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {/* Officer Cards */}
      {busy ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading team data…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
          <div>{tab === 'overdue' ? 'No officers with overdue issues!' : 'No officers found.'}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filtered.map(officer => (
            <div key={officer._id} className="fade-up">
              <OfficerCard
                officer={officer}
                issues={issues}
                selected={selectedId === officer._id}
                onSelect={setSelectedId}
              />
              {selectedId === officer._id && (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderTop: 'none', borderRadius: '0 0 var(--r) var(--r)', padding: '0 1.25rem 1rem' }}>
                  <OfficerIssues officerId={officer._id} issues={issues} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FIELD OFFICER VIEW — Personal performance
// ─────────────────────────────────────────────────────────────
function FieldOfficerView({ user }) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [myIssues, setMyIssues] = useState([]);
  const [profile, setProfile] = useState(null);
  const [busy, setBusy] = useState(true);
  const [filter, setFilter] = useState('all');

  const loadData = useCallback(async () => {
    setBusy(true);
    try {
      const [issueRes, profileRes] = await Promise.all([
        api.get('/admin/issues', { params: { assignedTo: user._id, limit: 50 } }),
        api.get('/auth/me'),
      ]);
      setMyIssues(issueRes.data.data || []);
      setProfile(profileRes.data.user);
    } catch {
      toast('Failed to load data', 'error');
    }
    setBusy(false);
  }, [user._id]);

  useEffect(() => { loadData(); }, [loadData]);

  const now = new Date();
  const overdueIssues = myIssues.filter(i => i.deadline && new Date(i.deadline) < now && !['resolved','closed','rejected'].includes(i.status));
  const onTimeIssues  = myIssues.filter(i => !['resolved','closed','rejected'].includes(i.status) && (!i.deadline || new Date(i.deadline) >= now));
  const resolved      = myIssues.filter(i => i.status === 'resolved');
  const score = profile?.totalAssigned > 0 ? Math.round(((profile.resolvedOnTime || 0) / profile.totalAssigned) * 100) : 100;
  const owed = profile?.compensationOwed || 0;

  const filteredIssues = filter === 'overdue' ? overdueIssues : filter === 'ontime' ? onTimeIssues : myIssues;

  return (
    <div className="page page-narrow">
      <div className="page-header fade-up">
        <div><h1>My Performance</h1><p>🏛️ {user?.department}</p></div>
        <button className="btn btn-glass btn-sm" onClick={loadData}>🔄 Refresh</button>
      </div>

      {/* Hero card */}
      <div className="card fade-up d1" style={{ marginBottom: '1.25rem', background: 'linear-gradient(135deg,rgba(6,182,212,.06),rgba(99,102,241,.04))', borderColor: 'rgba(6,182,212,.2)' }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#06b6d4,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 900, color: '#fff', flexShrink: 0, boxShadow: '0 8px 24px rgba(6,182,212,.4)' }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--f-display)', fontSize: 20, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 2 }}>{user?.name}</div>
            <div style={{ fontSize: 13, color: '#06b6d4', marginBottom: 10 }}>🦺 Field Officer</div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <StatPill label="Assigned"    value={myIssues.length}       color="#6366f1" />
              <StatPill label="Resolved"    value={resolved.length}       color="#22c55e" />
              <StatPill label="Overdue"     value={overdueIssues.length}  color={overdueIssues.length > 0 ? '#ef4444' : 'var(--text-muted)'} />
              <StatPill label="Penalty Pts" value={profile?.penaltyPoints || 0} color={(profile?.penaltyPoints || 0) > 0 ? '#f59e0b' : 'var(--text-muted)'} />
            </div>
          </div>
          <ScoreRing score={score} />
        </div>

        {(profile?.penaltyPoints || 0) > 0 && (
          <div style={{ marginTop: '1rem', background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.25)', borderRadius: 'var(--r-sm)', padding: '10px 14px', fontSize: 13, color: '#fbbf24' }}>
            ⚠️ You have <strong>{profile.penaltyPoints}</strong> penalty point{profile.penaltyPoints !== 1 ? 's' : ''}. Resolve overdue issues to avoid further deductions.
          </div>
        )}

        {owed > 0 && (
          <div style={{ marginTop: '0.75rem', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)', borderRadius: 'var(--r-sm)', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#ef4444' }}>💸 Compensation owed to government</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#ef4444', fontFamily: 'var(--f-display)' }}>₹{owed.toLocaleString('en-IN')}</span>
          </div>
        )}
      </div>

      {/* Rules */}
      <div className="card fade-up d2" style={{ marginBottom: '1.25rem' }}>
        <div className="section-label">📋 Penalty & Accountability Rules</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10 }}>
          {[
            { icon: '⏱', label: '1 day late', value: '+5 pts', color: '#f59e0b' },
            { icon: '🔴', label: '3+ days late', value: '+15 pts', color: '#ef4444' },
            { icon: '💰', label: 'Compensation', value: '₹100/day', color: '#818cf8' },
            { icon: '📊', label: 'Score formula', value: 'OnTime/Total × 100', color: '#22c55e' },
          ].map(r => (
            <div key={r.label} style={{ background: 'var(--hover-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--r-sm)', padding: '12px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{r.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: r.color, fontFamily: 'var(--f-display)' }}>{r.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{r.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Issues */}
      <div className="card fade-up d3">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div className="section-label" style={{ margin: 0 }}>📋 My Issues ({filteredIssues.length})</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[['all', 'All'], ['overdue', '🔴 Overdue'], ['ontime', '✅ On Track']].map(([key, label]) => (
              <button key={key} className={`btn btn-sm ${filter === key ? 'btn-primary' : 'btn-glass'}`}
                onClick={() => setFilter(key)} style={{ fontSize: 11 }}>{label}</button>
            ))}
          </div>
        </div>

        {busy ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading…</div>
        ) : filteredIssues.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🎉</div>
            <div>No {filter === 'overdue' ? 'overdue' : ''} issues found.</div>
          </div>
        ) : filteredIssues.map(issue => {
          const isOverdue = issue.deadline && new Date(issue.deadline) < now && !['resolved','closed','rejected'].includes(issue.status);
          return (
            <div key={issue._id} style={{ padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', fontFamily: 'var(--f-display)', marginBottom: 3 }}>{issue.ticketId}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--f-display)' }}>{issue.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>📍 {issue.location?.address}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', flexShrink: 0 }}>
                  <OverdueBadge issue={issue} />
                  <DeadlineCountdown deadline={issue.deadline} />
                </div>
              </div>

              {issue.deadline && !['resolved','closed','rejected'].includes(issue.status) && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                    <span>Assigned: {new Date(issue.createdAt).toLocaleDateString()}</span>
                    <span>Deadline: {new Date(issue.deadline).toLocaleDateString()}</span>
                  </div>
                  <div style={{ height: 5, background: 'rgba(255,255,255,.06)', borderRadius: 5, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: (() => {
                        const total = new Date(issue.deadline) - new Date(issue.createdAt);
                        const elapsed = new Date() - new Date(issue.createdAt);
                        return `${Math.min(Math.round((elapsed / total) * 100), 100)}%`;
                      })(),
                      background: isOverdue ? '#ef4444' : '#22c55e',
                      borderRadius: 5, transition: 'width .5s ease',
                    }} />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <button className="btn btn-glass btn-sm" onClick={() => navigate(`/issues/${issue._id}`)}>View Details →</button>
                {issue.penaltyPointsAdded > 0 && (
                  <span style={{ fontSize: 11, color: '#f87171', display: 'flex', alignItems: 'center', gap: 4 }}>
                    ⚠️ +{issue.penaltyPointsAdded} pts
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Root — routes based on isHead
// ─────────────────────────────────────────────────────────────
export default function OfficerAccountability() {
  const { user } = useAuth();
  if (!user) return null;
  return user.isHead
    ? <DeptHeadView user={user} />
    : <FieldOfficerView user={user} />;
}