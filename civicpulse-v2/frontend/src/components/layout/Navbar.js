import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const cls = ({ isActive }) => 'nav-link' + (isActive ? ' active' : '');

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="brand-dot" />
        <span>CivicPulse</span>
      </div>

      <div className="nav-links">
        <NavLink to="/"       className={cls}><span>🏠</span> <span>Feed</span></NavLink>
        <NavLink to="/report" className={cls}><span>➕</span> <span>Report</span></NavLink>
        <NavLink to="/track"  className={cls}><span>📍</span> <span>Track</span></NavLink>
        {user?.role === 'admin' && <>
          <NavLink to="/admin"        className={cls}><span>📊</span> <span>Dashboard</span></NavLink>
          <NavLink to="/admin/issues" className={cls}><span>📋</span> <span>Issues</span></NavLink>
          <NavLink to="/admin/users"  className={cls}><span>👥</span> <span>Users</span></NavLink>
        </>}
        <NavLink to="/profile" className={cls}><span>👤</span> <span>{user?.name?.split(' ')[0]}</span></NavLink>
        <button className="btn btn-outline btn-sm" onClick={() => { logout(); navigate('/login'); }}>
          Logout
        </button>
      </div>
    </nav>
  );
}
