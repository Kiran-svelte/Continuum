'use client';

/**
 * Global Search trigger button for the HR Dashboard.
 *
 * Renders a decorative anchor-styled button that instructs users to use
 * the Cmd+K global search shortcut. Wrapped in 'use client' because it
 * has an onClick handler, which cannot exist in a Server Component.
 *
 * @module components/hr/global-search-trigger
 */

import { Command } from 'lucide-react';

/**
 * A button styled to look like a search bar that shows the Cmd+K shortcut hint.
 * Clicking it does nothing visible — the real action is the keyboard shortcut
 * (Cmd+K) handled globally by the CommandKSearch component in the portal layout.
 *
 * @returns A styled interactive button
 */
export function GlobalSearchTrigger() {
  return (
    <button
      type="button"
      className="hidden sm:flex items-center gap-2 h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm text-[var(--muted-foreground)] hover:bg-[var(--accent)] transition-colors cursor-pointer select-none"
      onClick={() => {
        // Dispatch a synthetic Ctrl+K event to open the global CommandK palette
        document.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })
        );
      }}
      title="Press Ctrl+K or Cmd+K for global search"
      aria-label="Open global search (Cmd+K)"
    >
      <Command className="w-3.5 h-3.5 opacity-60" aria-hidden="true" />
      <span className="opacity-60">Global Search</span>
      <kbd className="ml-1 h-5 select-none rounded border border-[var(--border)] bg-[var(--muted)] px-1.5 font-mono text-[10px]">
        ⌘K
      </kbd>
    </button>
  );
}
