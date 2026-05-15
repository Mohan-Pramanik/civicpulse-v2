import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const citizenLinks = [
    { to: '/',       icon: '🏠', label: 'Feed',       end: true },
    { to: '/report', icon: '➕', label: 'Report Issue' },
    { to: '/track',  icon: '📍', label: 'My Reports' },
    { to: '/profile',icon: '👤', label: 'Profile' },
  ];

  const adminLinks = [
    { to: '/admin',         icon: '📊', label: 'Dashboard' },
    { to: '/admin/issues',  icon: '📋', label: 'Issues' },
    ...(user?.role === 'admin' ? [{ to: '/admin/users', icon: '👥', label: 'Users' }] : []),
  ];

  const cls = ({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`;

  const SidebarContent = () => (
    <>
      <div className="sidebar-brand">
        <div className="brand-dot" />
        <span>CivicPulse</span>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Navigation</div>
        {citizenLinks.map(l => (
          <NavLink key={l.to} to={l.to} className={cls} end={l.end} onClick={() => setOpen(false)}>
            <span className="sidebar-icon">{l.icon}</span>
            <span>{l.label}</span>
          </NavLink>
        ))}

        {(user?.role === 'admin' || user?.role === 'department') && (
          <>
            <div className="sidebar-section-label" style={{ marginTop: '.5rem' }}>Admin</div>
            {adminLinks.map(l => (
              <NavLink key={l.to} to={l.to} className={cls} onClick={() => setOpen(false)}>
                <span className="sidebar-icon">{l.icon}</span>
                <span>{l.label}</span>
              </NavLink>
            ))}
          </>
        )}

        <div style={{ flex: 1 }} />

        <div className="sidebar-section-label">System</div>
        <div className="sidebar-link" onClick={handleLogout}>
          <span className="sidebar-icon">🚪</span>
          <span>Sign Out</span>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={() => navigate('/profile')}>
          <div className="sidebar-avatar">{user?.name?.[0]?.toUpperCase() || '?'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sidebar-user-name" style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.name}</div>
            <div className="sidebar-user-role">{user?.role}</div>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>→</span>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sidebar">
        <SidebarContent />
      </aside>

      {/* Mobile topbar */}
      <div className="topbar">
        <div className="topbar-brand">
          <div className="brand-dot" />
          <span>CivicPulse</span>
        </div>
        <button className={`hamburger ${open ? 'open' : ''}`} onClick={() => setOpen(o => !o)} aria-label="Menu">
          <span /><span /><span />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <>
          <div className="sidebar-overlay" onClick={() => setOpen(false)} />
          <aside className="sidebar open">
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
}
