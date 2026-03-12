'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

export default function EmployeeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Employee Portal Error]', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4 max-w-md px-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-white">Something went wrong</h2>
        <p className="text-sm text-white/60">
          An unexpected error occurred in the employee portal. Please try again.
        </p>
        {error.digest && (
          <p className="text-xs text-white/60 font-mono">Error ID: {error.digest}</p>
        )}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <RefreshCcw className="w-4 h-4" />
            Try Again
          </button>
          <a
            href="/employee/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 border border-white/10 text-white rounded-lg text-sm font-medium hover:bg-white/5 transition-colors"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
