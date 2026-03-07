'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useErrorHandling } from '@/lib/error-handling';

interface ErrorPageProps {
  error: Error & { id?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const { handleError } = useErrorHandling();
  const hasLogged = useRef(false);

  useEffect(() => {
    // Log error once when component mounts
    if (!hasLogged.current) {
      handleError(error, {
        logError: true,
        showToast: false, // Don't show toast on error pages
      });
      hasLogged.current = true;
    }
  }, [error, handleError]);

  const isChunkLoadError = error.message?.includes('Loading chunk') || 
                          error.name === 'ChunkLoadError';
  
  const isNetworkError = error.message?.includes('fetch') ||
                        error.message?.includes('network') ||
                        !navigator?.onLine;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg"
      >
        <Card className="border-destructive/20">
          <CardHeader className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="text-6xl mb-4"
            >
              {isChunkLoadError ? '🔄' : isNetworkError ? '🌐' : '💥'}
            </motion.div>
            <CardTitle className="text-xl">
              {isChunkLoadError 
                ? 'App Update Available' 
                : isNetworkError 
                  ? 'Connection Problem'
                  : 'Something went wrong'
              }
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">
                {isChunkLoadError 
                  ? 'The application has been updated. Please refresh to get the latest version.'
                  : isNetworkError
                    ? 'Please check your internet connection and try again.'
                    : 'We encountered an unexpected error. Our team has been notified and will look into it.'
                }
              </p>
              
              {error.id && (
                <p className="text-xs text-muted-foreground font-mono">
                  Error ID: {error.id}
                </p>
              )}
            </div>

            {/* Error details for development */}
            {process.env.NODE_ENV === 'development' && (
              <details className="space-y-2">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Technical Details (Development)
                </summary>
                <div className="bg-muted rounded-lg p-3 space-y-2">
                  <div>
                    <span className="text-xs font-semibold text-destructive">Error:</span>
                    <pre className="text-xs text-foreground mt-1 overflow-auto">
                      {error.message}
                    </pre>
                  </div>
                  {error.stack && (
                    <div>
                      <span className="text-xs font-semibold text-destructive">Stack Trace:</span>
                      <pre className="text-xs text-muted-foreground mt-1 overflow-auto max-h-32">
                        {error.stack}
                      </pre>
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    <strong>URL:</strong> {window.location.href}<br />
                    <strong>Time:</strong> {new Date().toISOString()}<br />
                    <strong>User Agent:</strong> {navigator.userAgent}
                  </div>
                </div>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              {isChunkLoadError ? (
                <Button 
                  onClick={() => window.location.reload()} 
                  className="flex items-center gap-2 w-full"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh App
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={reset} 
                    className="flex items-center gap-2 flex-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Try Again
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => window.location.href = '/'}
                    className="flex items-center gap-2 flex-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Go Home
                  </Button>
                </>
              )}
            </div>

            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                If the problem persists, please contact support.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}