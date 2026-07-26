/**
 * Lists recent Vercel deployments for the project with their target, branch,
 * commit and state, so a push can be traced to what production is serving.
 *
 *   node scripts/ops/vercel-deployments.mjs [limit]
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
const projectId = process.env.VERCEL_PROJECT_ID;
const teamId = process.env.VERCEL_TEAM_ID;
const limit = Number(process.argv[2] || 8);

const res = await fetch(
  `https://api.vercel.com/v6/deployments?projectId=${projectId}&teamId=${teamId}&limit=${limit}`,
  { headers: { Authorization: `Bearer ${token}` } },
);
if (!res.ok) {
  console.error('vercel api error', res.status, await res.text());
  process.exit(1);
}

const { deployments } = await res.json();
for (const d of deployments) {
  const meta = d.meta ?? {};
  console.log('─'.repeat(70));
  console.log('url     :', d.url);
  console.log('state   :', d.state, '| target:', d.target ?? '(preview)');
  console.log('branch  :', meta.githubCommitRef ?? '(n/a)');
  console.log('commit  :', (meta.githubCommitSha ?? '').slice(0, 8), '-', (meta.githubCommitMessage ?? '').split('\n')[0]);
  console.log('created :', new Date(d.created).toISOString());
}
