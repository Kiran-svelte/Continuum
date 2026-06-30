import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import {
  buildBackupIntegrityManifest,
  verifyBackupIntegrityManifest,
} from '@/lib/backup-manifest';
import { validateEnv } from '@/lib/env-check';
import { resolveConstraintEngineUrl } from '@/lib/leave-workflow';

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

function withEnv(env: Record<string, string | undefined>, run: () => void) {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(env)) {
    previous.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  try {
    run();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

describe('critical workflow stabilization', () => {
  it('production CSP removes unsafe-eval and wildcard protocol script sources', () => {
    const middleware = read('middleware.ts');
    assert.match(middleware, /isDevelopment \? "'unsafe-eval'" : null/);
    assert.doesNotMatch(middleware, /script-src 'self'[^"`\n]*https:/);
    assert.doesNotMatch(middleware, /script-src 'self'[^"`\n]*http:/);
    assert.match(middleware, /https:\/\/va\.vercel-scripts\.com/);
    assert.match(middleware, /https:\/\/accounts\.google\.com/);
  });

  it('constraint engine URL resolver rejects non-local HTTP in production', () => {
    withEnv(
      {
        NODE_ENV: 'production',
        CONSTRAINT_ENGINE_URL: 'http://constraint.example.com',
        NEXT_PUBLIC_CONSTRAINT_ENGINE_URL: undefined,
      },
      () => {
        assert.equal(resolveConstraintEngineUrl(), null);
      }
    );

    withEnv(
      {
        NODE_ENV: 'production',
        CONSTRAINT_ENGINE_URL: 'https://constraint.example.com',
        NEXT_PUBLIC_CONSTRAINT_ENGINE_URL: undefined,
      },
      () => {
        assert.equal(resolveConstraintEngineUrl(), 'https://constraint.example.com');
      }
    );
  });

  it('environment validation covers critical runtime and operations variables', () => {
    withEnv(
      {
        DATABASE_URL: 'postgresql://example',
        DIRECT_URL: 'postgresql://example-direct',
        JWT_SECRET: 'x'.repeat(64),
        NEXT_PUBLIC_APP_URL: 'https://continuum.support',
        CONSTRAINT_ENGINE_FALLBACK_MODE: 'bad-mode',
        SESSION_TIMEOUT_MINUTES: '2',
      },
      () => {
        const result = validateEnv();
        assert.equal(result.critical.status, 'ok');
        assert.equal(result.warnings.status, 'warning');
        assert.ok(
          result.warnings.suggestions.some((message) =>
            message.includes('CONSTRAINT_ENGINE_FALLBACK_MODE')
          )
        );
        assert.ok(
          result.warnings.suggestions.some((message) =>
            message.includes('SESSION_TIMEOUT_MINUTES')
          )
        );
      }
    );
  });

  it('backup exports include verifiable integrity metadata', () => {
    const backup = {
      _metadata: { version: '1.0' },
      company: { id: 'company_1' },
      employees: [{ id: 'emp_1' }, { id: 'emp_2' }],
      leave_balances: [{ id: 'balance_1' }],
    };

    const manifest = buildBackupIntegrityManifest(backup);
    const sealed = { ...backup, _integrity: manifest };

    assert.equal(manifest.algorithm, 'sha256');
    assert.equal(manifest.table_count, 3);
    assert.equal(manifest.record_count, 4);
    assert.equal(verifyBackupIntegrityManifest(sealed), true);
    assert.equal(
      verifyBackupIntegrityManifest({ ...sealed, employees: [{ id: 'changed' }] }),
      false
    );
  });

  it('leave submit uses shared constraint fallback and optimistic balance guard', () => {
    const submit = read('lib/services/leave-submit.ts');
    const evaluatorIndex = submit.indexOf('evaluateLeaveConstraintsForRequest({');
    const transactionIndex = submit.indexOf('prisma.$transaction');
    const routingIndex = submit.indexOf('const approverRouting = await resolveLeaveApprovers');

    assert.ok(evaluatorIndex > 0, 'submit service should use shared evaluator');
    assert.ok(!submit.includes('constraintEngineBreaker.execute'), 'submit service should not bypass shared evaluator');
    assert.ok(routingIndex > 0 && routingIndex < transactionIndex, 'approver routing must be resolved before transaction');
    assert.ok(submit.includes('updated_at: transactionalBalance.updated_at'));
    assert.ok(submit.includes('Leave balance was modified concurrently; please retry'));
  });

  it('leave balance mutation routes use concurrency helpers or updated_at guards', () => {
    const bulkApprove = read('app/api/leaves/bulk-approve/route.ts');
    const reject = read('app/api/leaves/reject/[requestId]/route.ts');
    const encash = read('app/api/leaves/encash/[id]/route.ts');

    assert.ok(bulkApprove.includes('updateLeaveBalanceWithConcurrencyCheck'));
    assert.ok(reject.includes('updateLeaveBalanceWithConcurrencyCheck'));
    assert.ok(encash.includes('updated_at: balance.updated_at'));
    assert.ok(encash.includes('remaining: { gte: encashment.days }'));
  });
});
