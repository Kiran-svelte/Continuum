'use client';

import { useRouter } from 'next/navigation';
import { supabaseSignOut } from '@/lib/supabase';
import { LogOut } from 'lucide-react';
import {
  COOKIE_SESSION,
  COOKIE_ROLE,
  COOKIE_ROLES,
  COOKIE_ONBOARDING,
  COOKIE_EMP_ONBOARDING,
  COOKIE_EMP_WELCOME,
  COOKIE_ENABLED_MODULES,
  COOKIE_COMPANY_SETUP,
} from '@/lib/brand';

interface SignOutButtonProps {
  variant?: 'sidebar' | 'compact';
}

export function SignOutButton({ variant = 'sidebar' }: SignOutButtonProps) {
  const router = useRouter();

  async function handleSignOut() {
    // 1. Call server-side sign-out API first (creates audit log while cookies still exist)
    try {
      await fetch('/api/auth/sign-out', { method: 'POST' });
    } catch {
      // Continue with sign-out even if audit fails
    }

    // 2. Clear all auth/role cookies client-side (backup for API response cookies)
    const clearCookie = (name: string) => {
      document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
    };

    clearCookie(COOKIE_SESSION);
    clearCookie(COOKIE_ROLE);
    clearCookie(COOKIE_ROLES);
    clearCookie(COOKIE_ONBOARDING);
    clearCookie(COOKIE_EMP_ONBOARDING);
    clearCookie(COOKIE_EMP_WELCOME);
    clearCookie(COOKIE_ENABLED_MODULES);
    clearCookie(COOKIE_COMPANY_SETUP);
    localStorage.removeItem('preferred_portal');

    // Clear Supabase client-side auth state
    try {
      await supabaseSignOut();
    } catch {
      // ignore
    }

    // Clear session cookie server-side
    try {
      await fetch('/api/auth/session', { method: 'DELETE' });
    } catch {
      // ignore
    }

    // Use replace so back button doesn't re-authenticate
    router.replace('/sign-in');
  }

  if (variant === 'compact') {
    return (
      <button
        onClick={handleSignOut}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-red-500 transition-colors"
        title="Sign out"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span>Sign Out</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleSignOut}
      className="flex items-center gap-3 w-full px-3 py-2 text-sm text-muted-foreground rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
    >
      <LogOut className="w-4 h-4" />
      <span>Sign Out</span>
    </button>
  );
}
