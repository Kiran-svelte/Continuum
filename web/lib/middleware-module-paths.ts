/**
 * Maps URL path prefixes to module slugs for middleware (second line of defense).
 * API routes should still call assertModule in handlers.
 *
 * Keep in sync with portal-nav.ts moduleSlug entries — validated by
 * tests/middleware-nav-coverage.test.ts
 */

import type { ModuleSlug } from '@/lib/core-functions/catalog';

export const PORTAL_MODULE_PATH_RULES: Array<{ prefix: string; slug: ModuleSlug }> = [
  // Admin
  { prefix: '/admin/payslips', slug: 'payroll' },
  { prefix: '/admin/people', slug: 'employees' },
  { prefix: '/admin/directory', slug: 'employees' },
  { prefix: '/admin/org-chart', slug: 'employees' },
  { prefix: '/admin/leave-requests', slug: 'leave' },
  { prefix: '/admin/leave-', slug: 'leave' },
  { prefix: '/admin/policy-settings', slug: 'leave' },
  { prefix: '/admin/holidays', slug: 'leave' },
  { prefix: '/admin/payroll', slug: 'payroll' },
  { prefix: '/admin/salary-', slug: 'payroll' },
  { prefix: '/admin/shifts', slug: 'attendance' },
  { prefix: '/admin/compliance', slug: 'compliance' },
  { prefix: '/admin/audit-logs', slug: 'compliance' },
  { prefix: '/admin/pf-reports', slug: 'pf' },

  // HR — leave
  { prefix: '/hr/request-leave', slug: 'leave' },
  { prefix: '/hr/leave-', slug: 'leave' },
  { prefix: '/hr/holidays', slug: 'leave' },
  { prefix: '/hr/approvals', slug: 'leave' },
  { prefix: '/hr/approval-config', slug: 'leave' },
  { prefix: '/hr/escalation', slug: 'leave' },
  { prefix: '/hr/policy-settings', slug: 'leave' },

  // HR — attendance
  { prefix: '/hr/attendance', slug: 'attendance' },
  { prefix: '/hr/shifts', slug: 'attendance' },
  { prefix: '/hr/my-attendance', slug: 'attendance' },

  // HR — people / directory / exit
  { prefix: '/hr/employees', slug: 'employees' },
  { prefix: '/hr/bulk-import', slug: 'employees' },
  { prefix: '/hr/employee-movements', slug: 'employees' },
  { prefix: '/hr/directory', slug: 'employees' },
  { prefix: '/hr/org-chart', slug: 'employees' },
  { prefix: '/hr/organization', slug: 'directory' },
  { prefix: '/hr/exit-checklist', slug: 'exit' },

  // HR — payroll & finance
  { prefix: '/hr/payroll', slug: 'payroll' },
  { prefix: '/hr/salary-', slug: 'payroll' },
  { prefix: '/hr/compensation', slug: 'payroll' },
  { prefix: '/hr/payslips', slug: 'payroll' },
  { prefix: '/hr/payroll-advances', slug: 'payroll' },
  { prefix: '/hr/reimbursements', slug: 'reimbursements' },

  // HR — performance / recruitment / learning / travel / analytics / documents / compliance
  { prefix: '/hr/performance', slug: 'performance' },
  { prefix: '/hr/goals', slug: 'performance' },
  { prefix: '/hr/reviews', slug: 'performance' },
  { prefix: '/hr/recruitment', slug: 'recruitment' },
  { prefix: '/hr/job-board', slug: 'recruitment' },
  { prefix: '/hr/learning', slug: 'learning' },
  { prefix: '/hr/travel', slug: 'expenses' },
  { prefix: '/hr/reports', slug: 'analytics' },
  { prefix: '/hr/report-builder', slug: 'analytics' },
  { prefix: '/hr/documents', slug: 'documents' },
  { prefix: '/hr/compliance', slug: 'compliance' },
  { prefix: '/hr/audit-logs', slug: 'compliance' },

  // Employee
  { prefix: '/employee/request-leave', slug: 'leave' },
  { prefix: '/employee/leave-history', slug: 'leave' },
  { prefix: '/employee/attendance', slug: 'attendance' },
  { prefix: '/employee/documents', slug: 'documents' },
  { prefix: '/employee/directory', slug: 'employees' },
  { prefix: '/employee/payslips', slug: 'payroll' },
  { prefix: '/employee/payroll-advances', slug: 'payroll' },
  { prefix: '/employee/reimbursements', slug: 'reimbursements' },
  { prefix: '/employee/travel', slug: 'expenses' },
  { prefix: '/employee/learning', slug: 'learning' },
  { prefix: '/employee/performance', slug: 'performance' },
  { prefix: '/employee/exit-checklist', slug: 'exit' },

  // Manager
  { prefix: '/manager/request-leave', slug: 'leave' },
  { prefix: '/manager/leave-requests', slug: 'leave' },
  { prefix: '/manager/team-calendar', slug: 'leave' },
  { prefix: '/manager/approvals', slug: 'leave' },
  { prefix: '/manager/team-attendance', slug: 'attendance' },
  { prefix: '/manager/my-attendance', slug: 'attendance' },
  { prefix: '/manager/team', slug: 'employees' },
  { prefix: '/manager/people', slug: 'employees' },
  { prefix: '/manager/directory', slug: 'employees' },
  { prefix: '/manager/org-chart', slug: 'employees' },
  { prefix: '/manager/performance', slug: 'performance' },
  { prefix: '/manager/payslips', slug: 'payroll' },
  { prefix: '/manager/payroll-advances', slug: 'payroll' },
  { prefix: '/manager/reimbursements', slug: 'reimbursements' },
  { prefix: '/manager/reports', slug: 'analytics' },
];

const SORTED_PORTAL_MODULE_PATH_RULES = [...PORTAL_MODULE_PATH_RULES].sort(
  (a, b) => b.prefix.length - a.prefix.length
);

function matchesModulePrefix(pathname: string, prefix: string): boolean {
  if (pathname === prefix) return true;
  // Intentional partial prefixes (e.g. /hr/leave-) must keep legacy prefix matching.
  if (prefix.endsWith('-')) {
    return pathname.startsWith(prefix);
  }
  return pathname.startsWith(`${prefix}/`);
}

export function moduleSlugForPortalPath(pathname: string): ModuleSlug | null {
  const normalized = pathname.split('?')[0] ?? pathname;
  for (const rule of SORTED_PORTAL_MODULE_PATH_RULES) {
    if (matchesModulePrefix(normalized, rule.prefix)) {
      return rule.slug;
    }
  }
  return null;
}

export type PortalPathModuleGate =
  | { kind: 'none' }
  | { kind: 'single'; slug: ModuleSlug }
  | { kind: 'any'; slugs: ModuleSlug[] };

export function portalPathModuleGate(pathname: string): PortalPathModuleGate {
  const slug = moduleSlugForPortalPath(pathname);
  return slug ? { kind: 'single', slug } : { kind: 'none' };
}

export function isPortalPathAllowedByModules(
  pathname: string,
  enabledModules: ReadonlySet<string>
): boolean {
  const gate = portalPathModuleGate(pathname);
  if (gate.kind === 'none') return true;
  if (gate.kind === 'single') {
    if (gate.slug === 'employees') return true;
    return enabledModules.has(gate.slug);
  }
  return gate.slugs.some((slug) => slug === 'employees' || enabledModules.has(slug));
}
