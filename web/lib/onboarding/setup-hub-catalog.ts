/**
 * Unified Organization Setup hub — card keys, module gates, hrefs, and DB validators.
 * Used by setup-wizard-view, /api/onboarding/progress, and module-ux-gates.
 */

import type { ModuleSlug } from '@/lib/core-functions/catalog';
import type { ModuleGateSpec } from '@/lib/module-ux-gates';
import { isGatedItemVisible } from '@/lib/module-ux-gates';

export type { ModuleGateSpec };

const WORKFLOW_APPROVAL_MODULES: readonly ModuleSlug[] = ['leave', 'expenses', 'reimbursements'];

export interface SetupHubCardDef {
  key: string;
  categoryKey: string;
  title: string;
  description: string;
  href: string;
  required: boolean;
  hint?: string;
  gate?: ModuleGateSpec;
}

export interface SetupHubCategoryDef {
  key: string;
  label: string;
  description: string;
}

export const SETUP_HUB_CATEGORIES: SetupHubCategoryDef[] = [
  { key: 'organization', label: 'Organization', description: 'Company profile, locations, directory, and work structure' },
  { key: 'people', label: 'People & Access', description: 'Invite team members, configure roles and permissions' },
  { key: 'attendance', label: 'Time & Attendance', description: 'Work schedules, shifts, and attendance tracking rules' },
  { key: 'leave', label: 'Leave Management', description: 'Leave types, quotas, accrual rules, and approval chains' },
  { key: 'payroll', label: 'Payroll', description: 'Salary components, statutory deductions, and payroll schedule' },
  { key: 'workflows', label: 'Notifications & Workflows', description: 'Alerts, reminders, and automated workflow triggers' },
  { key: 'extensions', label: 'Additional Modules', description: 'Configure optional modules enabled for your company' },
];

