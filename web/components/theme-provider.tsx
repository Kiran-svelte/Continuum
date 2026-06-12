'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeProviderContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeProviderContext = createContext<ThemeProviderContextType | undefined>(undefined);

const THEME_KEY = 'continuum-theme';

function sanitizeTheme(value: string | null | undefined, fallback: Theme): Theme {
  if (value === 'light' || value === 'dark' || value === 'system') {
    return value;
  }
  return fallback;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

function initialResolvedTheme(defaultTheme: Theme): 'light' | 'dark' {
  if (defaultTheme === 'dark' || defaultTheme === 'light') {
    return defaultTheme;
  }
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = THEME_KEY,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() =>
    initialResolvedTheme(defaultTheme)
  );

  // Get system preference
  const getSystemTheme = useCallback((): 'light' | 'dark' => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }, []);

  // Calculate resolved theme
  const calculateResolvedTheme = useCallback(
    (currentTheme: Theme): 'light' | 'dark' => {
      if (currentTheme === 'system') {
        return getSystemTheme();
      }
      return currentTheme;
    },
    [getSystemTheme]
  );

  // Initialize theme from localStorage
  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem(storageKey);
      const initialTheme = sanitizeTheme(storedTheme, defaultTheme);
      setThemeState(initialTheme);
      setResolvedTheme(calculateResolvedTheme(initialTheme));
    } catch {
      // Fail open: keep rendering app even if storage is unavailable.
      setThemeState(defaultTheme);
      setResolvedTheme(calculateResolvedTheme(defaultTheme));
    }
  }, [defaultTheme, storageKey, calculateResolvedTheme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        setResolvedTheme(getSystemTheme());
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, getSystemTheme]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
    root.style.colorScheme = resolvedTheme;
    if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
      fetch('http://127.0.0.1:7577/ingest/ec7a1340-542e-4274-b841-908eaf79e631',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4c3985'},body:JSON.stringify({sessionId:'4c3985',location:'theme-provider.tsx:apply',message:'resolvedTheme applied',data:{resolvedTheme,htmlClass:root.className},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
    }
  }, [resolvedTheme]);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      const sanitizedTheme = sanitizeTheme(newTheme, defaultTheme);
      localStorage.setItem(storageKey, newTheme);
      setThemeState(sanitizedTheme);
      setResolvedTheme(calculateResolvedTheme(sanitizedTheme));
    },
    [storageKey, calculateResolvedTheme, defaultTheme]
  );

  // Always render children to avoid a global blank screen if hydration stalls.
  return (
    <ThemeProviderContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
