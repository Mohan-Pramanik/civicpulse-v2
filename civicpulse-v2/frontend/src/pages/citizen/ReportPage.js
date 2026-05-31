import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createIssue } from '../../api';
import { useToast } from '../../context/ToastContext';
import IssueMap from '../../components/common/IssueMap';

const ROUTING = {
  road:         { dept:'Public Works Department (PWD)',   eta:'3–5 working days', color:'#6366f1' },
  water:        { dept:'KMC Water Supply Department',     eta:'2–4 working days', color:'#06b6d4' },
  waste:        { dept:'Sanitation & Solid Waste Dept',   eta:'1–2 working days', color:'#22c55e' },
  electricity:  { dept:'CESC / KMC Lighting Division',   eta:'2–3 working days', color:'#f59e0b' },
  encroachment: { dept:'KMC Enforcement Team',           eta:'5–7 working days', color:'#8b5cf6' },
  other:        { dept:'KMC General Grievance Cell',     eta:'7 working days',   color:'#94a3b8' },
};

const STEPS = ['Details', 'Location', 'Photos & Submit'];
// ← priority removed from initForm
const initForm = { title:'', description:'', category:'', address:'', landmark:'', area:'', ward:'', pincode:'', lat:'', lng:'' };

export default function ReportPage() {
  const [step,       setStep]       = useState(0);
  const [form,       setForm]       = useState(initForm);
  const [images,     setImages]     = useState([]);
  const [previews,   setPreviews]   = useState([]);
  const [error,      setError]      = useState('');
  const [busy,       setBusy]       = useState(false);
  const galleryRef   = useRef(null);
  const cameraRef    = useRef(null);
  const { toast }    = useToast();
  const navigate     = useNavigate();
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const route = ROUTING[form.category];

  // GPS + reverse geocode are now handled inside IssueMap
  // This callback receives auto-filled address fields from the map component
  const handleMapPick = (lat, lng, geo = {}) => {
    setForm(f => ({
      ...f,
      lat,
      lng,
      ...(geo.address && !f.address ? { address: geo.address } : {}),
      ...(geo.area    && !f.area    ? { area:    geo.area    } : {}),
      ...(geo.ward    && !f.ward    ? { ward:    geo.ward    } : {}),
      ...(geo.pincode && !f.pincode ? { pincode: geo.pincode } : {}),
    }));
    toast('📍 Location captured — address fields auto-filled');
  };

  const addFiles = (files) => {
    const newFiles = Array.from(files).slice(0, 5 - images.length);
    if (!newFiles.length) return toast('Maximum 5 photos allowed','error');
    const combined = [...images, ...newFiles].slice(0, 5);
    setImages(combined);
    const readers = combined.map(file => new Promise(resolve => {
      const r = new FileReader();
      r.onload = ev => resolve(ev.target.result);
      r.readAsDataURL(file);
    }));
    Promise.all(readers).then(setPreviews);
  };

  const removeImage = (i) => {
    const newImgs = images.filter((_, idx) => idx !== i);
    setImages(newImgs);
    const readers = newImgs.map(file => new Promise(resolve => {
      const r = new FileReader();
      r.onload = ev => resolve(ev.target.result);
      r.readAsDataURL(file);
    }));
    Promise.all(readers).then(setPreviews);
  };

  const goNext = () => {
    if (step === 0 && (!form.title || !form.category || !form.description)) { setError('Please fill all required fields'); return; }
    if (step === 1 && !form.address) { setError('Please enter the street address'); return; }
    setError(''); setStep(s => s + 1);
  };

  const submit = async e => {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k,v]) => v && fd.append(k,v));
      images.forEach(img => fd.append('images', img));
      const r = await createIssue(fd);
      toast(`✅ Ticket ${r.data.issue.ticketId} submitted!`);
      navigate('/track');
    } catch (err) { setError(err.response?.data?.message || 'Failed to submit. Try again.'); }
    setBusy(false);
  };

  return (
    <div className="page page-narrow">
      <div className="page-header fade-up">
        <div><h1>Report an Issue</h1><p>Auto-routed to the correct department</p></div>
      </div>

      {/* Step indicator */}
      <div className="fade-up d1" style={{ display:'flex', alignItems:'center', gap:8, marginBottom:'1.5rem' }}>
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <div style={{ display:'flex', alignItems:'center', gap:7, cursor:i<step?'pointer':'default', opacity:i>step?0.4:1 }}
              onClick={() => i < step && setStep(i)}>
              <div style={{ width:30, height:30, borderRadius:'50%', background:i<=step?'linear-gradient(135deg,#6366f1,#22c55e)':'rgba(255,255,255,0.08)', border:`1px solid ${i<=step?'transparent':'var(--glass-border)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#fff', boxShadow:i===step?'0 0 16px rgba(99,102,241,0.5)':'none', transition:'all 0.3s', flexShrink:0 }}>
                {i < step ? '✓' : i+1}
              </div>
              <span style={{ fontSize:13, fontWeight:i===step?700:500, color:i===step?'var(--text-primary)':'var(--text-muted)', fontFamily:'var(--f-display)', whiteSpace:'nowrap' }}>{s}</span>
            </div>
            {i < STEPS.length-1 && <div style={{ flex:1, height:1, background:i<step?'linear-gradient(90deg,#6366f1,#22c55e)':'var(--border)', borderRadius:1 }} />}
          </React.Fragment>
        ))}
      </div>

      {error && <div className="alert alert-error fade-up">⚠️ {error}</div>}

      <form onSubmit={submit}>

        {/* ── Step 0: Details ─────────────────────────────────────────── */}
        {step === 0 && (
          <div className="card fade-up d2">
            <div className="section-label">📝 Issue Details</div>
            <div className="form-group">
              <label className="form-label">Issue title *</label>
              <div className="input-wrap">
                <span className="input-icon">📌</span>
                <input className="form-control" placeholder="e.g. Large pothole causing accidents on Park Street" value={form.title} onChange={set('title')} required />
              </div>
            </div>

            {/* ← Only category now; priority removed */}
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select className="form-control" value={form.category} onChange={set('category')} required>
                <option value="">Select category…</option>
                <option value="road">🛣️ Road / Pothole</option>
                <option value="water">💧 Water Supply / Sewage</option>
                <option value="waste">🗑️ Garbage / Waste</option>
                <option value="electricity">⚡ Street Lights / Electricity</option>
                <option value="encroachment">🏗️ Encroachment</option>
                <option value="other">📋 Other</option>
              </select>
            </div>

            {route && (
              <div style={{ background:`linear-gradient(135deg,${route.color}12,${route.color}06)`, border:`1px solid ${route.color}25`, borderRadius:'var(--r-sm)', padding:'12px 16px', marginBottom:'1rem' }}>
                <div style={{ fontSize:11, color:route.color, fontWeight:700, fontFamily:'var(--f-display)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:4 }}>⚡ Auto-routed to</div>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>{route.dept}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>Expected resolution: {route.eta}</div>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Description *</label>
              <textarea className="form-control" placeholder="Describe the problem — severity, impact, how long it's been there…" value={form.description} onChange={set('description')} required />
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <button type="button" className="btn btn-primary" onClick={goNext}>Next: Location →</button>
            </div>
          </div>
        )}

        {/* ── Step 1: Location ────────────────────────────────────────── */}
        {step === 1 && (
          <div className="card fade-up d1">
            <div className="section-label">📍 Location Details</div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Street address *</label>
                <div className="input-wrap"><span className="input-icon">🏠</span>
                  <input className="form-control" placeholder="e.g. 12 Park Street" value={form.address} onChange={set('address')} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Area / Locality</label>
                <div className="input-wrap"><span className="input-icon">🏘️</span>
                  <input className="form-control" placeholder="e.g. Ballygunge" value={form.area} onChange={set('area')} />
                </div>
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Landmark</label>
                <div className="input-wrap"><span className="input-icon">🏛️</span>
                  <input className="form-control" placeholder="Near school / metro" value={form.landmark} onChange={set('landmark')} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">PIN code</label>
                <div className="input-wrap"><span className="input-icon">🔢</span>
                  <input className="form-control" placeholder="700001" value={form.pincode} onChange={set('pincode')} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Ward No. <span style={{fontSize:11,color:'var(--text-muted)',fontWeight:400}}>(auto-filled by GPS)</span></label>
                <div className="input-wrap"><span className="input-icon">🗳️</span>
                  <input className="form-control" placeholder="e.g. Ward 57 (auto-detected)" value={form.ward} onChange={set('ward')} />
                </div>
              </div>
            </div>

            {/* GPS + map — GPS button inside IssueMap, auto-fills address/area/ward/pincode */}
            <div style={{ marginBottom:'1rem' }}>
              <IssueMap
                picker
                lat={form.lat}
                lng={form.lng}
                height={300}
                onPick={handleMapPick}
              />
            </div>

            <div style={{ display:'flex', gap:8, justifyContent:'space-between' }}>
              <button type="button" className="btn btn-glass" onClick={() => setStep(0)}>← Back</button>
              <button type="button" className="btn btn-primary" onClick={goNext}>Next: Photos →</button>
            </div>
          </div>
        )}

        {/* ── Step 2: Photos & Submit ──────────────────────────────────── */}
        {step === 2 && (
          <div className="card fade-up d1">
            <div className="section-label">📷 Photo Evidence ({images.length}/5)</div>

            <div style={{ display:'flex', gap:10, marginBottom:'1rem', flexWrap:'wrap', position:'relative' }}>
              <input ref={galleryRef} type="file" accept="image/*" multiple
                style={{ position:'absolute', width:1, height:1, opacity:0, pointerEvents:'none', top:0, left:0 }}
                onChange={e => addFiles(e.target.files)} />
              <input ref={cameraRef} type="file" accept="image/*" capture="environment"
                style={{ position:'absolute', width:1, height:1, opacity:0, pointerEvents:'none', top:0, left:0 }}
                onChange={e => addFiles(e.target.files)} />

              <button type="button" className="btn btn-glass"
                style={{ flex:1, minWidth:140, height:56, flexDirection:'column', gap:4, fontSize:13 }}
                onClick={() => cameraRef.current?.click()}>
                <span style={{ fontSize:22 }}>📷</span>
                <span>Take Photo</span>
              </button>
              <button type="button" className="btn btn-glass"
                style={{ flex:1, minWidth:140, height:56, flexDirection:'column', gap:4, fontSize:13 }}
                onClick={() => galleryRef.current?.click()}>
                <span style={{ fontSize:22 }}>🖼️</span>
                <span>Choose from Gallery</span>
              </button>
            </div>

            {previews.length > 0 && (
              <div style={{ marginBottom:'1.25rem' }}>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:8, fontFamily:'var(--f-display)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em' }}>
                  Attached Photos ({previews.length})
                </div>
                <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                  {previews.map((src, i) => (
                    <div key={i} style={{ position:'relative', width:110, height:85, borderRadius:10, overflow:'hidden', border:'1px solid var(--glass-border)', flexShrink:0 }}>
                      <img src={src} alt={`preview-${i}`} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                      <button type="button" onClick={() => removeImage(i)}
                        style={{ position:'absolute', top:4, right:4, width:22, height:22, borderRadius:'50%', background:'rgba(239,68,68,0.9)', border:'none', color:'#fff', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, boxShadow:'0 2px 8px rgba(0,0,0,0.4)' }}>
                        ✕
                      </button>
                      <div style={{ position:'absolute', bottom:4, left:4, fontSize:10, background:'rgba(0,0,0,0.6)', color:'#fff', borderRadius:4, padding:'1px 5px' }}>
                        {(images[i]?.size / 1024).toFixed(0)}KB
                      </div>
                    </div>
                  ))}
                  {images.length < 5 && (
                    <button type="button" onClick={() => galleryRef.current?.click()}
                      style={{ width:110, height:85, borderRadius:10, border:'2px dashed var(--glass-border)', background:'rgba(255,255,255,0.03)', color:'var(--text-muted)', fontSize:22, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.2s' }}
                      onMouseOver={e => { e.currentTarget.style.borderColor='rgba(99,102,241,0.5)'; e.currentTarget.style.background='rgba(99,102,241,0.05)'; }}
                      onMouseOut={e => { e.currentTarget.style.borderColor='var(--glass-border)'; e.currentTarget.style.background='rgba(255,255,255,0.03)'; }}>
                      ➕
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Summary */}
            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid var(--glass-border)', borderRadius:'var(--r-sm)', padding:'1rem', marginBottom:'1rem' }}>
              <div className="section-label">📋 Submission Summary</div>
              <div style={{ fontSize:14, color:'var(--text-primary)', fontWeight:700, marginBottom:6 }}>{form.title}</div>
              <div style={{ fontSize:13, color:'var(--text-muted)' }}>📂 {form.category}</div>
              <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:3 }}>📍 {form.address}{form.area?`, ${form.area}`:''}</div>
              {form.lat && <div style={{ fontSize:13, color:'#22c55e', marginTop:3 }}>🗺️ GPS: {form.lat}, {form.lng}</div>}
              {route && <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:3 }}>🏛️ Routed to: {route.dept}</div>}
              {previews.length > 0 && <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:3 }}>📷 {previews.length} photo{previews.length>1?'s':''} attached</div>}
            </div>

            <div style={{ display:'flex', gap:8, justifyContent:'space-between' }}>
              <button type="button" className="btn btn-glass" onClick={() => setStep(1)}>← Back</button>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy
                  ? <><span className="spinner-sm" style={{ borderTopColor:'#fff', borderColor:'rgba(255,255,255,.2)' }} /> Submitting…</>
                  : '🚀 Submit Report'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}