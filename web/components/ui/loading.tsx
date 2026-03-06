'use client';

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// LOADING COMPONENTS - Various loading indicators
// ═══════════════════════════════════════════════════════════════════════════

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'primary' | 'white';
  className?: string;
}

export function Spinner({ size = 'md', variant = 'default', className }: SpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
    xl: 'w-12 h-12 border-4',
  };

  const variants = {
    default: 'border-muted-foreground/30 border-t-primary',
    primary: 'border-primary/30 border-t-primary',
    white: 'border-white/30 border-t-white',
  };

  return (
    <div
      className={cn(
        'rounded-full animate-spin',
        sizes[size],
        variants[variant],
        className
      )}
    />
  );
}

// Wave Loader
export function WaveLoader({ className }: { className?: string }) {
  return (
    <div className={cn('wave-loader', className)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} />
      ))}
    </div>
  );
}

// Dots Loader
export function DotsLoader({ className }: { className?: string }) {
  return (
    <div className={cn('loading-dots', className)}>
      <span />
      <span />
      <span />
    </div>
  );
}

// Pulse Loader
interface PulseLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PulseLoader({ size = 'md', className }: PulseLoaderProps) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return (
    <div className={cn('relative', sizes[size], className)}>
      <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-75" />
      <div className="absolute inset-0 rounded-full bg-primary" />
    </div>
  );
}

// Skeleton with shimmer
interface ShimmerSkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function ShimmerSkeleton({ 
  className, 
  variant = 'rectangular',
  width,
  height,
}: ShimmerSkeletonProps) {
  const variants = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  return (
    <div
      className={cn(
        'skeleton-enhanced',
        variants[variant],
        className
      )}
      style={{
        width: width,
        height: height,
      }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE LOADING COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

interface PageLoaderProps {
  message?: string;
  showProgress?: boolean;
  progress?: number;
}

export function PageLoader({ message, showProgress, progress = 0 }: PageLoaderProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
      {/* Animated logo */}
      <div className="relative mb-8">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center animate-pulse">
          <svg className="w-8 h-8 text-primary animate-bounce-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="absolute -inset-4 rounded-3xl bg-primary/5 animate-ping" />
      </div>

      {/* Progress bar */}
      {showProgress && (
        <div className="w-64 mb-4">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">{progress}%</p>
        </div>
      )}

      {/* Loading message */}
      {message && (
        <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
      )}

      {/* Dots indicator */}
      <div className="mt-4">
        <DotsLoader />
      </div>
    </div>
  );
}

// Top progress bar (like YouTube/GitHub)
interface TopProgressBarProps {
  progress: number;
  show: boolean;
}

export function TopProgressBar({ progress, show }: TopProgressBarProps) {
  if (!show) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-1">
      <div 
        className="h-full bg-gradient-to-r from-primary via-accent to-primary transition-all duration-300 ease-out"
        style={{ 
          width: `${progress}%`,
          boxShadow: '0 0 10px hsl(var(--primary) / 0.5)',
        }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SKELETON PAGE LAYOUTS
// ═══════════════════════════════════════════════════════════════════════════

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <ShimmerSkeleton className="h-8 w-48 mb-2" />
          <ShimmerSkeleton className="h-4 w-72" />
        </div>
        <ShimmerSkeleton className="h-10 w-32 rounded-lg" />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 stagger">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <ShimmerSkeleton className="h-4 w-20" />
              <ShimmerSkeleton className="h-6 w-12 rounded-full" />
            </div>
            <ShimmerSkeleton className="h-8 w-16 mb-2" />
            <ShimmerSkeleton className="h-3 w-32" />
            <ShimmerSkeleton className="h-2 w-full mt-4 rounded-full" />
          </div>
        ))}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-xl border border-border bg-card p-6 animate-slide-up">
          <ShimmerSkeleton className="h-6 w-32 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                <ShimmerSkeleton className="w-10 h-10 rounded-lg" />
                <div className="flex-1">
                  <ShimmerSkeleton className="h-4 w-24 mb-1" />
                  <ShimmerSkeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 animate-slide-up">
          <ShimmerSkeleton className="h-6 w-40 mb-4" />
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <ShimmerSkeleton className="h-4 w-32 mb-1" />
                  <ShimmerSkeleton className="h-3 w-24" />
                </div>
                <ShimmerSkeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4 animate-fade-in">
      {Array.from({ length: rows }).map((_, i) => (
        <div 
          key={i} 
          className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card animate-slide-up"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <ShimmerSkeleton className="w-12 h-12 rounded-full" variant="circular" />
          <div className="flex-1">
            <ShimmerSkeleton className="h-4 w-48 mb-2" />
            <ShimmerSkeleton className="h-3 w-32" />
          </div>
          <ShimmerSkeleton className="h-8 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-2 animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
          <ShimmerSkeleton className="h-4 w-24" />
          <ShimmerSkeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}
      <div className="flex justify-end gap-3 pt-4">
        <ShimmerSkeleton className="h-10 w-24 rounded-lg" />
        <ShimmerSkeleton className="h-10 w-32 rounded-lg" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// OPTIMISTIC UI HELPERS
// ═══════════════════════════════════════════════════════════════════════════

interface OptimisticWrapperProps {
  isPending: boolean;
  isSuccess: boolean;
  children: ReactNode;
  className?: string;
}

export function OptimisticWrapper({ 
  isPending, 
  isSuccess, 
  children, 
  className 
}: OptimisticWrapperProps) {
  return (
    <div 
      className={cn(
        'transition-all duration-300',
        isPending && 'opacity-70 pointer-events-none',
        isSuccess && 'optimistic-success',
        className
      )}
    >
      {children}
      {isPending && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-inherit">
          <Spinner size="sm" />
        </div>
      )}
    </div>
  );
}

// Button with loading state
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  children: ReactNode;
}

export function LoadingButton({ 
  loading, 
  loadingText = 'Loading...', 
  children, 
  disabled,
  className,
  ...props 
}: LoadingButtonProps) {
  return (
    <button
      {...props}
      disabled={loading || disabled}
      className={cn(
        'relative inline-flex items-center justify-center gap-2 transition-all',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'btn-press',
        className
      )}
    >
      {loading && <Spinner size="sm" variant="white" />}
      <span className={loading ? 'opacity-70' : ''}>
        {loading ? loadingText : children}
      </span>
    </button>
  );
}
