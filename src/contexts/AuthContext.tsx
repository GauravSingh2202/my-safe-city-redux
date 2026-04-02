import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, AuthState } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; phone?: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function fetchUserProfile(session: Session): Promise<User> {
  const uid = session.user.id;
  const email = session.user.email || '';

  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .single();

  // Get role
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', uid);

  const isAdmin = roles?.some(r => r.role === 'admin') ?? false;

  return {
    _id: uid,
    name: profile?.name || session.user.user_metadata?.name || '',
    email: profile?.email || email,
    role: isAdmin ? 'admin' : 'citizen',
    phone: profile?.phone || undefined,
    avatar: profile?.avatar_url || undefined,
    createdAt: profile?.created_at || session.user.created_at,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    loading: true,
  });

  useEffect(() => {
    // Listen for auth changes FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          // Use setTimeout to avoid deadlock with Supabase client
          setTimeout(async () => {
            try {
              const user = await fetchUserProfile(session);
              setState({ user, isAuthenticated: true, loading: false });
            } catch {
              setState({ user: null, isAuthenticated: false, loading: false });
            }
          }, 0);
        } else {
          setState({ user: null, isAuthenticated: false, loading: false });
        }
      }
    );

    // Then check existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        try {
          const user = await fetchUserProfile(session);
          setState({ user, isAuthenticated: true, loading: false });
        } catch {
          setState({ user: null, isAuthenticated: false, loading: false });
        }
      } else {
        setState({ user: null, isAuthenticated: false, loading: false });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }, []);

  const register = useCallback(async (data: { name: string; email: string; password: string; phone?: string }) => {
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { name: data.name, phone: data.phone || '' },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw new Error(error.message);
  }, []);

  const logout = useCallback(() => {
    supabase.auth.signOut();
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
