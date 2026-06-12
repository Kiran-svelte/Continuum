import { cn } from '@/lib/utils';

export interface DSCardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingMap = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

export function DSCard({
  className,
  interactive = false,
  padding = 'md',
  children,
  ...props
}: DSCardProps) {
  return (
    <div
      className={cn(
        'ds-card',
        'min-w-0 readable-copy',
        interactive && 'ds-card-interactive cursor-pointer',
        paddingMap[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
