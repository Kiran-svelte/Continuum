'use client';

import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';
import { Sun, Moon, Monitor } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  variant?: 'icon' | 'button' | 'dropdown';
}

export function ThemeToggle({ className, variant = 'icon' }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();

  if (variant === 'button') {
    return (
      <div className={cn('flex items-center gap-1 p-1 rounded-lg bg-gray-200/20 dark:bg-gray-700/20', className)}>
        <button
          onClick={() => setTheme('light')}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200',
            theme === 'light'
              ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
          )}
          title="Light mode"
        >
          <Sun className="w-4 h-4" />
          <span className="hidden sm:inline">Light</span>
        </button>
        <button
          onClick={() => setTheme('dark')}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200',
            theme === 'dark'
              ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
          )}
          title="Dark mode"
        >
          <Moon className="w-4 h-4" />
          <span className="hidden sm:inline">Dark</span>
        </button>
        <button
          onClick={() => setTheme('system')}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200',
            theme === 'system'
              ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
          )}
          title="System preference"
        >
          <Monitor className="w-4 h-4" />
          <span className="hidden sm:inline">System</span>
        </button>
      </div>
    );
  }

  // Default icon toggle (cycles through modes)
  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  return (
    <button
      onClick={cycleTheme}
      className={cn(
        'relative p-2 rounded-lg transition-all duration-300 hover:bg-gray-200/20 dark:hover:bg-gray-700/20 active:scale-95',
        className
      )}
      title={`Current: ${theme} (${resolvedTheme})`}
    >
      <Sun
        className={cn(
          'w-5 h-5 transition-all duration-300',
          resolvedTheme === 'dark' ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
        )}
      />
      <Moon
        className={cn(
          'absolute top-2 left-2 w-5 h-5 transition-all duration-300',
          resolvedTheme === 'dark' ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
        )}
      />
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
