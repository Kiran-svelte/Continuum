import { cn } from '@/lib/utils';
import { getCardVariantClass } from '@/lib/ui/twentyfirst-adapter';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'bordered' | 'ghost' | 'glass' | 'premium';
  interactive?: boolean;
  glow?: boolean;
}

export function Card({ className, variant = 'default', interactive = false, glow = false, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl transition-all duration-200 border',
        getCardVariantClass(variant),
        interactive && 'cursor-pointer hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5',
        glow && 'shadow-[0_10px_30px_color-mix(in_srgb,var(--primary)_10%,transparent)]',
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
    <div className={cn('px-6 py-4 border-b border-border/60', className)}>
      {children}
    </div>
  );
}

export function CardContent({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 py-4', className)}>{children}</div>;
}

export function CardFooter({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 py-4 border-t border-border/60 bg-muted/40', className)}>
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
