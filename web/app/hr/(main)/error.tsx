'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';
import { TiltCard } from '@/components/motion';

export default function HRError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('[HR Portal Error]', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <TiltCard
        className="w-full max-w-lg"
      >
        <div className="glass-panel p-8 rounded-2xl border border-red-500/30 shadow-2xl shadow-red-500/10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-5"
          >
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-red-500/20 to-red-800/30 flex items-center justify-center ring-4 ring-red-500/20">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-red-300 text-shadow-md">Oops! Something went wrong.</h2>
              <p className="text-sm text-slate-400">
                An unexpected error occurred while processing your request in the HR portal.
                Our team has been notified.
              </p>
              {error.digest && (
                <p className="text-xs text-slate-500 font-mono pt-2">Error Digest: {error.digest}</p>
              )}
            </div>
            <div className="flex items-center justify-center gap-4 pt-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={reset}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500/20 text-emerald-300 rounded-lg text-sm font-medium border border-emerald-500/40 hover:bg-emerald-500/30 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
              >
                <RefreshCcw className="w-4 h-4" />
                Try Again
              </motion.button>
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href="/hr/dashboard"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-700/30 text-slate-300 rounded-lg text-sm font-medium border border-slate-600/80 hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500/50"
              >
                <Home className="w-4 h-4" />
                Go to Dashboard
              </motion.a>
            </div>
          </motion.div>
        </div>
      </TiltCard>
    </div>
  );
}
