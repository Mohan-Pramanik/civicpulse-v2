import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe, login as apiLogin, register as apiRegister } from '../api';

const Ctx = createContext();

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(() => {
    return getMe().then(r => setUser(r.data.user)).catch(() => localStorage.removeItem('cp_token'));
  }, []);

  useEffect(() => {
    if (localStorage.getItem('cp_token')) fetchMe().finally(() => setLoading(false));
    else setLoading(false);
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

  const logout = () => { localStorage.removeItem('cp_token'); setUser(null); };
  const refreshUser = () => fetchMe();

  return (
    <Ctx.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => useContext(Ctx);
