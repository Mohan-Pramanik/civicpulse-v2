import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createIssue } from '../../api';
import { useToast } from '../../context/ToastContext';

const ROUTING = {
  road:         { dept:'Public Works Department (PWD)',   eta:'3–5 working days' },
  water:        { dept:'KMC Water Supply Department',     eta:'2–4 working days' },
  waste:        { dept:'Sanitation & Solid Waste Dept',   eta:'1–2 working days' },
  electricity:  { dept:'CESC / KMC Lighting Division',   eta:'2–3 working days' },
  encroachment: { dept:'KMC Enforcement Team',           eta:'5–7 working days' },
  other:        { dept:'KMC General Grievance Cell',     eta:'7 working days'   }
};

const initForm = { title:'', description:'', category:'', priority:'medium', address:'', landmark:'', area:'', ward:'', pincode:'', lat:'', lng:'' };

export default function ReportPage() {
  const [form,   setForm]   = useState(initForm);
  const [images, setImages] = useState([]);
  const [error,  setError]  = useState('');
  const [busy,   setBusy]   = useState(false);
  const [locBusy, setLocBusy] = useState(false);
  const { toast } = useToast();
  const navigate  = useNavigate();

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const route = ROUTING[form.category];

  const getGPS = () => {
    if (!navigator.geolocation) return toast('Geolocation not supported', 'error');
    setLocBusy(true);
    navigator.geolocation.getCurrentPosition(
      p => { setForm(f => ({ ...f, lat:p.coords.latitude.toFixed(5), lng:p.coords.longitude.toFixed(5) })); setLocBusy(false); },
      () => { toast('Could not get location', 'error'); setLocBusy(false); }
    );
  };

  const submit = async e => {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k,v]) => v && fd.append(k, v));
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
      <h1 style={{ fontSize:20, fontWeight:700, marginBottom:4 }}>Report an Issue</h1>
      <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:'1.5rem' }}>
        Automatically routed to the correct city department.
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={submit}>
        <div className="card">
          <div className="form-group">
            <label className="form-label">Issue title *</label>
            <input className="form-control" placeholder="e.g. Large pothole causing accidents" value={form.title} onChange={set('title')} required />
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
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Auto-route preview */}
          {route && (
            <div style={{ background:'var(--green-light)', border:'1px solid #b8ddd0', borderRadius:'var(--radius-sm)', padding:'12px 14px', marginBottom:'1rem' }}>
              <div style={{ fontSize:12, color:'var(--green-dark)', fontWeight:600 }}>⚡ Auto-routed to:</div>
              <div style={{ fontSize:14, fontWeight:700, color:'#085041', marginTop:3 }}>{route.dept}</div>
              <div style={{ fontSize:12, color:'var(--green)', marginTop:2 }}>Expected resolution: {route.eta}</div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Description *</label>
            <textarea className="form-control" placeholder="Describe the problem clearly — location details, severity, impact…" value={form.description} onChange={set('description')} required />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Street address *</label>
              <input className="form-control" placeholder="e.g. 12 Park Street" value={form.address} onChange={set('address')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Area / Locality</label>
              <input className="form-control" placeholder="e.g. Ballygunge" value={form.area} onChange={set('area')} />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Landmark</label>
              <input className="form-control" placeholder="Near school / metro / temple" value={form.landmark} onChange={set('landmark')} />
            </div>
            <div className="form-group">
              <label className="form-label">PIN code</label>
              <input className="form-control" placeholder="700001" value={form.pincode} onChange={set('pincode')} />
            </div>
          </div>

          {/* GPS */}
          <div className="grid-2" style={{ marginBottom:'1rem' }}>
            <div>
              <label className="form-label">Latitude</label>
              <input className="form-control" placeholder="22.5726" value={form.lat} onChange={set('lat')} type="number" step="any" />
            </div>
            <div style={{ display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
              <button type="button" className="btn btn-outline" onClick={getGPS} disabled={locBusy}>
                {locBusy ? '📡 Getting…' : '📡 Use GPS Location'}
              </button>
            </div>
          </div>

          {/* Images */}
          <div className="form-group">
            <label className="form-label">📷 Photo evidence (up to 5 images)</label>
            <input type="file" className="form-control" accept="image/*" multiple
              onChange={e => setImages(Array.from(e.target.files).slice(0,5))} />
            {images.length > 0 && (
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:8 }}>
                {images.map((img,i) => (
                  <span key={i} style={{ background:'var(--bg)', borderRadius:6, padding:'3px 10px', fontSize:12, color:'var(--text-secondary)' }}>
                    🖼 {img.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <button className="btn btn-primary btn-full" disabled={busy}>
            {busy ? 'Submitting…' : 'Submit Report →'}
          </button>
        </div>
      </form>
    </div>
  );
}
