/**
 * Signs in as each seeded demo role against the deployed site and fetches every
 * page that role can reach, reporting HTTP status, redirects and rendered error
 * markers. Fast breadth check to find broken pages before driving flows by hand.
 *
 *   node scripts/ops/sweep-portals.mjs [baseUrl]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, '../..');
const BASE = process.argv[2] || 'https://continuum.support';
const PASSWORD = 'Continuum@2026';

const ACCOUNTS = [
  { role: 'admin', email: 'admin@demo.continuum.support', portals: ['/admin'] },
  { role: 'hr', email: 'hr@demo.continuum.support', portals: ['/hr'] },
  { role: 'manager', email: 'manager@demo.continuum.support', portals: ['/manager'] },
  { role: 'employee', email: 'employee@demo.continuum.support', portals: ['/employee'] },
  { role: 'super_admin', email: 'superadmin@demo.continuum.support', portals: ['/super-admin'], superAdmin: true },
];

function collectRoutes() {
  const roots = ['admin', 'hr', 'manager', 'employee', 'super-admin'].map((p) => path.join(webRoot, 'app', p));
  const routes = [];
  const walk = (dir, urlParts) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        if (entry.name === 'page.tsx') routes.push('/' + urlParts.join('/'));
        continue;
      }
      if (entry.name.startsWith('[')) continue; // dynamic routes need real ids
      const isGroup = entry.name.startsWith('(') && entry.name.endsWith(')');
      walk(path.join(dir, entry.name), isGroup ? urlParts : [...urlParts, entry.name]);
    }
  };
  for (const root of roots) walk(root, [path.basename(root)]);
  return routes.sort();
}

function parseCookies(res) {
  const raw = res.headers.getSetCookie?.() ?? [];
  return raw.map((c) => c.split(';')[0]).join('; ');
}

async function signIn(email, isSuperAdmin = false) {
  const res = await fetch(`${BASE}/api/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD, ...(isSuperAdmin ? { is_super_admin: true } : {}) }),
    redirect: 'manual',
  });
  if (!res.ok) throw new Error(`signin ${email} -> ${res.status} ${await res.text()}`);
  let cookie = parseCookies(res);

  // /api/auth/me issues the module + onboarding hint cookies the middleware
  // gates read; without it every portal request bounces as "session stale".
  const me = await fetch(`${BASE}/api/auth/me`, { headers: { cookie }, redirect: 'manual' });
  const meCookies = parseCookies(me);
  if (meCookies) {
    const jar = new Map(cookie.split('; ').filter(Boolean).map((c) => [c.split('=')[0], c]));
    for (const c of meCookies.split('; ')) jar.set(c.split('=')[0], c);
    cookie = [...jar.values()].join('; ');
  }
  return cookie;
}

const ERROR_MARKERS = [
  'Application error',
  'Something went wrong',
  'Internal Server Error',
  'This page could not be found',
  'client-side exception',
  'Unhandled Runtime Error',
];

const allRoutes = collectRoutes();
const results = [];

for (const account of ACCOUNTS) {
  let cookie;
  try {
    cookie = await signIn(account.email, account.superAdmin === true);
  } catch (err) {
    console.error(`!! ${account.role}: ${err.message}`);
    continue;
  }

  const routes = allRoutes.filter((r) => account.portals.some((p) => r.startsWith(p)));
  console.log(`\n=== ${account.role.toUpperCase()} (${routes.length} routes) ===`);

  for (const route of routes) {
    try {
      const res = await fetch(`${BASE}${route}`, { headers: { cookie }, redirect: 'manual' });
      const location = res.headers.get('location');
      let marker = '';
      if (res.status === 200) {
        const html = await res.text();
        const hit = ERROR_MARKERS.find((m) => html.includes(m));
        if (hit) marker = ` [ERROR TEXT: ${hit}]`;
      }
      const verdict =
        res.status === 200 && !marker ? 'ok'
          : res.status >= 300 && res.status < 400 ? `redirect -> ${location}`
            : `HTTP ${res.status}${marker}`;
      if (verdict !== 'ok') {
        console.log(`  ${route.padEnd(42)} ${verdict}`);
        results.push({ role: account.role, route, verdict });
      }
    } catch (err) {
      console.log(`  ${route.padEnd(42)} FETCH FAILED: ${err.message}`);
      results.push({ role: account.role, route, verdict: `fetch failed: ${err.message}` });
    }
  }
}

console.log(`\n=== SUMMARY: ${results.length} problem route(s) ===`);
for (const r of results) console.log(`${r.role.padEnd(9)} ${r.route.padEnd(42)} ${r.verdict}`);
