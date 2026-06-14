/**
 * Label UI component.
 *
 * A semantic HTML `<label>` element with consistent design-system styling.
 * Forwarded ref allows association with form controls via htmlFor or wrapping.
 *
 * @module components/ui/label
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  /** Whether the field this label describes is required. Appends a '*' asterisk. */
  required?: boolean;
}

/**
 * Renders a styled form label.
 *
 * @param props - Standard label attributes plus optional `required` flag.
 * @returns A styled `<label>` element.
 */
export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'text-sm font-medium text-[var(--foreground)] leading-none',
        'peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className,
      )}
      {...props}
    >
      {children}
      {required && (
        <span className="ml-0.5 text-[var(--danger)]" aria-hidden="true">
          *
        </span>
      )}
    </label>
  ),
);

Label.displayName = 'Label';
