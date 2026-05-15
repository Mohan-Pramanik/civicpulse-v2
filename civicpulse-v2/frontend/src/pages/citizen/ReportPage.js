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

const STEPS = ['Details', 'Location', 'Evidence'];

const initForm = { title:'', description:'', category:'', priority:'medium', address:'', landmark:'', area:'', ward:'', pincode:'', lat:'', lng:'' };

export default function ReportPage() {
  const [step,    setStep]    = useState(0);
  const [form,    setForm]    = useState(initForm);
  const [images,  setImages]  = useState([]);
  const [error,   setError]   = useState('');
  const [busy,    setBusy]    = useState(false);
  const [locBusy, setLocBusy] = useState(false);
  const { toast } = useToast();
  const navigate  = useNavigate();

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const route = ROUTING[form.category];

  const getGPS = () => {
    if (!navigator.geolocation) return toast('Geolocation not supported', 'error');
    setLocBusy(true);
    navigator.geolocation.getCurrentPosition(
      p => { setForm(f => ({ ...f, lat: p.coords.latitude.toFixed(5), lng: p.coords.longitude.toFixed(5) })); setLocBusy(false); },
      () => { toast('Could not get location', 'error'); setLocBusy(false); }
    );
  };

  const submit = async e => {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
      images.forEach(img => fd.append('images', img));
      const r = await createIssue(fd);
      toast(`✅ Ticket ${r.data.issue.ticketId} submitted!`);
      navigate('/track');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit. Try again.');
    }
    setBusy(false);
  };

  return (
    <div className="page page-narrow">
      <div className="page-header fade-up">
        <div>
          <h1>Report an Issue</h1>
          <p>Automatically routed to the correct city department</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="fade-up d1" style={{ display:'flex', alignItems:'center', gap:8, marginBottom:'1.5rem' }}>
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <div style={{
              display:'flex', alignItems:'center', gap:7, cursor:'pointer',
              opacity: i > step ? 0.4 : 1, transition:'opacity 0.3s',
            }} onClick={() => i < step && setStep(i)}>
              <div style={{
                width:30, height:30, borderRadius:'50%',
                background: i <= step ? 'linear-gradient(135deg, #6366f1, #22c55e)' : 'rgba(255,255,255,0.08)',
                border: `1px solid ${i <= step ? 'transparent' : 'var(--glass-border)'}`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:12, fontWeight:700, color:'#fff',
                boxShadow: i === step ? '0 0 16px rgba(99,102,241,0.5)' : 'none',
                transition:'all 0.3s',
              }}>
                {i < step ? '✓' : i + 1}
              </div>
              <span style={{ fontSize:13, fontWeight: i === step ? 700 : 500, color: i === step ? 'var(--text-primary)' : 'var(--text-muted)', fontFamily:'var(--f-display)' }}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div style={{ flex:1, height:1, background: i < step ? 'linear-gradient(90deg, #6366f1, #22c55e)' : 'var(--border)', borderRadius:1 }} />}
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
              <div className="input-wrap"><span className="input-icon">📌</span>
                <input className="form-control" placeholder="e.g. Large pothole causing accidents on Park Street" value={form.title} onChange={set('title')} required />
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

            {route && (
              <div style={{ background:`linear-gradient(135deg, ${route.color}15, ${route.color}08)`, border:`1px solid ${route.color}30`, borderRadius:'var(--r-sm)', padding:'12px 16px', marginBottom:'1rem' }}>
                <div style={{ fontSize:12, color:route.color, fontWeight:700, fontFamily:'var(--f-display)', textTransform:'uppercase', letterSpacing:'.05em' }}>⚡ Auto-routed to</div>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', marginTop:4 }}>{route.dept}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>Expected: {route.eta}</div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Description *</label>
              <textarea className="form-control" placeholder="Describe the problem clearly — severity, impact, how long it's been there…" value={form.description} onChange={set('description')} required />
            </div>

            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <button type="button" className="btn btn-primary" onClick={() => { if (!form.title || !form.category || !form.description) { setError('Please fill all required fields'); return; } setError(''); setStep(1); }}>
                Next: Location →
              </button>
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
            </div>
            <div className="grid-2" style={{ marginBottom:'1rem' }}>
              <div className="form-group">
                <label className="form-label">Latitude</label>
                <input className="form-control" placeholder="22.5726" value={form.lat} onChange={set('lat')} type="number" step="any" />
              </div>
              <div className="form-group" style={{ display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
                <button type="button" className="btn btn-glass" onClick={getGPS} disabled={locBusy}>
                  {locBusy ? '📡 Getting…' : '📡 Use My GPS Location'}
                </button>
              </div>
            </div>
            {form.lat && (
              <div className="alert alert-success" style={{ marginBottom:'1rem' }}>
                ✅ GPS captured: {form.lat}, {form.lng}
              </div>
            )}
            <div style={{ display:'flex', gap:8, justifyContent:'space-between' }}>
              <button type="button" className="btn btn-glass" onClick={() => setStep(0)}>← Back</button>
              <button type="button" className="btn btn-primary" onClick={() => { if (!form.address) { setError('Please enter the street address'); return; } setError(''); setStep(2); }}>
                Next: Evidence →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Evidence & Submit */}
        {step === 2 && (
          <div className="card fade-up d1">
            <div className="section-label">📷 Photo Evidence</div>
            <div className="form-group">
              <label className="form-label">Upload photos (up to 5)</label>
              <input type="file" className="form-control" accept="image/*" multiple
                onChange={e => setImages(Array.from(e.target.files).slice(0, 5))} />
              {images.length > 0 && (
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:10 }}>
                  {images.map((img, i) => (
                    <div key={i} style={{ background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:8, padding:'4px 12px', fontSize:12, color:'#818cf8' }}>
                      🖼 {img.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summary */}
            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid var(--glass-border)', borderRadius:'var(--r-sm)', padding:'1rem', marginBottom:'1rem' }}>
              <div className="section-label">📋 Issue Summary</div>
              <div style={{ fontSize:14, color:'var(--text-primary)', fontWeight:700, marginBottom:6 }}>{form.title}</div>
              <div style={{ fontSize:13, color:'var(--text-muted)' }}>📂 {form.category} · ⚡ {form.priority}</div>
              <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:3 }}>📍 {form.address}{form.area ? `, ${form.area}` : ''}</div>
              {route && <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:3 }}>🏛️ {route.dept}</div>}
            </div>

            <div style={{ display:'flex', gap:8, justifyContent:'space-between' }}>
              <button type="button" className="btn btn-glass" onClick={() => setStep(1)}>← Back</button>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? <><span className="spinner-sm" style={{ borderTopColor:'#fff', borderColor:'rgba(255,255,255,.2)' }} /> Submitting…</> : '🚀 Submit Report'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
