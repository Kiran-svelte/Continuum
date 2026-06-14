/**
 * CF-001..CF-015 catalog: single source of truth for module slugs and dependencies.
 */

export const MODULE_SLUGS = [
  'employees',
  'leave',
  'compliance',
  'pf',
  'attendance',
  'payroll',
  'performance',
  'recruitment',
  'learning',
  'expenses',
  'reimbursements',
  'directory',
  'documents',
  'exit',
  'analytics',
] as const;

export type ModuleSlug = (typeof MODULE_SLUGS)[number];

/** Always enabled; cannot be turned off at runtime. */
export const MANDATORY_SLUGS: readonly ModuleSlug[] = [
  'employees',
  'leave',
  'compliance',
  'attendance',
];

/** Default cap when super admin has not set one. */
export const DEFAULT_SUPER_ADMIN_CAP: ModuleSlug[] = [...MODULE_SLUGS];

/** Default enabled set for new companies / unset hr_alerts. */
export const DEFAULT_ENABLED_SLUGS: ModuleSlug[] = [
  'leave',
  'attendance',
  'payroll',
  'documents',
];

export interface CoreFunctionDefinition {
  id: string;
  name: string;
  slug: ModuleSlug;
  description: string;
  mandatory: boolean;
  dependsOn: ModuleSlug[];
}

export const CORE_FUNCTION_CATALOG: CoreFunctionDefinition[] = [
  {
    id: 'CF-001',
    name: 'Employee Management',
    slug: 'employees',
    description: 'Profiles, org chart, lifecycle',
    mandatory: true,
    dependsOn: [],
  },
  {
    id: 'CF-002',
    name: 'Leave (+ AI)',
    slug: 'leave',
    description: 'Leave requests, balances, approvals',
    mandatory: true,
    dependsOn: ['employees'],
  },
  {
    id: 'CF-003',
    name: 'Compliance & Audit',
    slug: 'compliance',
    description: 'Statutory reports and audit trail',
    mandatory: true,
    dependsOn: ['employees'],
  },
  {
    id: 'CF-004',
    name: 'PF',
    slug: 'pf',
    description: 'Provident fund reporting (bundled in payroll run)',
    mandatory: false,
    dependsOn: ['employees', 'compliance', 'payroll'],
  },
  {
    id: 'CF-005',
    name: 'Attendance',
    slug: 'attendance',
    description: 'Clock-in, shifts, regularization',
    mandatory: true,
    dependsOn: ['employees'],
  },
  {
    id: 'CF-006',
    name: 'Payroll',
    slug: 'payroll',
    description: 'Salary runs, payslips, statutory deductions',
    mandatory: false,
    dependsOn: ['employees', 'compliance'],
  },
  {
    id: 'CF-007',
    name: 'Performance',
    slug: 'performance',
    description: 'Goals, reviews, appraisal cycles',
    mandatory: false,
    dependsOn: ['employees'],
  },
  {
    id: 'CF-008',
    name: 'Recruitment',
    slug: 'recruitment',
    description: 'Job postings and hiring pipeline',
    mandatory: false,
    dependsOn: [],
  },
  {
    id: 'CF-009',
    name: 'Learning',
    slug: 'learning',
    description: 'Courses and certifications',
    mandatory: false,
    dependsOn: ['employees'],
  },
  {
    id: 'CF-010',
    name: 'Travel & Expense',
    slug: 'expenses',
    description: 'Expense claims and travel requests',
    mandatory: false,
    dependsOn: ['employees'],
  },
  {
    id: 'CF-011',
    name: 'Reimbursements',
    slug: 'reimbursements',
    description: 'Reimbursement workflows',
    mandatory: false,
    dependsOn: ['employees'],
  },
  {
    id: 'CF-012',
    name: 'Directory',
    slug: 'directory',
    description: 'Company directory and people search',
    mandatory: false,
    dependsOn: ['employees'],
  },
  {
    id: 'CF-013',
    name: 'Documents',
    slug: 'documents',
    description: 'HR document vault and uploads',
    mandatory: false,
    dependsOn: ['employees'],
  },
  {
    id: 'CF-014',
    name: 'Exit',
    slug: 'exit',
    description: 'Offboarding and exit checklist',
    mandatory: false,
    dependsOn: ['employees'],
  },
  {
    id: 'CF-015',
    name: 'Analytics',
    slug: 'analytics',
    description: 'Reports and dashboards',
    mandatory: false,
    dependsOn: ['employees'],
  },
];

const SLUG_SET = new Set<string>(MODULE_SLUGS);

export function isModuleSlug(value: string): value is ModuleSlug {
  return SLUG_SET.has(value);
}

export function getCoreFunctionBySlug(slug: ModuleSlug): CoreFunctionDefinition | undefined {
  return CORE_FUNCTION_CATALOG.find((cf) => cf.slug === slug);
}

/** Max module slugs allowed per SaaS plan (super-admin cap cannot exceed). */
export const PLAN_MODULE_LIMITS: Record<string, ModuleSlug[]> = {
  free: ['leave', 'attendance', 'employees', 'compliance', 'documents'],
  starter: ['leave', 'attendance', 'payroll', 'documents', 'employees', 'compliance'],
  growth: [...MODULE_SLUGS],
  enterprise: [...MODULE_SLUGS],
};

export function maxModulesForPlan(plan: string): ModuleSlug[] {
  return PLAN_MODULE_LIMITS[plan] ?? PLAN_MODULE_LIMITS.free;
}

/** Labels and lucide icon names for onboarding and module management. */
export const MODULE_PICKER_META: Record<
  ModuleSlug,
  { label: string; description: string; icon: string }
> = {
  employees: { label: 'Employees', description: 'Core employee records', icon: 'Users' },
  leave: { label: 'Leave Management', description: 'Apply, approve, track leave', icon: 'CalendarDays' },
  compliance: { label: 'Compliance & Audit', description: 'Statutory and audit', icon: 'Scale' },
  pf: { label: 'PF', description: 'Provident fund reporting', icon: 'Landmark' },
  attendance: { label: 'Attendance & Shifts', description: 'Clock-in and shifts', icon: 'Clock' },
  payroll: { label: 'Payroll', description: 'Salary and payslips', icon: 'Banknote' },
  performance: { label: 'Performance Reviews', description: 'Goals and appraisals', icon: 'Target' },
  recruitment: { label: 'Recruitment', description: 'Hiring pipeline', icon: 'UserPlus' },
  learning: { label: 'Learning & Development', description: 'Training plans', icon: 'BookOpen' },
  expenses: { label: 'Expense Claims', description: 'Business expenses', icon: 'Receipt' },
  reimbursements: { label: 'Reimbursements', description: 'Reimbursement flows', icon: 'CreditCard' },
  directory: { label: 'Directory', description: 'People directory', icon: 'Building2' },
  documents: { label: 'Document Management', description: 'Policies and files', icon: 'FolderOpen' },
  exit: { label: 'Exit Management', description: 'Offboarding', icon: 'DoorOpen' },
  analytics: { label: 'Analytics', description: 'Reports and insights', icon: 'BarChart3' },
};
