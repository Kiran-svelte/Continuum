'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';

export type ErrorType = 
  | 'network'
  | 'validation'
  | 'permission'
  | 'constraint'
  | 'server'
  | 'unknown';

export interface AppError {
  type: ErrorType;
  message: string;
  details?: any;
  timestamp: Date;
  retryable: boolean;
  userFriendly: string;
  action?: string;
}

export interface ErrorHandlingOptions {
  showToast?: boolean;
  logError?: boolean;
  retryable?: boolean;
  fallbackMessage?: string;
}

// Standalone error classification function
function classifyErrorStandalone(error: any): ErrorType {
  if (!error) return 'unknown';

  const message = error.message?.toLowerCase() || '';
  
  // Network errors
  if (error.name === 'NetworkError' || 
      message.includes('fetch') || 
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('timeout') ||
      !navigator?.onLine) {
    return 'network';
  }
  
  // Server errors (5xx status codes)
  if (error.status >= 500 && error.status < 600) {
    return 'server';
  }
  
  // Client errors (4xx status codes)
  if (error.status >= 400 && error.status < 500) {
    if (error.status === 401 || error.status === 403) {
      return 'permission';
    }
    if (error.status === 400 || error.status === 422) {
      return 'validation';
    }
    return 'validation';
  }
  
  // Business logic errors
  if (message.includes('constraint') || message.includes('rule')) {
    return 'constraint';
  }
  if (message.includes('permission') || message.includes('forbidden')) {
    return 'permission';
  }
  if (message.includes('validation') || message.includes('invalid')) {
    return 'validation';
  }

  return 'unknown';
}

// Error classification and user-friendly messages
const ERROR_MESSAGES: Record<ErrorType, string> = {
  network: 'Connection problem. Please check your internet connection and try again.',
  server: 'Server is temporarily unavailable. Please try again in a moment.',
  validation: 'Please check your input and try again.',
  permission: 'You do not have permission to perform this action.',
  constraint: 'This action violates business rules. Please check the constraints.',
  unknown: 'An unexpected error occurred. Please try again or contact support.'
};

const ERROR_ACTIONS: Record<ErrorType, string> = {
  network: 'Retry',
  server: 'Retry',
  validation: 'Review',
  permission: 'Contact Admin',
  constraint: 'Review Rules',
  unknown: 'Contact Support'
};

// Standalone createAppError function
export function createAppError(error: any, options: ErrorHandlingOptions = {}): AppError {
  const type = classifyErrorStandalone(error);
  const message = error.message || error.toString();
  const userFriendly = options.fallbackMessage || ERROR_MESSAGES[type];
  
  return {
    type,
    message,
    details: error,
    timestamp: new Date(),
    retryable: options.retryable ?? (type === 'network' || type === 'server'),
    userFriendly,
    action: ERROR_ACTIONS[type],
  };
}

