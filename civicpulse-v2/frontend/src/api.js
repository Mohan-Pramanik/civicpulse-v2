import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Image base URL (backend root, not /api)
export const IMG_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', '');

const api = axios.create({ baseURL: BASE });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('cp_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('cp_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Helper to build full image URL
export const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${IMG_BASE}${path}`;
};

// Auth
export const login          = d  => api.post('/auth/login', d);
export const register       = d  => api.post('/auth/register', d);
export const getMe          = () => api.get('/auth/me');
export const updateProfile  = d  => api.put('/auth/updateprofile', d);
export const updatePassword = d  => api.put('/auth/updatepassword', d);

// Issues
export const getIssues      = p  => api.get('/issues', { params: p });
export const getIssue       = id => api.get(`/issues/${id}`);
export const createIssue    = d  => api.post('/issues', d, { headers: { 'Content-Type': 'multipart/form-data' } });
export const upvoteIssue    = id => api.put(`/issues/${id}/upvote`);
export const updateStatus   = (id, d) => api.put(`/issues/${id}/status`, d);
export const assignIssue    = (id, d) => api.put(`/issues/${id}/assign`, d);
export const addComment     = (id, d) => api.post(`/issues/${id}/comments`, d);
export const rateIssue      = (id, d) => api.put(`/issues/${id}/rate`, d);
export const deleteIssue    = id => api.delete(`/issues/${id}`);
export const getMyIssues    = () => api.get('/issues/mine');

// Admin
export const getAdminStats  = () => api.get('/admin/stats');
export const getDeptStats   = () => api.get('/admin/dept-stats');
export const getAdminIssues = p  => api.get('/admin/issues', { params: p });
export const getAdminUsers  = p  => api.get('/admin/users', { params: p });
export const updateUser     = (id, d) => api.put(`/admin/users/${id}`, d);
export const deleteUser     = id => api.delete(`/admin/users/${id}`);
export const createUser     = d  => api.post('/admin/users', d);
export const bulkStatus     = d  => api.post('/admin/bulk-status', d);
export const exportIssues   = () => api.get('/admin/export');

export default api;