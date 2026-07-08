import { createContext, useContext, useMemo, useState } from 'react';
import { api, storage } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(storage.getUser());
  const [apiBase, setApiBaseState] = useState(storage.getApiBase());

  async function login(username, password, base) {
    const finalBase = base || apiBase || '/api/v1';
    api.setBase(finalBase);
    setApiBaseState(finalBase);
    const data = await api.post('/auth/login', { username, password });
    storage.setSession(data.access_token, data.user);
    setUser(data.user);
    return data.user;
  }

  async function createAdmin(username, password, base) {
    const finalBase = base || apiBase || '/api/v1';
    api.setBase(finalBase);
    setApiBaseState(finalBase);
    return api.post('/auth/register', {
      username: username || 'admin',
      email: 'admin@tico.local',
      password: password || '123456',
      role: 'admin',
    });
  }

  function logout() {
    storage.clearSession();
    setUser(null);
  }

  function setApiBase(value) {
    api.setBase(value);
    setApiBaseState(value);
  }

  const value = useMemo(
    () => ({ user, apiBase, setApiBase, login, createAdmin, logout }),
    [user, apiBase]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth precisa estar dentro de AuthProvider');
  return context;
}
