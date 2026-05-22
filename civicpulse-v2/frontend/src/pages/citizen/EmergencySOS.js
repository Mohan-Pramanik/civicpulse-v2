import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createIssue } from '../../api';
import { useToast } from '../../context/ToastContext';

const EMERGENCY_TYPES = [
  { key:'flood',        label:'Flood / Water Logging',  icon:'🌊', dept:'KMC Water Supply Department',     color:'#06b6d4', desc:'Severe flooding or waterlogging blocking roads' },
  { key:'fire_hazard',  label:'Fire Hazard / Gas Leak', icon:'🔥', dept:'KMC General Grievance Cell',      color:'#ef4444', desc:'Open fire, gas leak, electrical fire risk' },
  { key:'road_collapse',label:'Road Cave-in / Collapse', icon:'⚠️', dept:'Public Works Department (PWD)',   color:'#f59e0b', desc:'Sudden road collapse or sinkhole' },
  { key:'power_outage', label:'Power Outage',            icon:'⚡', dept:'CESC / KMC Lighting Division',   color:'#fbbf24', desc:'Complete power failure in area' },
  { key:'sewage_burst', label:'Sewage Pipe Burst',       icon:'💧', dept:'KMC Water Supply Department',     color:'#8b5cf6', desc:'Major sewage overflow causing health hazard' },
  { key:'encroachment', label:'Violent Encroachment',    icon:'🚨', dept:'KMC Enforcement Team',            color:'#ef4444', desc:'Violent illegal encroachment requiring immediate action' },
];

const HELPLINES = [
  { label:'Police',                 number:'100',     icon:'👮', color:'#6366f1' },
  { label:'Fire Brigade',           number:'101',     icon:'🚒', color:'#ef4444' },
  { label:'Ambulance',              number:'102',     icon:'🚑', color:'#22c55e' },
  { label:'Disaster Management',    number:'1070',    icon:'🆘', color:'#f59e0b' },
  { label:'KMC Helpline',           number:'1800-103-5226', icon:'🏛️', color:'#06b6d4' },
  { label:'Women Helpline',         number:'1091',    icon:'👩', color:'#ec4899' },
  { label:'Child Helpline',         number:'1098',    icon:'👶', color:'#a78bfa' },
  { label:'Senior Citizen Helpline',number:'14567',   icon:'👴', color:'#fb923c' },
];

