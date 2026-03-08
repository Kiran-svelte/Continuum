import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'bordered' | 'ghost';
  interactive?: boolean;
}

export function Card({ className, variant = 'default', interactive = false, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl transition-all duration-200',
        // Default - subtle border with explicit colors
        variant === 'default' && 'border border-border bg-card text-card-foreground shadow-sm',
        // Elevated - more prominent shadow
        variant === 'elevated' && 'bg-card text-card-foreground shadow-lg hover:shadow-xl',
        // Bordered - clear border emphasis
        variant === 'bordered' && 'border-2 border-border bg-card text-card-foreground',
        // Ghost - minimal styling
        variant === 'ghost' && 'bg-transparent',
        // Interactive state
        interactive && 'cursor-pointer hover:border-primary/50 hover:shadow-md active:scale-[0.99]',
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
    <div className={cn('px-6 py-4 border-b border-border', className)}>
      {children}
    </div>
  );
}

export function CardContent({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 py-4', className)}>{children}</div>;
}

export function CardFooter({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 py-4 border-t border-border bg-muted/50', className)}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-lg font-semibold text-foreground', className)}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, children }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)}>
      {children}
    </p>
  );
}
