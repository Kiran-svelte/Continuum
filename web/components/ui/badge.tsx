import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export function Badge({ variant = 'default', size = 'md', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full whitespace-nowrap',
        variant === 'default' && 'bg-muted text-muted-foreground',
        variant === 'success' && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
        variant === 'warning' && 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
        variant === 'danger' && 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400',
        variant === 'info' && 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
        variant === 'outline' && 'border border-border bg-transparent text-foreground',
        size === 'sm' && 'px-2 py-0.5 text-[10px]',
        size === 'md' && 'px-2.5 py-0.5 text-xs',
        size === 'lg' && 'px-3 py-1 text-sm',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
