'use client';

import { useRouter } from 'next/navigation';
import { firebaseSignOut } from '@/lib/firebase';
import { supabaseSignOut } from '@/lib/supabase';

interface SignOutButtonProps {
  variant?: 'sidebar' | 'compact';
}

export function SignOutButton({ variant = 'sidebar' }: SignOutButtonProps) {
  const router = useRouter();

  async function handleSignOut() {
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

    router.push('/sign-in');
  }

  if (variant === 'compact') {
    return (
      <button
        onClick={handleSignOut}
        className="flex items-center gap-2 text-xs text-gray-400 hover:text-red-500 transition-colors"
        title="Sign out"
      >
        <span>↩</span>
        <span>Sign Out</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleSignOut}
      className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-500 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
    >
      <span>↩</span>
      <span>Sign Out</span>
    </button>
  );
}
