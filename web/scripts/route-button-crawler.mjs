import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const appDir = path.join(root, 'app');
const outputDir = path.join(root, 'test-results');
const baseUrl = process.env.CRAWLER_BASE_URL || 'http://127.0.0.1:3000';
const headless = process.env.HEADLESS !== 'false';
const concurrency = Number.parseInt(process.env.CRAWLER_CONCURRENCY || '4', 10);
const buttonSelector = 'button, [role="button"], input[type="button"], input[type="submit"]';

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', 'test-results'].includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath, out);
    else if (/page\.(tsx|jsx|ts|js)$/.test(entry.name)) out.push(fullPath);
  }
  return out;
}

function sampleSegment(segment) {
  if (segment.startsWith('[[...') && segment.endsWith(']]')) return 'sample';
  if (segment.startsWith('[...') && segment.endsWith(']')) return 'sample';
  if (segment.startsWith('[') && segment.endsWith(']')) {
    const name = segment.slice(1, -1).toLowerCase();
    if (name.includes('token')) return 'sample-token';
    if (name.includes('email')) return 'sample@example.com';
    return 'sample-id';
  }
  return segment;
}

function routeFromPage(file) {
  const rel = path.relative(appDir, file).replace(/\\/g, '/');
  const parts = rel
    .split('/')
    .slice(0, -1)
    .filter(Boolean)
    .filter((part) => !(part.startsWith('(') && part.endsWith(')')))
    .map(sampleSegment);
  return `/${parts.join('/')}`.replace(/\/+$/, '') || '/';
}

function isAuthRedirectUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.pathname === '/sign-in' && (
      parsed.searchParams.get('error') === 'auth_required' ||
      parsed.searchParams.get('reason') === 'module-session-stale' ||
      parsed.searchParams.has('redirect')
    );
  } catch {
    return false;
  }
}

function classify(status, pageErrors, responseErrors, notFoundDetected, finalUrl = '') {
  if (isAuthRedirectUrl(finalUrl)) return 'AUTH_REDIRECT';
  if (status === 404 || notFoundDetected || responseErrors.some((response) => response.status === 404)) return '404';
  if (pageErrors.length > 0) return 'CRASH';
  if (responseErrors.some((response) => response.status >= 500)) return 'CRASH';
  return 'SUCCESS';
}

async function detectNotFound(page) {
  try {
    return await page.evaluate(() => {
      const text = document.body?.innerText?.toLowerCase() || '';
      return text.includes('404') || text.includes('not found') || text.includes('page could not be found');
    });
  } catch {
    return false;
  }
}

async function collectButtons(page) {
  return page.locator(buttonSelector).evaluateAll((elements) =>
    elements.map((element, index) => {
      const htmlElement = element;
      const label =
        htmlElement.getAttribute('aria-label') ||
        htmlElement.getAttribute('title') ||
        htmlElement.innerText ||
        htmlElement.getAttribute('value') ||
        htmlElement.textContent ||
        element.tagName.toLowerCase();
      return {
        index,
        label: label.replace(/\s+/g, ' ').trim().slice(0, 120) || element.tagName.toLowerCase(),
        disabled: Boolean(htmlElement.disabled || htmlElement.getAttribute('aria-disabled') === 'true'),
        visible: Boolean(htmlElement.offsetWidth || htmlElement.offsetHeight || htmlElement.getClientRects().length),
      };
    }),
  );
}

async function openRoute(page, route) {
  const pageErrors = [];
  const responseErrors = [];
  const consoleErrors = [];
  const dialogs = [];

  const onPageError = (error) => pageErrors.push(error.message);
  const onConsole = (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  };
  const onResponse = (response) => {
    const status = response.status();
    if (status >= 400) responseErrors.push({ status, url: response.url() });
  };
  const onDialog = async (dialog) => {
    dialogs.push({ type: dialog.type(), message: dialog.message() });
    await dialog.dismiss().catch(() => {});
  };

  page.on('pageerror', onPageError);
  page.on('console', onConsole);
  page.on('response', onResponse);
  page.on('dialog', onDialog);

  let responseStatus = null;
  let gotoError = null;
  try {
    const response = await page.goto(new URL(route, baseUrl).toString(), {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    });
    responseStatus = response?.status() ?? null;
    await page.waitForLoadState('networkidle', { timeout: 1000 }).catch(() => {});
  } catch (error) {
    gotoError = error instanceof Error ? error.message : String(error);
    pageErrors.push(gotoError);
  }

  const notFoundDetected = await detectNotFound(page);
  const buttons = gotoError ? [] : await collectButtons(page).catch(() => []);
  const finalUrl = page.url();
  const status = classify(responseStatus, pageErrors, responseErrors, notFoundDetected, finalUrl);

  page.off('pageerror', onPageError);
  page.off('console', onConsole);
  page.off('response', onResponse);
  page.off('dialog', onDialog);

  return {
    route,
    url: finalUrl,
    status,
    responseStatus,
    gotoError,
    notFoundDetected,
    pageErrors,
    consoleErrors,
    responseErrors,
    dialogs,
    buttons,
  };
}

