import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyIssues, getImageUrl } from '../../api';
import { IssueProgress, StatusBadge, Spinner, EmptyState } from '../../components/common';
import ImagePreviewModal from '../../components/common/ImagePreviewModal';

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

  if (busy) return <div className="page"><Spinner /></div>;

  return (
    <div className="page page-narrow">
      <div className="page-header fade-up">
        <div>
          <h1>My Reports</h1>
          <p>{issues.length} issue{issues.length !== 1 ? 's' : ''} submitted by you</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/report')}>
          ➕ New Report
        </button>
      </div>

      {issues.length === 0 ? (
        <div className="card fade-up d1">
          <EmptyState icon="📭" title="No reports yet"
            sub="You haven't submitted any issues yet."
            action={<button className="btn btn-primary btn-sm" onClick={() => navigate('/report')}>Report an Issue</button>} />
        </div>
      ) : issues.map((issue, i) => {
        const images  = (issue.images || []).map(getImageUrl).filter(Boolean);
        const officer = issue.assignedTo;

        return (
          <div key={issue._id} className="card fade-up"
            style={{ animationDelay:`${i * 0.06}s`, marginBottom:'1rem' }}>

            {/* Header */}
            <div style={{ cursor:'pointer' }} onClick={() => navigate(`/issues/${issue._id}`)}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:11, fontWeight:700, fontFamily:'var(--f-display)', background:'linear-gradient(135deg,#6366f1,#22c55e)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', marginBottom:4 }}>
                    {issue.ticketId}
                  </div>
                  <div style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', fontFamily:'var(--f-display)' }}>
                    {issue.title}
                  </div>
                  <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>
                    📍 {issue.location?.address}{issue.location?.area ? ` · ${issue.location.area}` : ''}
                  </div>
                </div>
                <StatusBadge status={issue.status} />
              </div>
              <IssueProgress status={issue.status} />
            </div>

            {/* ── ASSIGNED OFFICER CARD ── */}
            {officer ? (
              <div style={{ marginTop:14, background:'linear-gradient(135deg,rgba(6,182,212,0.08),rgba(99,102,241,0.05))', border:'1px solid rgba(6,182,212,0.2)', borderRadius:'var(--r-sm)', padding:'12px 14px' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#06b6d4', fontFamily:'var(--f-display)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8 }}>
                  👷 Assigned Officer
                </div>
                <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
                  {/* Avatar */}
                  <div style={{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg,#06b6d4,#6366f1)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--f-display)', fontWeight:800, fontSize:16, color:'#fff', flexShrink:0, boxShadow:'0 3px 10px rgba(6,182,212,0.3)' }}>
                    {officer.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', fontFamily:'var(--f-display)' }}>
                      {officer.name}
                    </div>
                    {officer.department && (
                      <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
                        🏛️ {officer.department}
                      </div>
                    )}
                  </div>
                  {/* Contact buttons */}
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {officer.email && (
                      <a href={`mailto:${officer.email}`}
                        style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.25)', borderRadius:'var(--r-sm)', padding:'6px 12px', fontSize:12, color:'#818cf8', fontWeight:600, textDecoration:'none', transition:'all 0.2s' }}
                        onMouseOver={e => e.currentTarget.style.background='rgba(99,102,241,0.2)'}
                        onMouseOut={e => e.currentTarget.style.background='rgba(99,102,241,0.12)'}>
                        ✉️ Email
                      </a>
                    )}
                    {officer.phone && (
                      <a href={`tel:${officer.phone}`}
                        style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(34,197,94,0.12)', border:'1px solid rgba(34,197,94,0.25)', borderRadius:'var(--r-sm)', padding:'6px 12px', fontSize:12, color:'#4ade80', fontWeight:600, textDecoration:'none', transition:'all 0.2s' }}
                        onMouseOver={e => e.currentTarget.style.background='rgba(34,197,94,0.2)'}
                        onMouseOut={e => e.currentTarget.style.background='rgba(34,197,94,0.12)'}>
                        📞 Call
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Not yet assigned */
              ['pending'].includes(issue.status) && (
                <div style={{ marginTop:12, background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.15)', borderRadius:'var(--r-sm)', padding:'10px 14px', fontSize:12, color:'#fbbf24', display:'flex', alignItems:'center', gap:8 }}>
                  ⏳ Awaiting assignment to a field officer
                </div>
              )
            )}

            {/* Department info */}
            {issue.department && (
              <div style={{ marginTop:officer?8:12, display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ background:'rgba(255,255,255,0.06)', border:'1px solid var(--glass-border)', borderRadius:20, padding:'3px 11px', fontSize:12, color:'var(--text-secondary)' }}>
                  🏛️ {issue.department}
                </span>
                {issue.isOverdue && <span className="badge badge-red">⚠ Overdue</span>}
              </div>
            )}

            {/* Image thumbnails */}
            {images.length > 0 && (
              <div style={{ marginTop:12 }}>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:6, fontFamily:'var(--f-display)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em' }}>
                  📷 {images.length} Photo{images.length > 1 ? 's' : ''}
                </div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {images.map((src, idx) => (
                    <div key={idx} onClick={() => setPreviewImg({ images, idx })}
                      style={{ width:72, height:56, borderRadius:8, overflow:'hidden', cursor:'pointer', border:'1px solid var(--glass-border)', position:'relative', flexShrink:0 }}
                      onMouseOver={e => e.currentTarget.querySelector('.ov').style.opacity=1}
                      onMouseOut={e => e.currentTarget.querySelector('.ov').style.opacity=0}>
                      <img src={src} alt="evidence"
                        style={{ width:'100%', height:'100%', objectFit:'cover' }}
                        onError={e => e.target.style.display='none'} />
                      <div className="ov" style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', opacity:0, transition:'opacity 0.2s' }}>
                        <span style={{ color:'#fff', fontSize:13 }}>🔍</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:12, alignItems:'center' }}>
              <span style={{ fontSize:12, color:'var(--text-muted)', marginLeft:'auto' }}>
                {new Date(issue.createdAt).toLocaleDateString()}
              </span>
              <button className="btn btn-glass btn-sm"
                onClick={() => navigate(`/issues/${issue._id}`)}>
                View Details →
              </button>
            </div>
          </div>
        );
      })}

      {previewImg && (
        <ImagePreviewModal
          images={previewImg.images}
          startIndex={previewImg.idx}
          onClose={() => setPreviewImg(null)} />
      )}
    </div>
  );
}