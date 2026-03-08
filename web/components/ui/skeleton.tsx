import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'circular' | 'text' | 'card' | 'button' | 'badge' | 'avatar';
  width?: string | number;
  height?: string | number;
  lines?: number;
  animate?: boolean;
}

export function Skeleton({
  className,
  variant = 'default',
  width,
  height,
  lines = 1,
  animate = true,
  ...props
}: SkeletonProps) {
  const style = {
    width: width,
    height: height,
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={cn('space-y-2', className)} {...props}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cn(
              'skeleton',
              animate && 'animate-pulse',
              'rounded',
              index === lines - 1 ? 'w-3/4' : 'w-full',
              'h-4'
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'skeleton',
        animate && 'animate-pulse',
        variant === 'circular' && 'rounded-full',
        variant === 'text' && 'h-4 rounded',
        variant === 'card' && 'rounded-xl',
        variant === 'button' && 'rounded-lg h-10',
        variant === 'badge' && 'rounded-full h-6',
        variant === 'avatar' && 'rounded-full w-10 h-10',
        variant === 'default' && 'rounded-lg',
        className
      )}
      style={style}
      {...props}
    />
  );
}

// Pre-built skeleton patterns
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-6 space-y-4',
        className
      )}
    >
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" className="w-12 h-12" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-20 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}

export function SkeletonTable({
  rows = 5,
  columns = 4,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl border border-border bg-card', className)}>
      {/* Header */}
      <div className="flex gap-4 p-4 border-b border-border">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex gap-4 p-4 border-b border-border last:border-0"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-6 space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton variant="circular" className="w-8 h-8" />
            </div>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </div>

      {/* Content area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SkeletonCard />
        <div className="lg:col-span-2">
          <SkeletonTable rows={4} columns={5} />
        </div>
      </div>
    </div>
  );
}

export function SkeletonList({
  items = 5,
  className,
}: {
  items?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card"
        >
          <Skeleton variant="circular" className="w-10 h-10 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonForm({ fields = 4, className }: { fields?: number; className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="h-10 w-32" />
    </div>
  );
}

// Enhanced skeleton patterns for Continuum
export function SkeletonLeaveCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-6 space-y-4 relative overflow-hidden',
        className
      )}
    >
      {/* Gradient top bar */}
      <Skeleton className="absolute top-0 left-0 right-0 h-1 rounded-none" />
      
      {/* Header with badge */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-16" />
        <Skeleton variant="badge" className="w-12" />
      </div>
      
      {/* Main number */}
      <Skeleton className="h-8 w-12" />
      
      {/* Subtitle */}
      <Skeleton className="h-3 w-28" />
      
      {/* Progress bar */}
      <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
        <Skeleton className="h-2 w-3/4 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonMetricCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-3">
            <Skeleton variant="circular" className="w-8 h-8" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonLeaveRequest({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'border border-border rounded-lg bg-card p-4 space-y-4',
        className
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Skeleton variant="avatar" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton variant="badge" className="w-16" />
      </div>
      
      {/* Content */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="space-y-1">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-4 w-12" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-4 w-14" />
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Skeleton variant="button" className="w-20 h-8" />
        <Skeleton variant="button" className="w-16 h-8" />
      </div>
    </div>
  );
}

export function SkeletonNotification({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 hover:bg-muted/50 rounded-lg',
        className
      )}
    >
      <Skeleton variant="circular" className="w-8 h-8 mt-0.5" />
      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-3 w-full" />
        <div className="flex gap-2">
          <Skeleton variant="badge" className="w-16 h-5" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonEmployeeRow({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 hover:bg-muted/50 border-b last:border-0',
        className
      )}
    >
      <Skeleton variant="avatar" />
      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-18" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex gap-2">
          <Skeleton variant="badge" className="w-12" />
          <Skeleton variant="badge" className="w-16" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonPageHeader({ 
  showButton = true, 
  className 
}: { 
  showButton?: boolean; 
  className?: string; 
}) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      {showButton && <Skeleton variant="button" className="w-32" />}
    </div>
  );
}
