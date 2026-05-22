import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LanguageContext';   // ← ADD THIS

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { t, lang, switchLang, LANGUAGES } = useLang();   // ← ADD THIS
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); setOpen(false); };
  const cls = ({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`;

  const citizenLinks = [
    { to:'/feed',    icon:'🏠', label: t.nav.feed },
    { to:'/report',  icon:'➕', label: t.nav.report },
    { to:'/track',   icon:'📍', label: t.nav.myReports },
    { to:'/sos',     icon:'🆘', label: t.nav.sos, sos:true },
    { to:'/about',   icon:'ℹ️', label: t.nav.about },
    { to:'/profile', icon:'👤', label: t.nav.profile },
  ];

  const officerLinks = [
    { to:'/officer', icon:'🛠️', label: user?.isHead ? t.nav.deptDashboard : t.nav.myDashboard },
    { to:'/feed',    icon:'🏠', label: t.nav.issueFeed },
    { to:'/about',   icon:'ℹ️', label: t.nav.about },
    { to:'/profile', icon:'👤', label: t.nav.profile },
  ];

  const adminLinks = [
    { to:'/admin',        icon:'📊', label: t.nav.dashboard },
    { to:'/admin/issues', icon:'📋', label: t.nav.allIssues },
    { to:'/admin/users',  icon:'👥', label: t.nav.users },
    { to:'/feed',         icon:'🏠', label: t.nav.issueFeed },
    { to:'/about',        icon:'ℹ️', label: t.nav.about },
    { to:'/profile',      icon:'👤', label: t.nav.profile },
  ];

  const links = user?.role === 'admin' ? adminLinks
              : user?.role === 'department' ? officerLinks
              : citizenLinks;

  const roleLabel = {
    admin: t.profile?.administrator || 'Administrator',
    department: user?.isHead ? (t.profile?.deptHead || 'Dept Head') : (t.profile?.fieldOfficer || 'Field Officer'),
    citizen: t.profile?.citizen || 'Citizen',
  };
  const roleColor = { admin:'#ef4444', department:'#06b6d4', citizen:'#22c55e' };

  // Language switcher component
  const LangSwitcher = () => (
    <div style={{ padding:'0 .75rem .75rem', borderBottom:'1px solid var(--border)' }}>
      <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--f-display)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:6 }}>
        Language
      </div>
      <div style={{ display:'flex', gap:6 }}>
        {LANGUAGES.map(l => (
          <button
            key={l.code}
            onClick={() => switchLang(l.code)}
            title={l.label}
            style={{
              flex: 1,
              padding: '4px 0',
              borderRadius: 'var(--r-sm)',
              border: lang === l.code ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: lang === l.code ? 'var(--accent)15' : 'transparent',
              color: lang === l.code ? 'var(--accent)' : 'var(--text-muted)',
              fontSize: 11,
              fontWeight: lang === l.code ? 700 : 400,
              cursor: 'pointer',
              transition: 'all .15s',
            }}
          >
            {l.flag} {l.native}
          </button>
        ))}
      </div>
    </div>
  );

  const SidebarContent = () => (
    <>
      <div className="sidebar-brand">
        <div className="brand-dot" />
        <span>CivicPulse</span>
      </div>

      {/* Role badge */}
      <div style={{ padding:'0 .75rem .75rem', borderBottom:'1px solid var(--border)' }}>
        <div style={{ background:`${roleColor[user?.role]}15`, border:`1px solid ${roleColor[user?.role]}30`, borderRadius:'var(--r-sm)', padding:'6px 12px', display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:roleColor[user?.role], boxShadow:`0 0 8px ${roleColor[user?.role]}` }} />
          <span style={{ fontSize:12, fontWeight:700, color:roleColor[user?.role], fontFamily:'var(--f-display)', textTransform:'uppercase', letterSpacing:'.05em' }}>
            {roleLabel[user?.role]}
          </span>
        </div>
      </div>

      {/* Language Switcher */}
      <LangSwitcher />

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Navigation</div>
        {links.map(l => (
          <NavLink key={l.to} to={l.to} className={({ isActive }) =>
            `sidebar-link${isActive ? ' active' : ''}${l.sos ? ' sos-link' : ''}`
          } end={l.end} onClick={() => setOpen(false)}
          style={l.sos ? { background:'rgba(239,68,68,0.1)', borderColor:'rgba(239,68,68,0.2)', color:'#f87171', marginTop:4 } : {}}>
            <span className="sidebar-icon">{l.icon}</span>
            <span>{l.label}</span>
            {l.sos && <span style={{ marginLeft:'auto', fontSize:9, background:'rgba(239,68,68,0.3)', color:'#f87171', borderRadius:4, padding:'1px 5px', fontWeight:700 }}>URGENT</span>}
          </NavLink>
        ))}
        <div style={{ flex:1 }} />
        <div className="sidebar-section-label">System</div>
        <div className="sidebar-link" onClick={handleLogout} style={{ cursor:'pointer' }}>
          <span className="sidebar-icon">🚪</span>
          <span>{t.nav.signOut}</span>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={() => { navigate('/profile'); setOpen(false); }}>
          <div className="sidebar-avatar">{user?.name?.[0]?.toUpperCase() || '?'}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div className="sidebar-user-name" style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {t.feed?.welcomeBack || 'Welcome'}, {user?.name?.split(' ')[0]}!
            </div>
            <div className="sidebar-user-role">{user?.department || user?.role}</div>
          </div>
          <span style={{ fontSize:11, color:'var(--text-muted)' }}>→</span>
        </div>
      </div>
    </>
  );

  return (
    <>
      <aside className="sidebar"><SidebarContent /></aside>

      <div className="topbar">
        <div className="topbar-brand"><div className="brand-dot" /><span>CivicPulse</span></div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {user?.role === 'citizen' && (
            <NavLink to="/sos" style={{ background:'rgba(239,68,68,0.2)', border:'1px solid rgba(239,68,68,0.4)', borderRadius:'var(--r-sm)', padding:'5px 10px', fontSize:12, color:'#f87171', fontWeight:700, fontFamily:'var(--f-display)' }}>🆘 SOS</NavLink>
          )}
          <button className={`hamburger ${open ? 'open' : ''}`} onClick={() => setOpen(o=>!o)} aria-label="Menu">
            <span /><span /><span />
          </button>
        </div>
      </div>

      {open && (
        <>
          <div className="sidebar-overlay" onClick={() => setOpen(false)} />
          <aside className="sidebar open"><SidebarContent /></aside>
        </>
      )}
    </>
  );
}