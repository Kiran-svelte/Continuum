'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useErrorHandling } from '@/lib/error-handling';

interface AuthErrorPageProps {
  error: Error & { id?: string };
  reset: () => void;
}

export default function AuthErrorPage({ error, reset }: AuthErrorPageProps) {
  const { handleError } = useErrorHandling();
  const hasLogged = useRef(false);

  useEffect(() => {
    if (!hasLogged.current) {
      handleError(error, {
        logError: true,
        showToast: false,
      });
      hasLogged.current = true;
    }
  }, [error, handleError]);

  const isFirebaseAuthError = error.message?.includes('auth/') || 
                             error.name?.includes('Firebase');
  
  const isSupabaseAuthError = error.message?.includes('supabase') ||
                             error.message?.includes('session');

  const isNetworkError = error.message?.includes('fetch') ||
                        error.message?.includes('network') ||
                        !navigator?.onLine;

  const getErrorTitle = () => {
    if (isFirebaseAuthError) return 'Authentication Problem';
    if (isSupabaseAuthError) return 'Session Issue';
    if (isNetworkError) return 'Connection Problem';
    return 'Sign-in Error';
  };

  const getErrorDescription = () => {
    if (isFirebaseAuthError) {
      if (error.message?.includes('auth/user-not-found')) {
        return 'No account found with these credentials. Please check your email or create a new account.';
      }
      if (error.message?.includes('auth/wrong-password')) {
        return 'Incorrect password. Please try again or reset your password.';
      }
      if (error.message?.includes('auth/invalid-email')) {
        return 'Please enter a valid email address.';
      }
      if (error.message?.includes('auth/user-disabled')) {
        return 'This account has been disabled. Contact support for assistance.';
      }
      if (error.message?.includes('auth/too-many-requests')) {
        return 'Too many failed attempts. Please wait a few minutes before trying again.';
      }
      return 'There was a problem with authentication. Please try again.';
    }
    
    if (isSupabaseAuthError) {
      return 'Your session has expired or there was an issue with the database connection. Please try signing in again.';
    }
    
    if (isNetworkError) {
      return 'Please check your internet connection and try again.';
    }
    
    return 'We encountered an unexpected error during sign-in. Please try again.';
  };

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
              {isNetworkError ? '🌐' : isFirebaseAuthError || isSupabaseAuthError ? '🔐' : '⚠️'}
            </motion.div>
            <CardTitle className="text-xl">
              {getErrorTitle()}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">
                {getErrorDescription()}
              </p>
              
              {error.id && (
                <p className="text-xs text-muted-foreground font-mono">
                  Error ID: {error.id}
                </p>
              )}
            </div>

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
                      <span className="text-xs font-semibold text-destructive">Stack:</span>
                      <pre className="text-xs text-muted-foreground mt-1 overflow-auto max-h-32">
                        {error.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
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
            </div>

            <div className="text-center space-y-2">
              <p className="text-xs text-muted-foreground">
                Need help signing in?
              </p>
              <div className="flex justify-center space-x-4 text-xs">
                <button
                  className="text-primary hover:text-primary/80 underline"
                  onClick={() => window.location.href = '/auth/forgot-password'}
                >
                  Reset Password
                </button>
                <button
                  className="text-primary hover:text-primary/80 underline"
                  onClick={() => window.open('mailto:support@continuum-hr.com', '_blank')}
                >
                  Contact Support
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}