import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-foreground dark:text-white/90 mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'w-full rounded-xl border px-3.5 py-2.5 text-sm',
            'bg-white dark:bg-white/5',
            'text-foreground dark:text-white',
            'placeholder:text-muted-foreground dark:placeholder:text-white/40',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50',
            'dark:focus:shadow-[0_0_15px_rgba(var(--primary-rgb),0.15)]',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error
              ? 'border-red-500/80 focus:ring-red-500/40 dark:border-red-400/50'
              : 'border-gray-200 dark:border-white/10 hover:border-primary/30 dark:hover:border-white/20',
            className
          )}
          {...props}
        />
        {(error || helperText) && (
          <p
            className={cn(
              'mt-1.5 text-sm',
              error ? 'text-red-500 dark:text-red-400' : 'text-muted-foreground dark:text-white/50'
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
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-foreground dark:text-white/90 mb-1.5"
          >
            {label}
          </label>
        )}
        <textarea
          id={inputId}
          ref={ref}
          className={cn(
            'w-full rounded-xl border px-3.5 py-2.5 text-sm',
            'bg-white dark:bg-white/5',
            'text-foreground dark:text-white',
            'placeholder:text-muted-foreground dark:placeholder:text-white/40',
            'transition-all duration-200 resize-y min-h-[100px]',
            'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50',
            'dark:focus:shadow-[0_0_15px_rgba(var(--primary-rgb),0.15)]',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error
              ? 'border-red-500/80 focus:ring-red-500/40 dark:border-red-400/50'
              : 'border-gray-200 dark:border-white/10 hover:border-primary/30 dark:hover:border-white/20',
            className
          )}
          {...props}
        />
        {(error || helperText) && (
          <p
            className={cn(
              'mt-1.5 text-sm',
              error ? 'text-red-500 dark:text-red-400' : 'text-muted-foreground dark:text-white/50'
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
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helperText, options, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-foreground dark:text-white/90 mb-1.5"
          >
            {label}
          </label>
        )}
        <select
          id={inputId}
          ref={ref}
          className={cn(
            'w-full rounded-xl border px-3.5 py-2.5 text-sm',
            'bg-white dark:bg-white/5',
            'text-foreground dark:text-white',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50',
            'dark:focus:shadow-[0_0_15px_rgba(var(--primary-rgb),0.15)]',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error
              ? 'border-red-500/80 focus:ring-red-500/40 dark:border-red-400/50'
              : 'border-gray-200 dark:border-white/10 hover:border-primary/30 dark:hover:border-white/20',
            className
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {(error || helperText) && (
          <p
            className={cn(
              'mt-1.5 text-sm',
              error ? 'text-red-500 dark:text-red-400' : 'text-muted-foreground dark:text-white/50'
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
            'h-4 w-4 rounded border-white/20 bg-white/5 text-primary',
            'focus:ring-2 focus:ring-primary/40',
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
                className="text-sm font-medium text-foreground dark:text-white/90 cursor-pointer"
              >
                {label}
              </label>
            )}
            {description && (
              <p className="text-sm text-muted-foreground dark:text-white/50">{description}</p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
