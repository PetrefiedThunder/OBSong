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
        // Store only non-sensitive user metadata, not the token
        // Supabase manages the session token securely
        localStorage.setItem('toposonics_user', JSON.stringify(mappedUser));
      } else {
        // Try to restore session from Supabase's secure storage only
        // Don't rely on localStorage for tokens
        const storedUser = localStorage.getItem('toposonics_user');
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
            // Token will be null until Supabase session is restored
          } catch (error) {
            console.error('Failed to parse stored user:', error);
            localStorage.removeItem('toposonics_user');
          }
        }
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
        // Store only non-sensitive user metadata
        localStorage.setItem('toposonics_user', JSON.stringify(mappedUser));
      } else {
        setToken(null);
        setUser(null);
        localStorage.removeItem('toposonics_user');
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
    // Store only non-sensitive user metadata
    localStorage.setItem('toposonics_user', JSON.stringify(mappedUser));

    return { token: data.session.access_token, user: mappedUser };
  };

  const logout = async () => {
    if (supabaseClient) {
      await supabaseClient.auth.signOut();
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem('toposonics_user');
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
