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
    getMyIssues().then(r => setIssues(r.data.issues||[])).catch(()=>{}).finally(()=>setBusy(false));
  }, []);

  if (busy) return <div className="page"><Spinner /></div>;

  return (
    <div className="page page-narrow">
      <div className="page-header fade-up">
        <div><h1>My Reports</h1><p>{issues.length} issue{issues.length!==1?'s':''} submitted by you</p></div>
        <button className="btn btn-primary btn-sm" onClick={()=>navigate('/report')}>➕ New Report</button>
      </div>

      {issues.length === 0 ? (
        <div className="card fade-up d1">
          <EmptyState icon="📭" title="No reports yet" sub="You haven't submitted any issues yet."
            action={<button className="btn btn-primary btn-sm" onClick={()=>navigate('/report')}>Report an Issue</button>} />
        </div>
      ) : issues.map((issue, i) => {
        const images = (issue.images||[]).map(getImageUrl).filter(Boolean);
        return (
          <div key={issue._id} className="card fade-up" style={{ animationDelay:`${i*0.06}s`, marginBottom:'1rem' }}>
            <div style={{ cursor:'pointer' }} onClick={()=>navigate(`/issues/${issue._id}`)}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:11, fontWeight:700, fontFamily:'var(--f-display)', background:'linear-gradient(135deg,#6366f1,#22c55e)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', marginBottom:4 }}>{issue.ticketId}</div>
                  <div style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', fontFamily:'var(--f-display)' }}>{issue.title}</div>
                  <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>📍 {issue.location?.address}{issue.location?.area?` · ${issue.location.area}`:''}</div>
                </div>
                <StatusBadge status={issue.status} />
              </div>
              <IssueProgress status={issue.status} />
            </div>

            {/* Image thumbnails */}
            {images.length > 0 && (
              <div style={{ marginTop:14 }}>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:6, fontFamily:'var(--f-display)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em' }}>📷 {images.length} Photo{images.length>1?'s':''}</div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {images.map((src, idx) => (
                    <div key={idx} onClick={()=>setPreviewImg({images,idx})}
                      style={{ width:80, height:60, borderRadius:8, overflow:'hidden', cursor:'pointer', border:'1px solid var(--glass-border)', position:'relative', flexShrink:0 }}
                      onMouseOver={e=>e.currentTarget.querySelector('.ov').style.opacity=1}
                      onMouseOut={e=>e.currentTarget.querySelector('.ov').style.opacity=0}>
                      <img src={src} alt="evidence" style={{ width:'100%', height:'100%', objectFit:'cover' }}
                        onError={e=>{e.target.style.display='none';}} />
                      <div className="ov" style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', opacity:0, transition:'opacity 0.2s' }}>
                        <span style={{ color:'#fff', fontSize:14 }}>🔍</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:12, alignItems:'center' }}>
              <span style={{ background:'rgba(255,255,255,0.06)', border:'1px solid var(--glass-border)', borderRadius:20, padding:'3px 11px', fontSize:12, color:'var(--text-secondary)' }}>🏛️ {issue.department}</span>
              {issue.isOverdue && <span className="badge badge-red">⚠ Overdue</span>}
              <span style={{ fontSize:12, color:'var(--text-muted)', marginLeft:'auto' }}>{new Date(issue.createdAt).toLocaleDateString()}</span>
              <button className="btn btn-glass btn-sm" onClick={()=>navigate(`/issues/${issue._id}`)}>View →</button>
            </div>
          </div>
        );
      })}

      {previewImg && <ImagePreviewModal images={previewImg.images} startIndex={previewImg.idx} onClose={()=>setPreviewImg(null)} />}
    </div>
  );
}