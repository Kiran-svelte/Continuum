/**
 * Dumps recent leave requests with their routed approver, so approval-routing
 * behaviour can be checked against what each portal actually shows.
 *
 *   node scripts/ops/probe-leave.mjs
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

const requests = await prisma.leaveRequest.findMany({
  orderBy: { created_at: 'desc' },
  take: 10,
  include: {
    employee: { select: { email: true, first_name: true, primary_role: true, manager_id: true } },
    approver: { select: { email: true, first_name: true, primary_role: true } },
  },
});

for (const r of requests) {
  console.log('─'.repeat(70));
  console.log('id        :', r.id);
  console.log('employee  :', r.employee.email, `(${r.employee.primary_role})`);
  console.log('type/dates:', r.leave_type, r.start_date?.toISOString().slice(0, 10), '->', r.end_date?.toISOString().slice(0, 10), `${r.total_days}d`);
  console.log('status    :', r.status);
  console.log('approved_by:', r.approver ? `${r.approver.email} (${r.approver.primary_role})` : '(none)');
  console.log('current_approver_id:', r.current_approver_id ?? '(none)');
  if (r.current_approver_id) {
    const cur = await prisma.employee.findUnique({
      where: { id: r.current_approver_id },
      select: { email: true, primary_role: true },
    });
    console.log('current_approver   :', cur ? `${cur.email} (${cur.primary_role})` : '(missing)');
  }
  console.log('sla_deadline:', r.sla_deadline?.toISOString() ?? '(none)');
  console.log('created   :', r.created_at.toISOString());
}

console.log('\ncount:', await prisma.leaveRequest.count());
await prisma.$disconnect();
