import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type ScopedFile = {
  path: string;
  patterns: string[];
};

const REQUIRED_TENANT_SCOPES: ScopedFile[] = [
  {
    path: 'lib/services/leave-submit.ts',
    patterns: ['employee.org_id', 'company_id'],
  },
  {
    path: 'lib/services/leave-approve.ts',
    patterns: ['ctx.orgId', 'company_id'],
  },
  {
    path: 'lib/services/leave-cancel.ts',
    patterns: ['ctx.orgId', 'company_id'],
  },
  {
    path: 'lib/services/leave-list.ts',
    patterns: ['ctx.orgId', 'company_id'],
  },
  {
    path: 'lib/services/leave-balances.ts',
    patterns: ['ctx.orgId', 'company_id'],
  },
  {
    path: 'lib/services/pending-approvals.ts',
    patterns: ['ctx.orgId', 'company_id'],
  },
  {
    path: 'lib/services/attendance-clock.ts',
    patterns: ['ctx.orgId', 'company_id'],
  },
  {
    path: 'lib/services/attendance-today.ts',
    patterns: ['ctx.orgId', 'company_id'],
  },
  {
    path: 'lib/services/payslip-latest.ts',
    patterns: ['ctx.orgId', 'company_id'],
  },
  {
    path: 'lib/channel/context-from-link.ts',
    patterns: ['link.company_id', 'employee.org_id'],
  },
  {
    path: 'app/api/channel/verify/confirm/route.ts',
    patterns: ['employee.org_id', 'company_id'],
  },
];

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

const failures: string[] = [];

for (const scoped of REQUIRED_TENANT_SCOPES) {
  const fullPath = resolve(process.cwd(), scoped.path);
  if (!existsSync(fullPath)) {
    failures.push(`${scoped.path}: missing file`);
    continue;
  }

  const source = read(scoped.path);
  for (const pattern of scoped.patterns) {
    if (!source.includes(pattern)) {
      failures.push(`${scoped.path}: missing tenant-scope marker "${pattern}"`);
    }
  }
}

const schema = read('prisma/schema.prisma');
if (!schema.includes('@@unique([company_id, channel, external_id])')) {
  failures.push('prisma/schema.prisma: ChannelIdentityLink must be unique by company/channel/external_id');
}

if (failures.length > 0) {
  console.error('Tenant scope audit failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Tenant scope audit passed: ${REQUIRED_TENANT_SCOPES.length} files checked.`);
