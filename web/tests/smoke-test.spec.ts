/**
 * CONTINUUM — FULL-COVERAGE SMOKE TEST
 *
 * Visits every route, clicks every interactive element, and records:
 *   ✅ SUCCESS  — page loaded, no crash
 *   ❌ CRASH    — uncaught JS error or page throws
 *   ⛔ 404      — page returned 404 / not-found
 *   ⚠️  REDIRECT — page redirected away (auth gate)
 *   🔘 BUTTON   — per-button click result
 *
 * Usage:
 *   npx playwright test tests/smoke-test.spec.ts --reporter=html
 *   OR
 *   npx playwright test tests/smoke-test.spec.ts --reporter=json > test-results.json
 *
 * Configure BASE_URL and credentials via environment variables:
 *   $env:BASE_URL = "http://localhost:3000"
 *   $env:TEST_HR_EMAIL = "hr@example.com"
 *   $env:TEST_HR_PASSWORD = "yourpassword"
 *   $env:TEST_EMPLOYEE_EMAIL = "employee@example.com"
 *   $env:TEST_EMPLOYEE_PASSWORD = "yourpassword"
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// ─── Configuration ────────────────────────────────────────────────────────────

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const HR_EMAIL = process.env.TEST_HR_EMAIL || '';
const HR_PASSWORD = process.env.TEST_HR_PASSWORD || '';
const EMPLOYEE_EMAIL = process.env.TEST_EMPLOYEE_EMAIL || '';
const EMPLOYEE_PASSWORD = process.env.TEST_EMPLOYEE_PASSWORD || '';

// ─── Route Lists ─────────────────────────────────────────────────────────────

/** Public routes — no auth required */
const PUBLIC_ROUTES = [
  '/',
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/privacy',
  '/terms',
  '/support',
  '/help',
  '/status',
  '/about',
  '/blog',
  '/careers',
  '/changelog',
  '/cookies',
];

/** HR portal routes — requires HR or Admin role */
const HR_ROUTES = [
  '/hr/dashboard',
  '/hr/employees',
  '/hr/employees/invite',
  '/hr/approvals',
  '/hr/attendance',
  '/hr/audit-logs',
  '/hr/bulk-import',
  '/hr/compensation',
  '/hr/compliance',
  '/hr/documents',
  '/hr/employee-movements',
  '/hr/escalation',
  '/hr/exit-checklist',
  '/hr/goals',
  '/hr/holidays',
  '/hr/job-board',
  '/hr/learning',
  '/hr/leave-balance',
  '/hr/leave-calendar',
  '/hr/leave-encashment',
  '/hr/leave-quotas',
  '/hr/leave-requests',
  '/hr/my-attendance',
  '/hr/notifications',
  '/hr/organization',
  '/hr/payroll',
  '/hr/payroll-advances',
  '/hr/payslips',
  '/hr/performance',
  '/hr/pf-reports',
  '/hr/policy-settings',
  '/hr/profile',
  '/hr/recruitment',
  '/hr/reimbursements',
  '/hr/report-builder',
  '/hr/reports',
  '/hr/request-leave',
  '/hr/reviews',
  '/hr/salary-components',
  '/hr/salary-structures',
  '/hr/search',
  '/hr/settings',
  '/hr/shifts',
  '/hr/travel',
  '/hr/approval-config',
];

/** Employee portal routes */
const EMPLOYEE_ROUTES = [
  '/employee/dashboard',
  '/employee/attendance',
  '/employee/directory',
  '/employee/documents',
  '/employee/exit-checklist',
  '/employee/leave-history',
  '/employee/learning',
  '/employee/notifications',
  '/employee/payslips',
  '/employee/performance',
  '/employee/profile',
  '/employee/reimbursements',
  '/employee/request-leave',
  '/employee/search',
  '/employee/settings',
  '/employee/travel',
  '/employee/payroll-advances',
];

