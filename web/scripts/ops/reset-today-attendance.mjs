/**
 * Clears today's attendance row for a demo account so the clock-in path can be
 * re-exercised (e.g. to verify late-arrival detection).
 *
 *   node scripts/ops/reset-today-attendance.mjs <email>
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

const email = process.argv[2];
if (!email) {
  console.error('usage: reset-today-attendance.mjs <email>');
  process.exit(1);
}

const employee = await prisma.employee.findUnique({ where: { email }, select: { id: true } });
if (!employee) {
  console.error('no employee', email);
  process.exit(1);
}

const start = new Date();
start.setUTCHours(0, 0, 0, 0);
const end = new Date(start.getTime() + 86_400_000);

const deleted = await prisma.attendance.deleteMany({
  where: { emp_id: employee.id, date: { gte: start, lt: end } },
});

console.log('deleted', deleted.count, 'attendance row(s) for', email);
await prisma.$disconnect();
