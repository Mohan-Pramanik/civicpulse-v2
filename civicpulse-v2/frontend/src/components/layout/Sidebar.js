import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); setOpen(false); };
  const cls = ({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`;

  const citizenLinks = [
    { to: '/feed',    icon: '🏠', label: 'Feed' },
    { to: '/report',  icon: '➕', label: 'Report Issue' },
    { to: '/track',   icon: '📍', label: 'My Reports' },
    { to: '/profile', icon: '👤', label: 'Profile' },
  ];

  const officerLinks = [
    { to: '/officer', icon: '🛠️', label: 'My Dashboard' },
    { to: '/feed',    icon: '🏠', label: 'Issue Feed' },
    { to: '/profile', icon: '👤', label: 'Profile' },
  ];

  const adminLinks = [
    { to: '/admin',        icon: '📊', label: 'Dashboard' },
    { to: '/admin/issues', icon: '📋', label: 'All Issues' },
    { to: '/admin/users',  icon: '👥', label: 'Users' },
    { to: '/feed',         icon: '🏠', label: 'Issue Feed' },
    { to: '/profile',      icon: '👤', label: 'Profile' },
  ];

  const links = user?.role === 'admin' ? adminLinks
              : user?.role === 'department' ? officerLinks
              : citizenLinks;

  const roleLabel = { admin: 'Administrator', department: 'Officer', citizen: 'Citizen' };
  const roleColor = { admin: '#ef4444', department: '#06b6d4', citizen: '#22c55e' };

  const SidebarContent = () => (
    <>
      <div className="sidebar-brand">
        <div className="brand-dot" />
        <span>CivicPulse</span>
      </div>

      {/* Role badge */}
      <div style={{ padding: '0 .75rem .75rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ background: `${roleColor[user?.role]}15`, border: `1px solid ${roleColor[user?.role]}30`, borderRadius: 'var(--r-sm)', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: roleColor[user?.role], boxShadow: `0 0 8px ${roleColor[user?.role]}` }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: roleColor[user?.role], fontFamily: 'var(--f-display)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
            {roleLabel[user?.role]}
          </span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Navigation</div>
        {links.map(l => (
          <NavLink key={l.to} to={l.to} className={cls} end={l.end} onClick={() => setOpen(false)}>
            <span className="sidebar-icon">{l.icon}</span>
            <span>{l.label}</span>
          </NavLink>
        ))}
        <div style={{ flex: 1 }} />
        <div className="sidebar-section-label">System</div>
        <div className="sidebar-link" onClick={handleLogout} style={{ cursor: 'pointer' }}>
          <span className="sidebar-icon">🚪</span>
          <span>Sign Out</span>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={() => { navigate('/profile'); setOpen(false); }}>
          <div className="sidebar-avatar">{user?.name?.[0]?.toUpperCase() || '?'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sidebar-user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
            <div className="sidebar-user-role">{user?.department || user?.role}</div>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>→</span>
        </div>
      </div>
    </>
  );

  return (
    <>
      <aside className="sidebar"><SidebarContent /></aside>

      <div className="topbar">
        <div className="topbar-brand"><div className="brand-dot" /><span>CivicPulse</span></div>
        <button className={`hamburger ${open ? 'open' : ''}`} onClick={() => setOpen(o => !o)} aria-label="Menu">
          <span /><span /><span />
        </button>
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