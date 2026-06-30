'use client';

import { useCompanyModules } from '@/hooks/use-company-modules';
import type { ModuleSlug } from '@/lib/core-functions/catalog';
import { Lock } from 'lucide-react';

interface ModuleGuardProps {
  slug: ModuleSlug;
  children: React.ReactNode;
  /** Optional custom "not available" message */
  message?: string;
}

/**
 * Renders children only if the given module is enabled for the company.
 * Shows a friendly "module not available" screen while loading or if disabled.
 *
 * Usage:
 *   <ModuleGuard slug="payroll">
 *     <PayrollPage />
 *   </ModuleGuard>
 */
export function ModuleGuard({ slug, children, message }: ModuleGuardProps) {
  const { isModuleEnabled, loading } = useCompanyModules();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isModuleEnabled(slug)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center px-4">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
          <Lock className="w-6 h-6 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground mb-1">Module not enabled</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {message ??
              `The ${slug} module is not enabled for your organisation. Contact your administrator to enable it.`}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
