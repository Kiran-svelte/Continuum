/**
 * Turns AI auto-approval on or off for the demo company so the auto-approve
 * branch of leave submission can be exercised end to end.
 *
 *   node scripts/ops/toggle-auto-approve.mjs on|off [joinCode]
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

const mode = (process.argv[2] || 'on').toLowerCase();
const joinCode = process.argv[3] || 'DEMO2026';

const company = await prisma.company.findFirst({ where: { join_code: joinCode }, select: { id: true, name: true } });
if (!company) {
  console.error('no company with join code', joinCode);
  process.exit(1);
}

const settings = await prisma.companySettings.findUnique({
  where: { company_id: company.id },
  select: { hr_alerts: true },
});
const hrAlerts = (settings?.hr_alerts && typeof settings.hr_alerts === 'object') ? { ...settings.hr_alerts } : {};

hrAlerts.ai = {
  enabled: mode === 'on',
  confidence_threshold: 0.85,
  auto_approve_max_days: 3,
};

await prisma.companySettings.update({
  where: { company_id: company.id },
  data: { hr_alerts: hrAlerts },
});

console.log(`auto-approve ${mode} for ${company.name}:`, JSON.stringify(hrAlerts.ai));
await prisma.$disconnect();
