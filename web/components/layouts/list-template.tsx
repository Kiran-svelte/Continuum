import React from 'react';
import { Search } from 'lucide-react';

interface ListTemplateProps {
  title: string;
  description?: string;
  primaryAction?: React.ReactNode;
  secondaryActions?: React.ReactNode;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  filters?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Global List Template
 * Enforces layout for data-table pages (Leave Requests, Employees, etc).
 * - Header with actions
 * - Filter bar with optional search
 * - Auto-collapsing rows on mobile (handled by children, but layout guarantees bounds)
 */
export function ListTemplate({
  title,
  description,
  primaryAction,
  secondaryActions,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  filters,
  children,
}: ListTemplateProps) {
  return (
    <div className="flex flex-col min-h-full w-full bg-[var(--background)]">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 px-4 py-6 md:px-8 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)] tracking-tight">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                {description}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {secondaryActions}
            {primaryAction}
          </div>
        </div>

        {/* Filter / Search Bar */}
        {(searchPlaceholder || onSearchChange || filters) && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-4">
            {(searchPlaceholder || onSearchChange) && (
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  placeholder={searchPlaceholder || 'Search...'}
                  className="w-full h-9 rounded-md border border-[var(--border)] bg-[var(--card)] pl-9 pr-4 text-sm outline-none focus:ring-1 focus:ring-[var(--ring)] transition-shadow"
                />
              </div>
            )}
            {/* Custom filters slot */}
            {filters && (
              <div className="flex items-center gap-2 flex-wrap">
                {filters}
              </div>
            )}
          </div>
        )}
      </div>

      {/* List Content Area */}
      <div className="p-4 md:p-8 flex-1">
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
