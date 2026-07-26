/**
 * Read-only production probe: dumps the auth-relevant state for one account so
 * verification/credential bugs can be diagnosed against real data.
 *
 *   node scripts/ops/probe-account.mjs <email-fragment>
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, '../..');

function loadEnvFile(name) {
  const file = path.join(webRoot, name);
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[m[1]] = value.replace(/\\r/g, '').replace(/\\n/g, '').trim();
  }
}

loadEnvFile('.env.prod');

const prisma = new PrismaClient();
const fragment = process.argv[2] || 'traderlighter';

const employees = await prisma.employee.findMany({
  where: { email: { contains: fragment, mode: 'insensitive' } },
  select: {
    id: true, email: true, first_name: true, last_name: true,
    primary_role: true, secondary_roles: true, status: true,
    org_id: true, must_change_password: true, password_hash: true,
    created_at: true, updated_at: true, invited_by_type: true,
  },
});

console.log('=== MATCHING EMPLOYEES ===');
for (const emp of employees) {
  console.log(JSON.stringify({
    ...emp,
    password_hash: emp.password_hash ? `${emp.password_hash.slice(0, 10)}…(len ${emp.password_hash.length})` : null,
  }, null, 2));

  const tokens = await prisma.otpToken.findMany({
    where: { emp_id: emp.id },
    orderBy: { created_at: 'desc' },
    take: 20,
    select: { id: true, action: true, is_used: true, expires_at: true, created_at: true },
  });
  console.log('  tokens:', JSON.stringify(tokens));

  if (emp.org_id) {
    const company = await prisma.company.findUnique({
      where: { id: emp.org_id },
      select: { id: true, name: true, onboarding_completed: true, join_code: true },
    });
    console.log('  company:', JSON.stringify(company));
  }
}

console.log('\n=== COUNTS ===');
console.log('companies:', await prisma.company.count(), 'employees:', await prisma.employee.count());

console.log('\n=== RECENT EMPLOYEES ===');
console.log(JSON.stringify(await prisma.employee.findMany({
  orderBy: { created_at: 'desc' },
  take: 15,
  select: { email: true, primary_role: true, status: true, org_id: true, created_at: true },
}), null, 2));

console.log('\n=== COMPANIES ===');
console.log(JSON.stringify(await prisma.company.findMany({
  orderBy: { created_at: 'desc' },
  take: 15,
  select: { id: true, name: true, onboarding_completed: true, join_code: true },
}), null, 2));

await prisma.$disconnect();