export default function EmergencySOS() {
  const [selected,  setSelected]  = useState(null);
  const [location,  setLocation]  = useState('');
  const [desc,      setDesc]      = useState('');
  const [locBusy,   setLocBusy]   = useState(false);
  const [gps,       setGps]       = useState(null);
  const [submitting,setSubmitting]= useState(false);
  const [submitted, setSubmitted] = useState(null);
  const { toast }  = useToast();
  const navigate   = useNavigate();

  const getGPS = () => {
    if (!navigator.geolocation) return toast('GPS not available','error');
    setLocBusy(true);
    navigator.geolocation.getCurrentPosition(
      p => { setGps({ lat:p.coords.latitude.toFixed(5), lng:p.coords.longitude.toFixed(5) }); setLocBusy(false); toast('📡 GPS location captured'); },
      () => { toast('Could not get GPS','error'); setLocBusy(false); }
    );
  };

  const handleSubmit = async () => {
    if (!selected) return toast('Select emergency type','error');
    if (!location.trim()) return toast('Enter your location','error');
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('title', `🆘 EMERGENCY: ${selected.label}`);
      fd.append('description', desc || `Emergency report: ${selected.label}. Location: ${location}`);
      fd.append('category', 'other');
      fd.append('priority', 'critical');
      fd.append('address', location);
      if (gps) { fd.append('lat', gps.lat); fd.append('lng', gps.lng); }
      const r = await createIssue(fd);
      setSubmitted(r.data.issue);
      toast(`🆘 Emergency reported! Ticket: ${r.data.issue.ticketId}`);
    } catch { toast('Failed to submit — please call 100 directly','error'); }
    setSubmitting(false);
  };

  if (submitted) return (
    <div className="page page-narrow">
      <div className="card fade-up" style={{ textAlign:'center', padding:'3rem 2rem', background:'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(6,182,212,0.05))', borderColor:'rgba(34,197,94,0.3)' }}>
        <div style={{ fontSize:60, marginBottom:16, filter:'drop-shadow(0 0 20px rgba(34,197,94,0.5))' }}>✅</div>
        <div style={{ fontFamily:'var(--f-display)', fontSize:22, fontWeight:900, color:'var(--text-primary)', marginBottom:8 }}>Emergency Reported!</div>
        <div style={{ fontSize:16, fontWeight:700, background:'linear-gradient(135deg,#6366f1,#22c55e)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', marginBottom:16 }}>
          Ticket: {submitted.ticketId}
        </div>
        <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:24 }}>
          Your emergency has been flagged as <strong style={{ color:'#ef4444' }}>CRITICAL</strong> and routed to <strong style={{ color:'var(--text-primary)' }}>{selected?.dept}</strong>. Authorities have been notified.
        </div>
        <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:'var(--r-sm)', padding:'12px 16px', marginBottom:20, fontSize:13, color:'#f87171' }}>
          ⚠️ If life is in immediate danger, call <strong>100 (Police)</strong> or <strong>102 (Ambulance)</strong> now.
        </div>
        <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
          <button className="btn btn-primary" onClick={() => navigate(`/issues/${submitted._id}`)}>Track My Report →</button>
          <button className="btn btn-glass" onClick={() => { setSubmitted(null); setSelected(null); setLocation(''); setDesc(''); setGps(null); }}>Report Another</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="page page-narrow">
      {/* Header */}
      <div className="card fade-up" style={{ marginBottom:'1.25rem', background:'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(245,158,11,0.05))', borderColor:'rgba(239,68,68,0.3)', padding:'1.25rem 1.5rem' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
          <div style={{ fontSize:32, filter:'drop-shadow(0 0 12px rgba(239,68,68,0.6))' }}>🆘</div>
          <div>
            <div style={{ fontFamily:'var(--f-display)', fontSize:20, fontWeight:900, color:'#f87171' }}>Emergency SOS</div>
            <div style={{ fontSize:13, color:'var(--text-muted)' }}>For immediate civic emergencies only — critical priority, auto-routed</div>
          </div>
        </div>
        <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'var(--r-sm)', padding:'10px 14px', fontSize:12, color:'#f87171', display:'flex', gap:8, alignItems:'center' }}>
          ⚠️ For life-threatening emergencies, call <strong>100</strong> (Police) or <strong>102</strong> (Ambulance) immediately.
        </div>
      </div>

      {/* Quick Helplines */}
      <div className="card fade-up d1" style={{ marginBottom:'1.25rem' }}>
        <div className="section-label">📞 Emergency Helplines</div>
        <div className="grid-4" style={{ gap:8 }}>
          {HELPLINES.map(h => (
            <a key={h.number} href={`tel:${h.number}`}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, padding:'12px 8px', background:`${h.color}10`, border:`1px solid ${h.color}25`, borderRadius:'var(--r-sm)', textDecoration:'none', transition:'all 0.2s', cursor:'pointer' }}
              onMouseOver={e => { e.currentTarget.style.background=`${h.color}20`; e.currentTarget.style.transform='translateY(-2px)'; }}
              onMouseOut={e => { e.currentTarget.style.background=`${h.color}10`; e.currentTarget.style.transform=''; }}>
              <span style={{ fontSize:22 }}>{h.icon}</span>
              <span style={{ fontFamily:'var(--f-display)', fontSize:14, fontWeight:800, color:h.color }}>{h.number}</span>
              <span style={{ fontSize:10, color:'var(--text-muted)', textAlign:'center', lineHeight:1.3 }}>{h.label}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Emergency Type Selection */}
      <div className="card fade-up d2" style={{ marginBottom:'1.25rem' }}>
        <div className="section-label">🚨 Select Emergency Type</div>
        <div className="grid-2" style={{ gap:10 }}>
          {EMERGENCY_TYPES.map(t => (
            <button key={t.key} type="button"
              style={{ display:'flex', alignItems:'center', gap:12, padding:'14px', background: selected?.key===t.key ? `${t.color}15` : 'rgba(255,255,255,0.03)', border:`2px solid ${selected?.key===t.key ? t.color : 'var(--glass-border)'}`, borderRadius:'var(--r)', cursor:'pointer', textAlign:'left', transition:'all 0.2s', boxShadow: selected?.key===t.key ? `0 0 16px ${t.color}30` : 'none' }}
              onClick={() => setSelected(t)}>
              <span style={{ fontSize:26, flexShrink:0 }}>{t.icon}</span>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', fontFamily:'var(--f-display)', marginBottom:3 }}>{t.label}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)', lineHeight:1.4 }}>{t.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Location & Details */}
      <div className="card fade-up d3" style={{ marginBottom:'1.25rem' }}>
        <div className="section-label">📍 Your Location</div>
        <div className="form-group">
          <label className="form-label">Exact address *</label>
          <div className="input-wrap">
            <span className="input-icon">📍</span>
            <input className="form-control" placeholder="e.g. 12 Park Street, near Dalhousie Square" value={location} onChange={e => setLocation(e.target.value)} required />
          </div>
        </div>
        <div style={{ display:'flex', gap:8, marginBottom:'1rem' }}>
          <button type="button" className="btn btn-glass" onClick={getGPS} disabled={locBusy}>
            {locBusy ? '📡 Getting…' : '📡 Use GPS Location'}
          </button>
          {gps && <span style={{ fontSize:12, color:'#22c55e', display:'flex', alignItems:'center', gap:4 }}>✅ GPS: {gps.lat}, {gps.lng}</span>}
        </div>
        <div className="form-group">
          <label className="form-label">Additional details (optional)</label>
          <textarea className="form-control" rows={2} placeholder="Describe the situation…" value={desc} onChange={e => setDesc(e.target.value)} />
        </div>

        {selected && (
          <div style={{ background:`${selected.color}10`, border:`1px solid ${selected.color}25`, borderRadius:'var(--r-sm)', padding:'10px 14px', marginBottom:'1rem', fontSize:12 }}>
            <div style={{ color:selected.color, fontWeight:700, fontFamily:'var(--f-display)', marginBottom:3 }}>⚡ Auto-routed to: {selected.dept}</div>
            <div style={{ color:'var(--text-muted)' }}>Priority: CRITICAL · Response: within 2–4 hours</div>
          </div>
        )}

        <button className="btn btn-full" disabled={submitting || !selected || !location.trim()}
          style={{ background:'linear-gradient(135deg, #ef4444, #f59e0b)', color:'#fff', height:48, fontSize:15, fontWeight:700, boxShadow:'0 4px 20px rgba(239,68,68,0.4)', border:'none' }}
          onClick={handleSubmit}>
          {submitting
            ? <><span className="spinner-sm" style={{ borderTopColor:'#fff', borderColor:'rgba(255,255,255,.2)' }} /> Submitting Emergency…</>
            : '🆘 Submit Emergency Report'}
        </button>
      </div>
    </div>
  );
}