/** Card catalog — keys must match progress API completedSteps. */
export const SETUP_HUB_CARDS: SetupHubCardDef[] = [
  {
    key: 'company_profile',
    categoryKey: 'organization',
    title: 'Company Profile',
    description: 'Set company name, logo, timezone, fiscal year, and work week',
    href: '/admin/company-settings?tab=general',
    required: true,
    hint: 'Start here — required before inviting employees',
  },
  {
    key: 'departments',
    categoryKey: 'organization',
    title: 'Departments & Structure',
    description: 'Create departments, job titles, and reporting lines',
    href: '/admin/company-settings?tab=org-structure',
    required: true,
  },
  {
    key: 'locations',
    categoryKey: 'organization',
    title: 'Locations & Offices',
    description: 'Add office locations and remote work policies',
    href: '/admin/company-settings?tab=general',
    required: false,
    hint: 'Optional — needed for multi-location shift rules',
  },
  {
    key: 'employees',
    categoryKey: 'people',
    title: 'Invite Employees',
    description: 'Add employees individually or bulk import via CSV',
    href: '/admin/people',
    required: true,
    hint: 'Employees receive a welcome email with login instructions',
  },
  {
    key: 'roles',
    categoryKey: 'people',
    title: 'Roles & Permissions',
    description: 'Configure what each role can see, do, and approve',
    href: '/admin/rbac',
    required: true,
  },
  {
    key: 'job_titles',
    categoryKey: 'people',
    title: 'Job Titles & Grades',
    description: 'Define employment tiers, grades, and pay bands',
    href: '/admin/company-settings?tab=org-structure',
    required: false,
  },
  {
    key: 'shifts',
    categoryKey: 'attendance',
    title: 'Work Shifts',
    description: 'Define shift timings, grace periods, and overtime rules',
    href: '/admin/shifts',
    required: true,
    gate: { moduleSlug: 'attendance' },
    hint: 'Default: Mon–Fri, 9:00–18:00, 15 min grace period',
  },
  {
    key: 'holidays',
    categoryKey: 'leave',
    title: 'Holiday Calendar',
    description: 'Set national holidays, company events, and optional holidays',
    href: '/admin/holidays',
    required: true,
    gate: { moduleSlug: 'leave' },
  },
  {
    key: 'leave_types',
    categoryKey: 'leave',
    title: 'Leave Types & Quotas',
    description: 'Configure Casual Leave, Sick Leave, Earned Leave, LWP, and custom types',
    href: '/admin/policy-settings',
    required: true,
    gate: { moduleSlug: 'leave' },
    hint: 'Default leave types are pre-seeded — review and adjust quotas',
  },
  {
    key: 'leave_approvals',
    categoryKey: 'leave',
    title: 'Approval Chains',
    description: 'Set who approves leave — direct manager, HR, or multi-level',
    href: '/admin/company-settings?tab=approval-chains',
    required: true,
    gate: { requiresAnyModule: WORKFLOW_APPROVAL_MODULES },
  },
  {
    key: 'salary_structure',
    categoryKey: 'payroll',
    title: 'Salary Components',
    description:
      'Configure earning/deduction building blocks (Basic, HRA, PF, etc.). This step does not assign CTC per employee.',
    href: '/admin/salary-components',
    required: false,
    gate: { moduleSlug: 'payroll' },
    hint: 'After components exist, assign each employee’s annual CTC under HR → Salary Structures',
  },
  {
    key: 'salary_structures_per_employee',
    categoryKey: 'payroll',
    title: 'Per-Employee Salary Structures',
    description: 'Assign annual CTC and breakdown for each employee before your first payroll run',
    href: '/admin/salary-structures',
    required: false,
    gate: { moduleSlug: 'payroll' },
  },
  {
    key: 'statutory',
    categoryKey: 'payroll',
    title: 'Payroll Runs & Statutory Deductions',
    description: 'PF, ESI, Professional Tax, and TDS — rates and thresholds',
    href: '/admin/payroll',
    required: false,
    gate: { moduleSlug: 'payroll' },
  },
  {
    key: 'pf_setup',
    categoryKey: 'payroll',
    title: 'Provident Fund (PF)',
    description: 'PF establishment ID, contribution rates, and compliance exports',
    href: '/admin/pf-reports',
    required: false,
    gate: { moduleSlug: 'pf' },
  },
  {
    key: 'notifications',
    categoryKey: 'workflows',
    title: 'Email Notifications',
    description: 'Configure what emails are sent for leaves, payroll, and onboarding',
    href: '/admin/notifications',
    required: false,
  },
  {
    key: 'workflows',
    categoryKey: 'workflows',
    title: 'Approval Workflows',
    description: 'Multi-step approval rules for expenses, documents, and custom requests',
    href: '/admin/company-settings?tab=approval-chains',
    required: false,
    gate: { requiresAnyModule: ['leave', 'expenses', 'reimbursements'] },
  },
  {
    key: 'integrations',
    categoryKey: 'workflows',
    title: 'Regional & Compliance',
    description: 'Country code, currency, labour law region, and compliance settings',
    href: '/admin/company-settings?tab=general',
    required: false,
  },
  {
    key: 'performance_setup',
    categoryKey: 'extensions',
    title: 'Performance & Goals',
    description: 'Review cycles, goal templates, and manager appraisal permissions',
    href: '/admin/rbac',
    required: false,
    gate: { moduleSlug: 'performance' },
  },
  {
    key: 'recruitment_setup',
    categoryKey: 'extensions',
    title: 'Recruitment',
    description: 'Job postings, hiring pipeline, and offer workflow',
    href: '/admin/rbac',
    required: false,
    gate: { moduleSlug: 'recruitment' },
  },
  {
    key: 'learning_setup',
    categoryKey: 'extensions',
    title: 'Learning (LMS)',
    description: 'Courses, enrollments, and training compliance',
    href: '/admin/rbac',
    required: false,
    gate: { moduleSlug: 'learning' },
  },
  {
    key: 'documents_setup',
    categoryKey: 'extensions',
    title: 'Documents',
    description: 'Document types, retention policies, and employee uploads',
    href: '/admin/rbac',
    required: false,
    gate: { moduleSlug: 'documents' },
  },
  {
    key: 'exit_setup',
    categoryKey: 'extensions',
    title: 'Exit Management',
    description: 'Exit checklist templates and clearance workflows',
    href: '/admin/company-settings?tab=approval-chains',
    required: false,
    gate: { moduleSlug: 'exit' },
  },
  {
    key: 'expenses_setup',
    categoryKey: 'extensions',
    title: 'Travel & Expense',
    description: 'Expense categories, limits, and approval policies',
    href: '/admin/company-settings?tab=approval-chains',
    required: false,
    gate: { moduleSlug: 'expenses' },
  },
  {
    key: 'reimbursements_setup',
    categoryKey: 'extensions',
    title: 'Reimbursements',
    description: 'Reimbursement types and payout approval rules',
    href: '/admin/company-settings?tab=approval-chains',
    required: false,
    gate: { moduleSlug: 'reimbursements' },
  },
  {
    key: 'directory_setup',
    categoryKey: 'extensions',
    title: 'Employee Directory',
    description: 'Org directory visibility and search settings',
    href: '/admin/people',
    required: false,
    gate: { moduleSlug: 'directory' },
  },
  {
    key: 'analytics_setup',
    categoryKey: 'extensions',
    title: 'Analytics & Reports',
    description: 'Custom reports and workforce analytics',
    href: '/admin/rbac',
    required: false,
    gate: { moduleSlug: 'analytics' },
  },
  {
    key: 'compliance_setup',
    categoryKey: 'extensions',
    title: 'Compliance & Audit',
    description: 'Audit log retention and statutory report access',
    href: '/admin/compliance',
    required: false,
    gate: { moduleSlug: 'compliance' },
  },
];

/** Setup hub card key → module gate (for filterSetupWizardCategories). */
export const SETUP_WIZARD_CARD_GATES: Record<string, ModuleGateSpec | undefined> = Object.fromEntries(
  SETUP_HUB_CARDS.map((c) => [c.key, c.gate])
);

export function filterSetupHubCards(
  enabled: readonly ModuleSlug[]
): SetupHubCardDef[] {
  return SETUP_HUB_CARDS.filter((card) => isGatedItemVisible(card.gate, enabled));
}

export function filterSetupHubCategories(
  enabled: readonly ModuleSlug[]
): Array<SetupHubCategoryDef & { cards: SetupHubCardDef[] }> {
  const visible = filterSetupHubCards(enabled);
  const byCategory = new Map<string, SetupHubCardDef[]>();
  for (const card of visible) {
    const list = byCategory.get(card.categoryKey) ?? [];
    list.push(card);
    byCategory.set(card.categoryKey, list);
  }
  return SETUP_HUB_CATEGORIES.map((cat) => ({
    ...cat,
    cards: byCategory.get(cat.key) ?? [],
  })).filter((cat) => cat.cards.length > 0);
}
