import { cn } from '@/lib/utils';
import { getButtonSizeClass, getButtonVariantClass } from '@/lib/ui/twentyfirst-adapter';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'success' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  glow?: boolean;
}

export function Button({ variant = 'primary', size = 'md', loading = false, glow = false, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg font-semibold',
        'max-w-full min-w-0 whitespace-normal break-words text-center leading-5',
        '[&_svg]:shrink-0',
        'transition-[background-color,border-color,color,box-shadow,filter] duration-200 ease-out',
        'active:scale-100 transform-none',
        'focus:outline-none focus-visible:[box-shadow:var(--focus-ring)]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'hover:brightness-110',
        variant === 'ghost' || variant === 'outline' || variant === 'secondary'
          ? 'active:brightness-100'
          : 'active:brightness-95',
        getButtonVariantClass(variant),
        getButtonSizeClass(size),
        glow && 'shadow-[0_10px_30px_color-mix(in_srgb,var(--primary)_18%,transparent)] hover:shadow-[0_10px_40px_color-mix(in_srgb,var(--primary)_30%,transparent)]',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
}
