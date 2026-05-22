import React from 'react';
import { useNavigate } from 'react-router-dom';

const HELPLINES = [
  { label:'Police',              number:'100',          icon:'👮', color:'#6366f1' },
  { label:'Fire Brigade',        number:'101',          icon:'🚒', color:'#ef4444' },
  { label:'Ambulance',           number:'102',          icon:'🚑', color:'#22c55e' },
  { label:'Disaster Mgmt',       number:'1070',         icon:'🆘', color:'#f59e0b' },
  { label:'KMC Helpline',        number:'1800-103-5226',icon:'🏛️', color:'#06b6d4' },
  { label:'Women Helpline',      number:'1091',         icon:'👩', color:'#ec4899' },
  { label:'Child Helpline',      number:'1098',         icon:'👶', color:'#a78bfa' },
  { label:'Senior Citizen',      number:'14567',        icon:'👴', color:'#fb923c' },
  { label:'Anti-Corruption',     number:'1064',         icon:'⚖️', color:'#22c55e' },
  { label:'Traffic Police',      number:'1073',         icon:'🚦', color:'#f59e0b' },
  { label:'Electricity (CESC)',  number:'1912',         icon:'⚡', color:'#fbbf24' },
  { label:'Water (KMC)',         number:'1916',         icon:'💧', color:'#06b6d4' },
];

const DEPARTMENTS = [
  { name:'Public Works Department (PWD)', email:'pwd@civicpulse.in',           icon:'🛣️', handles:'Roads, potholes, bridges, footpaths' },
  { name:'KMC Water Supply Dept',         email:'water@civicpulse.in',         icon:'💧', handles:'Water supply, sewage, drainage' },
  { name:'Sanitation & Solid Waste',      email:'sanitation@civicpulse.in',    icon:'🗑️', handles:'Garbage collection, waste management' },
  { name:'CESC / KMC Lighting',           email:'electricity@civicpulse.in',   icon:'⚡', handles:'Street lights, electrical hazards' },
  { name:'KMC Enforcement Team',          email:'enforcement@civicpulse.in',   icon:'🏗️', handles:'Encroachment, illegal construction' },
  { name:'KMC General Grievance',         email:'grievance@civicpulse.in',     icon:'📋', handles:'General civic complaints' },
];

const FEATURES = [
  { icon:'📍', title:'Smart Issue Reporting', desc:'Multi-step form with GPS location, photo evidence, and automatic department routing based on issue category.' },
  { icon:'🔄', title:'Real-time Tracking', desc:'Track every status change from pending to resolved with live timeline and citizen notifications.' },
  { icon:'🆘', title:'Emergency SOS', desc:'One-click emergency reporting with critical priority and direct helpline access.' },
  { icon:'🏛️', title:'Department System', desc:'6 specialized departments with dedicated heads and field officers for efficient issue resolution.' },
  { icon:'🤖', title:'AI Assistant', desc:'Smart chatbot that helps citizens report issues, check status, and navigate the platform.' },
  { icon:'📊', title:'Analytics Dashboard', desc:'Real-time admin analytics with department performance tracking and hotspot identification.' },
];

