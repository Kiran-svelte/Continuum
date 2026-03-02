import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  sanitizeInput,
  sanitizeObject,
  generateCSRFToken,
  validateCSRFToken,
  hashPassword,
  getSecurityHeaders,
  maskSensitiveData,
} from '@/lib/security';

describe('sanitizeInput', () => {
  it('strips HTML tags', () => {
    const result = sanitizeInput('<b>bold</b>');
    assert.ok(!result.includes('<b>'));
    assert.ok(!result.includes('</b>'));
    assert.ok(result.includes('bold'));
  });

  it('handles <script> XSS pattern', () => {
    const result = sanitizeInput('<script>alert(1)</script>');
    assert.ok(!result.includes('<script>'));
    assert.ok(!result.includes('</script>'));
  });

  it('handles onerror= XSS pattern', () => {
    const result = sanitizeInput('<img onerror="alert(1)" src=x>');
    assert.ok(!result.includes('onerror='));
  });

  it('handles javascript: protocol', () => {
    const result = sanitizeInput('javascript:alert(1)');
    assert.ok(!result.includes('javascript:'));
  });

  it('preserves normal text', () => {
    const result = sanitizeInput('Hello World 123');
    assert.strictEqual(result, 'Hello World 123');
  });

  it('preserves text with no dangerous characters', () => {
    assert.strictEqual(sanitizeInput('simple text'), 'simple text');
  });

  it('handles empty string', () => {
    assert.strictEqual(sanitizeInput(''), '');
  });

  it('removes null bytes', () => {
    const result = sanitizeInput('hello\0world');
    assert.ok(!result.includes('\0'));
  });
});

describe('sanitizeObject', () => {
  it('sanitizes string fields in an object', () => {
    const obj = { name: '<b>test</b>', count: 42 };
    const result = sanitizeObject(obj);
    assert.ok(!result.name.includes('<b>'));
    assert.strictEqual(result.count, 42);
  });

  it('handles nested objects', () => {
    const obj = { data: { value: '<script>alert(1)</script>' } };
    const result = sanitizeObject(obj);
    assert.ok(!(result.data as any).value.includes('<script>'));
  });
});

describe('CSRF token', () => {
  const secret = 'test-secret-key-12345';

  it('generates a token with 3 parts (timestamp.nonce.signature)', () => {
    const token = generateCSRFToken(secret);
    const parts = token.split('.');
    assert.strictEqual(parts.length, 3);
  });

  it('validates a freshly generated token', () => {
    const token = generateCSRFToken(secret);
    assert.strictEqual(validateCSRFToken(token, secret), true);
  });

  it('rejects token with wrong secret', () => {
    const token = generateCSRFToken(secret);
    assert.strictEqual(validateCSRFToken(token, 'wrong-secret'), false);
  });

  it('rejects empty token', () => {
    assert.strictEqual(validateCSRFToken('', secret), false);
  });

  it('rejects malformed token', () => {
    assert.strictEqual(validateCSRFToken('invalid', secret), false);
  });

  it('rejects token with tampered signature', () => {
    const token = generateCSRFToken(secret);
    const parts = token.split('.');
    parts[2] = 'tampered';
    assert.strictEqual(validateCSRFToken(parts.join('.'), secret), false);
  });

  it('rejects expired token (tampered timestamp)', () => {
    const token = generateCSRFToken(secret);
    const parts = token.split('.');
    // Set timestamp to 25 hours ago
    parts[0] = (Date.now() - 25 * 60 * 60 * 1000).toString();
    // This will fail because signature won't match the new timestamp
    assert.strictEqual(validateCSRFToken(parts.join('.'), secret), false);
  });
});

describe('hashPassword', () => {
  it('produces consistent results for same input', () => {
    const hash1 = hashPassword('password123');
    const hash2 = hashPassword('password123');
    assert.strictEqual(hash1, hash2);
  });

  it('produces different results for different inputs', () => {
    const hash1 = hashPassword('password1');
    const hash2 = hashPassword('password2');
    assert.notStrictEqual(hash1, hash2);
  });

  it('returns a hex string of 64 characters (SHA-256)', () => {
    const hash = hashPassword('test');
    assert.strictEqual(hash.length, 64);
    assert.ok(/^[a-f0-9]+$/.test(hash));
  });
});

describe('getSecurityHeaders', () => {
  it('returns all required security headers', () => {
    const headers = getSecurityHeaders();
    const requiredHeaders = [
      'X-Content-Type-Options',
      'X-Frame-Options',
      'X-XSS-Protection',
      'Referrer-Policy',
      'Permissions-Policy',
      'Strict-Transport-Security',
      'Content-Security-Policy',
    ];
    for (const header of requiredHeaders) {
      assert.ok(header in headers, `Missing header: ${header}`);
    }
  });

  it('X-Frame-Options is DENY', () => {
    const headers = getSecurityHeaders();
    assert.strictEqual(headers['X-Frame-Options'], 'DENY');
  });

  it('X-Content-Type-Options is nosniff', () => {
    const headers = getSecurityHeaders();
    assert.strictEqual(headers['X-Content-Type-Options'], 'nosniff');
  });

  it('HSTS includes preload', () => {
    const headers = getSecurityHeaders();
    assert.ok(headers['Strict-Transport-Security'].includes('preload'));
  });
});

describe('maskSensitiveData', () => {
  it('masks email fields', () => {
    const result = maskSensitiveData({ email: 'user@mail.com', name: 'John' }, ['email']);
    assert.ok(result.email.includes('*'));
    assert.ok(result.email.includes('@'));
    assert.strictEqual(result.name, 'John');
  });

  it('masks string fields with partial visibility', () => {
    const result = maskSensitiveData({ phone: '1234567890' }, ['phone']);
    assert.ok(result.phone.includes('*'));
    assert.ok(result.phone.startsWith('12'));
    assert.ok(result.phone.endsWith('90'));
  });
});