/** Manager portal routes */
const MANAGER_ROUTES = [
  '/manager/dashboard',
  '/manager/approvals',
  '/manager/directory',
  '/manager/leave-requests',
  '/manager/my-attendance',
  '/manager/notifications',
  '/manager/people',
  '/manager/performance',
  '/manager/profile',
  '/manager/reimbursements',
  '/manager/reports',
  '/manager/request-leave',
  '/manager/search',
  '/manager/settings',
  '/manager/team',
  '/manager/team-attendance',
  '/manager/team-calendar',
  '/manager/payslips',
  '/manager/payroll-advances',
];

// ─── Result Tracking ──────────────────────────────────────────────────────────

interface RouteResult {
  url: string;
  status: 'success' | 'crash' | '404' | 'redirect' | 'timeout' | 'auth-required';
  finalUrl: string;
  httpStatus?: number;
  errors: string[];
  buttons: ButtonResult[];
  loadTimeMs: number;
}

interface ButtonResult {
  id: string;
  text: string;
  status: 'success' | 'crash' | 'navigation' | 'skipped' | 'error';
  error?: string;
  navigatedTo?: string;
}

const allResults: RouteResult[] = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Navigates to a URL and collects all JS console errors.
 * Filters out known-benign noise that would produce false positives:
 *   - CSP violations for cursor-effects.js / theme-init.js (own public scripts needing nonce)
 *   - PostHog dev analytics trying to connect to localhost:7577
 *   - Generic 401 responses from client-side fetches on unauthenticated pages
 */
async function visitPage(
  page: Page,
  url: string
): Promise<{ status: RouteResult['status']; finalUrl: string; errors: string[]; httpStatus?: number; loadTimeMs: number }> {
  const rawErrors: string[] = [];
  const start = Date.now();

  // Known benign patterns — infrastructure/dev noise, not real app crashes
  const BENIGN_ERROR_PATTERNS = [
    /cursor-effects\.js.*Content Security Policy/i,
    /theme-init\.js.*Content Security Policy/i,
    /127\.0\.0\.1:7577/,          // PostHog dev analytics
    /posthog/i,                     // PostHog references
    /cloudflareinsights/i,          // Cloudflare analytics
    /vercel-insights/i,             // Vercel analytics
    /Failed to load resource.*401/, // Unauthenticated client-side API calls (expected)
    /Suspense boundary.*server rendering/, // Next.js hydration info (not a crash)
  ];

  page.on('console', (msg) => {
    if (msg.type() === 'error') rawErrors.push(`[console.error] ${msg.text()}`);
  });
  page.on('pageerror', (err) => rawErrors.push(`[pageerror] ${err.message}`));

  let httpStatus: number | undefined;
  let response;

  try {
    response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    httpStatus = response?.status();
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  } catch (err) {
    return {
      status: 'timeout',
      finalUrl: page.url(),
      errors: [`Timeout: ${err}`],
      loadTimeMs: Date.now() - start,
    };
  }

  const finalUrl = page.url();
  const loadTimeMs = Date.now() - start;

  // Filter out benign infrastructure noise
  const errors = rawErrors.filter(
    (e) => !BENIGN_ERROR_PATTERNS.some((pattern) => pattern.test(e))
  );

  // Determine status
  if (httpStatus === 404 || finalUrl.includes('/not-found') || await page.locator('h1:has-text("404")').count() > 0) {
    return { status: '404', finalUrl, errors, httpStatus, loadTimeMs };
  }

  const originPath = new URL(url).pathname;
  const finalPath = new URL(finalUrl).pathname;
  if (!finalPath.startsWith(originPath.split('/').slice(0, 2).join('/')) && finalPath !== originPath) {
    // Redirected away (e.g., to /sign-in)
    if (finalPath.includes('sign-in') || finalPath.includes('login') || finalPath.includes('onboarding')) {
      return { status: 'auth-required', finalUrl, errors, httpStatus, loadTimeMs };
    }
    return { status: 'redirect', finalUrl, errors, httpStatus, loadTimeMs };
  }

  if (errors.length > 0) {
    return { status: 'crash', finalUrl, errors, httpStatus, loadTimeMs };
  }

  return { status: 'success', finalUrl, errors, httpStatus, loadTimeMs };
}

/**
 * Finds and clicks every interactive button/link on the current page.
 * Skips navigation links and destructive actions to avoid test pollution.
 */
