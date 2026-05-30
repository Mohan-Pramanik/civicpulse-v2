/**
 * AssignWithDeadline.js
 * Modal that lets a dept head assign an issue to an officer
 * AND set a deadline in days.
 *
 * Place in: frontend/src/components/AssignWithDeadline.js
 *
 * Usage in DepartmentHeadDashboard:
 *   <AssignWithDeadline
 *     issue={selectedIssue}
 *     officers={officers}
 *     onClose={() => setAssignOpen(false)}
 *     onAssigned={(updatedIssue) => handleIssueUpdate(updatedIssue)}
 *   />
 */

import React, { useState } from 'react';
import { useAccountability } from '../context/AccountabilityContext';
import { useToast } from '../context/ToastContext';

// Deadline preset options
const DEADLINE_PRESETS = [
  { label: '1 Day',   days: 1,  color: '#ef4444' },
  { label: '2 Days',  days: 2,  color: '#f59e0b' },
  { label: '3 Days',  days: 3,  color: '#f59e0b' },
  { label: '5 Days',  days: 5,  color: '#06b6d4' },
  { label: '7 Days',  days: 7,  color: '#22c55e' },
  { label: 'Custom',  days: 0,  color: '#8b5cf6' },
];

export default function AssignWithDeadline({ issue, officers, onClose, onAssigned }) {
  const [selectedOfficer, setSelectedOfficer] = useState('');
  const [selectedPreset,  setSelectedPreset]  = useState(null);
  const [customDays,      setCustomDays]       = useState('');
  const [busy,            setBusy]             = useState(false);
  const [err,             setErr]              = useState('');

  const { assignWithDeadline } = useAccountability();
  const { toast } = useToast();

  const deadlineDays = selectedPreset?.days === 0
    ? Number(customDays)
    : selectedPreset?.days;

  const deadlineDate = deadlineDays
    ? new Date(Date.now() + deadlineDays * 86400000).toDateString()
    : null;

  const handleSubmit = async () => {
    if (!selectedOfficer) { setErr('Please select an officer.'); return; }
    if (!deadlineDays || deadlineDays < 1) { setErr('Please set a valid deadline.'); return; }

    setBusy(true); setErr('');
    try {
      const updated = await assignWithDeadline(issue._id, selectedOfficer, deadlineDays);
      toast(`✅ Assigned with ${deadlineDays}-day deadline!`);
      onAssigned(updated);
      onClose();
    } catch (e) {
      setErr(e.response?.data?.message || 'Assignment failed.');
    }
    setBusy(false);
  };

  return (
    <div
      style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.78)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}
      onClick={onClose}
    >
      <div
        style={{ background:'var(--bg-card)', border:'1px solid var(--glass-border)', borderRadius:'var(--r)', padding:'1.75rem', width:'100%', maxWidth:480, boxShadow:'0 24px 64px rgba(0,0,0,0.6)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.25rem' }}>
          <div>
            <div style={{ fontFamily:'var(--f-display)', fontSize:17, fontWeight:800, color:'var(--text-primary)' }}>
              👷 Assign with Deadline
            </div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:3, maxWidth:340, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {issue?.ticketId} — {issue?.title}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-muted)', fontSize:20, cursor:'pointer' }}>✕</button>
        </div>

        {err && (
          <div className="alert alert-error" style={{ marginBottom:'1rem' }}>⚠️ {err}</div>
        )}

        {/* Officer select */}
        <div className="form-group">
          <label className="form-label">Select Field Officer *</label>
          <select
            className="form-control"
            value={selectedOfficer}
            onChange={e => setSelectedOfficer(e.target.value)}
          >
            <option value="">Choose officer…</option>
            {officers.map(o => (
              <option key={o._id} value={o._id}>
                {o.name} — {o.penaltyPoints || 0} penalty pts | Score: {o.accountabilityScore ?? 100}%
              </option>
            ))}
          </select>
        </div>

        {/* Deadline presets */}
        <div className="form-group">
          <label className="form-label">Set Deadline *</label>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:10 }}>
            {DEADLINE_PRESETS.map(preset => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setSelectedPreset(preset)}
                style={{
                  padding:      '6px 14px',
                  borderRadius: 20,
                  border:       `2px solid ${selectedPreset?.label === preset.label ? preset.color : 'var(--glass-border)'}`,
                  background:   selectedPreset?.label === preset.label ? `${preset.color}18` : 'transparent',
                  color:        selectedPreset?.label === preset.label ? preset.color : 'var(--text-muted)',
                  fontSize:     12,
                  fontWeight:   700,
                  cursor:       'pointer',
                  transition:   'all .15s',
                  fontFamily:   'var(--f-display)',
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom days input */}
          {selectedPreset?.days === 0 && (
            <div className="input-wrap" style={{ marginTop:8 }}>
              <span className="input-icon">📅</span>
              <input
                className="form-control"
                type="number"
                min="1"
                max="30"
                placeholder="Enter number of days…"
                value={customDays}
                onChange={e => setCustomDays(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Deadline summary */}
        {deadlineDays > 0 && deadlineDate && (
          <div style={{
            background:   'rgba(99,102,241,.08)',
            border:       '1px solid rgba(99,102,241,.25)',
            borderRadius: 'var(--r-sm)',
            padding:      '10px 14px',
            marginBottom: '1rem',
            fontSize:     13,
          }}>
            <span style={{ color:'#818cf8', fontWeight:700 }}>📅 Deadline: </span>
            <span style={{ color:'var(--text-primary)' }}>{deadlineDate}</span>
            <span style={{ color:'var(--text-muted)', marginLeft:8 }}>({deadlineDays} day{deadlineDays !== 1 ? 's' : ''} from now)</span>
          </div>
        )}

        {/* Penalty info */}
        <div style={{
          background:   'rgba(245,158,11,.06)',
          border:       '1px solid rgba(245,158,11,.2)',
          borderRadius: 'var(--r-sm)',
          padding:      '10px 14px',
          marginBottom: '1.25rem',
          fontSize:     12,
          color:        '#fbbf24',
          lineHeight:   1.6,
        }}>
          ⚠️ <strong>Penalty rules:</strong> 1-day delay → 5 pts &nbsp;|&nbsp; 3+ days delay → 15 pts<br/>
          💰 <strong>Compensation:</strong> ₹100 per day of delay
        </div>

        {/* Buttons */}
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-glass" style={{ flex:1 }} onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            style={{ flex:2 }}
            onClick={handleSubmit}
            disabled={busy || !selectedOfficer || !deadlineDays}
          >
            {busy
              ? <><span className="spinner-sm" style={{ borderTopColor:'#fff', borderColor:'rgba(255,255,255,.2)' }} /> Assigning…</>
              : '✅ Assign with Deadline'
            }
          </button>
        </div>
      </div>
    </div>
  );
}