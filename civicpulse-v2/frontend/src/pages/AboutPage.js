import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/* ─── CSS ──────────────────────────────────────────────────────────────────── */
const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');

  @keyframes floatUp   { from{opacity:0;transform:translateY(32px)} to{opacity:1;transform:translateY(0)} }
  @keyframes lineGrow  { from{width:0} to{width:100%} }
  @keyframes numberCount { from{opacity:0;transform:scale(.7)} to{opacity:1;transform:scale(1)} }
  @keyframes glowPulse { 0%,100%{opacity:.4} 50%{opacity:.9} }
  @keyframes shimmer   {
    0%   { background-position: -600px 0; }
    100% { background-position:  600px 0; }
  }

  .about-root { font-family:'DM Sans',sans-serif; }

  /* hero */
  .ab-hero {
    position:relative; overflow:hidden;
    background: linear-gradient(160deg, #0d1220 0%, #0f1629 40%, #111827 100%);
    border-radius: var(--r); margin-bottom:1.5rem;
    padding: 3.5rem 2rem 3rem;
    border: 1px solid rgba(255,255,255,0.06);
  }
  .ab-hero-grid {
    position:absolute; inset:0; pointer-events:none;
    background-image:
      linear-gradient(rgba(99,102,241,.07) 1px, transparent 1px),
      linear-gradient(90deg, rgba(99,102,241,.07) 1px, transparent 1px);
    background-size: 40px 40px;
    mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%);
  }
  .ab-hero-glow {
    position:absolute; top:-80px; left:50%; transform:translateX(-50%);
    width:500px; height:260px;
    background: radial-gradient(ellipse, rgba(99,102,241,.2) 0%, transparent 70%);
    pointer-events:none; animation: glowPulse 4s ease-in-out infinite;
  }
  .ab-logo-wrap {
    width:72px;height:72px;border-radius:20px;
    background:linear-gradient(135deg,#6366f1,#22c55e);
    display:flex;align-items:center;justify-content:center;
    font-size:36px; margin:0 auto 1.25rem;
    box-shadow:0 8px 32px rgba(99,102,241,.45);
    animation: floatUp .6s ease both;
  }
  .ab-hero-title {
    font-family:'Syne',sans-serif;
    font-size: clamp(28px, 5vw, 42px);
    font-weight:800; text-align:center; line-height:1.15;
    color:#f1f5f9; letter-spacing:-.03em;
    margin-bottom:.75rem;
    animation: floatUp .65s .1s ease both;
  }
  .ab-hero-title span { background:linear-gradient(135deg,#818cf8,#34d399); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
  .ab-hero-sub {
    max-width:520px; margin:0 auto 2rem; text-align:center;
    font-size:15px; color:#94a3b8; line-height:1.75; font-weight:300;
    animation: floatUp .65s .18s ease both;
  }

  /* stat ticker */
  .ab-stats {
    display:flex; justify-content:center; gap:0; flex-wrap:wrap;
    border: 1px solid rgba(255,255,255,0.08); border-radius:14px;
    overflow:hidden; animation: floatUp .65s .28s ease both;
    max-width:560px; margin:0 auto;
  }
  .ab-stat {
    flex:1; min-width:100px; padding:18px 12px; text-align:center;
    position:relative;
  }
  .ab-stat + .ab-stat::before {
    content:''; position:absolute; left:0; top:20%; height:60%;
    width:1px; background:rgba(255,255,255,0.08);
  }
  .ab-stat-val {
    font-family:'Syne',sans-serif; font-size:26px; font-weight:800;
    background:linear-gradient(135deg,#818cf8,#34d399);
    -webkit-background-clip:text; -webkit-text-fill-color:transparent;
    background-clip:text; line-height:1;
    animation: numberCount .8s .4s cubic-bezier(.22,.68,0,1.2) both;
  }
  .ab-stat-lbl { font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:.08em; margin-top:5px; }

  /* section cards */
  .ab-card {
    background:rgba(255,255,255,0.025);
    border:1px solid rgba(255,255,255,0.07);
    border-radius:var(--r);
    padding:1.75rem;
    margin-bottom:1.25rem;
    position:relative; overflow:hidden;
  }
  .ab-card-accent {
    position:absolute; top:0; left:0; right:0; height:2px;
    background:linear-gradient(90deg,#6366f1,#22c55e,#06b6d4);
    background-size:200%;
    animation: shimmer 3s linear infinite;
  }
  .ab-section-label {
    font-family:'Syne',sans-serif;
    font-size:11px; font-weight:700; color:#6366f1;
    text-transform:uppercase; letter-spacing:.12em;
    display:flex; align-items:center; gap:8px; margin-bottom:1.25rem;
  }
  .ab-section-label::after {
    content:''; flex:1; height:1px;
    background:linear-gradient(90deg,rgba(99,102,241,.4),transparent);
  }

  /* mission */
  .ab-mission-text {
    font-family:'Syne',sans-serif;
    font-size:clamp(18px,3vw,24px);
    font-weight:700; color:#e2e8f0;
    line-height:1.5; letter-spacing:-.02em;
  }
  .ab-mission-text em { font-style:normal; color:#818cf8; }

  /* features grid */
  .ab-features { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:12px; }
  .ab-feature {
    background:rgba(255,255,255,0.03);
    border:1px solid rgba(255,255,255,0.07);
    border-radius:12px; padding:18px 16px;
    transition:border-color .2s, transform .2s, background .2s;
    cursor:default;
  }
  .ab-feature:hover {
    border-color:rgba(99,102,241,.4);
    background:rgba(99,102,241,.05);
    transform:translateY(-3px);
  }
  .ab-feature-icon { font-size:28px; margin-bottom:10px; display:block; }
  .ab-feature-title { font-family:'Syne',sans-serif; font-size:14px; font-weight:700; color:#f1f5f9; margin-bottom:5px; }
  .ab-feature-desc  { font-size:12px; color:#64748b; line-height:1.6; }

  /* how it works steps */
  .ab-steps { display:flex; flex-direction:column; gap:0; }
  .ab-step  { display:flex; gap:20px; align-items:flex-start; padding:16px 0; border-bottom:1px solid rgba(255,255,255,0.05); }
  .ab-step:last-child { border-bottom:none; }
  .ab-step-num {
    width:36px; height:36px; border-radius:10px; flex-shrink:0;
    background:linear-gradient(135deg,#6366f1,#8b5cf6);
    display:flex; align-items:center; justify-content:center;
    font-family:'Syne',sans-serif; font-size:16px; font-weight:800; color:#fff;
    box-shadow:0 4px 16px rgba(99,102,241,.35);
  }
  .ab-step-title { font-family:'Syne',sans-serif; font-size:14px; font-weight:700; color:#f1f5f9; margin-bottom:4px; }
  .ab-step-desc  { font-size:12px; color:#64748b; line-height:1.6; }

  /* dept table */
  .ab-dept { display:flex; gap:14px; padding:14px 0; border-bottom:1px solid rgba(255,255,255,0.05); align-items:flex-start; }
  .ab-dept:last-child { border-bottom:none; }
  .ab-dept-icon {
    width:40px;height:40px;border-radius:10px;flex-shrink:0;
    display:flex;align-items:center;justify-content:center;font-size:18px;
    background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.2);
  }
  .ab-dept-name { font-family:'Syne',sans-serif; font-size:13px; font-weight:700; color:#f1f5f9; margin-bottom:3px; }
  .ab-dept-handles { font-size:11px; color:#64748b; margin-bottom:4px; }
  .ab-dept-email  { font-size:11px; color:#818cf8; text-decoration:none; }
  .ab-dept-email:hover { text-decoration:underline; }

  /* tech stack pills */
  .ab-pills { display:flex; flex-wrap:wrap; gap:8px; }
  .ab-pill  {
    font-size:11px; font-weight:600; font-family:'Syne',sans-serif;
    padding:5px 12px; border-radius:20px;
    background:rgba(255,255,255,0.05);
    border:1px solid rgba(255,255,255,0.1);
    color:#94a3b8;
    transition: all .2s;
  }
  .ab-pill:hover { border-color:rgba(99,102,241,.5); color:#a5b4fc; background:rgba(99,102,241,.08); }

  /* contact card */
  .ab-contact-item { display:flex; gap:12px; align-items:center; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.05); }
  .ab-contact-item:last-child { border-bottom:none; }
  .ab-contact-icon {
    width:34px;height:34px;border-radius:9px;flex-shrink:0;
    display:flex;align-items:center;justify-content:center;font-size:16px;
    background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);
  }
  .ab-contact-label { font-size:10px; color:#475569; text-transform:uppercase; letter-spacing:.06em; }
  .ab-contact-val   { font-size:13px; font-weight:500; color:#818cf8; text-decoration:none; }
  .ab-contact-val:hover { text-decoration:underline; color:#a5b4fc; }

  /* CTA */
  .ab-cta {
    text-align:center; padding:2.5rem 2rem;
    background:linear-gradient(135deg,rgba(99,102,241,.1),rgba(34,197,94,.06));
    border:1px solid rgba(99,102,241,.2);
    border-radius:var(--r); margin-bottom:1.25rem;
    position:relative; overflow:hidden;
  }
  .ab-cta-glow {
    position:absolute;top:-60px;left:50%;transform:translateX(-50%);
    width:300px;height:200px;
    background:radial-gradient(ellipse,rgba(99,102,241,.2),transparent 70%);
    pointer-events:none;
  }
  .ab-cta-title {
    font-family:'Syne',sans-serif;
    font-size:clamp(20px,3.5vw,28px); font-weight:800;
    color:#f1f5f9; letter-spacing:-.02em; margin-bottom:.5rem;
  }
  .ab-cta-sub { font-size:14px; color:#64748b; margin-bottom:1.5rem; line-height:1.6; }
  .ab-cta-btns { display:flex; gap:10px; justify-content:center; flex-wrap:wrap; }

  @media(max-width:560px) {
    .ab-hero { padding:2.5rem 1.25rem 2rem; }
    .ab-card { padding:1.25rem; }
    .ab-features { grid-template-columns:1fr 1fr; }
    .ab-stat-val { font-size:20px; }
  }
`;

/* ─── data ──────────────────────────────────────────────────────────────────── */
const FEATURES = [
  { icon:'📍', title:'Smart Issue Reporting',  desc:'Multi-step form with GPS pinning, photo evidence, and auto-routing to the right department.' },
  { icon:'🔄', title:'Real-time Tracking',     desc:'Live status timeline from pending → assigned → in progress → resolved with citizen notifications.' },
  { icon:'🆘', title:'Emergency SOS',          desc:'One-tap emergency reporting with critical priority, GPS capture, and direct helpline access.' },
  { icon:'🗺️', title:'Live Issue Map',         desc:'Interactive Leaflet map showing all civic issues plotted by priority across the city.' },
  { icon:'🏛️', title:'6 Departments',          desc:'Dedicated departments with heads and field officers for efficient resolution.' },
  { icon:'🤖', title:'AI Chatbot',             desc:'Smart assistant helping citizens report, track, and navigate the platform.' },
  { icon:'📊', title:'Admin Analytics',        desc:'Real-time dashboards with department performance, hotspot maps, and satisfaction ratings.' },
  { icon:'🌐', title:'3 Languages',            desc:'Full support for English, Bengali (বাংলা), and Hindi (हिंदी) across all pages.' },
];

const STEPS = [
  { num:'01', title:'Citizen spots an issue',      desc:'Takes a photo, pins the location on the map, selects the category.' },
  { num:'02', title:'Auto-routing to department',  desc:'System instantly routes the report to the right KMC department with CRITICAL/HIGH/MEDIUM/LOW priority.' },
  { num:'03', title:'Officer assigned',            desc:'Department head assigns the issue to a field officer in their team.' },
  { num:'04', title:'Resolution & notification',   desc:'Officer marks resolved. Citizen gets notified and can rate the resolution.' },
  { num:'05', title:'Analytics updated',           desc:'Admin dashboard reflects the resolution in real-time — stats, heat maps, satisfaction scores.' },
];

const DEPARTMENTS = [
  { icon:'🛣️', name:'Public Works Department (PWD)',    email:'pwd@civicpulse.in',          handles:'Roads, potholes, bridges, footpaths' },
  { icon:'💧', name:'KMC Water Supply Department',      email:'water@civicpulse.in',         handles:'Water supply, sewage, drainage' },
  { icon:'🗑️', name:'Sanitation & Solid Waste',         email:'sanitation@civicpulse.in',    handles:'Garbage collection, waste management' },
  { icon:'⚡', name:'CESC / KMC Lighting Division',     email:'electricity@civicpulse.in',   handles:'Street lights, electrical hazards' },
  { icon:'🏗️', name:'KMC Enforcement Team',             email:'enforcement@civicpulse.in',   handles:'Encroachment, illegal construction' },
  { icon:'📋', name:'KMC General Grievance Cell',       email:'grievance@civicpulse.in',     handles:'General civic complaints, emergencies' },
];

const TECH = ['React 18','Node.js','Express','MongoDB','Mongoose','JWT Auth','Leaflet Maps','Cloudinary','Multer','Socket.io','OpenStreetMap','Nominatim API'];

const CONTACTS = [
  { icon:'✉️', label:'General',   val:'hello@civicpulse.in',   href:'mailto:hello@civicpulse.in' },
  { icon:'🆘', label:'Emergency', val:'sos@civicpulse.in',     href:'mailto:sos@civicpulse.in' },
  { icon:'🛠️', label:'Support',   val:'support@civicpulse.in', href:'mailto:support@civicpulse.in' },
  { icon:'📞', label:'Helpdesk',  val:'+91 33 2286 1000',      href:'tel:+913322861000' },
  { icon:'🌐', label:'Website',   val:'civicpulse.in',         href:'https://civicpulse-v2.vercel.app' },
];

/* ─── component ─────────────────────────────────────────────────────────────── */
export default function AboutPage() {
  const navigate = useNavigate();
  const rootRef  = useRef(null);

  // Intersection observer for scroll-triggered animations
  useEffect(() => {
    if (!rootRef.current) return;
    const els = rootRef.current.querySelectorAll('.ab-animate');
    const io  = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.style.animation = 'floatUp .55s ease forwards';
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach(el => {
      el.style.opacity = '0';
      io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  return (
    <div className="page about-root" ref={rootRef}>
      <style>{STYLE}</style>

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <div className="ab-hero">
        <div className="ab-hero-grid" />
        <div className="ab-hero-glow" />
        <div style={{ position:'relative', zIndex:1 }}>
          <div className="ab-logo-wrap">🏙️</div>
          <h1 className="ab-hero-title">About <span>CivicPulse</span></h1>
          <p className="ab-hero-sub">
            A crowdsourced civic issue reporting and resolution system connecting
            Kolkata's citizens with the right government departments —
            making the city better, together.
          </p>
          <div className="ab-stats">
            {[['2.4k+','Issues Reported'],['68%','Resolution Rate'],['12k+','Active Citizens'],['6','Departments']].map(([v,l]) => (
              <div key={l} className="ab-stat">
                <div className="ab-stat-val">{v}</div>
                <div className="ab-stat-lbl">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── MISSION ───────────────────────────────────────────────────── */}
      <div className="ab-card ab-animate">
        <div className="ab-card-accent" />
        <div className="ab-section-label">Our Mission</div>
        <p className="ab-mission-text">
          We believe every citizen deserves a <em>voice</em>. CivicPulse gives Kolkata's residents a direct line to the departments that maintain their city — turning complaints into <em>action</em>, and frustration into <em>resolution</em>.
        </p>
      </div>

      {/* ── PLATFORM FEATURES ─────────────────────────────────────────── */}
      <div className="ab-card ab-animate">
        <div className="ab-card-accent" />
        <div className="ab-section-label">Platform Features</div>
        <div className="ab-features">
          {FEATURES.map((f, i) => (
            <div key={i} className="ab-feature">
              <span className="ab-feature-icon">{f.icon}</span>
              <div className="ab-feature-title">{f.title}</div>
              <div className="ab-feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
      <div className="ab-card ab-animate">
        <div className="ab-card-accent" />
        <div className="ab-section-label">How It Works</div>
        <div className="ab-steps">
          {STEPS.map((s, i) => (
            <div key={i} className="ab-step">
              <div className="ab-step-num">{s.num}</div>
              <div>
                <div className="ab-step-title">{s.title}</div>
                <div className="ab-step-desc">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── DEPARTMENTS + TECH ────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.25rem', marginBottom:'1.25rem' }}
        className="ab-animate" id="ab-two-col">
        <style>{`@media(max-width:640px){#ab-two-col{grid-template-columns:1fr;}}`}</style>

        {/* Departments */}
        <div className="ab-card" style={{ marginBottom:0 }}>
          <div className="ab-card-accent" />
          <div className="ab-section-label">Department Directory</div>
          {DEPARTMENTS.map((d, i) => (
            <div key={i} className="ab-dept">
              <div className="ab-dept-icon">{d.icon}</div>
              <div>
                <div className="ab-dept-name">{d.name}</div>
                <div className="ab-dept-handles">{d.handles}</div>
                <a href={`mailto:${d.email}`} className="ab-dept-email">✉️ {d.email}</a>
              </div>
            </div>
          ))}
        </div>

        {/* Tech + Contact */}
        <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
          <div className="ab-card" style={{ marginBottom:0 }}>
            <div className="ab-card-accent" />
            <div className="ab-section-label">Tech Stack</div>
            <div className="ab-pills">
              {TECH.map(t => <span key={t} className="ab-pill">{t}</span>)}
            </div>
            <div style={{ marginTop:'1.25rem', display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[
                ['Project',  'CivicPulse v2.0'],
                ['City',     'Kolkata, WB'],
                ['Year',     '2026'],
                ['License',  'MIT Open Source'],
              ].map(([k,v]) => (
                <div key={k} style={{ background:'rgba(255,255,255,0.03)', borderRadius:8, padding:'8px 10px', border:'1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize:9, color:'#475569', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:3 }}>{k}</div>
                  <div style={{ fontSize:12, fontWeight:600, color:'#94a3b8', fontFamily:'Syne,sans-serif' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="ab-card" style={{ marginBottom:0 }}>
            <div className="ab-card-accent" />
            <div className="ab-section-label">Contact</div>
            {CONTACTS.map((c, i) => (
              <div key={i} className="ab-contact-item">
                <div className="ab-contact-icon">{c.icon}</div>
                <div>
                  <div className="ab-contact-label">{c.label}</div>
                  <a href={c.href} className="ab-contact-val">{c.val}</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <div className="ab-cta ab-animate">
        <div className="ab-cta-glow" />
        <div style={{ position:'relative', zIndex:1 }}>
          <div className="ab-cta-title">Ready to make Kolkata better?</div>
          <p className="ab-cta-sub">Join thousands of citizens already using CivicPulse to report issues and hold departments accountable.</p>
          <div className="ab-cta-btns">
            <button className="btn btn-primary" onClick={() => navigate('/report')}>
              ➕ Report an Issue
            </button>
            <button className="btn btn-glass" onClick={() => navigate('/feed')}>
              🗺️ Browse Issue Map
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}