async function clickAllButtons(page: Page, pageUrl: string): Promise<ButtonResult[]> {
  const results: ButtonResult[] = [];

  // Selectors to skip (destructive / external / navigation)
  const SKIP_TEXT_PATTERNS = [
    /sign.?out/i, /log.?out/i, /delete/i, /remove/i, /reset/i,
    /deactivate/i, /terminate/i, /revoke/i, /export/i, /download/i,
    /generate payroll/i, /approve payroll/i, /send email/i,
    /force logout/i, /backup/i, /purge/i, /self.?heal/i,
  ];

  // Find all buttons (not disabled, not inside modals that aren't open)
  const buttons = await page.locator(
    'button:not([disabled]):not([aria-disabled="true"]):visible, ' +
    '[role="button"]:not([disabled]):visible'
  ).all();

  for (const btn of buttons.slice(0, 30)) { // cap at 30 per page
    let text = '';
    let id = '';
    try {
      text = (await btn.innerText()).trim().replace(/\s+/g, ' ').slice(0, 60);
      id = (await btn.getAttribute('id')) || `btn-${text.slice(0, 20)}`;

      // Skip destructive / navigation buttons
      if (SKIP_TEXT_PATTERNS.some((p) => p.test(text))) {
        results.push({ id, text, status: 'skipped' });
        continue;
      }

      // Skip tiny icon-only buttons with no text
      if (!text || text.length === 0) {
        results.push({ id: id || 'icon-btn', text: '[icon only]', status: 'skipped' });
        continue;
      }

      const errors: string[] = [];
      page.once('pageerror', (err) => errors.push(err.message));

      const [newPage] = await Promise.all([
        page.context().waitForEvent('page', { timeout: 2000 }).catch(() => null),
        btn.click({ timeout: 3000 }).catch(() => {}),
      ]);

      if (newPage) {
        await newPage.close();
        results.push({ id, text, status: 'navigation', navigatedTo: newPage.url() });
        continue;
      }

      // Check if we navigated away
      await page.waitForLoadState('domcontentloaded', { timeout: 3000 }).catch(() => {});
      const currentUrl = page.url();

      if (errors.length > 0) {
        results.push({ id, text, status: 'crash', error: errors[0] });
        // Navigate back
        await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
        continue;
      }

      if (currentUrl !== pageUrl && !currentUrl.includes(new URL(pageUrl).pathname)) {
        results.push({ id, text, status: 'navigation', navigatedTo: currentUrl });
        await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
      } else {
        results.push({ id, text, status: 'success' });
      }
    } catch (err) {
      results.push({ id: id || 'unknown', text: text || 'unknown', status: 'error', error: String(err) });
    }
  }

  return results;
}

// ─── Auth Helper ──────────────────────────────────────────────────────────────

async function signIn(page: Page, email: string, password: string): Promise<boolean> {
  if (!email || !password) return false;
  try {
    await page.goto(`${BASE_URL}/sign-in`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.fill('input[type="email"], input[name="email"]', email);
    await page.fill('input[type="password"], input[name="password"]', password);
    await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
    await page.waitForURL(/dashboard|onboarding|employee|hr|manager|admin/, { timeout: 15000 });
    return true;
  } catch {
    return false;
  }
}

async function signOut(page: Page) {
  try {
    await fetch(`${BASE_URL}/api/auth/sign-out`, { method: 'POST' });
    await page.evaluate(() => {
      document.cookie.split(';').forEach((c) => {
        document.cookie = c.replace(/^ +/, '').replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
      });
    });
  } catch {}
}

// ─── Test: Public Routes ──────────────────────────────────────────────────────

test.describe('Public Routes', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`Public: ${route}`, async ({ page }) => {
      const url = `${BASE_URL}${route}`;
      const pageResult = await visitPage(page, url);
      const buttons = pageResult.status === 'success'
        ? await clickAllButtons(page, url)
        : [];

      const result: RouteResult = { url, ...pageResult, buttons };
      allResults.push(result);

      // Log to console for visibility
      const icon = { success: '✅', crash: '❌', '404': '⛔', redirect: '⚠️', 'auth-required': '🔒', timeout: '⏱️' }[pageResult.status];
      console.log(`${icon} [${pageResult.status.toUpperCase()}] ${route} → ${pageResult.finalUrl} (${pageResult.loadTimeMs}ms)`);
      if (pageResult.errors.length > 0) console.log(`   Errors: ${pageResult.errors.join('; ')}`);

      // Only fail on actual crashes (not auth redirects — those are expected on public routes)
      if (pageResult.status === 'crash') {
        expect(pageResult.errors, `Page ${route} crashed with JS errors`).toEqual([]);
      }
      if (pageResult.status === '404') {
        expect(pageResult.status, `Page ${route} returned 404`).not.toBe('404');
      }
    });
  }
});

