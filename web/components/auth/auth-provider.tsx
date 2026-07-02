'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
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

const AUTH_BOOTSTRAP_PREFIXES = [
  '/admin',
  '/employee',
  '/hr',
  '/manager',
  '/onboarding',
  '/super-admin',
];

const PUBLIC_AUTH_SKIP_PREFIXES = [
  '/admin/login',
  '/forgot-password',
  '/help',
  '/privacy',
  '/reset-password',
  '/sign-in',
  '/sign-up',
  '/status',
  '/support',
  '/terms',
];

function shouldBootstrapAuth(pathname: string): boolean {
  if (!pathname || pathname === '/') {
    return false;
  }

  if (PUBLIC_AUTH_SKIP_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return false;
  }

  return AUTH_BOOTSTRAP_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const [user, setUser] = useState<MeResponse | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadAuth() {
      if (!shouldBootstrapAuth(pathname)) {
        if (mounted) {
          setUser(null);
          setPermissions([]);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);

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
  }, [pathname]);

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
