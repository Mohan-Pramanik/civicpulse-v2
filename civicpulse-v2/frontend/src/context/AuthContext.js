import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe, login as apiLogin, register as apiRegister } from '../api';

const Ctx = createContext();

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(() => {
    return getMe()
      .then(r => setUser(r.data.user))
      .catch(() => {
        localStorage.removeItem('cp_token');
        setUser(null);
      });
  }, []);

  useEffect(() => {
    if (localStorage.getItem('cp_token')) {
      fetchMe().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [fetchMe]);

  const login = async (email, password) => {
    const r = await apiLogin({ email, password });
    localStorage.setItem('cp_token', r.data.token);
    setUser(r.data.user);
    return r.data.user;
  };

  const register = async (data) => {
    const r = await apiRegister(data);
    localStorage.setItem('cp_token', r.data.token);
    setUser(r.data.user);
    return r.data.user;
  };

  // ── Used by Google Sign-In when an existing user logs in ──
  // The backend already verified the Google token and returned
  // a JWT + user object — we just store them directly.
  const loginWithToken = (token, userData) => {
    localStorage.setItem('cp_token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('cp_token');
    setUser(null);
  };

  const refreshUser = () => fetchMe();

  return (
    <Ctx.Provider value={{ user, loading, login, register, loginWithToken, logout, refreshUser }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => useContext(Ctx);