/**
 * Maps URL path prefixes to module slugs for middleware (second line of defense).
 * API routes should still call assertModule in handlers.
 */

import type { ModuleSlug } from '@/lib/core-functions/catalog';

export const PORTAL_MODULE_PATH_RULES: Array<{ prefix: string; slug: ModuleSlug }> = [
  { prefix: '/admin/payslips', slug: 'payroll' },
  { prefix: '/admin/leave-requests', slug: 'leave' },
  { prefix: '/admin/leave-', slug: 'leave' },
  { prefix: '/admin/policy-settings', slug: 'leave' },
  { prefix: '/admin/holidays', slug: 'leave' },
  { prefix: '/admin/payroll', slug: 'payroll' },
  { prefix: '/admin/salary-', slug: 'payroll' },
  { prefix: '/admin/shifts', slug: 'attendance' },
  { prefix: '/admin/compliance', slug: 'compliance' },
  { prefix: '/admin/pf-reports', slug: 'pf' },
  { prefix: '/hr/payroll', slug: 'payroll' },
  { prefix: '/hr/salary-', slug: 'payroll' },
  { prefix: '/hr/compensation', slug: 'payroll' },
  { prefix: '/hr/attendance', slug: 'attendance' },
  { prefix: '/hr/shifts', slug: 'attendance' },
  { prefix: '/hr/leave-', slug: 'leave' },
  { prefix: '/hr/request-leave', slug: 'leave' },
  { prefix: '/hr/holidays', slug: 'leave' },
  { prefix: '/hr/recruitment', slug: 'recruitment' },
  { prefix: '/hr/job-board', slug: 'recruitment' },
  { prefix: '/hr/performance', slug: 'performance' },
  { prefix: '/hr/goals', slug: 'performance' },
  { prefix: '/hr/reviews', slug: 'performance' },
  { prefix: '/hr/reimbursements', slug: 'reimbursements' },
  { prefix: '/hr/travel', slug: 'expenses' },
  { prefix: '/hr/compliance', slug: 'compliance' },
  { prefix: '/employee/payslips', slug: 'payroll' },
  { prefix: '/employee/attendance', slug: 'attendance' },
  { prefix: '/employee/request-leave', slug: 'leave' },
  { prefix: '/employee/leave-history', slug: 'leave' },
  { prefix: '/employee/learning', slug: 'learning' },
  { prefix: '/employee/travel', slug: 'expenses' },
  { prefix: '/employee/reimbursements', slug: 'reimbursements' },
  { prefix: '/employee/documents', slug: 'documents' },
  { prefix: '/employee/exit-checklist', slug: 'exit' },
  { prefix: '/employee/directory', slug: 'directory' },
  { prefix: '/manager/team-attendance', slug: 'attendance' },
  { prefix: '/manager/request-leave', slug: 'leave' },
  { prefix: '/manager/leave-requests', slug: 'leave' },
  { prefix: '/manager/team-calendar', slug: 'leave' },
  { prefix: '/manager/directory', slug: 'directory' },
  { prefix: '/manager/approvals', slug: 'leave' },
  { prefix: '/manager/reimbursements', slug: 'reimbursements' },
  { prefix: '/manager/reports', slug: 'analytics' },
];

export function moduleSlugForPortalPath(pathname: string): ModuleSlug | null {
  const normalized = pathname.split('?')[0] ?? pathname;
  for (const rule of PORTAL_MODULE_PATH_RULES) {
    if (normalized.startsWith(rule.prefix)) {
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
  if (gate.kind === 'single') return enabledModules.has(gate.slug);
  return gate.slugs.some((slug) => enabledModules.has(slug));
}
