'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '@toposonics/types';
import { supabaseClient } from '@/lib/supabaseClient';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password?: string) => Promise<{ token: string; user: User }>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load auth from Supabase session on mount
  useEffect(() => {
    if (!supabaseClient) {
      setIsLoading(false);
      return;
    }

    const syncSession = async () => {
      const { data } = await supabaseClient!.auth.getSession();
      const session = data.session;

      if (session) {
        const mappedUser: User = {
          id: session.user.id,
          email: session.user.email || '',
          displayName: (session.user.user_metadata as Record<string, unknown>)?.full_name as string | undefined,
          createdAt: new Date(session.user.created_at),
          lastLoginAt: session.user.last_sign_in_at ? new Date(session.user.last_sign_in_at) : undefined,
        };

        setToken(session.access_token);
        setUser(mappedUser);
      }

      setIsLoading(false);
    };

    syncSession();

    const { data: authListener } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (session) {
        const mappedUser: User = {
          id: session.user.id,
          email: session.user.email || '',
          displayName: (session.user.user_metadata as Record<string, unknown>)?.full_name as string | undefined,
          createdAt: new Date(session.user.created_at),
          lastLoginAt: session.user.last_sign_in_at ? new Date(session.user.last_sign_in_at) : undefined,
        };
        setToken(session.access_token);
        setUser(mappedUser);
      } else {
        setToken(null);
        setUser(null);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password?: string) => {
    if (!supabaseClient) {
      throw new Error('Supabase client is not configured');
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password: password || '',
    });

    if (error || !data.session) {
      throw error || new Error('Login failed');
    }

    const mappedUser: User = {
      id: data.session.user.id,
      email: data.session.user.email || '',
      displayName: (data.session.user.user_metadata as Record<string, unknown>)?.full_name as string | undefined,
      createdAt: new Date(data.session.user.created_at),
      lastLoginAt: data.session.user.last_sign_in_at ? new Date(data.session.user.last_sign_in_at) : undefined,
    };

    setToken(data.session.access_token);
    setUser(mappedUser);

    return { token: data.session.access_token, user: mappedUser };
  };

  const logout = async () => {
    if (supabaseClient) {
      await supabaseClient.auth.signOut();
    }
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
