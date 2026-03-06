import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export function Badge({ variant = 'default', size = 'md', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium transition-colors',
        // Sizes
        size === 'sm' && 'px-2 py-0.5 text-[10px]',
        size === 'md' && 'px-2.5 py-0.5 text-xs',
        size === 'lg' && 'px-3 py-1 text-sm',
        // Variants with explicit colors and dark mode support
        variant === 'default' && 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
        variant === 'success' && 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400',
        variant === 'warning' && 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-400',
        variant === 'danger' && 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400',
        variant === 'info' && 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400',
        variant === 'outline' && 'border border-gray-300 bg-transparent text-gray-900 dark:border-gray-600 dark:text-gray-100',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
