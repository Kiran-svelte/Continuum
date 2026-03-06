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
        variant === 'default' && 'border border-gray-200 bg-white text-gray-900 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100',
        // Elevated - more prominent shadow
        variant === 'elevated' && 'bg-white text-gray-900 shadow-lg hover:shadow-xl dark:bg-gray-900 dark:text-gray-100',
        // Bordered - clear border emphasis
        variant === 'bordered' && 'border-2 border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100',
        // Ghost - minimal styling
        variant === 'ghost' && 'bg-transparent',
        // Interactive state
        interactive && 'cursor-pointer hover:border-blue-300 hover:shadow-md active:scale-[0.99]',
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
    <div className={cn('px-6 py-4 border-b border-gray-200 dark:border-gray-700', className)}>
      {children}
    </div>
  );
}

export function CardContent({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 py-4', className)}>{children}</div>;
}

export function CardFooter({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 py-4 border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50', className)}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-lg font-semibold text-gray-900 dark:text-gray-100', className)}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, children }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-sm text-gray-500 dark:text-gray-400', className)}>
      {children}
    </p>
  );
}
