'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, refreshAccessToken, setAccessToken } from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { PublicUser } from '@/types';

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (data: {
    username: string;
    email: string;
    password: string;
    displayName: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<PublicUser>) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // On first load (or full page refresh), the access token in memory is gone.
  // We try to silently get a new one using the httpOnly refresh cookie.
  // If that succeeds, the user stays logged in without re-entering a password.
  useEffect(() => {
    (async () => {
      const token = await refreshAccessToken();
      if (token) {
        try {
          const me = await apiFetch<PublicUser>('/users/me');
          setUser(me);
          connectSocket();
        } catch {
          setAccessToken(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const data = await apiFetch<{ user: PublicUser; accessToken: string }>('/auth/login', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({ identifier, password }),
      });
      setAccessToken(data.accessToken);
      setUser(data.user);
      connectSocket();
      router.push('/chat');
    },
    [router],
  );

  const register = useCallback(
    async (payload: { username: string; email: string; password: string; displayName: string }) => {
      const data = await apiFetch<{ user: PublicUser; accessToken: string }>('/auth/register', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify(payload),
      });
      setAccessToken(data.accessToken);
      setUser(data.user);
      connectSocket();
      router.push('/chat');
    },
    [router],
  );

  const logout = useCallback(async () => {
    await apiFetch('/auth/logout', { method: 'POST' });
    setAccessToken(null);
    setUser(null);
    disconnectSocket();
    router.push('/login');
  }, [router]);

  const updateUser = useCallback((updates: Partial<PublicUser>) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
