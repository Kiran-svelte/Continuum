import { cn } from '@/lib/utils';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function Switch({ checked, onChange, label, disabled, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        'relative w-12 h-6 shrink-0 rounded-full transition-colors duration-300',
        'focus:outline-none focus-visible:[box-shadow:var(--focus-ring)]',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        checked ? 'bg-primary' : 'bg-[var(--bg-surface-hover)]',
        className
      )}
    >
      <span
        className={cn(
          'absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300',
          checked ? 'translate-x-6' : 'translate-x-0'
        )}
      />
    </button>
  );
}
