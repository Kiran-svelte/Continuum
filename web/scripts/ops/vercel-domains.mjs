/**
 * Shows which deployment each project domain currently points at, so a push can
 * be traced to whether continuum.support actually serves it.
 *
 *   node scripts/ops/vercel-domains.mjs
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
const auth = { headers: { Authorization: `Bearer ${token}` } };

const projectRes = await fetch(`https://api.vercel.com/v9/projects/${projectId}?teamId=${teamId}`, auth);
const project = await projectRes.json();
console.log('project             :', project.name);
console.log('production branch   :', project.link?.productionBranch ?? '(default)');
console.log('git repo            :', project.link?.repo ?? '(n/a)');

const domainsRes = await fetch(`https://api.vercel.com/v9/projects/${projectId}/domains?teamId=${teamId}`, auth);
const { domains } = await domainsRes.json();
console.log('\ndomains:');
for (const d of domains ?? []) {
  console.log(` - ${d.name}  gitBranch=${d.gitBranch ?? '(production)'}  redirect=${d.redirect ?? '-'}  verified=${d.verified}`);
}
