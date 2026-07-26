/**
 * Live reproduction of the email-verification link flow against production.
 *
 * Mints a real email_verify token for an account, prints the link the email
 * would contain, POSTs it to the deployed confirm endpoint, and re-reads the
 * row so we can see whether the server or the client is dropping it.
 *
 *   node scripts/ops/probe-verify-flow.mjs <email> [baseUrl]
 */
import crypto from 'node:crypto';
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
const email = process.argv[2] || 'traderlighter11@gmail.com';
const baseUrl = process.argv[3] || 'https://continuum.support';

const emp = await prisma.employee.findUnique({
  where: { email },
  select: { id: true, org_id: true, email: true },
});
if (!emp) {
  console.error('no employee for', email);
  process.exit(1);
}

const token = crypto.randomBytes(24).toString('hex');
const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

const row = await prisma.otpToken.create({
  data: {
    id: crypto.randomUUID(),
    emp_id: emp.id,
    company_id: emp.org_id,
    action: 'email_verify',
    code_hash: tokenHash,
    expires_at: new Date(Date.now() + 30 * 60_000),
    attempts: 0,
    is_used: false,
  },
  select: { id: true, created_at: true, expires_at: true },
});

console.log('minted token row:', row.id);
console.log('LINK:', `${baseUrl}/sign-in?verify_token=${token}`);

if (process.argv.includes('--mint-only')) {
  await prisma.$disconnect();
  process.exit(0);
}

const res = await fetch(`${baseUrl}/api/auth/email-verification/confirm`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token }),
});

console.log('\nPOST /api/auth/email-verification/confirm');
console.log('  status:', res.status, res.statusText);
console.log('  content-type:', res.headers.get('content-type'));
console.log('  set-cookie:', res.headers.get('set-cookie'));
const text = await res.text();
console.log('  body:', text.slice(0, 600));

const after = await prisma.otpToken.findUnique({
  where: { id: row.id },
  select: { is_used: true },
});
console.log('\ntoken is_used after confirm:', after?.is_used);

await prisma.$disconnect();
