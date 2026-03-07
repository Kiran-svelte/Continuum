'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface OptimisticButtonProps extends React.ComponentProps<typeof Button> {
  isLoading?: boolean;
  successMessage?: string;
  errorMessage?: string;
  loadingText?: string;
  successIcon?: string;
  children?: React.ReactNode;
}

export function OptimisticButton({
  isLoading = false,
  successMessage,
  errorMessage,
  loadingText = 'Processing...',
  successIcon = '✓',
  className,
  children,
  disabled,
  ...props
}: OptimisticButtonProps) {
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [showError, setShowError] = React.useState(false);

  React.useEffect(() => {
    if (successMessage) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  React.useEffect(() => {
    if (errorMessage) {
      setShowError(true);
      const timer = setTimeout(() => setShowError(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  if (showSuccess) {
    return (
      <Button
        {...props}
        disabled
        className={cn(
          'bg-green-600 hover:bg-green-600 text-white relative overflow-hidden',
          className
        )}
      >
        <span className="flex items-center gap-2">
          {successIcon} {successMessage}
        </span>
      </Button>
    );
  }

  if (showError) {
    return (
      <Button
        {...props}
        variant="danger"
        disabled
        className={cn('relative overflow-hidden', className)}
      >
        <span className="flex items-center gap-2">
          ⚠️ {errorMessage}
        </span>
      </Button>
    );
  }

  return (
    <Button
      {...props}
      disabled={disabled || isLoading}
      className={cn(
        isLoading && 'relative overflow-hidden',
        className
      )}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          {loadingText}
        </span>
      ) : (
        children
      )}
      
      {isLoading && (
        <div className="absolute inset-0 bg-primary/20 animate-pulse" />
      )}
    </Button>
  );
}