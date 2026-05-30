import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyIssues, getImageUrl } from '../../api';
import { IssueProgress, StatusBadge, Spinner, EmptyState } from '../../components/common';
import ImagePreviewModal from '../../components/common/ImagePreviewModal';
import OverdueBadge from '../../components/OverdueBadge';

export default function TrackPage() {
  const [issues,     setIssues]     = useState([]);
  const [busy,       setBusy]       = useState(true);
  const [previewImg, setPreviewImg] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    getMyIssues()
      .then(r => setIssues(r.data.issues || []))
      .catch(() => {})
      .finally(() => setBusy(false));
  }, []);

  // Deadline time remaining helper
  const deadlineInfo = (issue) => {
    if (!issue.deadline) return null;
    if (['resolved','closed','rejected'].includes(issue.status)) return null;
    const now      = new Date();
    const deadline = new Date(issue.deadline);
    const diffMs   = deadline - now;
    if (diffMs <= 0) {
      const days = Math.floor(Math.abs(diffMs) / 86400000);
      return { overdue:true, days, compensation: days * 100 };
    }
    const days  = Math.floor(diffMs / 86400000);
    const hours = Math.floor((diffMs % 86400000) / 3600000);
    return { overdue:false, days, hours };
  };

  if (busy) return <div className="page"><Spinner /></div>;

  return (
    <div className="page page-narrow">
      <div className="page-header fade-up">
        <div>
          <h1>My Reports</h1>
          <p>{issues.length} issue{issues.length !== 1 ? 's' : ''} submitted by you</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/report')}>➕ New Report</button>
      </div>

      {issues.length === 0 ? (
        <div className="card fade-up d1">
          <EmptyState icon="📭" title="No reports yet" sub="You haven't submitted any issues yet."
            action={<button className="btn btn-primary btn-sm" onClick={() => navigate('/report')}>Report an Issue</button>} />
        </div>
      ) : issues.map((issue, i) => {
        const images   = (issue.images || []).map(getImageUrl).filter(Boolean);
        const officer  = issue.assignedTo;
        const dl       = deadlineInfo(issue);

        return (
          <div key={issue._id} className="card fade-up" style={{ animationDelay:`${i * 0.06}s`, marginBottom:'1rem' }}>

            {/* Header */}
            <div style={{ cursor:'pointer' }} onClick={() => navigate(`/issues/${issue._id}`)}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:11, fontWeight:700, fontFamily:'var(--f-display)', background:'linear-gradient(135deg,#6366f1,#22c55e)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', marginBottom:4 }}>
                    {issue.ticketId}
                  </div>
                  <div style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', fontFamily:'var(--f-display)' }}>{issue.title}</div>
                  <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>
                    📍 {issue.location?.address}{issue.location?.area ? ` · ${issue.location.area}` : ''}
                  </div>
                </div>
                <StatusBadge status={issue.status} />
              </div>
              <IssueProgress status={issue.status} />
            </div>

            {/* ── Deadline & overdue info ─────────────────────── */}
            {dl && (
              <div style={{ marginTop:10, padding:'10px 14px', borderRadius:'var(--r-sm)', background: dl.overdue ? 'rgba(239,68,68,.06)' : 'rgba(99,102,241,.06)', border:`1px solid ${dl.overdue ? 'rgba(239,68,68,.2)' : 'rgba(99,102,241,.2)'}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
                  <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                    <OverdueBadge issue={issue} />
                    {!dl.overdue && (
                      <span style={{ fontSize:12, fontWeight:600, color: dl.days === 0 ? '#ef4444' : dl.days <= 1 ? '#f59e0b' : '#818cf8' }}>
                        ⏱ {dl.days > 0 ? `${dl.days}d ` : ''}{dl.hours}h remaining
                      </span>
                    )}
                    <span style={{ fontSize:11, color:'var(--text-muted)' }}>
                      📅 Deadline: {new Date(issue.deadline).toLocaleDateString()}
                    </span>
                  </div>
                  {/* Compensation suggestion for overdue issues */}
                  {dl.overdue && dl.compensation > 0 && (
                    <div style={{ background:'rgba(245,158,11,.1)', border:'1px solid rgba(245,158,11,.25)', borderRadius:20, padding:'3px 12px', fontSize:11, fontWeight:700, color:'#f59e0b' }}>
                      💰 Suggested comp: ₹{dl.compensation.toLocaleString()}
                    </div>
                  )}
                </div>

                {/* Deadline progress bar */}
                {!dl.overdue && issue.createdAt && (
                  <div style={{ marginTop:8 }}>
                    <div style={{ height:4, background:'rgba(255,255,255,.06)', borderRadius:4, overflow:'hidden' }}>
                      <div style={{
                        height:   '100%',
                        width:    `${Math.min(Math.round(((new Date() - new Date(issue.createdAt)) / (new Date(issue.deadline) - new Date(issue.createdAt))) * 100), 100)}%`,
                        background: dl.days <= 1 ? '#ef4444' : dl.days <= 2 ? '#f59e0b' : '#6366f1',
                        borderRadius: 4,
                        transition: 'width .5s ease',
                      }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Assigned officer card ───────────────────────── */}
            {officer && (
              <div style={{ marginTop:10, background:'rgba(6,182,212,.06)', border:'1px solid rgba(6,182,212,.2)', borderRadius:'var(--r-sm)', padding:'10px 14px', display:'flex', gap:12, alignItems:'center' }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#06b6d4,#6366f1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color:'#fff', flexShrink:0 }}>
                  {officer.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:10, color:'#06b6d4', fontFamily:'var(--f-display)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:2 }}>👷 Assigned Officer</div>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', fontFamily:'var(--f-display)' }}>{officer.name}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>🏛️ {officer.department || issue.department}</div>
                </div>
                <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                  {officer.email && (
                    <a href={`mailto:${officer.email}`} onClick={e => e.stopPropagation()}
                      style={{ fontSize:12, color:'#818cf8', textDecoration:'none', background:'rgba(99,102,241,.1)', border:'1px solid rgba(99,102,241,.2)', borderRadius:20, padding:'3px 10px' }}>
                      ✉️ Email
                    </a>
                  )}
                  {officer.phone && (
                    <a href={`tel:${officer.phone}`} onClick={e => e.stopPropagation()}
                      style={{ fontSize:12, color:'#34d399', textDecoration:'none', background:'rgba(34,197,94,.1)', border:'1px solid rgba(34,197,94,.2)', borderRadius:20, padding:'3px 10px' }}>
                      📞 Call
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Photos */}
            {images.length > 0 && (
              <div style={{ marginTop:12 }}>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:6, fontFamily:'var(--f-display)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em' }}>
                  📷 {images.length} Photo{images.length > 1 ? 's' : ''}
                </div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {images.map((src, idx) => (
                    <div key={idx} onClick={() => setPreviewImg({ images, idx })}
                      style={{ width:80, height:60, borderRadius:8, overflow:'hidden', cursor:'pointer', border:'1px solid var(--glass-border)', flexShrink:0 }}>
                      <img src={src} alt="evidence" style={{ width:'100%', height:'100%', objectFit:'cover' }}
                        onError={e => e.target.style.display = 'none'} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:12, alignItems:'center' }}>
              <span style={{ background:'rgba(255,255,255,0.06)', border:'1px solid var(--glass-border)', borderRadius:20, padding:'3px 11px', fontSize:12, color:'var(--text-secondary)' }}>
                🏛️ {issue.department}
              </span>
              <span style={{ fontSize:12, color:'var(--text-muted)', marginLeft:'auto' }}>
                {new Date(issue.createdAt).toLocaleDateString()}
              </span>
              <button className="btn btn-glass btn-sm" onClick={() => navigate(`/issues/${issue._id}`)}>
                View Details →
              </button>
            </div>
          </div>
        );
      })}

      {previewImg && (
        <ImagePreviewModal images={previewImg.images} startIndex={previewImg.idx} onClose={() => setPreviewImg(null)} />
      )}
    </div>
  );
}