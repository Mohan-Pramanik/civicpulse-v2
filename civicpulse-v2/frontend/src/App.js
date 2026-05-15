import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import './index.css';

import Navbar        from './components/layout/Navbar';
import LoginPage     from './pages/auth/LoginPage';
import RegisterPage  from './pages/auth/RegisterPage';
import FeedPage      from './pages/citizen/FeedPage';
import ReportPage    from './pages/citizen/ReportPage';
import TrackPage     from './pages/citizen/TrackPage';
import IssueDetail   from './pages/citizen/IssueDetailPage';
import ProfilePage   from './pages/citizen/ProfilePage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminIssues   from './pages/admin/AdminIssues';
import AdminUsers    from './pages/admin/AdminUsers';

const Guard = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner" style={{ marginTop:'4rem' }}/>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

function AppRoutes() {
  const { user } = useAuth();
  return (
    <BrowserRouter>
      {user && <Navbar />}
      <Routes>
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/"         element={<Guard><FeedPage /></Guard>} />
        <Route path="/report"   element={<Guard><ReportPage /></Guard>} />
        <Route path="/track"    element={<Guard><TrackPage /></Guard>} />
        <Route path="/issues/:id" element={<Guard><IssueDetail /></Guard>} />
        <Route path="/profile"  element={<Guard><ProfilePage /></Guard>} />
        <Route path="/admin"         element={<Guard roles={['admin']}><AdminDashboard /></Guard>} />
        <Route path="/admin/issues"  element={<Guard roles={['admin']}><AdminIssues /></Guard>} />
        <Route path="/admin/users"   element={<Guard roles={['admin']}><AdminUsers /></Guard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </AuthProvider>
  );
}
