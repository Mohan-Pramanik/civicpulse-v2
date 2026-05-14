import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const cls = ({ isActive }) => 'nav-link' + (isActive ? ' active' : '');
  const handleLogout = () => { logout(); navigate('/login'); setOpen(false); };

  const links = [
    { to: '/', icon: '🏠', label: 'Feed', end: true },
    { to: '/report', icon: '➕', label: 'Report' },
    { to: '/track', icon: '📍', label: 'My Reports' },
    ...(user?.role === 'admin' || user?.role === 'department' ? [
      { to: '/admin', icon: '📊', label: 'Dashboard' },
      { to: '/admin/issues', icon: '📋', label: 'Issues' },
      ...(user?.role === 'admin' ? [{ to: '/admin/users', icon: '👥', label: 'Users' }] : []),
    ] : []),
    { to: '/profile', icon: '👤', label: user?.name?.split(' ')[0] || 'Profile' },
  ];

  return (
    <>
      <nav className="navbar">
        <NavLink to="/" className="navbar-brand">
          <div className="brand-dot" />
          <span>CivicPulse</span>
        </NavLink>

        <div className="nav-links nav-links-desktop">
          {links.map(l => (
            <NavLink key={l.to} to={l.to} className={cls} end={l.end}>
              <span>{l.icon}</span>
              <span>{l.label}</span>
            </NavLink>
          ))}
          <button className="btn btn-outline btn-sm" style={{ marginLeft: 6 }} onClick={handleLogout}>
            Logout
          </button>
        </div>

        <button className="nav-hamburger" onClick={() => setOpen(o => !o)} aria-label="Menu">
          <span className={`hamburger-icon ${open ? 'open' : ''}`}>
            <span /><span /><span />
          </span>
        </button>
      </nav>

      {open && (
        <div className="nav-drawer">
          <div className="nav-drawer-inner">
            <div className="nav-drawer-user">
              <div className="nav-drawer-avatar">{user?.name?.[0]?.toUpperCase() || '?'}</div>
              <div>
                <div className="nav-drawer-name">{user?.name}</div>
                <div className="nav-drawer-role">{user?.role}</div>
              </div>
            </div>
            {links.map(l => (
              <NavLink
                key={l.to} to={l.to} end={l.end}
                className={({ isActive }) => `nav-drawer-link${isActive ? ' active' : ''}`}
                onClick={() => setOpen(false)}
              >
                <span>{l.icon}</span>
                <span>{l.label}</span>
              </NavLink>
            ))}
            <button className="nav-drawer-logout" onClick={handleLogout}>🚪 Sign out</button>
          </div>
          <div className="nav-drawer-overlay" onClick={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}