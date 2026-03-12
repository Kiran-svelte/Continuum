'use client';

import { useRouter } from 'next/navigation';
import { supabaseSignOut } from '@/lib/supabase';
import { LogOut } from 'lucide-react';

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
    document.cookie = 'continuum-session=; path=/; max-age=0';
    document.cookie = 'continuum-role=; path=/; max-age=0';
    document.cookie = 'continuum-roles=; path=/; max-age=0';
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
