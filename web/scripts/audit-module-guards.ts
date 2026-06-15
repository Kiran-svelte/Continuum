import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type RouteGuard = {
  path: string;
  slug: string;
};

const REQUIRED_ROUTE_GUARDS: RouteGuard[] = [
  { path: 'app/api/leaves/route.ts', slug: 'leave' },
  { path: 'app/api/attendance/route.ts', slug: 'attendance' },
  { path: 'app/api/payroll/preflight/route.ts', slug: 'payroll' },
  { path: 'app/api/payroll-advances/route.ts', slug: 'payroll' },
  { path: 'app/api/expenses/route.ts', slug: 'expenses' },
  { path: 'app/api/travel-requests/route.ts', slug: 'expenses' },
  { path: 'app/api/goals/route.ts', slug: 'performance' },
  { path: 'app/api/courses/route.ts', slug: 'learning' },
  { path: 'app/api/job-postings/route.ts', slug: 'recruitment' },
  { path: 'app/api/reports/builder/route.ts', slug: 'analytics' },
  { path: 'app/api/reports/headcount/route.ts', slug: 'employees' },
  { path: 'app/api/reports/attendance-summary/route.ts', slug: 'attendance' },
  { path: 'app/api/reports/payroll-register/route.ts', slug: 'payroll' },
  { path: 'app/api/reports/document-expiry/route.ts', slug: 'documents' },
  { path: 'app/api/reports/exit-attrition/route.ts', slug: 'exit' },
];

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

const failures: string[] = [];

for (const guard of REQUIRED_ROUTE_GUARDS) {
  const fullPath = resolve(process.cwd(), guard.path);
  if (!existsSync(fullPath)) {
    failures.push(`${guard.path}: missing route`);
    continue;
  }

  const source = read(guard.path);
  const hasAssert = source.includes('assertModule(') || source.includes('requireModuleForOrg(');
  const hasSlug = source.includes(`'${guard.slug}'`) || source.includes(`"${guard.slug}"`);

  if (!hasAssert || !hasSlug) {
    failures.push(`${guard.path}: missing module guard for "${guard.slug}"`);
  }
}

if (failures.length > 0) {
  console.error('Module guard audit failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Module guard audit passed: ${REQUIRED_ROUTE_GUARDS.length} routes checked.`);
