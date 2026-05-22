import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { upvoteIssue, getImageUrl } from '../../api';
import ImagePreviewModal from '../common/ImagePreviewModal';

const CAT_ICON = { road:'🛣️', water:'💧', waste:'🗑️', electricity:'⚡', encroachment:'🏗️', other:'📋' };
const CAT_BG   = { road:'rgba(99,102,241,0.12)', water:'rgba(6,182,212,0.12)', waste:'rgba(34,197,94,0.12)', electricity:'rgba(245,158,11,0.12)', encroachment:'rgba(139,92,246,0.12)', other:'rgba(255,255,255,0.06)' };
const statusCls = s => ({ pending:'badge-gray', assigned:'badge-blue', in_progress:'badge-amber', resolved:'badge-green', closed:'badge-gray', rejected:'badge-red' }[s]||'badge-gray');
const prioCls   = p => ({ low:'badge-gray', medium:'badge-blue', high:'badge-amber', critical:'badge-red' }[p]||'badge-gray');
const PRIO_GLOW = { critical:'rgba(239,68,68,0.4)', high:'rgba(245,158,11,0.3)', medium:'rgba(6,182,212,0.25)', low:'rgba(34,197,94,0.2)' };

export default function IssueCard({ issue }) {
  const navigate = useNavigate();
  const [votes,      setVotes]      = useState(issue.upvoteCount ?? issue.upvotes?.length ?? 0);
  const [voted,      setVoted]      = useState(false);
  const [busy,       setBusy]       = useState(false);
  const [previewIdx, setPreviewIdx] = useState(null);

  const images = (issue.images || []).map(getImageUrl).filter(Boolean);

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
    <>
      <div className="issue-row" onClick={() => navigate(`/issues/${issue._id}`)}>
        <div className="issue-icon" style={{ background: CAT_BG[issue.category] || 'rgba(255,255,255,0.06)' }}>
          {CAT_ICON[issue.category] || '📋'}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
            <div className="issue-title">{issue.title}</div>
            <span className={`badge ${prioCls(issue.priority)}`} style={{ boxShadow:`0 0 8px ${PRIO_GLOW[issue.priority]||'transparent'}`, flexShrink:0 }}>{issue.priority}</span>
          </div>
          <div className="issue-meta" style={{ marginTop:5 }}>
            <span>📍 {issue.location?.area || issue.location?.address}</span>
            <span>🕐 {new Date(issue.createdAt).toLocaleDateString()}</span>
            <span style={{ background:'rgba(255,255,255,0.06)', borderRadius:20, padding:'1px 9px', border:'1px solid var(--glass-border)' }}>{issue.department}</span>
          </div>

          {/* Image thumbnails inline */}
          {images.length > 0 && (
            <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap' }} onClick={e => e.stopPropagation()}>
              {images.slice(0,3).map((src, i) => (
                <div key={i} onClick={e => { e.stopPropagation(); setPreviewIdx(i); }}
                  style={{ width:50, height:38, borderRadius:6, overflow:'hidden', cursor:'pointer', border:'1px solid var(--glass-border)', flexShrink:0 }}>
                  <img src={src} alt="evidence" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>e.target.style.display='none'} />
                </div>
              ))}
              {images.length > 3 && (
                <div style={{ width:50, height:38, borderRadius:6, background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'#818cf8', fontWeight:700, cursor:'pointer', flexShrink:0 }}
                  onClick={e => { e.stopPropagation(); setPreviewIdx(0); }}>
                  +{images.length-3}
                </div>
              )}
            </div>
          )}

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:10 }}>
            <button className={`upvote-btn ${voted ? 'voted' : ''}`} onClick={handleUpvote} disabled={busy}>
              ▲ {votes}
            </button>
            <span className={`badge ${statusCls(issue.status)}`}>{issue.status?.replace(/_/g,' ')}</span>
          </div>
        </div>
      </div>

      {previewIdx !== null && images.length > 0 && (
        <ImagePreviewModal images={images} startIndex={previewIdx} onClose={() => setPreviewIdx(null)} />
      )}
    </>
  );
}