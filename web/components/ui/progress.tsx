'use client';

import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface ProgressBarProps {
  value?: number;
  max?: number;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  indeterminate?: boolean;
  showValue?: boolean;
  animated?: boolean;
  className?: string;
}

export function ProgressBar({
  value = 0,
  max = 100,
  variant = 'default',
  size = 'md',
  indeterminate = false,
  showValue = false,
  animated = true,
  className,
}: ProgressBarProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  // Animate value changes
  useEffect(() => {
    if (!animated || indeterminate) {
      setDisplayValue(percentage);
      return;
    }

    const duration = 500;
    const steps = 20;
    const increment = (percentage - displayValue) / steps;
    let current = displayValue;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current += increment;
      setDisplayValue(current);

      if (step >= steps) {
        setDisplayValue(percentage);
        clearInterval(timer);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [percentage, animated, indeterminate]);

  const variantStyles = {
    default: 'bg-primary',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
    info: 'bg-blue-500',
  };

  const sizeStyles = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn(
          'w-full overflow-hidden rounded-full bg-secondary',
          sizeStyles[size]
        )}
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            variantStyles[variant],
            indeterminate && 'progress-indeterminate'
          )}
          style={{
            width: indeterminate ? '40%' : `${displayValue}%`,
          }}
        />
      </div>
      {showValue && !indeterminate && (
        <p className="text-xs text-muted-foreground mt-1">
          {Math.round(displayValue)}%
        </p>
      )}
    </div>
  );
}

// Optimistic UI wrapper
interface OptimisticProps {
  children: React.ReactNode;
  isOptimistic?: boolean;
  className?: string;
}

export function OptimisticWrapper({ children, isOptimistic = false, className }: OptimisticProps) {
  return (
    <div
      className={cn(
        'transition-opacity duration-200',
        isOptimistic && 'opacity-70',
        className
      )}
    >
      {children}
    </div>
  );
}

// Page loading indicator
export function PageLoader({ className }: { className?: string }) {
  return (
    <div className={cn('fixed top-0 left-0 right-0 z-50', className)}>
      <ProgressBar indeterminate size="sm" />
    </div>
  );
}

// Spinner component
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizeStyles = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
  };

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-primary border-t-transparent',
        sizeStyles[size],
        className
      )}
    />
  );
}

// Loading overlay
interface LoadingOverlayProps {
  show: boolean;
  message?: string;
  className?: string;
}

export function LoadingOverlay({ show, message, className }: LoadingOverlayProps) {
  if (!show) return null;

  return (
    <div
      className={cn(
        'absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm',
        className
      )}
    >
      <Spinner size="lg" />
      {message && (
        <p className="mt-4 text-sm text-muted-foreground animate-pulse">{message}</p>
      )}
    </div>
  );
}

// Progress steps
interface ProgressStep {
  label: string;
  description?: string;
}

interface ProgressStepsProps {
  steps: ProgressStep[];
  currentStep: number;
  className?: string;
}

export function ProgressSteps({ steps, currentStep, className }: ProgressStepsProps) {
  return (
    <div className={cn('flex items-center', className)}>
      {steps.map((step, index) => (
        <div key={index} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300',
                index < currentStep && 'bg-primary text-primary-foreground',
                index === currentStep && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                index > currentStep && 'bg-muted text-muted-foreground'
              )}
            >
              {index < currentStep ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                index + 1
              )}
            </div>
            <div className="mt-2 text-center">
              <p
                className={cn(
                  'text-sm font-medium',
                  index <= currentStep ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {step.label}
              </p>
              {step.description && (
                <p className="text-xs text-muted-foreground">{step.description}</p>
              )}
            </div>
          </div>
          {index < steps.length - 1 && (
            <div
              className={cn(
                'h-0.5 w-16 mx-4 transition-colors duration-300',
                index < currentStep ? 'bg-primary' : 'bg-muted'
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