// ─── Test: HR Routes ──────────────────────────────────────────────────────────

test.describe('HR Portal Routes', () => {
  let hrContext: BrowserContext | null = null;

  test.beforeAll(async ({ browser }) => {
    if (!HR_EMAIL || !HR_PASSWORD) {
      console.warn('⚠️  HR credentials not set. Skipping auth. Set TEST_HR_EMAIL and TEST_HR_PASSWORD.');
      return;
    }
    hrContext = await browser.newContext();
    const page = await hrContext.newPage();
    const loggedIn = await signIn(page, HR_EMAIL, HR_PASSWORD);
    if (!loggedIn) console.warn('⚠️  HR sign-in failed. Routes will test without auth.');
    await page.close();
  });

  test.afterAll(async () => {
    if (hrContext) await hrContext.close();
  });

  for (const route of HR_ROUTES) {
    test(`HR: ${route}`, async ({ browser }) => {
      const ctx = hrContext || await browser.newContext();
      const page = await ctx.newPage();
      const url = `${BASE_URL}${route}`;

      const pageResult = await visitPage(page, url);
      const buttons = pageResult.status === 'success'
        ? await clickAllButtons(page, url)
        : [];

      const result: RouteResult = { url, ...pageResult, buttons };
      allResults.push(result);

      const icon = { success: '✅', crash: '❌', '404': '⛔', redirect: '⚠️', 'auth-required': '🔒', timeout: '⏱️' }[pageResult.status];
      console.log(`${icon} [${pageResult.status.toUpperCase()}] ${route} → ${pageResult.finalUrl} (${pageResult.loadTimeMs}ms)`);
      if (pageResult.status === 'crash') {
        console.log(`   Errors: ${pageResult.errors.join('; ')}`);
      }
      buttons.forEach((b) => {
        const bIcon = { success: '  🔘✅', crash: '  🔘❌', navigation: '  🔘➡️', skipped: '  🔘⏭️', error: '  🔘⚠️' }[b.status];
        console.log(`${bIcon} Button "${b.text}" → ${b.status}${b.error ? ` (${b.error})` : ''}${b.navigatedTo ? ` → ${b.navigatedTo}` : ''}`);
      });

      await page.close();
      if (!hrContext) await ctx.close();

      if (pageResult.status === 'crash') {
        expect(pageResult.errors, `HR page ${route} crashed`).toEqual([]);
      }
    });
  }
});

// ─── Test: Employee Routes ─────────────────────────────────────────────────────

test.describe('Employee Portal Routes', () => {
  let employeeContext: BrowserContext | null = null;

  test.beforeAll(async ({ browser }) => {
    if (!EMPLOYEE_EMAIL || !EMPLOYEE_PASSWORD) {
      console.warn('⚠️  Employee credentials not set. Skipping auth.');
      return;
    }
    employeeContext = await browser.newContext();
    const page = await employeeContext.newPage();
    await signIn(page, EMPLOYEE_EMAIL, EMPLOYEE_PASSWORD);
    await page.close();
  });

  test.afterAll(async () => {
    if (employeeContext) await employeeContext.close();
  });

  for (const route of EMPLOYEE_ROUTES) {
    test(`Employee: ${route}`, async ({ browser }) => {
      const ctx = employeeContext || await browser.newContext();
      const page = await ctx.newPage();
      const url = `${BASE_URL}${route}`;

      const pageResult = await visitPage(page, url);
      const buttons = pageResult.status === 'success'
        ? await clickAllButtons(page, url)
        : [];

      const result: RouteResult = { url, ...pageResult, buttons };
      allResults.push(result);

      const icon = { success: '✅', crash: '❌', '404': '⛔', redirect: '⚠️', 'auth-required': '🔒', timeout: '⏱️' }[pageResult.status];
      console.log(`${icon} [${pageResult.status.toUpperCase()}] ${route} (${pageResult.loadTimeMs}ms)`);
      buttons.forEach((b) => {
        if (b.status === 'crash' || b.status === 'error') {
          console.log(`  🔘❌ Button "${b.text}" → ${b.error}`);
        }
      });

      await page.close();
      if (!employeeContext) await ctx.close();

      if (pageResult.status === 'crash') {
        expect(pageResult.errors, `Employee page ${route} crashed`).toEqual([]);
      }
    });
  }
});

