// import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
// import { getMe, login as apiLogin, register as apiRegister } from '../api';

// const Ctx = createContext();

// export const AuthProvider = ({ children }) => {
//   const [user,    setUser]    = useState(null);
//   const [loading, setLoading] = useState(true);

//   const fetchMe = useCallback(() => {
//     return getMe().then(r => setUser(r.data.user)).catch(() => localStorage.removeItem('cp_token'));
//   }, []);

//   useEffect(() => {
//     if (localStorage.getItem('cp_token')) fetchMe().finally(() => setLoading(false));
//     else setLoading(false);
//   }, [fetchMe]);

//   const login = async (email, password) => {
//     const r = await apiLogin({ email, password });
//     localStorage.setItem('cp_token', r.data.token);
//     setUser(r.data.user);
//     return r.data.user;
//   };

//   const register = async (data) => {
//     const r = await apiRegister(data);
//     localStorage.setItem('cp_token', r.data.token);
//     setUser(r.data.user);
//     return r.data.user;
//   };

//   const logout = () => { localStorage.removeItem('cp_token'); setUser(null); };
//   const refreshUser = () => fetchMe();

//   return (
//     <Ctx.Provider value={{ user, loading, login, register, logout, refreshUser }}>
//       {children}
//     </Ctx.Provider>
//   );
// };

// export const useAuth = () => useContext(Ctx);
import React, { createContext, useContext, useState, useEffect } from 'react';

const Ctx = createContext();

const MOCK_USERS = [
  { _id: '1', name: 'Admin User',   email: 'admin@civicpulse.in', password: 'password123', role: 'admin' },
  { _id: '2', name: 'Demo Citizen', email: 'user@civicpulse.in',  password: 'password123', role: 'citizen' },
];

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('cp_mock_user');
    if (saved) setUser(JSON.parse(saved));
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const found = MOCK_USERS.find(u => u.email === email && u.password === password);
    if (!found) throw { response: { data: { message: 'Invalid email or password' } } };
    const { password: _, ...safeUser } = found;
    localStorage.setItem('cp_mock_user', JSON.stringify(safeUser));
    localStorage.setItem('cp_token', 'mock-token');
    setUser(safeUser);
    return safeUser;
  };

  const register = async (data) => {
    const newUser = { _id: Date.now().toString(), name: data.name, email: data.email, role: 'citizen' };
    localStorage.setItem('cp_mock_user', JSON.stringify(newUser));
    localStorage.setItem('cp_token', 'mock-token');
    setUser(newUser);
    return newUser;
  };

  const logout = () => {
    localStorage.removeItem('cp_token');
    localStorage.removeItem('cp_mock_user');
    setUser(null);
  };

  const refreshUser = () => {};

  return (
    <Ctx.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => useContext(Ctx);