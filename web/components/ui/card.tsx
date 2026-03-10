import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'bordered' | 'ghost' | 'glass' | 'premium';
  interactive?: boolean;
  glow?: boolean;
}

export function Card({ className, variant = 'default', interactive = false, glow = false, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl transition-all duration-200',
        variant === 'default' && 'border border-border/60 bg-card text-card-foreground shadow-sm dark:border-slate-800/50 dark:shadow-none',
        variant === 'elevated' && 'bg-card text-card-foreground shadow-md dark:shadow-black/20 dark:border dark:border-slate-800/50',
        variant === 'bordered' && 'border-2 border-border bg-card text-card-foreground',
        variant === 'ghost' && 'bg-transparent',
        variant === 'glass' && 'glass-card text-card-foreground',
        variant === 'premium' && 'premium-card text-card-foreground',
        interactive && 'cursor-pointer hover:border-primary/40 hover:shadow-md active:scale-[0.99]',
        glow && 'dark:glow-primary',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 py-4 border-b border-border/40 dark:border-slate-800/40', className)}>
      {children}
    </div>
  );
}

export function CardContent({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 py-4', className)}>{children}</div>;
}

export function CardFooter({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 py-4 border-t border-border/40 dark:border-slate-800/40 bg-muted/20', className)}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-lg font-semibold text-foreground tracking-tight', className)}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, children }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-sm text-muted-foreground leading-relaxed', className)}>
      {children}
    </p>
  );
}
