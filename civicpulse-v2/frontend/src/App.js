import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import './index.css';

import Sidebar       from './components/layout/Sidebar';
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
import AiChat        from './components/common/AiChat';

const Guard = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' }}>
      <div className="spinner" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

function AppRoutes() {
  const { user } = useAuth();
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={
          <Guard>
            <div className="app-shell">
              <Sidebar />
              <div className="main-content">
                <Routes>
                  <Route path="/"              element={<FeedPage />} />
                  <Route path="/report"        element={<ReportPage />} />
                  <Route path="/track"         element={<TrackPage />} />
                  <Route path="/issues/:id"    element={<IssueDetail />} />
                  <Route path="/profile"       element={<ProfilePage />} />
                  <Route path="/admin"         element={<Guard roles={['admin','department']}><AdminDashboard /></Guard>} />
                  <Route path="/admin/issues"  element={<Guard roles={['admin','department']}><AdminIssues /></Guard>} />
                  <Route path="/admin/users"   element={<Guard roles={['admin']}><AdminUsers /></Guard>} />
                  <Route path="*"              element={<Navigate to="/" replace />} />
                </Routes>
              </div>
              <AiChat />
            </div>
          </Guard>
        } />
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
