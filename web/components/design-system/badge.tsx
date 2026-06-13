import { cn } from '@/lib/utils';

export type DSBadgeTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

export interface DSBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: DSBadgeTone;
}

const toneClass: Record<DSBadgeTone, string> = {
  default: 'badge-gray',
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  info: 'badge-info',
};

export function DSBadge({ tone = 'default', className, children, ...props }: DSBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        toneClass[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
