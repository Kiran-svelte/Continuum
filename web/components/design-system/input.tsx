import * as React from 'react';
import { cn } from '@/lib/utils';

export interface DSInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const DSInput = React.forwardRef<HTMLInputElement, DSInputProps>(
  ({ className, label, hint, error, id, ...props }, ref) => {
    const inputId = id ?? (label ? label.replace(/\s+/g, '-').toLowerCase() : undefined);
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'input',
            error && 'border-[var(--status-danger)] focus:border-[var(--status-danger)]',
            className,
          )}
          aria-invalid={Boolean(error)}
          {...props}
        />
        {error ? (
          <p className="mt-1 text-xs text-[var(--status-danger)]">{error}</p>
        ) : hint ? (
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">{hint}</p>
        ) : null}
      </div>
    );
  },
);
DSInput.displayName = 'DSInput';
