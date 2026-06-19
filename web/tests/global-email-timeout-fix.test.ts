import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizeEnvValue, resolveFirstEnvValue } from '../lib/email-service';

test('email env normalization strips quotes, escaped newlines, raw newlines, and null-like values', () => {
  assert.equal(normalizeEnvValue('\uFEFF" app-pass\\n\\r "'), 'app-pass');
  assert.equal(normalizeEnvValue('line1\nline2'), 'line1line2');
  assert.equal(normalizeEnvValue('undefined'), '');
  assert.equal(normalizeEnvValue('null'), '');
  assert.equal(normalizeEnvValue('  valid-value  '), 'valid-value');
});

test('email env resolver supports app password aliases and prioritizes first populated key', () => {
  const backup = {
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,
    EMAIL_SERVER_PASSWORD: process.env.EMAIL_SERVER_PASSWORD,
    GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD,
  };

  try {
    process.env.SMTP_PASS = '   ';
    process.env.SMTP_PASSWORD = '""';
    process.env.EMAIL_SERVER_PASSWORD = 'undefined';
    process.env.GMAIL_APP_PASSWORD = '  app-password-from-alias  ';

    const resolvedPassword = resolveFirstEnvValue([
      'SMTP_PASS',
      'SMTP_PASSWORD',
      'EMAIL_SERVER_PASSWORD',
      'GMAIL_APP_PASSWORD',
    ]);

    assert.equal(resolvedPassword, 'app-password-from-alias');
  } finally {
    process.env.SMTP_PASS = backup.SMTP_PASS;
    process.env.SMTP_PASSWORD = backup.SMTP_PASSWORD;
    process.env.EMAIL_SERVER_PASSWORD = backup.EMAIL_SERVER_PASSWORD;
    process.env.GMAIL_APP_PASSWORD = backup.GMAIL_APP_PASSWORD;
  }
});

test('company invite route attempts invite email delivery and returns email delivery status fields', () => {
  const routePath = resolve(process.cwd(), 'app/api/company/invite-user/route.ts');
  const source = readFileSync(routePath, 'utf8');

  assert.equal(source.includes("sendInviteEmail("), true);
  assert.equal(source.includes('promiseTimeout('), true);
  assert.equal(source.includes('Invitation email delivery timed out'), true);
  assert.equal(source.includes('email: {'), true);
  assert.equal(source.includes('attempted: true'), true);
  assert.equal(source.includes('sent: inviteEmailSent'), true);
  assert.equal(source.includes('error: inviteEmailError'), true);
  assert.equal(source.includes('warning:'), true);
});

test('super-admin users route wraps invite email send with bounded timeout helper', () => {
  const routePath = resolve(process.cwd(), 'app/api/super-admin/users/route.ts');
  const source = readFileSync(routePath, 'utf8');

  assert.equal(source.includes('promiseTimeout('), true);
  assert.equal(source.includes('sendSuperAdminUserInviteEmail('), true);
  assert.equal(source.includes('Invitation email delivery timed out'), true);
  assert.equal(source.includes('email: {'), true);
});

test('email provider auto-selects resend when RESEND_API_KEY is set', () => {
  const emailPath = resolve(process.cwd(), 'lib/email-service.ts');
  const source = readFileSync(emailPath, 'utf8');

  assert.equal(source.includes('sendViaResend'), true);
  assert.equal(source.includes("resolveFirstEnvValue(['RESEND_API_KEY'])"), true);
  assert.equal(source.includes("return 'resend'"), true);
});

test('role invite/create pages use fetchWithTimeout in submit handlers', () => {
  const pagePaths = [
    'app/super-admin/companies/new/page.tsx',
    'app/super-admin/users/new/page.tsx',
    'app/admin/(main)/people/invite/page.tsx',
    'app/manager/(main)/people/invite/page.tsx',
    'app/hr/(main)/employees/invite/page.tsx',
  ];

  for (const pagePath of pagePaths) {
    const source = readFileSync(resolve(process.cwd(), pagePath), 'utf8');
    assert.equal(source.includes('fetchWithTimeout('), true, `${pagePath} should use fetchWithTimeout`);
  }
});
