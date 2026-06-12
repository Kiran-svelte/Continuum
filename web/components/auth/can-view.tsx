'use client';

import React from 'react';
import { useAuth } from './auth-provider';

interface CanViewProps {
  /** The permission code required to view the children (e.g., 'payroll.process') */
  require: string;
  children: React.ReactNode;
  /** Optional fallback to render if unauthorized. Defaults to null (hidden). */
  fallback?: React.ReactNode;
}

/**
 * Global client-side RBAC wrapper.
 * If the authenticated user does not have the required permission,
 * the children are not rendered. This enforces the "hide, don't disable" rule.
 */
export function CanView({ require, children, fallback = null }: CanViewProps) {
  const { hasPermission, isLoading } = useAuth();

  // Optionally, you might want to return a skeleton if loading,
  // but usually CanView is used deep in the tree where loading is already handled
  // or it just defers rendering until auth is loaded.
  if (isLoading) return null;

  if (hasPermission(require)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
