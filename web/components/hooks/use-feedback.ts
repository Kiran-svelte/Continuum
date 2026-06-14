'use client';

import { toast } from 'sonner';

interface FeedbackOptions {
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Extended description below the main message */
  description?: string;
}

/**
 * Global feedback system for consistent UI states.
 * Wraps Sonner toast to enforce standard colors and iconography.
 */
export function useFeedback() {
  const success = (message: string, options?: FeedbackOptions) => {
    toast.success(message, {
      description: options?.description,
      action: options?.action,
      icon: '✓',
      style: {
        background: 'var(--status-success)',
        color: 'white',
        border: 'none',
      },
    });
  };

  const error = (message: string, options?: FeedbackOptions) => {
    toast.error(message, {
      description: options?.description,
      action: options?.action,
      icon: '✗',
      style: {
        background: 'var(--status-danger)',
        color: 'white',
        border: 'none',
      },
      duration: 5000, // Errors stay longer
    });
  };

  const warning = (message: string, options?: FeedbackOptions) => {
    toast.warning(message, {
      description: options?.description,
      action: options?.action,
      icon: '⚠️',
      style: {
        background: 'var(--status-warning)',
        color: 'white',
        border: 'none',
      },
    });
  };

  const info = (message: string, options?: FeedbackOptions) => {
    toast.info(message, {
      description: options?.description,
      action: options?.action,
      icon: 'ℹ️',
      style: {
        background: 'var(--primary)',
        color: 'white',
        border: 'none',
      },
    });
  };

  /**
   * Used for background processes. Returns a toast ID that can be dismissed
   * later or updated when the process completes.
   */
  const process = (message: string): string | number => {
    return toast.loading(message, {
      style: {
        background: 'var(--card)',
        color: 'var(--foreground)',
        border: '1px solid var(--border)',
      },
    });
  };

  const dismiss = (id: string | number) => {
    toast.dismiss(id);
  };

  return {
    success,
    error,
    warning,
    info,
    process,
    dismiss,
  };
}