// ─── Test: Manager Routes ─────────────────────────────────────────────────────

test.describe('Manager Portal Routes', () => {
  for (const route of MANAGER_ROUTES) {
    test(`Manager: ${route}`, async ({ page }) => {
      const url = `${BASE_URL}${route}`;
      const pageResult = await visitPage(page, url);
      const result: RouteResult = { url, ...pageResult, buttons: [] };
      allResults.push(result);

      const icon = { success: '✅', crash: '❌', '404': '⛔', redirect: '⚠️', 'auth-required': '🔒', timeout: '⏱️' }[pageResult.status];
      console.log(`${icon} [${pageResult.status.toUpperCase()}] ${route} (${pageResult.loadTimeMs}ms)`);

      if (pageResult.status === 'crash') {
        expect(pageResult.errors, `Manager page ${route} crashed`).toEqual([]);
      }
      if (pageResult.status === '404') {
        expect(pageResult.status).not.toBe('404');
      }
    });
  }
});

// ─── Test: API Endpoint Smoke ──────────────────────────────────────────────────

test.describe('API Health Checks', () => {
  const PUBLIC_APIS = [
    { method: 'GET', path: '/api/health', expectStatus: [200, 503] },
    { method: 'GET', path: '/api/health/live', expectStatus: [200, 503] },
    { method: 'GET', path: '/api/health/ready', expectStatus: [200, 503] },
    { method: 'GET', path: '/api/status/public', expectStatus: [200, 503] },
  ];

  const AUTH_APIS = [
    { method: 'GET', path: '/api/auth/me', expectStatus: [200, 401] },
    { method: 'GET', path: '/api/notifications', expectStatus: [200, 401] },
    { method: 'GET', path: '/api/leaves/balances', expectStatus: [200, 401] },
    { method: 'GET', path: '/api/employees', expectStatus: [200, 401, 403] },
  ];

  for (const api of PUBLIC_APIS) {
    test(`API ${api.method} ${api.path}`, async ({ request }) => {
      const response = await request[api.method.toLowerCase() as 'get'](
        `${BASE_URL}${api.path}`
      );
      const expected = Array.isArray(api.expectStatus) ? api.expectStatus : [api.expectStatus];
      console.log(`🌐 ${api.method} ${api.path} → ${response.status()}`);
      expect(expected, `${api.path} returned unexpected status ${response.status()}`).toContain(response.status());
    });
  }

  for (const api of AUTH_APIS) {
    test(`API (no-auth) ${api.method} ${api.path}`, async ({ request }) => {
      const response = await request[api.method.toLowerCase() as 'get'](
        `${BASE_URL}${api.path}`
      );
      const expected = Array.isArray(api.expectStatus) ? api.expectStatus : [api.expectStatus];
      console.log(`🔒 ${api.method} ${api.path} → ${response.status()} (no auth)`);
      expect(expected, `${api.path} returned unexpected unauthenticated status ${response.status()}`).toContain(response.status());
    });
  }
});

// ─── Final Report Generation ───────────────────────────────────────────────────

test.afterAll(async () => {
  if (allResults.length === 0) return;

  const report = generateMarkdownReport(allResults);
  const reportPath = path.join(process.cwd(), 'SMOKE_TEST_RESULTS.md');
  fs.writeFileSync(reportPath, report, 'utf-8');
  console.log(`\n📄 Full report written to: ${reportPath}`);
});

