'use client';

/**
 * RetryButton — Error-state retry button with optional countdown.
 *
 * Used in: list fetch failures, form submit failures, file upload failures,
 *          any async action that fails.
 *
 * Usage:
 *   <RetryButton onRetry={refetch} />
 *   <RetryButton onRetry={refetch} label="Retry loading employees" />
 */
import { useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface RetryButtonProps {
  /** Called when user clicks retry. */
  onRetry: () => Promise<void> | void;
  /** Button label (default: "Try again") */
  label?: string;
  /** Additional CSS classes */
  className?: string;
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Button variant */
  variant?: 'primary' | 'ghost' | 'outline';
}

export function RetryButton({
  onRetry,
  label = 'Try again',
  className,
  size = 'sm',
  variant = 'outline',
}: RetryButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(async () => {
    setLoading(true);
    try {
      await onRetry();
    } finally {
      setLoading(false);
    }
  }, [onRetry]);

  return (
    <Button
      type="button"
      variant={variant}
      size={size === 'md' ? undefined : size}
      onClick={handleClick}
      disabled={loading}
      aria-label={label}
      className={cn('gap-1.5', className)}
    >
      <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} aria-hidden />
      {loading ? 'Retrying…' : label}
    </Button>
  );
}
