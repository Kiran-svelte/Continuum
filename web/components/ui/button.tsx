import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'success' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  glow?: boolean;
}

export function Button({ variant = 'primary', size = 'md', loading = false, glow = false, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold',
        'transition-all duration-200 ease-out transform-gpu',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
        'active:scale-[0.97] hover:scale-[1.02]',
        variant === 'primary' && 'bg-primary text-primary-foreground shadow-sm hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] dark:hover:shadow-[0_0_25px_rgba(var(--primary-rgb),0.5)]',
        variant === 'secondary' && 'bg-white/10 backdrop-blur-sm text-foreground border border-white/20 hover:bg-white/15 hover:border-white/30 dark:text-white dark:hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]',
        variant === 'danger' && 'bg-red-500/90 text-white hover:bg-red-500 hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]',
        variant === 'success' && 'bg-emerald-500/90 text-white hover:bg-emerald-500 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]',
        variant === 'ghost' && 'text-foreground hover:bg-white/10 dark:text-white/80 dark:hover:text-white',
        variant === 'outline' && 'border border-border bg-transparent text-foreground hover:bg-white/5 hover:border-primary/50 dark:border-white/20 dark:text-white/80 dark:hover:border-white/40 dark:hover:shadow-[0_0_15px_rgba(var(--primary-rgb),0.15)]',
        variant === 'gradient' && 'bg-gradient-to-r from-primary via-purple-500 to-pink-500 text-white shadow-md hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.4)]',
        size === 'sm' && 'px-3.5 py-1.5 text-sm',
        size === 'md' && 'px-4.5 py-2 text-sm',
        size === 'lg' && 'px-6 py-2.5 text-base',
        glow && 'shadow-[0_0_25px_rgba(var(--primary-rgb),0.4)]',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
}
