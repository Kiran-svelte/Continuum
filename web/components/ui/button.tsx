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
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]',
        variant === 'primary' && 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',
        variant === 'secondary' && 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/50',
        variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-500/90 dark:hover:bg-red-500',
        variant === 'success' && 'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500/90 dark:hover:bg-emerald-500',
        variant === 'ghost' && 'text-foreground hover:bg-muted/60',
        variant === 'outline' && 'border border-border bg-transparent text-foreground hover:bg-muted/50',
        variant === 'gradient' && 'bg-gradient-to-r from-primary via-purple-500 to-pink-500 text-white shadow-md hover:shadow-lg',
        size === 'sm' && 'px-3 py-1.5 text-sm',
        size === 'md' && 'px-4 py-2 text-sm',
        size === 'lg' && 'px-6 py-2.5 text-base',
        glow && 'btn-glow',
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
