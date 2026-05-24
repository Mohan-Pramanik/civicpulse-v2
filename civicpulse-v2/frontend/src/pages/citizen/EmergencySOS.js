import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createIssue } from '../../api';
import { useToast } from '../../context/ToastContext';

const EMERGENCY_TYPES = [
  { key:'flood',        label:'Flood / Water Logging',   icon:'🌊', dept:'KMC Water Supply Department',   color:'#06b6d4', desc:'Severe flooding or waterlogging blocking roads' },
  { key:'fire_hazard',  label:'Fire Hazard / Gas Leak',  icon:'🔥', dept:'KMC General Grievance Cell',    color:'#ef4444', desc:'Open fire, gas leak, electrical fire risk' },
  { key:'road_collapse',label:'Road Cave-in / Collapse', icon:'⚠️', dept:'Public Works Department (PWD)', color:'#f59e0b', desc:'Sudden road collapse or sinkhole' },
  { key:'power_outage', label:'Power Outage',            icon:'⚡', dept:'CESC / KMC Lighting Division',  color:'#fbbf24', desc:'Complete power failure in area' },
  { key:'sewage_burst', label:'Sewage Pipe Burst',       icon:'💧', dept:'KMC Water Supply Department',   color:'#8b5cf6', desc:'Major sewage overflow causing health hazard' },
  { key:'encroachment', label:'Violent Encroachment',    icon:'🚨', dept:'KMC Enforcement Team',          color:'#ef4444', desc:'Violent illegal encroachment requiring immediate action' },
];

const HELPLINES = [
  { label:'Police',            number:'100',           icon:'👮', color:'#6366f1' },
  { label:'Fire Brigade',      number:'101',           icon:'🚒', color:'#ef4444' },
  { label:'Ambulance',         number:'102',           icon:'🚑', color:'#22c55e' },
  { label:'Disaster Mgmt',     number:'1070',          icon:'🆘', color:'#f59e0b' },
  { label:'KMC Helpline',      number:'1800-103-5226', icon:'🏛️', color:'#06b6d4' },
  { label:'Women Helpline',    number:'1091',          icon:'👩', color:'#ec4899' },
  { label:'Child Helpline',    number:'1098',          icon:'👶', color:'#a78bfa' },
  { label:'Senior Citizen',    number:'14567',         icon:'👴', color:'#fb923c' },
];

const SOS_STYLE = `
  @keyframes sosPulse {
    0%   { box-shadow: 0 0 0 0   rgba(239,68,68,0.7), 0 0 0 0   rgba(239,68,68,0.4); }
    50%  { box-shadow: 0 0 0 28px rgba(239,68,68,0),   0 0 0 52px rgba(239,68,68,0); }
    100% { box-shadow: 0 0 0 0   rgba(239,68,68,0.7), 0 0 0 0   rgba(239,68,68,0.4); }
  }
  @keyframes sosRing {
    0%   { transform: scale(1);   opacity: 0.6; }
    100% { transform: scale(1.9); opacity: 0; }
  }
  @keyframes sosEntrance {
    from { opacity:0; transform: scale(0.85) translateY(20px); }
    to   { opacity:1; transform: scale(1)    translateY(0); }
  }
  @keyframes formSlideIn {
    from { opacity:0; transform: translateY(24px); }
    to   { opacity:1; transform: translateY(0); }
  }
  .sos-btn {
    width: 160px; height: 160px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 35%, #ff6b6b, #ef4444, #b91c1c);
    border: 4px solid rgba(255,255,255,0.2);
    color: #fff;
    font-size: 28px;
    font-weight: 900;
    font-family: var(--f-display, sans-serif);
    letter-spacing: .1em;
    cursor: pointer;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 4px;
    animation: sosPulse 2s infinite, sosEntrance 0.5s cubic-bezier(.22,.68,0,1.2);
    transition: transform 0.15s, filter 0.15s;
    position: relative;
    z-index: 2;
    outline: none;
    user-select: none;
  }
  .sos-btn:hover  { transform: scale(1.06); filter: brightness(1.1); }
  .sos-btn:active { transform: scale(0.96); }
  .sos-ring {
    position: absolute;
    width: 160px; height: 160px;
    border-radius: 50%;
    border: 3px solid rgba(239,68,68,0.5);
    animation: sosRing 1.8s ease-out infinite;
    pointer-events: none;
  }
  .sos-ring:nth-child(2) { animation-delay: 0.6s; }
  .sos-ring:nth-child(3) { animation-delay: 1.2s; }
  .sos-form { animation: formSlideIn 0.35s cubic-bezier(.22,.68,0,1.1); }
`;

