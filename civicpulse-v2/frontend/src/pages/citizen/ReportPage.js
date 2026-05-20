import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createIssue } from '../../api';
import { useToast } from '../../context/ToastContext';

const ROUTING = {
  road:         { dept:'Public Works Department (PWD)',   eta:'3–5 working days', color:'#6366f1' },
  water:        { dept:'KMC Water Supply Department',     eta:'2–4 working days', color:'#06b6d4' },
  waste:        { dept:'Sanitation & Solid Waste Dept',   eta:'1–2 working days', color:'#22c55e' },
  electricity:  { dept:'CESC / KMC Lighting Division',   eta:'2–3 working days', color:'#f59e0b' },
  encroachment: { dept:'KMC Enforcement Team',           eta:'5–7 working days', color:'#8b5cf6' },
  other:        { dept:'KMC General Grievance Cell',     eta:'7 working days',   color:'#94a3b8' },
};

const STEPS = ['Details', 'Location', 'Evidence & Submit'];
const initForm = { title:'', description:'', category:'', priority:'medium', address:'', landmark:'', area:'', ward:'', pincode:'', lat:'', lng:'' };

export default function ReportPage() {
  const [step,      setStep]      = useState(0);
  const [form,      setForm]      = useState(initForm);
  const [images,    setImages]    = useState([]);
  const [previews,  setPreviews]  = useState([]);
  const [error,     setError]     = useState('');
  const [busy,      setBusy]      = useState(false);
  const [locBusy,   setLocBusy]   = useState(false);
  const { toast }  = useToast();
  const navigate   = useNavigate();
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const route = ROUTING[form.category];

  const getGPS = () => {
    if (!navigator.geolocation) return toast('Geolocation not supported','error');
    setLocBusy(true);
    navigator.geolocation.getCurrentPosition(
      p => { setForm(f => ({ ...f, lat:p.coords.latitude.toFixed(5), lng:p.coords.longitude.toFixed(5) })); setLocBusy(false); },
      () => { toast('Could not get location','error'); setLocBusy(false); }
    );
  };

  const handleImages = e => {
    const files = Array.from(e.target.files).slice(0, 5);
    setImages(files);
    // Generate previews
    const readers = files.map(file => new Promise(resolve => {
      const r = new FileReader();
      r.onload = ev => resolve(ev.target.result);
      r.readAsDataURL(file);
    }));
    Promise.all(readers).then(setPreviews);
  };

  const removeImage = (i) => {
    setImages(prev => prev.filter((_, idx) => idx !== i));
    setPreviews(prev => prev.filter((_, idx) => idx !== i));
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
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit. Please try again.');
    }
    setBusy(false);
  };

  const goNext = () => {
    if (step === 0 && (!form.title || !form.category || !form.description)) {
      setError('Please fill all required fields'); return;
    }
    if (step === 1 && !form.address) {
      setError('Please enter the street address'); return;
    }
    setError(''); setStep(s => s + 1);
  };

  return (
    <div className="page page-narrow">
      <div className="page-header fade-up">
        <div>
          <h1>Report an Issue</h1>
          <p>Auto-routed to the correct city department</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="fade-up d1" style={{ display:'flex', alignItems:'center', gap:8, marginBottom:'1.5rem' }}>
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <div style={{ display:'flex', alignItems:'center', gap:7, cursor: i<step?'pointer':'default', opacity: i>step ? 0.4 : 1 }}
              onClick={() => i < step && setStep(i)}>
              <div style={{ width:30, height:30, borderRadius:'50%', background: i<=step ? 'linear-gradient(135deg,#6366f1,#22c55e)' : 'rgba(255,255,255,0.08)', border:`1px solid ${i<=step ? 'transparent' : 'var(--glass-border)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#fff', boxShadow: i===step ? '0 0 16px rgba(99,102,241,0.5)' : 'none', transition:'all 0.3s', flexShrink:0 }}>
                {i < step ? '✓' : i+1}
              </div>
              <span style={{ fontSize:13, fontWeight: i===step ? 700 : 500, color: i===step ? 'var(--text-primary)' : 'var(--text-muted)', fontFamily:'var(--f-display)', whiteSpace:'nowrap' }}>{s}</span>
            </div>
            {i < STEPS.length-1 && (
              <div style={{ flex:1, height:1, background: i < step ? 'linear-gradient(90deg,#6366f1,#22c55e)' : 'var(--border)', borderRadius:1 }} />
            )}
          </React.Fragment>
        ))}
      </div>

      {error && <div className="alert alert-error fade-up">⚠️ {error}</div>}

      <form onSubmit={submit}>
        {/* Step 0: Details */}
        {step === 0 && (
          <div className="card fade-up d2">
            <div className="section-label">📝 Issue Details</div>
            <div className="form-group">
              <label className="form-label">Issue title *</label>
              <div className="input-wrap">
                <span className="input-icon">📌</span>
                <input className="form-control" placeholder="e.g. Large pothole causing accidents" value={form.title} onChange={set('title')} required />
              </div>
            </div>
            <div className="grid-2">
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
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-control" value={form.priority} onChange={set('priority')}>
                  <option value="low">🟢 Low</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="high">🟠 High</option>
                  <option value="critical">🔴 Critical</option>
                </select>
              </div>
            </div>

            {/* Auto-routing preview */}
            {route && (
              <div style={{ background:`linear-gradient(135deg,${route.color}12,${route.color}06)`, border:`1px solid ${route.color}25`, borderRadius:'var(--r-sm)', padding:'12px 16px', marginBottom:'1rem' }}>
                <div style={{ fontSize:11, color:route.color, fontWeight:700, fontFamily:'var(--f-display)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:4 }}>⚡ Auto-routed to</div>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>{route.dept}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>Expected resolution: {route.eta}</div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Description *</label>
              <textarea className="form-control" placeholder="Describe the problem clearly — severity, impact, how long…" value={form.description} onChange={set('description')} required />
            </div>

            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <button type="button" className="btn btn-primary" onClick={goNext}>Next: Location →</button>
            </div>
          </div>
        )}

        {/* Step 1: Location */}
        {step === 1 && (
          <div className="card fade-up d1">
            <div className="section-label">📍 Location Details</div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Street address *</label>
                <div className="input-wrap">
                  <span className="input-icon">🏠</span>
                  <input className="form-control" placeholder="e.g. 12 Park Street" value={form.address} onChange={set('address')} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Area / Locality</label>
                <div className="input-wrap">
                  <span className="input-icon">🏘️</span>
                  <input className="form-control" placeholder="e.g. Ballygunge" value={form.area} onChange={set('area')} />
                </div>
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Landmark</label>
                <div className="input-wrap">
                  <span className="input-icon">🏛️</span>
                  <input className="form-control" placeholder="Near school / metro" value={form.landmark} onChange={set('landmark')} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">PIN code</label>
                <div className="input-wrap">
                  <span className="input-icon">🔢</span>
                  <input className="form-control" placeholder="700001" value={form.pincode} onChange={set('pincode')} />
                </div>
              </div>
            </div>
            <div className="grid-2" style={{ marginBottom:'1rem' }}>
              <div className="form-group">
                <label className="form-label">GPS Coordinates</label>
                <div style={{ display:'flex', gap:6 }}>
                  <input className="form-control" placeholder="Lat" value={form.lat} onChange={set('lat')} type="number" step="any" style={{ flex:1 }} />
                  <input className="form-control" placeholder="Lng" value={form.lng} onChange={set('lng')} type="number" step="any" style={{ flex:1 }} />
                </div>
              </div>
              <div className="form-group" style={{ display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
                <button type="button" className="btn btn-glass" onClick={getGPS} disabled={locBusy}>
                  {locBusy ? '📡 Getting location…' : '📡 Use My GPS Location'}
                </button>
              </div>
            </div>
            {form.lat && (
              <div className="alert alert-success" style={{ marginBottom:'1rem' }}>✅ GPS captured: {form.lat}, {form.lng}</div>
            )}
            <div style={{ display:'flex', gap:8, justifyContent:'space-between' }}>
              <button type="button" className="btn btn-glass" onClick={() => setStep(0)}>← Back</button>
              <button type="button" className="btn btn-primary" onClick={goNext}>Next: Evidence →</button>
            </div>
          </div>
        )}

        {/* Step 2: Evidence & Submit */}
        {step === 2 && (
          <div className="card fade-up d1">
            <div className="section-label">📷 Photo Evidence</div>
            <div className="form-group">
              <label className="form-label">Upload photos (up to 5)</label>
              <input type="file" className="form-control" accept="image/*" multiple onChange={handleImages} />
            </div>

            {/* Image previews */}
            {previews.length > 0 && (
              <div style={{ marginBottom:'1.25rem' }}>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:8, fontFamily:'var(--f-display)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em' }}>
                  Preview ({previews.length} photo{previews.length>1?'s':''})
                </div>
                <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                  {previews.map((src, i) => (
                    <div key={i} style={{ position:'relative', width:120, height:90, borderRadius:10, overflow:'hidden', border:'1px solid var(--glass-border)', flexShrink:0 }}>
                      <img src={src} alt={`preview-${i}`} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                      <button type="button" onClick={() => removeImage(i)}
                        style={{ position:'absolute', top:4, right:4, width:22, height:22, borderRadius:'50%', background:'rgba(239,68,68,0.85)', border:'none', color:'#fff', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid var(--glass-border)', borderRadius:'var(--r-sm)', padding:'1rem', marginBottom:'1rem' }}>
              <div className="section-label">📋 Submission Summary</div>
              <div style={{ fontSize:14, color:'var(--text-primary)', fontWeight:700, marginBottom:6 }}>{form.title}</div>
              <div style={{ fontSize:13, color:'var(--text-muted)' }}>📂 {form.category} · ⚡ {form.priority}</div>
              <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:3 }}>📍 {form.address}{form.area ? `, ${form.area}` : ''}</div>
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