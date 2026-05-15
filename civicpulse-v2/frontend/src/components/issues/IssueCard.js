import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { upvoteIssue } from '../../api';

const CAT_ICON = { road:'🛣️', water:'💧', waste:'🗑️', electricity:'⚡', encroachment:'🏗️', other:'📋' };
const CAT_BG   = { road:'#FAECE7', water:'#E6F1FB', waste:'#EAF3DE', electricity:'#FAEEDA', encroachment:'#EEEDFE', other:'#F1EFE8' };

const statusBadge = s => ({ pending:'badge-gray', assigned:'badge-blue', in_progress:'badge-amber', resolved:'badge-green', closed:'badge-gray', rejected:'badge-red' }[s] || 'badge-gray');
const prioBadge   = p => ({ low:'badge-gray', medium:'badge-blue', high:'badge-amber', critical:'badge-red' }[p] || 'badge-gray');

export default function IssueCard({ issue }) {
  const navigate = useNavigate();
  const [votes, setVotes]   = useState(issue.upvoteCount ?? issue.upvotes?.length ?? 0);
  const [voted, setVoted]   = useState(false);
  const [busy,  setBusy]    = useState(false);

  const handleUpvote = async (e) => {
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
      <div className="issue-icon" style={{ background: CAT_BG[issue.category] || '#f4f6f4' }}>
        {CAT_ICON[issue.category] || '📋'}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
          <div className="issue-title">{issue.title}</div>
          <span className={`badge ${prioBadge(issue.priority)}`}>{issue.priority}</span>
        </div>
        <div className="issue-meta" style={{ marginTop:4 }}>
          <span>📍 {issue.location?.address}</span>
          <span>🕐 {new Date(issue.createdAt).toLocaleDateString()}</span>
          <span style={{ background:'var(--bg)', borderRadius:20, padding:'1px 8px' }}>{issue.department}</span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8 }}>
          <button className={`upvote-btn ${voted ? 'voted' : ''}`} onClick={handleUpvote} disabled={busy}>
            ▲ {votes}
          </button>
          <span className={`badge ${statusBadge(issue.status)}`}>{issue.status?.replace('_',' ')}</span>
        </div>
      </div>
    </div>
  );
}
