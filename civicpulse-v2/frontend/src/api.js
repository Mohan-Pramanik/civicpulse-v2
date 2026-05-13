import axios from 'axios';

const API = axios.create({ baseURL: process.env.REACT_APP_API_URL || '/api' });

API.interceptors.request.use(cfg => {
  const token = localStorage.getItem('cp_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});
API.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) {
    localStorage.removeItem('cp_token');
    window.location.href = '/login';
  }
  return Promise.reject(err);
});

// Auth
export const register        = d  => API.post('/auth/register', d);
export const login           = d  => API.post('/auth/login', d);
export const getMe           = () => API.get('/auth/me');
export const updateProfile   = d  => API.put('/auth/updateprofile', d);
export const updatePassword  = d  => API.put('/auth/updatepassword', d);

// Issues
export const getIssues    = p  => API.get('/issues', { params: p });
export const getMyIssues  = () => API.get('/issues/mine');
export const getIssue     = id => API.get(`/issues/${id}`);
export const createIssue  = d  => API.post('/issues', d);
export const upvoteIssue  = id => API.put(`/issues/${id}/upvote`);
export const updateStatus = (id, d) => API.put(`/issues/${id}/status`, d);
export const assignIssue  = (id, d) => API.put(`/issues/${id}/assign`, d);
export const addComment   = (id, d) => API.post(`/issues/${id}/comments`, d);
export const rateIssue    = (id, d) => API.put(`/issues/${id}/rate`, d);
export const deleteIssue  = id => API.delete(`/issues/${id}`);

// Admin
export const getAdminStats  = () => API.get('/admin/stats');
export const getAdminIssues = p  => API.get('/admin/issues', { params: p });
export const getAdminUsers  = p  => API.get('/admin/users', { params: p });
export const updateUser     = (id, d) => API.put(`/admin/users/${id}`, d);
export const deleteUser     = id => API.delete(`/admin/users/${id}`);
export const bulkStatus     = d  => API.post('/admin/bulk-status', d);
export const exportIssues   = () => API.get('/admin/export');

export default API;
