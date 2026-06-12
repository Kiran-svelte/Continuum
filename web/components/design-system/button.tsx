import * as React from 'react';
import { cn } from '@/lib/utils';

export type DSButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type DSButtonSize = 'sm' | 'md' | 'lg';

export interface DSButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: DSButtonVariant;
  size?: DSButtonSize;
  loading?: boolean;
  asChild?: false;
}

const variantClass: Record<DSButtonVariant, string> = {
  primary: 'btn btn-primary',
  secondary: 'btn btn-secondary',
  outline: 'btn btn-outline',
  ghost: 'btn btn-ghost',
  danger:
    'btn border-[var(--status-danger)] text-[var(--status-danger)] hover:bg-[var(--status-danger-soft)]',
};

const sizeClass: Record<DSButtonSize, string> = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
};

export const DSButton = React.forwardRef<HTMLButtonElement, DSButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      disabled={disabled || loading}
      className={cn(variantClass[variant], sizeClass[size], loading && 'opacity-70', className)}
      {...props}
    >
      {loading ? (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  ),
);
DSButton.displayName = 'DSButton';
