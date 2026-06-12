import fs from 'fs';
import path from 'path';

const root = path.join(process.cwd(), 'web');

function walk(dir, fileTest, base = '') {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = path.join(base, e.name).replace(/\\/g, '/');
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full, fileTest, rel));
    else if (fileTest(e.name, rel)) out.push(rel);
  }
  return out;
}

function routeFromPage(rel) {
  let r = rel.replace(/\/page\.tsx$/, '');
  r = r.replace(/\([^)]+\)\//g, '/').replace(/\([^)]+\)/g, '');
  r = r.replace(/\/+/g, '/').replace(/^\//, '');
  return r ? `/${r}` : '/';
}

const pageFiles = walk(path.join(root, 'app'), (n) => n === 'page.tsx');
const pages = [...new Set(pageFiles.map(routeFromPage))].sort();

const views = walk(path.join(root, 'components'), (n) => n.endsWith('-view.tsx'))
  .map((r) => r.replace(/\.tsx$/, '').replace(/^.*components\//, 'components/'))
  .sort();

const listTsx = (dir) =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.endsWith('.tsx')).map((f) => f.replace('.tsx', '')).sort()
    : [];

const portals = {
  admin: [
    'getting-started', 'dashboard', 'setup-wizard', 'startup-readiness', 'company-settings',
    'people', 'people/invite', 'rbac', 'billing', 'system-health', 'notifications', 'profile',
    'audit-logs', 'leave-requests', 'payroll', 'payslips', 'my-payroll-advances', 'pf-reports',
    'salary-structures', 'salary-components', 'policy-settings', 'holidays', 'shifts', 'compliance', 'search',
  ].map((p) => `/admin/${p}`),
  hr: [
    'dashboard', 'leave-requests', 'leave-calendar', 'leave-balance', 'leave-quotas', 'leave-encashment',
    'holidays', 'request-leave', 'my-attendance', 'attendance', 'shifts', 'employees', 'employees/[id]',
    'employees/invite', 'bulk-import', 'organization', 'employee-movements', 'exit-checklist', 'payroll',
    'pf-reports', 'salary-structures', 'salary-components', 'compensation', 'reimbursements', 'payslips',
    'my-payroll-advances', 'payroll-advances', 'performance', 'goals', 'reviews', 'recruitment', 'job-board',
    'learning', 'travel', 'approvals', 'approval-config', 'escalation', 'reports', 'report-builder', 'documents',
    'policy-settings', 'compliance', 'audit-logs', 'notifications', 'profile', 'settings', 'search',
  ].map((p) => `/hr/${p}`),
  manager: [
    'dashboard', 'request-leave', 'leave-requests', 'team-calendar', 'approvals', 'my-attendance',
    'team-attendance', 'team', 'directory', 'performance', 'reimbursements', 'payslips', 'payroll-advances',
    'reports', 'people', 'people/invite', 'search', 'notifications', 'profile', 'settings',
  ].map((p) => `/manager/${p}`),
  employee: [
    'dashboard', 'request-leave', 'leave-history', 'attendance', 'directory', 'performance', 'documents',
    'payslips', 'payroll-advances', 'reimbursements', 'learning', 'travel', 'exit-checklist', 'search',
    'notifications', 'profile', 'settings',
  ].map((p) => `/employee/${p}`),
  superAdmin: [
    'dashboard', 'companies', 'companies/[id]', 'companies/[id]/settings', 'companies/[id]/core-functions',
    'companies/new', 'users', 'users/[id]', 'users/new', 'users/invites/[id]', 'operations',
  ].map((p) => `/super-admin/${p}`),
};

const modules = [
  { id: 'CF-001', slug: 'employees', name: 'Employee Management', mandatory: true },
  { id: 'CF-002', slug: 'leave', name: 'Leave (+ AI)', mandatory: true },
  { id: 'CF-003', slug: 'compliance', name: 'Compliance & Audit', mandatory: true },
  { id: 'CF-004', slug: 'pf', name: 'Provident Fund', mandatory: false },
  { id: 'CF-005', slug: 'attendance', name: 'Attendance & Shifts', mandatory: true },
  { id: 'CF-006', slug: 'payroll', name: 'Payroll', mandatory: false },
  { id: 'CF-007', slug: 'performance', name: 'Performance', mandatory: false },
  { id: 'CF-008', slug: 'recruitment', name: 'Recruitment / ATS', mandatory: false },
  { id: 'CF-009', slug: 'learning', name: 'Learning (LMS)', mandatory: false },
  { id: 'CF-010', slug: 'expenses', name: 'Travel & Expense', mandatory: false },
  { id: 'CF-011', slug: 'reimbursements', name: 'Reimbursements', mandatory: false },
  { id: 'CF-012', slug: 'directory', name: 'Directory', mandatory: false },
  { id: 'CF-013', slug: 'documents', name: 'Documents', mandatory: false },
  { id: 'CF-014', slug: 'exit', name: 'Exit Management', mandatory: false },
  { id: 'CF-015', slug: 'analytics', name: 'Analytics & Reports', mandatory: false },
];

function listComponentsIn(dir, prefix) {
  if (!fs.existsSync(dir)) return [];
  return walk(dir, (n) => n.endsWith('.tsx'))
    .map((r) => `${prefix}/${r.replace(/\.tsx$/, '')}`)
    .sort();
}

const componentCategories = {
  pages: views,
  designSystem: listComponentsIn(path.join(root, 'components/design-system'), 'design-system'),
  ui: listComponentsIn(path.join(root, 'components/ui'), 'ui'),
  layouts: listComponentsIn(path.join(root, 'components/layouts'), 'layouts'),
  motion: listComponentsIn(path.join(root, 'components/motion'), 'motion'),
  assistant: listComponentsIn(path.join(root, 'components/assistant'), 'assistant'),
  approval: listComponentsIn(path.join(root, 'components/approval'), 'approval'),
  compliance: listComponentsIn(path.join(root, 'components/compliance'), 'compliance'),
  invite: listComponentsIn(path.join(root, 'components/invite'), 'invite'),
  portals: listComponentsIn(path.join(root, 'components/portals'), 'portals'),
  marketing: listComponentsIn(path.join(root, 'components/marketing'), 'marketing'),
};

// Top-level shell components (not in subfolders with many files)
const rootShell = fs
  .readdirSync(path.join(root, 'components'))
  .filter((f) => f.endsWith('.tsx') && !fs.statSync(path.join(root, 'components', f)).isDirectory())
  .map((f) => f.replace('.tsx', ''))
  .sort();

const data = {
  generatedAt: new Date().toISOString(),
  counts: { pages: pages.length, views: views.length },
  pages,
  views,
  portals,
  modules,
  componentCategories,
  rootShell,
  designSystem: listTsx(path.join(root, 'components/design-system')),
  ui: listTsx(path.join(root, 'components/ui')),
  layouts: listTsx(path.join(root, 'components/layouts')),
  shell: [
    'portal-layout', 'portal-switcher', 'module-filtered-portal-layout', 'app-layout',
    'continuum-assistant-host', 'continuum-assistant-widget', 'notification-bell',
    'global-search-page', 'command-k (CommandKSearch)', 'global-error-boundary',
    'workflow-explainer-panel', 'payroll-compliance-disclaimer', 'glass-panel',
  ],
  reports: [
    '/api/reports/attendance-summary', '/api/reports/builder', '/api/reports/document-expiry',
    '/api/reports/exit-attrition', '/api/reports/export-bundle', '/api/reports/headcount',
    '/api/reports/learning-completion', '/api/reports/leave-summary', '/api/reports/leave-summary/pdf',
    '/api/reports/payroll-register', '/api/reports/performance-summary', '/api/reports/recruitment-pipeline',
    '/api/reports/reimbursement-spend', '/api/reports/travel-spend',
  ],
  crons: [
    'document-expiry', 'learning-overdue', 'leave-accrual', 'leave-sla-breach', 'performance-overdue',
    'probation-check', 'process-events', 'sla-check', 'year-end-carry-forward',
  ].map((c) => `/api/cron/${c}`),
};

const out = path.join(process.cwd(), 'docs/marketing/brochure-inventory.json');
fs.writeFileSync(out, JSON.stringify(data, null, 2));
console.log('Wrote', out, data.counts);
