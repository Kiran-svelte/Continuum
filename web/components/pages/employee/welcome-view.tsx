'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function WelcomeView() {
  const router = useRouter();
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const continueToDashboard = async () => {
    if (finishing) {
      return;
    }

    setFinishing(true);
    setError(null);

    try {
      const response = await fetch('/api/employee/welcome/complete', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload.error || 'Could not complete welcome flow.');
        setFinishing(false);
        return;
      }

      router.push('/employee/dashboard');
    } catch {
      setError('Could not complete welcome flow.');
      setFinishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center p-6 overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,var(--primary)_0%,transparent_30%),radial-gradient(circle_at_80%_0%,var(--success)_0%,transparent_34%),linear-gradient(140deg,var(--background),var(--card))] opacity-80" />

      <div className="relative z-10 max-w-3xl w-full">
        <div className="card p-8 md:p-12 text-center space-y-8">
          <div className="mx-auto w-56 h-56 relative" style={{ perspective: '1000px' }}>
            <div
              className="absolute inset-0 rounded-full border border-[var(--primary)]/45 animate-spin"
              style={{ transform: 'rotateX(72deg)' }}
            />
            <div
              className="absolute inset-5 rounded-full border border-[var(--success)]/50 animate-spin"
              style={{ animationDirection: 'reverse', animationDuration: '10s', transform: 'rotateY(70deg)' }}
            />
            <div
              className="absolute inset-10 rounded-full border border-[var(--info)]/50 animate-spin"
              style={{ animationDuration: '8s', transform: 'rotateZ(60deg)' }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-[var(--primary)] text-white flex items-center justify-center shadow-xl shadow-[var(--primary)]/30">
                <Sparkles className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">Welcome to Continuum</p>
            <h1 className="text-display">Your workspace is ready</h1>
            <p className="text-body text-[var(--muted-foreground)] max-w-xl mx-auto">
              You completed the essential onboarding steps. Let&apos;s launch your employee workspace.
            </p>
          </div>

          {error && (
            <p className="rounded-lg border border-[var(--destructive)]/40 bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)] max-w-md mx-auto">
              {error}
            </p>
          )}

          <Button
            onClick={continueToDashboard}
            disabled={finishing}
            className="btn btn-primary min-w-52 h-12 text-base"
          >
            {finishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Open my dashboard <ArrowRight className="w-4 h-4" /></>}
          </Button>
        </div>
      </div>
    </div>
  );
}
