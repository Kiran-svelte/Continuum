'use client';

import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

interface SignOutButtonProps {
  variant?: 'sidebar' | 'compact';
}

export function SignOutButton({ variant = 'sidebar' }: SignOutButtonProps) {
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function handleSignOut() {
    await supabase.auth.signOut();
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
