import { cn } from '@/lib/utils';

export function BentoGrid({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('bento-grid', className)} {...props}>
      {children}
    </div>
  );
}

export function BentoCell({
  span = 4,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { span?: 3 | 4 | 6 | 8 | 12 }) {
  const spanClass =
    span === 12 ? 'bento-span-12'
    : span === 8 ? 'bento-span-8'
    : span === 6 ? 'bento-span-6'
    : span === 3 ? 'bento-span-3'
    : 'bento-span-4';
  return (
    <div className={cn(spanClass, className)} {...props}>
      {children}
    </div>
  );
}
