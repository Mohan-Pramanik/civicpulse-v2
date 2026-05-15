import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { upvoteIssue } from '../../api';

const CAT_ICON = { road:'🛣️', water:'💧', waste:'🗑️', electricity:'⚡', encroachment:'🏗️', other:'📋' };
const CAT_BG   = {
  road:         'rgba(99,102,241,0.15)',
  water:        'rgba(6,182,212,0.15)',
  waste:        'rgba(34,197,94,0.15)',
  electricity:  'rgba(245,158,11,0.15)',
  encroachment: 'rgba(139,92,246,0.15)',
  other:        'rgba(255,255,255,0.08)',
};

const statusCls = s => ({ pending:'badge-gray', assigned:'badge-blue', in_progress:'badge-amber', resolved:'badge-green', closed:'badge-gray', rejected:'badge-red' }[s] || 'badge-gray');
const prioCls   = p => ({ low:'badge-gray', medium:'badge-blue', high:'badge-amber', critical:'badge-red' }[p] || 'badge-gray');

export default function IssueCard({ issue }) {
  const navigate = useNavigate();
  const [votes, setVotes] = useState(issue.upvoteCount ?? issue.upvotes?.length ?? 0);
  const [voted, setVoted] = useState(false);
  const [busy,  setBusy]  = useState(false);

  const handleUpvote = async e => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      const r = await upvoteIssue(issue._id);
      setVotes(r.data.upvotes);
      setVoted(r.data.voted);
    } catch {}
    setBusy(false);
  };

  return (
    <div className="issue-row" onClick={() => navigate(`/issues/${issue._id}`)}>
      <div className="issue-icon" style={{ background: CAT_BG[issue.category] || 'rgba(255,255,255,0.08)' }}>
        {CAT_ICON[issue.category] || '📋'}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
          <div className="issue-title">{issue.title}</div>
          <span className={`badge ${prioCls(issue.priority)}`}>{issue.priority}</span>
        </div>
        <div className="issue-meta" style={{ marginTop:5 }}>
          <span>📍 {issue.location?.area || issue.location?.address}</span>
          <span>🕐 {new Date(issue.createdAt).toLocaleDateString()}</span>
          <span style={{ background:'rgba(255,255,255,0.06)', borderRadius:20, padding:'1px 9px', border:'1px solid var(--glass-border)' }}>
            {issue.department}
          </span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:10 }}>
          <button className={`upvote-btn ${voted ? 'voted' : ''}`} onClick={handleUpvote} disabled={busy}>
            ▲ {votes}
          </button>
          <span className={`badge ${statusCls(issue.status)}`}>{issue.status?.replace(/_/g,' ')}</span>
        </div>
      </div>
    </div>
  );
}