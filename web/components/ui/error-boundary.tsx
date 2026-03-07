'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: string) => void;
}

interface ErrorFallbackProps {
  error?: Error;
  resetError: () => void;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo: errorInfo.componentStack || '',
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo.componentStack || 'No component stack');
    }

    // Send error to monitoring service (placeholder)
    // sendErrorToService(error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-h-[50vh] flex items-center justify-center p-4"
    >
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="text-6xl">💥</div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Oops! Something went wrong</h2>
              <p className="text-sm text-muted-foreground mt-2">
                We encountered an unexpected error. Don't worry, we've been notified.
              </p>
            </div>
            
            {process.env.NODE_ENV === 'development' && error && (
              <details className="text-left bg-muted rounded-lg p-3">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                  Technical Details
                </summary>
                <pre className="text-xs mt-2 text-red-600 overflow-auto max-h-32">
                  {error.message}
                  {error.stack}
                </pre>
              </details>
            )}
            
            <div className="flex gap-3 justify-center">
              <Button
                onClick={resetError}
                className="flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try again
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/'}
              >
                Go home
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Specialized error fallbacks
export function NetworkErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center p-6 space-y-4"
    >
      <div className="text-4xl">🌐</div>
      <div>
        <h3 className="font-semibold text-foreground">Connection Problem</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Check your internet connection and try again.
        </p>
      </div>
      <Button onClick={resetError} size="sm">
        Retry
      </Button>
    </motion.div>
  );
}

export function ChunkLoadErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center p-6 space-y-4"
    >
      <div className="text-4xl">🔄</div>
      <div>
        <h3 className="font-semibold text-foreground">Loading Error</h3>
        <p className="text-sm text-muted-foreground mt-1">
          There was an issue loading this page. Please refresh.
        </p>
      </div>
      <Button onClick={() => window.location.reload()} size="sm">
        Refresh Page
      </Button>
    </motion.div>
  );
}

// Hook for using error boundaries in functional components
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    console.error('Captured error:', error);
    setError(error);
  }, []);

  // Throw error in next render to trigger error boundary
  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { captureError, resetError };
}