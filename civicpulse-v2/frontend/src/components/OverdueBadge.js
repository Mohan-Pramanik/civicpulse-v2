/**
 * OverdueBadge.js
 * Reusable badge showing overdue status + delay days.
 * Place in: frontend/src/components/OverdueBadge.js
 *
 * Usage:
 *   <OverdueBadge issue={issue} />
 */

import React from 'react';

export default function OverdueBadge({ issue }) {
  if (!issue) return null;

  // Resolved issues are never overdue
  if (['resolved', 'closed', 'rejected'].includes(issue.status)) return null;

  // No deadline set
  if (!issue.deadline) return null;

  const now       = new Date();
  const deadline  = new Date(issue.deadline);
  const isOverdue = now > deadline;

  if (!isOverdue) {
    // Show "due soon" warning if within 24 hours
    const hoursLeft = (deadline - now) / 3600000;
    if (hoursLeft <= 24) {
      return (
        <span style={{
          background: 'rgba(245,158,11,.15)',
          color:      '#f59e0b',
          border:     '1px solid rgba(245,158,11,.35)',
          borderRadius: 20,
          padding:    '2px 10px',
          fontSize:   11,
          fontWeight: 700,
          display:    'inline-flex',
          alignItems: 'center',
          gap:        4,
        }}>
          ⚠️ Due in {Math.round(hoursLeft)}h
        </span>
      );
    }
    return null;
  }

  const delayDays = Math.floor((now - deadline) / 86400000);

  return (
    <span style={{
      background:   'rgba(239,68,68,.15)',
      color:        '#ef4444',
      border:       '1px solid rgba(239,68,68,.35)',
      borderRadius: 20,
      padding:      '2px 10px',
      fontSize:     11,
      fontWeight:   700,
      display:      'inline-flex',
      alignItems:   'center',
      gap:          4,
      boxShadow:    '0 0 10px rgba(239,68,68,.2)',
    }}>
      🔴 OVERDUE — {delayDays} day{delayDays !== 1 ? 's' : ''} late
    </span>
  );
}