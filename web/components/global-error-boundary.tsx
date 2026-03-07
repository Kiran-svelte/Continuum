'use client';

import { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface GlobalErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorId?: string;
}

interface GlobalErrorBoundaryProps {
  children: ReactNode;
}

export class GlobalErrorBoundary extends Component<GlobalErrorBoundaryProps, GlobalErrorBoundaryState> {
  constructor(props: GlobalErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): GlobalErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorId: `global_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to monitoring service
    if (typeof window !== 'undefined') {
      // Create detailed error report
      const errorReport = {
        id: this.state.errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        type: 'global_boundary',
        userId: null, // Add if available
        companyId: null // Add if available
      };

      // Send to monitoring (in production this would go to your monitoring service)
      console.error('Global Error Boundary Caught Error:', errorReport);

      // Store in localStorage as backup
      try {
        const existingErrors = JSON.parse(localStorage.getItem('app_errors') || '[]');
        existingErrors.push(errorReport);
        // Keep only last 10 errors
        const recentErrors = existingErrors.slice(-10);
        localStorage.setItem('app_errors', JSON.stringify(recentErrors));
      } catch (storageError) {
        console.error('Failed to store error in localStorage:', storageError);
      }
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorId: undefined });
  };

  private handleRefresh = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-lg border-destructive/20">
            <CardHeader className="text-center">
              <div className="text-6xl mb-4">🚨</div>
              <CardTitle className="text-xl text-destructive">
                Critical Application Error
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">
                  The application encountered a critical error and needs to restart.
                  Our development team has been automatically notified.
                </p>
                
                {this.state.errorId && (
                  <p className="text-xs text-muted-foreground font-mono">
                    Error ID: {this.state.errorId}
                  </p>
                )}
              </div>

              {/* Development mode details */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="space-y-2">
                  <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    Error Details (Development)
                  </summary>
                  <div className="bg-muted rounded-lg p-3 space-y-2">
                    <div>
                      <span className="text-xs font-semibold text-destructive">Error:</span>
                      <pre className="text-xs text-foreground mt-1 overflow-auto whitespace-pre-wrap">
                        {this.state.error.message}
                      </pre>
                    </div>
                    {this.state.error.stack && (
                      <div>
                        <span className="text-xs font-semibold text-destructive">Stack:</span>
                        <pre className="text-xs text-muted-foreground mt-1 overflow-auto max-h-40 whitespace-pre-wrap">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={this.handleReset}
                  className="flex items-center gap-2 flex-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Retry
                </Button>
                <Button 
                  variant="outline"
                  onClick={this.handleRefresh}
                  className="flex items-center gap-2 flex-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Page
                </Button>
              </div>

              <div className="text-center space-y-2">
                <p className="text-xs text-muted-foreground">
                  Need immediate help? Contact support with the error ID above.
                </p>
                <div className="flex justify-center space-x-4 text-xs">
                  <button 
                    className="text-blue-500 hover:text-blue-600 underline"
                    onClick={() => window.open('mailto:support@continuum-hr.com', '_blank')}
                  >
                    Email Support
                  </button>
                  <button 
                    className="text-blue-500 hover:text-blue-600 underline"
                    onClick={() => window.open('/help', '_blank')}
                  >
                    Help Center
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}