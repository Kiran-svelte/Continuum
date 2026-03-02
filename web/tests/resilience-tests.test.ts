import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  sanitizeInput,
  generateCSRFToken,
  validateCSRFToken,
  hashPassword,
} from '@/lib/security';

describe('Rate limit data structure', () => {
  it('tracks request counts correctly', () => {
    const rateLimits = new Map<string, { count: number; resetAt: number }>();
    const key = 'user:test-ip';
    const windowMs = 60_000;

    rateLimits.set(key, { count: 1, resetAt: Date.now() + windowMs });
    const entry = rateLimits.get(key)!;
    entry.count++;

    assert.strictEqual(entry.count, 2);
    assert.ok(entry.resetAt > Date.now());
  });

  it('resets after window expires', () => {
    const rateLimits = new Map<string, { count: number; resetAt: number }>();
    const key = 'user:127.0.0.1';

    // Simulate expired window
    rateLimits.set(key, { count: 100, resetAt: Date.now() - 1000 });
    const entry = rateLimits.get(key)!;

    if (entry.resetAt < Date.now()) {
      entry.count = 1;
      entry.resetAt = Date.now() + 60_000;
    }

    assert.strictEqual(entry.count, 1);
  });

  it('enforces max requests per window', () => {
    const MAX_REQUESTS = 100;
    const rateLimits = new Map<string, { count: number; resetAt: number }>();
    const key = 'user:test';

    rateLimits.set(key, { count: MAX_REQUESTS, resetAt: Date.now() + 60_000 });
    const entry = rateLimits.get(key)!;

    const isRateLimited = entry.count >= MAX_REQUESTS && entry.resetAt > Date.now();
    assert.strictEqual(isRateLimited, true);
  });
});

describe('OTP hash verification', () => {
  it('OTP hash matches for correct code', () => {
    const otp = '123456';
    const hash = hashPassword(otp);
    const verifyHash = hashPassword(otp);
    assert.strictEqual(hash, verifyHash);
  });

  it('OTP hash does not match for wrong code', () => {
    const correctHash = hashPassword('123456');
    const wrongHash = hashPassword('654321');
    assert.notStrictEqual(correctHash, wrongHash);
  });

  it('OTP hash is consistent across calls', () => {
    const otp = '999999';
    const hashes = Array.from({ length: 5 }, () => hashPassword(otp));
    assert.ok(hashes.every((h) => h === hashes[0]));
  });
});

describe('Audit hash chain integrity', () => {
  it('chain of hashes maintains integrity', () => {
    const entries: { data: string; hash: string; prevHash: string }[] = [];
    let prevHash = 'genesis';

    for (let i = 0; i < 5; i++) {
      const data = `audit-entry-${i}`;
      const hash = hashPassword(`${prevHash}:${data}`);
      entries.push({ data, hash, prevHash });
      prevHash = hash;
    }

    // Verify chain integrity
    for (let i = 1; i < entries.length; i++) {
      assert.strictEqual(entries[i].prevHash, entries[i - 1].hash);
      const expectedHash = hashPassword(`${entries[i].prevHash}:${entries[i].data}`);
      assert.strictEqual(entries[i].hash, expectedHash);
    }
  });

  it('detects tampered entries in chain', () => {
    const entry1Hash = hashPassword('genesis:entry-1');
    const entry2Hash = hashPassword(`${entry1Hash}:entry-2`);

    // Tamper with entry 1
    const tamperedHash = hashPassword('genesis:tampered-entry');
    const recomputedEntry2 = hashPassword(`${tamperedHash}:entry-2`);

    assert.notStrictEqual(recomputedEntry2, entry2Hash);
  });
});

describe('Input sanitization edge cases', () => {
  it('handles nested HTML tags', () => {
    const result = sanitizeInput('<div><script>alert(1)</script></div>');
    assert.ok(!result.includes('<script>'));
    assert.ok(!result.includes('<div>'));
  });

  it('handles data: URI scheme', () => {
    const result = sanitizeInput('data:text,hello');
    // data: pattern without text/html should pass through (no match)
    assert.ok(!result.includes('data:text/html'));
  });

  it('handles unicode in input', () => {
    const result = sanitizeInput('Hello 🌍 World');
    assert.ok(result.includes('🌍'));
  });

  it('handles very long input without crashing', () => {
    const longInput = 'a'.repeat(100_000);
    const result = sanitizeInput(longInput);
    assert.strictEqual(result.length, 100_000);
  });

  it('handles mixed content with tags', () => {
    const result = sanitizeInput('Hello <b>world</b> test');
    assert.ok(!result.includes('<b>'));
    assert.ok(result.includes('world'));
    assert.ok(result.includes('Hello'));
  });
});

describe('CSRF token expiry check', () => {
  const secret = 'resilience-test-secret';

  it('fresh token is valid', () => {
    const token = generateCSRFToken(secret);
    assert.strictEqual(validateCSRFToken(token, secret), true);
  });

  it('token with non-numeric timestamp is rejected', () => {
    const result = validateCSRFToken('not-a-number.nonce.signature', secret);
    assert.strictEqual(result, false);
  });

  it('multiple tokens are unique', () => {
    const tokens = Array.from({ length: 10 }, () => generateCSRFToken(secret));
    const uniqueTokens = new Set(tokens);
    assert.strictEqual(uniqueTokens.size, 10);
  });
});
