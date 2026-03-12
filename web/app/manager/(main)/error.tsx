'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ServerCrash, RefreshCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ManagerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('[Manager Portal Error]', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)] text-center p-4">
      <motion.div
        initial={{ opacity: 0, y: -30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring' as const, stiffness: 100, damping: 15 }}
        className="glass-panel max-w-lg w-full p-8 md:p-12 rounded-2xl border-l-4 border-t-2 border-red-500/50"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' as const, stiffness: 120 }}
          className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-red-500/20 to-red-800/20 flex items-center justify-center"
        >
          <ServerCrash className="w-10 h-10 text-red-400" />
        </motion.div>

        <h1 className="mt-6 text-3xl font-bold text-red-300 text-shadow-lg">
          Portal Error
        </h1>
        <p className="mt-2 text-base text-slate-400">
          An unexpected error occurred. Your session may have expired or there was a network issue.
        </p>

        {error.digest && (
          <div className="mt-4 inline-block bg-slate-800/50 px-3 py-1 rounded-md">
            <p className="text-xs text-slate-500 font-mono">Error ID: {error.digest}</p>
          </div>
        )}

        <div className="mt-8 flex items-center justify-center gap-4">
          <Button
            onClick={() => reset()}
            variant="outline"
            className="bg-sky-500/20 hover:bg-sky-500/40 border border-sky-400 text-sky-300 rounded-xl font-bold shadow-[0_0_15px_rgba(7,159,217,0.3)] hover:-translate-y-0.5 transition-transform duration-300"
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          <a href="/manager/dashboard">
            <Button
              variant="ghost"
              className="text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors"
            >
              <Home className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
          </a>
        </div>
      </motion.div>
    </div>
  );
}
