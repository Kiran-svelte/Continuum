import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('MAILFIX-20260702 password reset mail delivery', () => {
  it('creates the missing password reset token table via migration', () => {
    const migrationPath = 'prisma/migrations/20260702162000_password_reset_token/migration.sql';
    assert.ok(existsSync(resolve(process.cwd(), migrationPath)), 'password reset migration should exist');

    const migration = read(migrationPath);
    assert.match(migration, /CREATE TABLE IF NOT EXISTS "PasswordResetToken"/);
    assert.match(migration, /"token_hash" TEXT NOT NULL/);
    assert.match(migration, /"PasswordResetToken_token_hash_key"/);
    assert.match(migration, /"PasswordResetToken_email_idx"/);
  });

  it('sanitizes escaped newline env values before using email providers', () => {
    const emailService = read('lib/email-service.ts');
    assert.match(emailService, /function cleanEnv/);
    assert.match(emailService, /\.replace\(\/\\\\r\/g, ''\)/);
    assert.match(emailService, /\.replace\(\/\\\\n\/g, ''\)/);
    assert.match(emailService, /envValue\('SMTP_USER', 'GMAIL_USER'\)/);
    assert.match(emailService, /envValue\('SMTP_PASS', 'GMAIL_APP_PASSWORD'\)/);
  });

  it('forgot-password still stores a token before sending mail', () => {
    const route = read('app/api/auth/forgot-password/route.ts');
    assert.match(route, /prisma\.passwordResetToken\.create/);
    assert.match(route, /sendPasswordResetEmail\(emailLower, resetUrl\)/);
  });
});
