import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth }       from './context/AuthContext';
import { ToastProvider }               from './context/ToastContext';
import { LanguageProvider }            from './context/LanguageContext';
import { ThemeProvider }               from './context/ThemeContext';
import { AccountabilityProvider }      from './context/AccountabilityContext'; // ← NEW
import './index.css';

import Sidebar                   from './components/layout/Sidebar';
import LoginPage                 from './pages/auth/LoginPage';
import RegisterPage              from './pages/auth/RegisterPage';
import FeedPage                  from './pages/citizen/FeedPage';
import ReportPage                from './pages/citizen/ReportPage';
import TrackPage                 from './pages/citizen/TrackPage';
import IssueDetail               from './pages/citizen/IssueDetailPage';
import ProfilePage               from './pages/citizen/ProfilePage';
import EmergencySOS              from './pages/citizen/EmergencySOS';
import AboutPage                 from './pages/AboutPage';
import AdminDashboard            from './pages/admin/AdminDashboard';
import AdminIssues               from './pages/admin/AdminIssues';
import AdminUsers                from './pages/admin/AdminUsers';
import AccountabilityDashboard   from './pages/admin/AccountabilityDashboard';  // ← NEW
import OfficerDashboard          from './pages/officer/OfficerDashboard';
import DepartmentHeadDashboard   from './pages/officer/DepartmentHeadDashboard';
import OfficerAccountability     from './pages/officer/OfficerAccountability';  // ← NEW
import Chatbot                   from './components/common/Chatbot';

const Guard = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'var(--grad-page)' }}>
      <div className="spinner" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

function AppRoutes() {
  const { user } = useAuth();

  const homeRoute = () => {
    if (user?.role === 'admin')       return <Navigate to="/admin" replace />;
    if (user?.role === 'department')  return <Navigate to="/officer" replace />;
    return <FeedPage />;
  };

  const officerRoute = () => {
    if (user?.isHead) return <DepartmentHeadDashboard />;
    return <OfficerDashboard />;
  };

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
                  <Route path="/"              element={homeRoute()} />
                  <Route path="/feed"          element={<FeedPage />} />
                  <Route path="/report"        element={<ReportPage />} />
                  <Route path="/track"         element={<TrackPage />} />
                  <Route path="/issues/:id"    element={<IssueDetail />} />
                  <Route path="/profile"       element={<ProfilePage />} />
                  <Route path="/sos"           element={<Guard roles={['citizen']}><EmergencySOS /></Guard>} />
                  <Route path="/about"         element={<AboutPage />} />
                  <Route path="/officer"       element={<Guard roles={['department']}>{officerRoute()}</Guard>} />

                  {/* ── NEW: Officer accountability ── */}
                  <Route path="/officer/accountability"
                    element={<Guard roles={['department']}><OfficerAccountability /></Guard>} />

                  <Route path="/admin"         element={<Guard roles={['admin']}><AdminDashboard /></Guard>} />
                  <Route path="/admin/issues"  element={<Guard roles={['admin']}><AdminIssues /></Guard>} />
                  <Route path="/admin/users"   element={<Guard roles={['admin']}><AdminUsers /></Guard>} />

                  {/* ── NEW: Admin accountability dashboard ── */}
                  <Route path="/admin/accountability"
                    element={<Guard roles={['admin']}><AccountabilityDashboard /></Guard>} />

                  <Route path="*"              element={<Navigate to="/" replace />} />
                </Routes>
              </div>
              <Chatbot />
            </div>
          </Guard>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <LanguageProvider>
            <AccountabilityProvider>       {/* ← NEW */}
              <AppRoutes />
            </AccountabilityProvider>       {/* ← NEW */}
          </LanguageProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}