export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="page">
      {/* Hero */}
      <div className="card fade-up" style={{ marginBottom:'1.5rem', background:'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(34,197,94,0.06))', borderColor:'rgba(99,102,241,0.2)', textAlign:'center', padding:'3rem 2rem' }}>
        <div style={{ fontSize:52, marginBottom:14, filter:'drop-shadow(0 0 20px rgba(99,102,241,0.4))' }}>🏙️</div>
        <h1 style={{ fontFamily:'var(--f-display)', fontSize:28, fontWeight:900, marginBottom:8, letterSpacing:'-.4px' }}>
          About <span style={{ background:'linear-gradient(135deg,#6366f1,#22c55e)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>CivicPulse</span>
        </h1>
        <p style={{ fontSize:15, color:'var(--text-secondary)', maxWidth:560, margin:'0 auto 1.5rem', lineHeight:1.7 }}>
          A crowdsourced civic issue reporting and resolution system connecting Kolkata's citizens with the right government departments — making the city better, together.
        </p>
        <div style={{ display:'flex', gap:16, justifyContent:'center', flexWrap:'wrap' }}>
          {[['2.4k+','Issues Reported'],['68%','Resolution Rate'],['12k+','Active Citizens'],['6','Departments']].map(([v,l]) => (
            <div key={l} style={{ textAlign:'center' }}>
              <div style={{ fontSize:22, fontWeight:900, fontFamily:'var(--f-display)', background:'linear-gradient(135deg,#6366f1,#22c55e)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>{v}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="card fade-up d1" style={{ marginBottom:'1.25rem' }}>
        <div className="section-label">⚡ Platform Features</div>
        <div className="grid-2" style={{ gap:12 }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{ display:'flex', gap:12, padding:'14px', background:'rgba(255,255,255,0.03)', border:'1px solid var(--glass-border)', borderRadius:'var(--r-sm)' }}>
              <span style={{ fontSize:26, flexShrink:0 }}>{f.icon}</span>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', fontFamily:'var(--f-display)', marginBottom:4 }}>{f.title}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.5 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Emergency Helplines */}
      <div className="card fade-up d2" style={{ marginBottom:'1.25rem' }}>
        <div className="section-label">📞 Emergency Helplines</div>
        <div className="grid-4" style={{ gap:8 }}>
          {HELPLINES.map(h => (
            <a key={h.number} href={`tel:${h.number}`}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, padding:'14px 8px', background:`${h.color}10`, border:`1px solid ${h.color}20`, borderRadius:'var(--r-sm)', textDecoration:'none', transition:'all 0.2s' }}
              onMouseOver={e => { e.currentTarget.style.background=`${h.color}20`; e.currentTarget.style.transform='translateY(-2px)'; }}
              onMouseOut={e => { e.currentTarget.style.background=`${h.color}10`; e.currentTarget.style.transform=''; }}>
              <span style={{ fontSize:24 }}>{h.icon}</span>
              <span style={{ fontFamily:'var(--f-display)', fontSize:15, fontWeight:800, color:h.color }}>{h.number}</span>
              <span style={{ fontSize:10, color:'var(--text-muted)', textAlign:'center', lineHeight:1.3 }}>{h.label}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Department Directory */}
      <div className="card fade-up d3" style={{ marginBottom:'1.25rem' }}>
        <div className="section-label">🏛️ Department Directory</div>
        {DEPARTMENTS.map((d, i) => (
          <div key={i} style={{ display:'flex', gap:14, padding:'14px 0', borderBottom: i < DEPARTMENTS.length-1 ? '1px solid var(--border)' : 'none', alignItems:'flex-start' }}>
            <span style={{ fontSize:24, flexShrink:0 }}>{d.icon}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', fontFamily:'var(--f-display)', marginBottom:3 }}>{d.name}</div>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4 }}>Handles: {d.handles}</div>
              <a href={`mailto:${d.email}`} style={{ fontSize:12, color:'#818cf8', textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
                ✉️ {d.email}
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Contact & Project Info */}
      <div className="grid-2" style={{ marginBottom:'1.25rem', gap:'1rem' }}>
        <div className="card fade-up d3">
          <div className="section-label">📬 Contact Us</div>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[
              { icon:'✉️', label:'General Enquiries',  value:'hello@civicpulse.in',         href:'mailto:hello@civicpulse.in' },
              { icon:'🆘', label:'Emergency Support',  value:'sos@civicpulse.in',            href:'mailto:sos@civicpulse.in' },
              { icon:'🛠️', label:'Technical Support',  value:'support@civicpulse.in',        href:'mailto:support@civicpulse.in' },
              { icon:'📞', label:'Helpdesk',            value:'+91 33 2286 1000',             href:'tel:+913322861000' },
              { icon:'🌐', label:'Website',             value:'civicpulse.in',               href:'https://civicpulse-v2.vercel.app' },
            ].map(c => (
              <a key={c.label} href={c.href} style={{ display:'flex', gap:10, alignItems:'center', textDecoration:'none', transition:'all 0.15s' }}
                onMouseOver={e => e.currentTarget.style.opacity='.8'}
                onMouseOut={e => e.currentTarget.style.opacity='1'}>
                <span style={{ fontSize:18, flexShrink:0 }}>{c.icon}</span>
                <div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:1 }}>{c.label}</div>
                  <div style={{ fontSize:13, color:'#818cf8', fontWeight:500 }}>{c.value}</div>
                </div>
              </a>
            ))}
          </div>
        </div>

        <div className="card fade-up d3">
          <div className="section-label">ℹ️ Project Info</div>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[
              { label:'Project Name',  value:'CivicPulse v2.0' },
              { label:'City',          value:'Kolkata, West Bengal' },
              { label:'Governing Body',value:'Kolkata Municipal Corporation (KMC)' },
              { label:'Tech Stack',    value:'MERN + React + MongoDB' },
              { label:'Launched',      value:'2026' },
              { label:'License',       value:'Open Source · MIT' },
            ].map(p => (
              <div key={p.label} style={{ display:'flex', justifyContent:'space-between', gap:8, paddingBottom:10, borderBottom:'1px solid var(--border)' }}>
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>{p.label}</span>
                <span style={{ fontSize:13, color:'var(--text-primary)', fontWeight:600, textAlign:'right' }}>{p.value}</span>
              </div>
            ))}
          </div>
          <button className="btn btn-primary btn-sm btn-full" style={{ marginTop:'1rem' }} onClick={() => navigate('/report')}>
            ➕ Report an Issue
          </button>
        </div>
      </div>
    </div>
  );
}