export function useErrorHandling() {
  const [errors, setErrors] = useState<AppError[]>([]);
  const [isRetrying, setIsRetrying] = useState(false);
  const retryCount = useRef(0);
  const maxRetries = 3;

  // Classify error type based on error object or response
  const classifyError = useCallback((error: any): ErrorType => {
    if (!error) return 'unknown';
    
    // Network errors
    if (error.name === 'TypeError' && error.message?.includes('fetch')) {
      return 'network';
    }
    if (error.code === 'NETWORK_ERROR' || !navigator.onLine) {
      return 'network';
    }

    // HTTP status code errors
    if (error.status || error.response?.status) {
      const status = error.status || error.response.status;
      if (status === 400) return 'validation';
      if (status === 401 || status === 403) return 'permission';
      if (status === 409) return 'constraint';
      if (status >= 500) return 'server';
    }

    // Business logic errors
    if (error.message?.includes('constraint') || error.message?.includes('violation')) {
      return 'constraint';
    }
    if (error.message?.includes('permission') || error.message?.includes('forbidden')) {
      return 'permission';
    }
    if (error.message?.includes('validation') || error.message?.includes('invalid')) {
      return 'validation';
    }

    return 'unknown';
  }, []);

  // Create AppError from any error
  const createAppError = useCallback((error: any, options: ErrorHandlingOptions = {}): AppError => {
    const type = classifyError(error);
    const message = error.message || error.toString();
    const userFriendly = options.fallbackMessage || ERROR_MESSAGES[type];
    
    return {
      type,
      message,
      details: error,
      timestamp: new Date(),
      retryable: options.retryable ?? (type === 'network' || type === 'server'),
      userFriendly,
      action: ERROR_ACTIONS[type],
    };
  }, [classifyError]);

  // Handle error with comprehensive logging and user feedback
  const handleError = useCallback((error: any, options: ErrorHandlingOptions = {}) => {
    const appError = createAppError(error, options);
    
    // Add to error log
    setErrors(prev => [appError, ...prev.slice(0, 9)]); // Keep last 10 errors

    // Log error for debugging
    if (options.logError !== false) {
      console.error('Error handled:', {
        type: appError.type,
        message: appError.message,
        details: appError.details,
        timestamp: appError.timestamp,
        stack: error.stack,
        userAgent: navigator.userAgent,
        url: window.location.href,
      });
    }

    // Show user-friendly toast notification
    if (options.showToast !== false) {
      const toastOptions = {
        action: appError.retryable ? {
          label: appError.action,
          onClick: () => {
            // Retry logic would be implemented by the calling component
            console.log('Retry requested for error:', appError);
          }
        } : undefined
      };

      switch (appError.type) {
        case 'network':
          toast.error(appError.userFriendly, toastOptions);
          break;
        case 'permission':
          toast.error(appError.userFriendly);
          break;
        case 'constraint':
          toast.warning(appError.userFriendly);
          break;
        case 'validation':
          toast.warning(appError.userFriendly);
          break;
        default:
          toast.error(appError.userFriendly, toastOptions);
      }
    }

    return appError;
  }, [createAppError]);

  // Retry mechanism with exponential backoff
  const retryWithBackoff = useCallback(async (
    operation: () => Promise<any>,
    context: string = 'operation'
  ) => {
    if (retryCount.current >= maxRetries) {
      throw new Error(`Max retries (${maxRetries}) exceeded for ${context}`);
    }

    setIsRetrying(true);
    try {
      const delay = Math.min(1000 * Math.pow(2, retryCount.current), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      const result = await operation();
      retryCount.current = 0; // Reset on success
      return result;
    } catch (error) {
      retryCount.current++;
      throw error;
    } finally {
      setIsRetrying(false);
    }
  }, []);

  // Safe async operation wrapper
  const safeAsync = useCallback(async <T>(
    operation: () => Promise<T>,
    options: ErrorHandlingOptions & { 
      context?: string;
      onError?: (error: AppError) => void;
    } = {}
  ): Promise<T | null> => {
    try {
      const result = await operation();
      retryCount.current = 0; // Reset retry count on successful operation
      return result;
    } catch (error) {
      const appError = handleError(error, options);
      
      if (options.onError) {
        options.onError(appError);
      }
      
      // Auto-retry for retryable errors
      if (appError.retryable && retryCount.current < maxRetries) {
        console.log(`Auto-retrying ${options.context || 'operation'} (attempt ${retryCount.current + 1}/${maxRetries})`);
        return retryWithBackoff(operation, options.context);
      }
      
      return null;
    }
  }, [handleError, retryWithBackoff]);

  // Clear errors
  const clearErrors = useCallback(() => {
    setErrors([]);
    retryCount.current = 0;
  }, []);

  // Get error summary for debugging
  const getErrorSummary = useCallback(() => {
    const summary = errors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<ErrorType, number>);
    
    return {
      total: errors.length,
      byType: summary,
      recent: errors.slice(0, 3),
    };
  }, [errors]);

  return {
    errors,
    isRetrying,
    handleError,
    safeAsync,
    retryWithBackoff,
    clearErrors,
    getErrorSummary,
    createAppError,
  };
}

// Global error handler for unhandled promise rejections
export function setupGlobalErrorHandling() {
  if (typeof window === 'undefined') return;

  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Don't show toast for every unhandled rejection to avoid spam
    // but log them for debugging
    const error = event.reason;
    console.error('Global error handler:', {
      error,
      stack: error?.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
    });
  });

  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    
    // Handle chunk loading errors specifically
    if (event.error?.name === 'ChunkLoadError' || 
        event.message?.includes('Loading chunk')) {
      toast.error('App update available. Please refresh the page.', {
        action: {
          label: 'Refresh',
          onClick: () => window.location.reload()
        }
      });
    }
  });
}

// Utility function to check if error is retryable
export function isRetryableError(error: any): boolean {
  const appError = createAppError(error);
  return appError.type === 'network' || appError.type === 'server';
}

// Utility to get user-friendly error message
export function getUserFriendlyMessage(error: any, fallback?: string): string {
  const appError = createAppError(error, { fallbackMessage: fallback });
  return appError.userFriendly;
}