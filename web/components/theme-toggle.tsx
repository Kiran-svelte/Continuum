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
      <div className={cn('liquid-glass flex items-center gap-1 rounded-[var(--radius)] p-1', className)}>
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={cn(
            'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 active:scale-[0.98]',
            theme === 'light'
              ? 'bg-[var(--card)] text-[var(--primary)] shadow-[var(--shadow-xs)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          )}
          title="Light mode"
          aria-pressed={theme === 'light'}
        >
          <Sun className="w-4 h-4" />
          <span className="hidden sm:inline">Light</span>
        </button>
        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={cn(
            'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 active:scale-[0.98]',
            theme === 'dark'
              ? 'bg-[var(--card)] text-[var(--primary)] shadow-[var(--shadow-xs)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          )}
          title="Dark mode"
          aria-pressed={theme === 'dark'}
        >
          <Moon className="w-4 h-4" />
          <span className="hidden sm:inline">Dark</span>
        </button>
        <button
          type="button"
          onClick={() => setTheme('system')}
          className={cn(
            'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 active:scale-[0.98]',
            theme === 'system'
              ? 'bg-[var(--card)] text-[var(--primary)] shadow-[var(--shadow-xs)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          )}
          title="System preference"
          aria-pressed={theme === 'system'}
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
      type="button"
      onClick={cycleTheme}
      className={cn(
        'relative rounded-lg p-2 transition-colors duration-300 hover:bg-[var(--muted)] active:scale-[0.98]',
        className
      )}
      title={`Theme: ${theme} (${resolvedTheme})`}
      aria-label={`Theme: ${theme}. Click to cycle.`}
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
