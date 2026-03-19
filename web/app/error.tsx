'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { GlassPanel } from "@/components/glass-panel";
import { Button } from '@/components/ui/button';
import { useErrorHandling } from '@/lib/error-handling';

interface ErrorPageProps {
  error: Error & { id?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const { handleError } = useErrorHandling();
  const hasLogged = useRef(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!hasLogged.current) {
      handleError(error, {
        logError: true,
        showToast: false,
      });
      hasLogged.current = true;
    }
  }, [error, handleError]);

  if (!mounted) return null;

  const isChunkLoadError = error.message?.includes('Loading chunk') ||
    error.name === 'ChunkLoadError';

  const isNetworkError = typeof navigator !== 'undefined' && (
    error.message?.includes('fetch') ||
    error.message?.includes('network') ||
    !navigator?.onLine);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg z-10"
      >
        <GlassPanel className="overflow-hidden">
          <div className="p-10 border-b border-border/30 text-center space-y-4">
            <motion.div
              animate={{
                y: [0, -10, 0],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ duration: 4, repeat: Infinity }}
              className="text-7xl mb-6 inline-block"
            >
              {isChunkLoadError ? '🔄' : isNetworkError ? '🌐' : '🛑'}
            </motion.div>
            <h1 className="text-3xl font-extrabold tracking-tight text-glow gradient-text">
              {isChunkLoadError
                ? 'System Upgrade'
                : isNetworkError
                  ? 'Signal Interrupted'
                  : 'Core Exception'
              }
            </h1>
            <p className="text-muted-foreground/80 max-w-sm mx-auto">
              {isChunkLoadError
                ? 'A new version of Continuum is ready. We need to re-sync your session.'
                : isNetworkError
                  ? 'We lost connection to the enterprise grid. Please check your uplink.'
                  : 'A critical event occurred in the engine. Our automated systems are investigating.'
              }
            </p>
          </div>

          <div className="p-10 space-y-8">
            {error.id && (
              <div className="flex items-center justify-between text-[10px] font-mono px-4 py-2 bg-muted/30 rounded-full border border-border/20">
                <span className="uppercase text-muted-foreground">Trace ID</span>
                <span className="text-primary font-bold">{error.id}</span>
              </div>
            )}

            {process.env.NODE_ENV === 'development' && (
              <details className="group">
                <summary className="cursor-pointer text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                  Kernel Logs
                </summary>
                <div className="mt-4 p-4 rounded-xl bg-background/50 border border-border/20 font-mono text-[10px] overflow-auto max-h-48 space-y-3">
                  <p className="text-destructive font-bold">{error.message}</p>
                  {error.stack && <pre className="text-muted-foreground whitespace-pre-wrap">{error.stack}</pre>}
                </div>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={isChunkLoadError ? () => window.location.reload() : reset}
                className="magic-border-btn flex-1 h-12 text-sm font-bold uppercase tracking-widest"
              >
                {isChunkLoadError ? 'Sync Session' : 'Re-Attempt'}
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/'}
                className="flex-1 h-12 text-sm font-bold uppercase tracking-widest border-border/40 hover:bg-muted/50 transition-all rounded-2xl"
              >
                Return Base
              </Button>
            </div>
          </div>
        </GlassPanel>
      </motion.div>
    </div>
  );
}