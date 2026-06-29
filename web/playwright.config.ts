import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Continuum smoke tests.
 * Run with:
 *   npx playwright test --reporter=html
 *   npx playwright test --reporter=list      (quick terminal output)
 */
export default defineConfig({
  testDir: './tests',
  // Maximum time a test can run (includes page load + all button clicks)
  timeout: 90_000,
  // Retry flaky tests once
  retries: 1,
  // Run tests in parallel across files but serially within each file
  // (so auth session persists across route tests in same describe block)
  fullyParallel: false,
  workers: 1,

  // Write results to multiple reporters
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-results.json' }],
  ],

  use: {
    // Base URL — override with BASE_URL env var
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    // Record video on failure
    video: 'retain-on-failure',
    // Ignore HTTPS errors for local dev with self-signed certs
    ignoreHTTPSErrors: true,
    // Generous timeout for navigation
    navigationTimeout: 20_000,
    // Action timeout (clicking, typing, etc.)
    actionTimeout: 10_000,
    // Accept cookies/permissions by default
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
