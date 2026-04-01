import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { User, AuthState } from '@/types';
import { api } from '@/services/api';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; phone?: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const stored = localStorage.getItem('mysafecity_auth');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch { /* ignore */ }
    }
    return { user: null, token: null, isAuthenticated: false };
  });

  const login = useCallback(async (email: string, password: string) => {
    const { user, token } = await api.login(email, password);
    const newState = { user, token, isAuthenticated: true };
    setState(newState);
    localStorage.setItem('mysafecity_auth', JSON.stringify(newState));
  }, []);

  const register = useCallback(async (data: { name: string; email: string; password: string; phone?: string }) => {
    const { user, token } = await api.register(data);
    const newState = { user, token, isAuthenticated: true };
    setState(newState);
    localStorage.setItem('mysafecity_auth', JSON.stringify(newState));
  }, []);

  const logout = useCallback(() => {
    setState({ user: null, token: null, isAuthenticated: false });
    localStorage.removeItem('mysafecity_auth');
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
