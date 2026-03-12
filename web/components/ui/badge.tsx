import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline' | 'live' | 'premium';
  size?: 'sm' | 'md' | 'lg';
  glow?: boolean;
}

export function Badge({ variant = 'default', size = 'md', glow = false, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold rounded-full whitespace-nowrap',
        'transition-all duration-200',
        variant === 'default' && 'bg-white/10 text-white/80 dark:bg-white/10 dark:text-white/80',
        variant === 'success' && 'bg-emerald-500/15 text-emerald-400 dark:bg-emerald-500/15 dark:text-emerald-400',
        variant === 'success' && glow && 'shadow-[0_0_12px_rgba(16,185,129,0.3)]',
        variant === 'warning' && 'bg-amber-500/15 text-amber-400 dark:bg-amber-500/15 dark:text-amber-400',
        variant === 'warning' && glow && 'shadow-[0_0_12px_rgba(245,158,11,0.3)]',
        variant === 'danger' && 'bg-red-500/15 text-red-400 dark:bg-red-500/15 dark:text-red-400',
        variant === 'danger' && glow && 'shadow-[0_0_12px_rgba(239,68,68,0.3)]',
        variant === 'info' && 'bg-blue-500/15 text-blue-400 dark:bg-blue-500/15 dark:text-blue-400',
        variant === 'info' && glow && 'shadow-[0_0_12px_rgba(59,130,246,0.3)]',
        variant === 'outline' && 'border border-white/20 bg-transparent text-white/70',
        variant === 'live' && 'bg-emerald-500/20 text-emerald-400 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.3)]',
        variant === 'premium' && 'bg-gradient-to-r from-primary/20 to-accent/20 text-primary border border-primary/30 dark:from-primary/20 dark:to-accent/20 dark:text-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]',
        size === 'sm' && 'px-2 py-0.5 text-[10px]',
        size === 'md' && 'px-2.5 py-0.5 text-xs',
        size === 'lg' && 'px-3 py-1 text-sm',
        className
      )}
      {...props}
    >
      {variant === 'live' && (
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
      )}
      {children}
    </span>
  );
}