export default function EmergencySOS() {
  const [activated, setActivated] = useState(false);   // ← SOS button pressed
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
      p => { setGps({ lat:p.coords.latitude.toFixed(5), lng:p.coords.longitude.toFixed(5) }); setLocBusy(false); toast('📡 GPS captured'); },
      () => { toast('Could not get GPS','error'); setLocBusy(false); }
    );
  };

  const handleSubmit = async () => {
    if (!selected)       return toast('Select emergency type','error');
    if (!location.trim()) return toast('Enter your location','error');
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('title',       `🆘 EMERGENCY: ${selected.label}`);
      fd.append('description', desc || `Emergency: ${selected.label} at ${location}`);
      fd.append('category',    'other');
      fd.append('priority',    'critical');
      fd.append('address',     location);
      if (gps) { fd.append('lat', gps.lat); fd.append('lng', gps.lng); }
      const r = await createIssue(fd);
      setSubmitted(r.data.issue);
      toast(`🆘 Emergency reported! Ticket: ${r.data.issue.ticketId}`);
    } catch { toast('Failed — please call 100 directly','error'); }
    setSubmitting(false);
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (submitted) return (
    <div className="page page-narrow">
      <div className="card fade-up" style={{ textAlign:'center', padding:'3rem 2rem', background:'linear-gradient(135deg,rgba(34,197,94,0.1),rgba(6,182,212,0.05))', borderColor:'rgba(34,197,94,0.3)' }}>
        <div style={{ fontSize:64, marginBottom:16, filter:'drop-shadow(0 0 24px rgba(34,197,94,0.5))' }}>✅</div>
        <div style={{ fontFamily:'var(--f-display)', fontSize:22, fontWeight:900, color:'var(--text-primary)', marginBottom:8 }}>Emergency Reported!</div>
        <div style={{ fontSize:16, fontWeight:700, background:'linear-gradient(135deg,#6366f1,#22c55e)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', marginBottom:16 }}>
          Ticket: {submitted.ticketId}
        </div>
        <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:20 }}>
          Flagged <strong style={{ color:'#ef4444' }}>CRITICAL</strong> · Routed to <strong style={{ color:'var(--text-primary)' }}>{selected?.dept}</strong>
        </div>
        <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:'var(--r-sm)', padding:'12px 16px', marginBottom:20, fontSize:13, color:'#f87171' }}>
          ⚠️ Life in danger? Call <strong>100 (Police)</strong> or <strong>102 (Ambulance)</strong> now.
        </div>
        <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
          <button className="btn btn-primary" onClick={() => navigate(`/issues/${submitted._id}`)}>Track Report →</button>
          <button className="btn btn-glass" onClick={() => { setSubmitted(null); setActivated(false); setSelected(null); setLocation(''); setDesc(''); setGps(null); }}>Report Another</button>
        </div>
      </div>
    </div>
  );

  // ── SOS landing screen ────────────────────────────────────────────────────
  if (!activated) return (
    <div className="page page-narrow">
      <style>{SOS_STYLE}</style>

      {/* Big SOS button */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'55vh', gap:28 }}>
        <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center', width:220, height:220 }}>
          <div className="sos-ring" />
          <div className="sos-ring" />
          <div className="sos-ring" />
          <button className="sos-btn" onClick={() => setActivated(true)}>
            <span style={{ fontSize:36, lineHeight:1 }}>🆘</span>
            <span style={{ fontSize:32, lineHeight:1 }}>SOS</span>
            <span style={{ fontSize:11, opacity:0.85, fontWeight:600, letterSpacing:'.06em' }}>TAP TO REPORT</span>
          </button>
        </div>
        <div style={{ textAlign:'center', maxWidth:300 }}>
          <div style={{ fontSize:16, fontWeight:700, color:'#f87171', fontFamily:'var(--f-display)', marginBottom:6 }}>
            Civic Emergency?
          </div>
          <div style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.6 }}>
            Tap the SOS button to report a critical civic emergency — flood, road collapse, power failure, and more.
          </div>
        </div>

        {/* Life-threat warning */}
        <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'var(--r)', padding:'12px 20px', maxWidth:340, textAlign:'center', fontSize:12, color:'#f87171', lineHeight:1.6 }}>
          ⚠️ For <strong>life-threatening</strong> emergencies call directly:
          <div style={{ display:'flex', justifyContent:'center', gap:16, marginTop:10, flexWrap:'wrap' }}>
            {[['👮','Police','100'],['🚑','Ambulance','102'],['🚒','Fire','101']].map(([icon,label,num]) => (
              <a key={num} href={`tel:${num}`} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, textDecoration:'none' }}>
                <span style={{ fontSize:20 }}>{icon}</span>
                <span style={{ fontSize:14, fontWeight:800, color:'#f87171' }}>{num}</span>
                <span style={{ fontSize:10, color:'var(--text-muted)' }}>{label}</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Quick helplines at bottom */}
      <div className="card fade-up" style={{ marginTop:'1rem' }}>
        <div className="section-label">📞 All Emergency Helplines</div>
        <div className="grid-4" style={{ gap:8 }}>
          {HELPLINES.map(h => (
            <a key={h.number} href={`tel:${h.number}`}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, padding:'12px 6px', background:`${h.color}10`, border:`1px solid ${h.color}20`, borderRadius:'var(--r-sm)', textDecoration:'none', transition:'all 0.2s' }}
              onMouseOver={e => { e.currentTarget.style.background=`${h.color}20`; e.currentTarget.style.transform='translateY(-2px)'; }}
              onMouseOut={e => { e.currentTarget.style.background=`${h.color}10`; e.currentTarget.style.transform=''; }}>
              <span style={{ fontSize:20 }}>{h.icon}</span>
              <span style={{ fontFamily:'var(--f-display)', fontSize:13, fontWeight:800, color:h.color }}>{h.number}</span>
              <span style={{ fontSize:9, color:'var(--text-muted)', textAlign:'center', lineHeight:1.3 }}>{h.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Emergency form (after SOS pressed) ───────────────────────────────────
  return (
    <div className="page page-narrow sos-form">
      <style>{SOS_STYLE}</style>

      {/* Header */}
      <div className="card fade-up" style={{ marginBottom:'1.25rem', background:'linear-gradient(135deg,rgba(239,68,68,0.12),rgba(245,158,11,0.05))', borderColor:'rgba(239,68,68,0.3)', padding:'1.25rem 1.5rem' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
          <div style={{ fontSize:32, filter:'drop-shadow(0 0 12px rgba(239,68,68,0.6))' }}>🆘</div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:'var(--f-display)', fontSize:20, fontWeight:900, color:'#f87171' }}>Emergency SOS</div>
            <div style={{ fontSize:13, color:'var(--text-muted)' }}>Critical priority — auto-routed to the right department</div>
          </div>
          <button className="btn btn-glass btn-sm" onClick={() => setActivated(false)}>← Back</button>
        </div>
        <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'var(--r-sm)', padding:'10px 14px', fontSize:12, color:'#f87171' }}>
          ⚠️ Life in danger? Call <strong>100</strong> (Police) or <strong>102</strong> (Ambulance) immediately.
        </div>
      </div>

      {/* Emergency type */}
      <div className="card fade-up d1" style={{ marginBottom:'1.25rem' }}>
        <div className="section-label">🚨 Select Emergency Type</div>
        <div className="grid-2" style={{ gap:10 }}>
          {EMERGENCY_TYPES.map(type => (
            <button key={type.key} type="button"
              style={{ display:'flex', alignItems:'center', gap:12, padding:'14px', background: selected?.key===type.key ? `${type.color}15` : 'rgba(255,255,255,0.03)', border:`2px solid ${selected?.key===type.key ? type.color : 'var(--glass-border)'}`, borderRadius:'var(--r)', cursor:'pointer', textAlign:'left', transition:'all 0.2s', boxShadow: selected?.key===type.key ? `0 0 16px ${type.color}30` : 'none' }}
              onClick={() => setSelected(type)}>
              <span style={{ fontSize:26, flexShrink:0 }}>{type.icon}</span>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', fontFamily:'var(--f-display)', marginBottom:2 }}>{type.label}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)', lineHeight:1.4 }}>{type.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Location */}
      <div className="card fade-up d2" style={{ marginBottom:'1.25rem' }}>
        <div className="section-label">📍 Your Location</div>
        <div className="form-group">
          <label className="form-label">Exact address *</label>
          <div className="input-wrap">
            <span className="input-icon">📍</span>
            <input className="form-control" placeholder="e.g. 12 Park Street, near Dalhousie Square"
              value={location} onChange={e => setLocation(e.target.value)} />
          </div>
        </div>
        <div style={{ display:'flex', gap:8, marginBottom:'1rem', flexWrap:'wrap' }}>
          <button type="button" className="btn btn-glass" onClick={getGPS} disabled={locBusy}>
            {locBusy ? '📡 Getting…' : '📡 Use GPS Location'}
          </button>
          {gps && <span style={{ fontSize:12, color:'#22c55e', display:'flex', alignItems:'center', gap:4 }}>✅ {gps.lat}, {gps.lng}</span>}
        </div>
        <div className="form-group">
          <label className="form-label">Additional details (optional)</label>
          <textarea className="form-control" rows={2} placeholder="Describe the situation…" value={desc} onChange={e => setDesc(e.target.value)} />
        </div>

        {selected && (
          <div style={{ background:`${selected.color}10`, border:`1px solid ${selected.color}25`, borderRadius:'var(--r-sm)', padding:'10px 14px', marginBottom:'1rem', fontSize:12 }}>
            <div style={{ color:selected.color, fontWeight:700, marginBottom:3 }}>⚡ Auto-routed to: {selected.dept}</div>
            <div style={{ color:'var(--text-muted)' }}>Priority: CRITICAL · Response: within 2–4 hours</div>
          </div>
        )}

        <button
          className="btn btn-full"
          disabled={submitting || !selected || !location.trim()}
          style={{ background:'linear-gradient(135deg,#ef4444,#f59e0b)', color:'#fff', height:52, fontSize:16, fontWeight:800, fontFamily:'var(--f-display)', boxShadow:'0 4px 24px rgba(239,68,68,0.5)', border:'none', borderRadius:'var(--r)', letterSpacing:'.03em' }}
          onClick={handleSubmit}
        >
          {submitting
            ? <><span className="spinner-sm" style={{ borderTopColor:'#fff', borderColor:'rgba(255,255,255,.2)' }} /> Submitting…</>
            : '🆘 Submit Emergency Report'}
        </button>
      </div>
    </div>
  );
}