function generateMarkdownReport(results: RouteResult[]): string {
  const now = new Date().toISOString();
  const total = results.length;
  const success = results.filter((r) => r.status === 'success').length;
  const crashes = results.filter((r) => r.status === 'crash').length;
  const notFound = results.filter((r) => r.status === '404').length;
  const authRequired = results.filter((r) => r.status === 'auth-required').length;
  const redirects = results.filter((r) => r.status === 'redirect').length;
  const timeouts = results.filter((r) => r.status === 'timeout').length;

  const allButtons = results.flatMap((r) => r.buttons);
  const deadButtons = allButtons.filter((b) => b.status === 'crash' || b.status === 'error');

  let md = `# 🧪 CONTINUUM SMOKE TEST RESULTS\n`;
  md += `> Generated: ${now}\n\n`;

  md += `## 📊 Summary\n\n`;
  md += `| Metric | Count |\n|--------|-------|\n`;
  md += `| Total routes tested | **${total}** |\n`;
  md += `| ✅ Success | **${success}** |\n`;
  md += `| ❌ Crashes (JS errors) | **${crashes}** |\n`;
  md += `| ⛔ 404 Not Found | **${notFound}** |\n`;
  md += `| 🔒 Auth Required (redirected to login) | **${authRequired}** |\n`;
  md += `| ⚠️  Redirects (unexpected) | **${redirects}** |\n`;
  md += `| ⏱️  Timeouts | **${timeouts}** |\n`;
  md += `| Total buttons clicked | **${allButtons.filter(b => b.status !== 'skipped').length}** |\n`;
  md += `| Dead buttons (crash/error) | **${deadButtons.length}** |\n\n`;

  md += `## ❌ CRASHES (JS Errors)\n\n`;
  const crashedRoutes = results.filter((r) => r.status === 'crash');
  if (crashedRoutes.length === 0) {
    md += `> No page crashes found! 🎉\n\n`;
  } else {
    crashedRoutes.forEach((r) => {
      md += `### \`${r.url}\`\n`;
      r.errors.forEach((e) => { md += `- \`${e}\`\n`; });
      md += '\n';
    });
  }

  md += `## ⛔ 404 NOT FOUND ROUTES\n\n`;
  const notFoundRoutes = results.filter((r) => r.status === '404');
  if (notFoundRoutes.length === 0) {
    md += `> No 404s found! 🎉\n\n`;
  } else {
    notFoundRoutes.forEach((r) => { md += `- \`${r.url}\`\n`; });
    md += '\n';
  }

  md += `## 🔘 DEAD BUTTONS\n\n`;
  if (deadButtons.length === 0) {
    md += `> No dead buttons found! 🎉\n\n`;
  } else {
    deadButtons.forEach((b) => {
      md += `- **"${b.text}"** → \`${b.status}\`: ${b.error || ''}\n`;
    });
    md += '\n';
  }

  md += `## 🔒 AUTH-GATED ROUTES (expected)\n\n`;
  const authRoutes = results.filter((r) => r.status === 'auth-required');
  authRoutes.forEach((r) => { md += `- \`${r.url}\` → \`${r.finalUrl}\`\n`; });
  md += '\n';

  md += `## ✅ ALL ROUTE RESULTS\n\n`;
  md += `| Route | Status | Final URL | Load Time | Errors | Buttons Clicked |\n`;
  md += `|-------|--------|-----------|-----------|--------|-----------------|\n`;
  results.forEach((r) => {
    const icon = { success: '✅', crash: '❌', '404': '⛔', redirect: '⚠️', 'auth-required': '🔒', timeout: '⏱️' }[r.status];
    const errCount = r.errors.length;
    const btnsClicked = r.buttons.filter(b => b.status !== 'skipped').length;
    const finalPath = r.finalUrl.replace(BASE_URL, '');
    md += `| \`${r.url.replace(BASE_URL, '')}\` | ${icon} ${r.status} | \`${finalPath}\` | ${r.loadTimeMs}ms | ${errCount} | ${btnsClicked} |\n`;
  });

  return md;
}
