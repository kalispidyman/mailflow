import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '../api/client';

interface User {
  id: number; username: string; email: string; full_name: string;
  role: string; company: string | null; company_id?: number;
}

interface AuthContextType {
  user: User | null; loading: boolean; login: (u: string, p: string) => Promise<void>;
  register: (d: Record<string, string>) => Promise<void>; logout: () => void;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    api.auth.me().then(setUser).catch(() => { localStorage.removeItem('token'); }).finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    const res = await api.auth.login(username, password);
    localStorage.setItem('token', res.access_token);
    setUser(res.user);
  };

  const register = async (data: Record<string, string>) => {
    const res = await api.auth.register(data);
    localStorage.setItem('token', res.access_token);
    setUser(res.user);
  };

  const logout = () => { localStorage.removeItem('token'); setUser(null); window.location.href = '/login'; };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
