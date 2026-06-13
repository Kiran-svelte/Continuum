'use client';

import { Toaster as SonnerToaster } from 'sonner';

/**
 * Global toast notification component.
 * Wraps Sonner's Toaster with Continuum design tokens.
 * Must be rendered once in the root layout.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      expand={false}
      richColors
      closeButton
      duration={4000}
      toastOptions={{
        style: {
          background: 'var(--card)',
          border: '1px solid var(--border)',
          color: 'var(--foreground)',
          borderRadius: '0.75rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          fontSize: '0.875rem',
          fontFamily: 'inherit',
        },
        className: 'continuum-toast',
      }}
    />
  );
}