async function clickButton(page, route, button) {
  if (button.disabled) return { ...button, result: 'SKIPPED_DISABLED', errors: [], responseErrors: [] };
  if (!button.visible) return { ...button, result: 'SKIPPED_HIDDEN', errors: [], responseErrors: [] };

  const errors = [];
  const responseErrors = [];
  const dialogs = [];

  const onPageError = (error) => errors.push(error.message);
  const onResponse = (response) => {
    const status = response.status();
    if (status >= 400) responseErrors.push({ status, url: response.url() });
  };
  const onDialog = async (dialog) => {
    dialogs.push({ type: dialog.type(), message: dialog.message() });
    await dialog.dismiss().catch(() => {});
  };

  page.on('pageerror', onPageError);
  page.on('response', onResponse);
  page.on('dialog', onDialog);

  let result = 'SUCCESS';
  try {
    await page.goto(new URL(route, baseUrl).toString(), { waitUntil: 'domcontentloaded', timeout: 12000 });
    await page.waitForLoadState('networkidle', { timeout: 1000 }).catch(() => {});
    const locator = page.locator(buttonSelector).nth(button.index);
    await locator.scrollIntoViewIfNeeded({ timeout: 1000 }).catch(() => {});
    await locator.click({ timeout: 2000 });
    await page.waitForLoadState('domcontentloaded', { timeout: 1000 }).catch(() => {});
    await page.waitForTimeout(150);
    const notFoundDetected = await detectNotFound(page);
    result = classify(null, errors, responseErrors, notFoundDetected, page.url());
  } catch (error) {
    result = 'CRASH';
    errors.push(error instanceof Error ? error.message : String(error));
  } finally {
    page.off('pageerror', onPageError);
    page.off('response', onResponse);
    page.off('dialog', onDialog);
  }

  return {
    ...button,
    result,
    errors,
    responseErrors,
    dialogs,
  };
}

function writeJson(results) {
  fs.writeFileSync(path.join(outputDir, 'route-button-crawl.json'), JSON.stringify(results, null, 2));
}

function writeMarkdown(results) {
  const routeSummary = results.routes.reduce((acc, route) => {
    acc[route.status] = (acc[route.status] || 0) + 1;
    return acc;
  }, {});
  const clickSummary = results.clicks.reduce((acc, click) => {
    acc[click.result] = (acc[click.result] || 0) + 1;
    return acc;
  }, {});

  const lines = [
    '# Route Button Crawl Results',
    '',
    `Base URL: ${baseUrl}`,
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Route Summary',
    '',
    ...Object.entries(routeSummary).map(([status, count]) => `- ${status}: ${count}`),
    '',
    '## Button Click Summary',
    '',
    ...Object.entries(clickSummary).map(([status, count]) => `- ${status}: ${count}`),
    '',
    '## Non-Success Routes',
    '',
    ...results.routes
      .filter((route) => route.status !== 'SUCCESS')
      .map((route) => `- ${route.status}: ${route.route} (${route.responseStatus ?? 'no response'})`),
    '',
    '## Non-Success Button Clicks',
    '',
    ...results.clicks
      .filter((click) => !['SUCCESS', 'SKIPPED_DISABLED', 'SKIPPED_HIDDEN'].includes(click.result))
      .map((click) => `- ${click.result}: ${click.route} :: ${click.label}`),
    '',
  ];

  fs.writeFileSync(path.join(outputDir, 'route-button-crawl.md'), `${lines.join('\n')}\n`);
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  const routes = [...new Set(walk(appDir).map(routeFromPage))].sort((a, b) => a.localeCompare(b));
  const browser = await chromium.launch({ headless });
  const routeResults = [];
  const clickResults = [];
  const startedAt = new Date().toISOString();
  let nextRouteIndex = 0;

  const snapshot = () => ({
    baseUrl,
    generatedAt: new Date().toISOString(),
    startedAt,
    routeCount: routes.length,
    routes: routeResults.sort((a, b) => a.route.localeCompare(b.route)),
    clickCount: clickResults.length,
    clicks: clickResults.sort((a, b) => `${a.route}:${a.index}`.localeCompare(`${b.route}:${b.index}`)),
    partial: routeResults.length < routes.length,
  });

  try {
    async function worker(workerId) {
      const page = await browser.newPage();
      try {
        while (nextRouteIndex < routes.length) {
          const route = routes[nextRouteIndex];
          nextRouteIndex += 1;
          const routeResult = await openRoute(page, route);
          routeResults.push(routeResult);

          if (routeResult.status === 'AUTH_REDIRECT') {
            for (const button of routeResult.buttons) {
              clickResults.push({
                route,
                ...button,
                result: 'SKIPPED_AUTH_REDIRECT',
                errors: [],
                responseErrors: [],
                dialogs: [],
              });
            }
          } else {
            for (const button of routeResult.buttons) {
              const clickResult = await clickButton(page, route, button);
              clickResults.push({ route, ...clickResult });
            }
          }

          writeJson(snapshot());
          writeMarkdown(snapshot());
          console.log(`[worker ${workerId}] ${routeResult.status} ${route} (${routeResult.buttons.length} buttons)`);
        }
      } finally {
        await page.close().catch(() => {});
      }
    }

    const workerCount = Math.max(1, Math.min(concurrency, routes.length));
    await Promise.all(Array.from({ length: workerCount }, (_, index) => worker(index + 1)));
  } finally {
    await browser.close();
  }

  const results = { ...snapshot(), partial: false };

  writeJson(results);
  writeMarkdown(results);

  const routeFailures = routeResults.filter((route) => !['SUCCESS', 'AUTH_REDIRECT'].includes(route.status)).length;
  const clickFailures = clickResults.filter((click) => click.result === 'CRASH' || click.result === '404').length;
  console.log(`Routes checked: ${routes.length}`);
  console.log(`Route failures: ${routeFailures}`);
  console.log(`Button clicks checked: ${clickResults.length}`);
  console.log(`Button click failures: ${clickFailures}`);
  console.log(`JSON: ${path.join(outputDir, 'route-button-crawl.json')}`);
  console.log(`Markdown: ${path.join(outputDir, 'route-button-crawl.md')}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
