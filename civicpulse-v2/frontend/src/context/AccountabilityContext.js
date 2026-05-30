/**
 * AccountabilityContext.js
 * Global state for deadline / penalty / accountability data.
 * Place in: frontend/src/context/AccountabilityContext.js
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import api from '../api';

const AccountabilityContext = createContext();

export function AccountabilityProvider({ children }) {
  const [dashboard,     setDashboard]     = useState(null);
  const [overdueIssues, setOverdueIssues] = useState([]);
  const [officers,      setOfficers]      = useState([]);
  const [loading,       setLoading]       = useState(false);

  // Load full admin dashboard data
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/deadline/dashboard');
      setDashboard(r.data.summary);
      setOfficers(r.data.officerStats);
    } catch (err) {
      console.error('Dashboard load failed', err);
    }
    setLoading(false);
  }, []);

  // Load overdue issues
  const loadOverdue = useCallback(async () => {
    try {
      const r = await api.get('/deadline/overdue');
      setOverdueIssues(r.data.issues);
    } catch (err) {
      console.error('Overdue load failed', err);
    }
  }, []);

  // Assign issue with deadline
  const assignWithDeadline = useCallback(async (issueId, officerId, deadlineDays) => {
    const r = await api.put(`/deadline/assign/${issueId}`, { officerId, deadlineDays });
    return r.data.issue;
  }, []);

  // Manual penalty
  const addPenalty = useCallback(async (officerId, points, reason) => {
    const r = await api.post(`/deadline/penalty/${officerId}`, { points, reason });
    return r.data;
  }, []);

  // Reset penalty
  const resetPenalty = useCallback(async (officerId) => {
    const r = await api.delete(`/deadline/penalty/${officerId}/reset`);
    return r.data;
  }, []);

  return (
    <AccountabilityContext.Provider value={{
      dashboard, overdueIssues, officers, loading,
      loadDashboard, loadOverdue, assignWithDeadline, addPenalty, resetPenalty
    }}>
      {children}
    </AccountabilityContext.Provider>
  );
}

export function useAccountability() {
  return useContext(AccountabilityContext);
}