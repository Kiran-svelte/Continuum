import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({ variant = 'primary', size = 'md', loading = false, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]',
        // Primary - main CTAs (10% accent) - explicit blue colors for visibility
        variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md',
        // Secondary - supporting actions (30% secondary)
        variant === 'secondary' && 'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700',
        // Danger - destructive actions
        variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
        // Success - positive actions
        variant === 'success' && 'bg-green-600 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 shadow-sm',
        // Ghost - minimal visual weight
        variant === 'ghost' && 'text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800',
        // Outline - bordered button
        variant === 'outline' && 'border border-gray-300 text-gray-900 hover:bg-gray-50 hover:border-blue-300 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800',
        // Sizes
        size === 'sm' && 'px-3 py-1.5 text-sm',
        size === 'md' && 'px-4 py-2 text-sm',
        size === 'lg' && 'px-6 py-3 text-base',
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
