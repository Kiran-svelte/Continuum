import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface DetailTemplateProps {
  title: string;
  description?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  sidebar?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Global Detail Template
 * Enforces layout for complex record views and settings pages.
 * - Breadcrumb navigation
 * - Title and Description with Action slot (usually for SaveButton)
 * - Optional Sidebar for section navigation (e.g., Profile -> Personal, Bank, etc)
 * - Main content area
 */
export function DetailTemplate({
  title,
  description,
  breadcrumbs,
  sidebar,
  actions,
  children,
}: DetailTemplateProps) {
  return (
    <div className="flex flex-col min-h-full w-full bg-[var(--background)]">
      {/* Sticky Header with Breadcrumbs */}
      <div className="sticky top-0 z-20 px-4 py-4 md:px-8 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-md">
        
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center space-x-1 text-sm text-[var(--muted-foreground)] mb-4">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 mx-1 opacity-50" />}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-[var(--primary)] transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="font-medium text-[var(--foreground)]">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
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
          <div className="flex items-center gap-3">
            {actions}
          </div>
        </div>
      </div>

      {/* Content Area with Optional Sidebar */}
      <div className="flex-1 flex flex-col md:flex-row p-4 md:p-8 gap-8 max-w-[1600px] w-full mx-auto">
        {/* Sidebar Nav */}
        {sidebar && (
          <aside className="w-full md:w-64 shrink-0">
            <div className="sticky top-32 space-y-1">
              {sidebar}
            </div>
          </aside>
        )}
        
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-sm">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
