import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { PublicUser } from '@shared';
import { endpoints, tokenStore } from '../lib/api';

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<PublicUser>;
  register: (b: { firstName: string; lastName: string; email: string; password: string }) => Promise<PublicUser>;
  logout: () => Promise<void>;
  setUser: (u: PublicUser | null) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!tokenStore.access) {
        setLoading(false);
        return;
      }
      try {
        const { user } = await endpoints.me();
        if (!cancelled) setUser(user);
      } catch {
        tokenStore.clear();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user, tokens } = await endpoints.login({ email, password });
    tokenStore.set(tokens);
    setUser(user);
    return user;
  }, []);

  const register = useCallback(async (b: { firstName: string; lastName: string; email: string; password: string }) => {
    const { user, tokens } = await endpoints.register(b);
    tokenStore.set(tokens);
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await endpoints.logout();
    } catch {
      /* el logout local siempre procede */
    }
    tokenStore.clear();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!tokenStore.access) return;
    try {
      const { user } = await endpoints.me();
      setUser(user);
    } catch {
      /* sin sesión válida */
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
