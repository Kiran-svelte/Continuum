/**
 * Read-only report of the deployed Vercel environment variables that drive
 * email links and auth origins, so we can tell configuration bugs apart from
 * code bugs. Values are masked unless the key is in SAFE_TO_PRINT.
 *
 *   node scripts/ops/vercel-env-report.mjs
 *
 * Requires VERCEL_TOKEN in the environment or in web/.env.ops.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

loadEnvFile('.env.ops');

const token = process.env.VERCEL_TOKEN;
const projectId = process.env.VERCEL_PROJECT_ID || 'prj_bmzb8jzDWdjuDOfs4v2nudrEXZmn';
const teamId = process.env.VERCEL_TEAM_ID || 'team_hTuQ50nKvTbROYgfNhRPNMe4';

if (!token) {
  console.error('VERCEL_TOKEN missing (set it in web/.env.ops)');
  process.exit(1);
}

const SAFE_TO_PRINT = new Set([
  'NEXT_PUBLIC_APP_URL', 'APP_URL', 'EMAIL_PROVIDER', 'EMAIL_FROM_NAME',
  'RESEND_FROM_EMAIL', 'SENDGRID_FROM_EMAIL', 'SENDGRID_FROM_NAME',
  'SMTP_FROM', 'SMTP_HOST', 'SMTP_PORT', 'GMAIL_USER',
  'ENABLE_SIGNUP_FALLBACK', 'NEXT_PUBLIC_ENABLE_PUBLIC_SIGNUP',
  'CORS_ALLOWED_ORIGINS', 'NODE_ENV', 'NEXT_PUBLIC_DEMO_AUTH',
]);

const res = await fetch(
  `https://api.vercel.com/v9/projects/${projectId}/env?teamId=${teamId}&decrypt=true`,
  { headers: { Authorization: `Bearer ${token}` } },
);

if (!res.ok) {
  console.error('Vercel API error', res.status, await res.text());
  process.exit(1);
}

const { envs } = await res.json();
const filter = process.argv[2];

const rows = envs
  .filter((e) => (filter ? e.key.includes(filter) : true))
  .map((e) => ({
    key: e.key,
    target: Array.isArray(e.target) ? e.target.join('|') : e.target,
    type: e.type,
    value: SAFE_TO_PRINT.has(e.key)
      ? JSON.stringify(e.value)
      : e.value
        ? `set(len ${String(e.value).length})`
        : '(empty)',
  }))
  .sort((a, b) => a.key.localeCompare(b.key));

console.table(rows);
