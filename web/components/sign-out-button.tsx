'use client';

import { useRouter } from 'next/navigation';
import { firebaseSignOut } from '@/lib/firebase';
import { supabaseSignOut } from '@/lib/supabase';
import { keycloakSignOut, isKeycloakClientEnabled } from '@/lib/keycloak-client';
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
    document.cookie = 'continuum-role=; path=/; max-age=0';
    document.cookie = 'continuum-roles=; path=/; max-age=0';
    document.cookie = 'firebase-auth-token=; path=/; max-age=0';
    document.cookie = 'kc-access-token=; path=/; max-age=0';
    document.cookie = 'kc-refresh-token=; path=/; max-age=0';
    document.cookie = 'kc-token-exp=; path=/; max-age=0';
    localStorage.removeItem('preferred_portal');

    // If Keycloak is active, use its logout flow (clears cookies + SSO session)
    if (isKeycloakClientEnabled()) {
      try {
        await keycloakSignOut();
        return; // keycloakSignOut redirects the browser
      } catch {
        // Fall through to legacy sign-out
      }
    }

    try {
      await supabaseSignOut();
    } catch {
      // ignore
    }
    try {
      await firebaseSignOut();
    } catch {
      // ignore
    }
    try {
      // Clear Firebase HTTP-only session cookie if present
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
