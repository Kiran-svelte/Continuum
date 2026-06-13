'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ensureMe, type MeResponse } from '@/lib/client-auth';

interface AuthContextValue {
  user: MeResponse | null;
  permissions: string[];
  isLoading: boolean;
  hasPermission: (code: string) => boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  permissions: [],
  isLoading: true,
  hasPermission: () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadAuth() {
      try {
        const me = await ensureMe();
        if (mounted) {
          setUser(me);
          setPermissions(me?.permissions || []);
        }
      } catch (error) {
        console.error('[AuthProvider] Failed to load auth state', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void loadAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const hasPermission = (code: string) => {
    if (permissions.includes('*')) return true;
    return permissions.includes(code);
  };

  return (
    <AuthContext.Provider value={{ user, permissions, isLoading, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
