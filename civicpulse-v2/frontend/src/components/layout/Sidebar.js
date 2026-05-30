import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth }  from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); setOpen(false); };

  const citizenLinks = [
    { to:'/feed',    icon:'🏠', label:'Feed' },
    { to:'/report',  icon:'➕', label:'Report Issue' },
    { to:'/track',   icon:'📍', label:'My Reports' },
    { to:'/sos',     icon:'🆘', label:'Emergency SOS', sos:true },
    { to:'/about',   icon:'ℹ️', label:'About & Help' },
    { to:'/profile', icon:'👤', label:'Profile' },
  ];

  const officerLinks = [
    { to:'/officer',                icon:'🛠️', label: user?.isHead ? 'Dept Dashboard' : 'My Dashboard' },
    { to:'/officer/accountability', icon:'⚡', label:'My Performance' },   // ← NEW
    { to:'/feed',                   icon:'🏠', label:'Issue Feed' },
    { to:'/about',                  icon:'ℹ️', label:'About & Help' },
    { to:'/profile',                icon:'👤', label:'Profile' },
  ];

  const adminLinks = [
    { to:'/admin',                  icon:'📊', label:'Dashboard' },
    { to:'/admin/issues',           icon:'📋', label:'All Issues' },
    { to:'/admin/users',            icon:'👥', label:'Users' },
    { to:'/admin/accountability',   icon:'⚖️', label:'Accountability' },   // ← NEW
    { to:'/feed',                   icon:'🏠', label:'Issue Feed' },
    { to:'/about',                  icon:'ℹ️', label:'About & Help' },
    { to:'/profile',                icon:'👤', label:'Profile' },
  ];

  const links      = user?.role === 'admin' ? adminLinks : user?.role === 'department' ? officerLinks : citizenLinks;
  const roleLabel  = { admin:'Administrator', department: user?.isHead ? 'Dept Head' : 'Field Officer', citizen:'Citizen' };
  const roleColor  = { admin:'#ef4444', department:'#06b6d4', citizen:'#22c55e' };

  const SidebarContent = () => (
    <>
      <div className="sidebar-brand">
        <div className="brand-dot" />
        <span>CivicPulse</span>
      </div>

      {/* Role badge */}
      <div style={{ padding:'0 .75rem .75rem', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ background:`${roleColor[user?.role]}15`, border:`1px solid ${roleColor[user?.role]}30`, borderRadius:'var(--r-sm)', padding:'6px 12px', display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:roleColor[user?.role], boxShadow:`0 0 8px ${roleColor[user?.role]}` }} />
          <span style={{ fontSize:12, fontWeight:700, color:roleColor[user?.role], fontFamily:'var(--f-display)', textTransform:'uppercase', letterSpacing:'.05em' }}>
            {roleLabel[user?.role]}
          </span>
        </div>
      </div>

      {/* Dark / Light toggle */}
      <div style={{ padding:'.6rem .75rem', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
        <button
          onClick={toggle}
          style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'var(--r-sm)', padding:'7px 12px', cursor:'pointer', transition:'background 0.2s' }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseOut={e  => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
        >
          <span style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.7)', fontFamily:'var(--f-display)', textTransform:'uppercase', letterSpacing:'.05em' }}>
            {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </span>
          <div style={{ width:36, height:20, borderRadius:10, background: theme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(99,102,241,0.7)', position:'relative', transition:'background 0.3s', flexShrink:0 }}>
            <div style={{ position:'absolute', top:3, left: theme === 'dark' ? 3 : 17, width:14, height:14, borderRadius:'50%', background:'#fff', transition:'left 0.3s cubic-bezier(.22,.68,0,1.2)', boxShadow:'0 1px 4px rgba(0,0,0,0.3)' }} />
          </div>
        </button>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Navigation</div>
        {links.map(l => (
          <NavLink key={l.to} to={l.to}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}${l.sos ? ' sos-link' : ''}`}
            end={l.end} onClick={() => setOpen(false)}
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
          <span>Sign Out</span>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={() => { navigate('/profile'); setOpen(false); }}>
          <div className="sidebar-avatar">{user?.name?.[0]?.toUpperCase() || '?'}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div className="sidebar-user-name" style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              Welcome, {user?.name?.split(' ')[0]}!
            </div>
            <div className="sidebar-user-role">{user?.department || user?.role}</div>
          </div>
          <span style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>→</span>
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
          <button onClick={toggle} style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', padding:4 }}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          {user?.role === 'citizen' && (
            <NavLink to="/sos" style={{ background:'rgba(239,68,68,0.2)', border:'1px solid rgba(239,68,68,0.4)', borderRadius:'var(--r-sm)', padding:'5px 10px', fontSize:12, color:'#f87171', fontWeight:700, fontFamily:'var(--f-display)' }}>🆘 SOS</NavLink>
          )}
          <button className={`hamburger ${open ? 'open' : ''}`} onClick={() => setOpen(o => !o)} aria-label="Menu">
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