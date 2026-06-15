import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import test from 'node:test';

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...walk(full));
      continue;
    }
    if (stat.isFile() && full.endsWith('route.ts')) {
      out.push(full);
    }
  }
  return out;
}

test('API 500 responses do not return raw internal message variables', () => {
  const appApiRoot = resolve(process.cwd(), 'app/api');
  const offenders = walk(appApiRoot).filter((file) => {
    const source = readFileSync(file, 'utf8');
    return source.includes('NextResponse.json({ error: message }, { status: 500 })');
  });

  assert.deepEqual(
    offenders.map((file) => relative(process.cwd(), file)),
    [],
    'unexpected 500 handlers should return stable public copy, not raw error.message'
  );
});
