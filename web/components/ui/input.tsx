import { cn } from '@/lib/utils';
import { forwardRef } from 'react';
import { getFormFieldMessageClass, getFormFieldToneClass } from '@/lib/ui/twentyfirst-adapter';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s/g, '-');

    return (
      <div className="w-full readable-copy">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-foreground/90 mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'w-full rounded-xl border px-3.5 py-2.5 text-sm',
            'bg-[var(--bg-surface)]',
            'text-foreground',
            'placeholder:text-muted-foreground',
            'transition-all duration-200',
            'focus:outline-none focus:border-primary/60 focus:[box-shadow:var(--focus-ring)]',
            'disabled:cursor-not-allowed disabled:opacity-50',
            getFormFieldToneClass(Boolean(error)),
            className
          )}
          {...props}
        />
        {(error || helperText) && (
          <p
            className={cn(
              'mt-1.5 break-words text-sm leading-6',
              getFormFieldMessageClass(Boolean(error))
            )}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s/g, '-');

    return (
      <div className="w-full readable-copy">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-foreground/90 mb-1.5"
          >
            {label}
          </label>
        )}
        <textarea
          id={inputId}
          ref={ref}
          className={cn(
            'w-full rounded-xl border px-3.5 py-2.5 text-sm',
            'bg-[var(--bg-surface)]',
            'text-foreground',
            'placeholder:text-muted-foreground',
            'transition-all duration-200 resize-y min-h-[100px]',
            'focus:outline-none focus:border-primary/60 focus:[box-shadow:var(--focus-ring)]',
            'disabled:cursor-not-allowed disabled:opacity-50',
            getFormFieldToneClass(Boolean(error)),
            className
          )}
          {...props}
        />
        {(error || helperText) && (
          <p
            className={cn(
              'mt-1.5 break-words text-sm leading-6',
              getFormFieldMessageClass(Boolean(error))
            )}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helperText, options, children, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s/g, '-');

    return (
      <div className="w-full readable-copy">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-foreground/90 mb-1.5"
          >
            {label}
          </label>
        )}
        <select
          id={inputId}
          ref={ref}
          className={cn(
            'w-full rounded-xl border px-3.5 py-2.5 text-sm',
            'bg-[var(--bg-surface)]',
            'text-foreground',
            'transition-all duration-200',
            'focus:outline-none focus:border-primary/60 focus:[box-shadow:var(--focus-ring)]',
            'disabled:cursor-not-allowed disabled:opacity-50',
            getFormFieldToneClass(Boolean(error)),
            className
          )}
          {...props}
        >
          {children ?? options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {(error || helperText) && (
          <p
            className={cn(
              'mt-1.5 break-words text-sm leading-6',
              getFormFieldMessageClass(Boolean(error))
            )}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s/g, '-');

    return (
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id={inputId}
          ref={ref}
          className={cn(
            'h-4 w-4 rounded border-[var(--border)] bg-[var(--bg-surface)] text-primary',
            'focus:[box-shadow:var(--focus-ring)]',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-colors duration-200',
            'accent-primary',
            className
          )}
          {...props}
        />
        {(label || description) && (
          <div>
            {label && (
              <label
                htmlFor={inputId}
                className="text-sm font-medium text-foreground/90 cursor-pointer"
              >
                {label}
              </label>
            )}
            {description && (
              <p className="break-words text-sm leading-6 text-muted-foreground">{description}</p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
