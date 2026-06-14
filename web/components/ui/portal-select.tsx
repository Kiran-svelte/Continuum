'use client';

import { cn } from '@/lib/utils';

export interface PortalSelectOption {
  value: string;
  label: string;
}

export interface PortalSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: PortalSelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

/**
 * Token-styled native select for portal forms (dark-mode friendly trigger).
 */
export function PortalSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  className,
  disabled,
  'aria-label': ariaLabel,
}: PortalSelectProps) {
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        'w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] shadow-[var(--shadow-xs)]',
        'focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:border-[var(--primary)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
    >
      {placeholder ? (
        <option value="" className="bg-[var(--card)] text-[var(--muted-foreground)]">
          {placeholder}
        </option>
      ) : null}
      {options.map((option) => (
        <option
          key={option.value}
          value={option.value}
          className="bg-[var(--card)] text-[var(--foreground)]"
        >
          {option.label}
        </option>
      ))}
    </select>
  );
}
