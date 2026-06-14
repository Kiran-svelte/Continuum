/**
 * Smoke script for employee/admin fallback routes (L5-07-002).
 * Usage: npx tsx scripts/fallback-routes-smoke.ts
 */
const ROUTES = [
  '/employee/dashboard',
  '/employee/request-leave',
  '/employee/leave-history',
  '/employee/attendance',
  '/employee/payslips',
  '/employee/profile',
  '/employee/profile/whatsapp',
  '/manager/approvals',
  '/admin/getting-started',
  '/admin/integrations/whatsapp',
];

async function main() {
  const base = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
  console.log(`Fallback route smoke against ${base}`);
  let failed = 0;

  for (const route of ROUTES) {
    try {
      const res = await fetch(`${base}${route}`, { redirect: 'manual' });
      const ok = res.status === 200 || res.status === 307 || res.status === 308;
      console.log(`${ok ? 'PASS' : 'FAIL'} ${route} → ${res.status}`);
      if (!ok) failed += 1;
    } catch (error) {
      console.log(`FAIL ${route} → ${error instanceof Error ? error.message : 'error'}`);
      failed += 1;
    }
  }

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main();
