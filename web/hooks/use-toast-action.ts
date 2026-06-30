'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface ToastActionOptions<T> {
  successMessage?: string | ((result: T) => string);
  errorMessage?: string | ((err: unknown) => string);
  loadingMessage?: string;
}

/**
 * Wraps an async action with loading state + automatic toast feedback.
 *
 * Usage:
 *   const { run, loading } = useToastAction(async () => {
 *     await fetch('/api/...');
 *   }, { successMessage: 'Saved!', errorMessage: 'Save failed' });
 *
 *   <button onClick={run} disabled={loading}>Save</button>
 */
export function useToastAction<T = void>(
  action: () => Promise<T>,
  options: ToastActionOptions<T> = {}
) {
  const [loading, setLoading] = useState(false);

  const run = useCallback(async () => {
    if (loading) return;
    setLoading(true);

    const toastId = options.loadingMessage
      ? toast.loading(options.loadingMessage)
      : undefined;

    try {
      const result = await action();

      if (toastId !== undefined) toast.dismiss(toastId);

      const msg =
        typeof options.successMessage === 'function'
          ? options.successMessage(result)
          : options.successMessage;

      if (msg) toast.success(msg);

      return result;
    } catch (err) {
      if (toastId !== undefined) toast.dismiss(toastId);

      const msg =
        typeof options.errorMessage === 'function'
          ? options.errorMessage(err)
          : options.errorMessage ?? (err instanceof Error ? err.message : 'Something went wrong');

      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [action, options, loading]);

  return { run, loading };
}
