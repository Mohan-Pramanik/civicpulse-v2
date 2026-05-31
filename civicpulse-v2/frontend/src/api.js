import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
export const IMG_BASE = BASE.replace('/api', '');

const api = axios.create({ baseURL: BASE });

// ── Attach JWT to every request ───────────────────────────────
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('cp_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// ── Auto-logout on 401 ────────────────────────────────────────
// But do NOT redirect if we're already on an auth page —
// that causes the 401 error to flash on the register/login form.
const AUTH_PATHS = ['/login', '/register', '/forgot-password'];

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('cp_token');
      const onAuthPage = AUTH_PATHS.some(p => window.location.pathname.startsWith(p));
      if (!onAuthPage) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// ── Build full image URL from a relative path ─────────────────
export const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${IMG_BASE}${p}`;
};

// ── Auth ──────────────────────────────────────────────────────
export const login          = d       => api.post('/auth/login', d);
export const register       = d       => api.post('/auth/register', d);
export const getMe          = ()      => api.get('/auth/me');
export const updateProfile  = d       => api.put('/auth/updateprofile', d);
export const updatePassword = d       => api.put('/auth/updatepassword', d);

// ── Issues ────────────────────────────────────────────────────
export const getIssues      = p       => api.get('/issues', { params: p });
export const getIssue       = id      => api.get(`/issues/${id}`);
export const createIssue    = d       => api.post('/issues', d, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
export const upvoteIssue    = id      => api.put(`/issues/${id}/upvote`);
export const updateStatus   = (id, d) => api.put(`/issues/${id}/status`, d);
export const addComment     = (id, d) => api.post(`/issues/${id}/comments`, d);
export const rateIssue      = (id, d) => api.put(`/issues/${id}/rate`, d);
export const getMyIssues    = ()      => api.get('/issues/mine');
export const deleteIssue    = id      => api.delete(`/issues/${id}`);

// ── 📍 Nearby issues ─────────────────────────────────────────
export const getNearbyIssues = (lat, lng, radius = 500, params = {}) =>
  api.get('/issues/nearby', { params: { lat, lng, radius, ...params } });

// ── Admin ─────────────────────────────────────────────────────
export const getAdminStats  = ()      => api.get('/admin/stats');
export const getDeptStats   = ()      => api.get('/admin/dept-stats');
export const getAdminIssues = p       => api.get('/admin/issues', { params: p });
export const getAdminUsers  = p       => api.get('/admin/users',  { params: p });
export const updateUser     = (id, d) => api.put(`/admin/users/${id}`, d);
export const deleteUser     = id      => api.delete(`/admin/users/${id}`);
export const createUser     = d       => api.post('/admin/users', d);
export const bulkStatus     = d       => api.post('/admin/bulk-status', d);
export const exportIssues   = ()      => api.get('/admin/export');
export const getOfficers    = p       => api.get('/admin/officers', { params: p });
export const assignIssue    = (id, d) => api.put(`/admin/issues/${id}/assign`, d);

// ── Officer management (dept head) ───────────────────────────
export const getMyOfficers = ()                   => api.get('/admin/my-officers');
export const createOfficer = d                    => api.post('/admin/my-officers', d);
export const assignOfficer = (issueId, officerId) => api.put(`/admin/issues/${issueId}/assign`, { officerId });

// ── Deadline / Penalty / Accountability ──────────────────────
export const assignWithDeadline         = (issueId, officerId, deadlineDays) =>
  api.put(`/deadline/assign/${issueId}`, { officerId, deadlineDays });
export const getOverdueIssues           = ()                    => api.get('/deadline/overdue');
export const getAccountabilityDashboard = ()                    => api.get('/deadline/dashboard');
export const getOfficerAccountability   = ()                    => api.get('/deadline/accountability');
export const addPenaltyPoints           = (officerId, points, reason) =>
  api.post(`/deadline/penalty/${officerId}`, { points, reason });
export const resetPenaltyPoints         = (officerId)           =>
  api.delete(`/deadline/penalty/${officerId}/reset`);

// ── Citizen verification ─────────────────────────────────────
export const verifyIssueResolved = (id)         => api.put(`/issues/${id}/verify`);
export const reopenIssue         = (id, reason) => api.put(`/issues/${id}/reopen`, { reason });

export default api;