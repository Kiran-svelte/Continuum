import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...walk(full));
      continue;
    }
    if (stat.isFile() && full.endsWith('.test.ts')) {
      out.push(full);
    }
  }
  return out;
}

const testsRoot = resolve(process.cwd(), 'tests');
const tsxCli = resolve(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');
const PREFLIGHT_MANIFEST = [
  'tests/onboarding-step-contract-sync.test.ts',
  'tests/onboarding-finalize-flag.test.ts',
  'tests/onboarding-gate-matrix.test.ts',
  'tests/module-gating.test.ts',
  'tests/leave-approval-chain-integration.test.ts',
  'tests/invite-lifecycle.test.ts',
  'tests/rbac-role-matrix.test.ts',
  'tests/idempotency-leave.test.ts',
  'tests/channel-executor-headless.test.ts',
  'tests/tenant-isolation.test.ts',
  'tests/channel-verify.test.ts',
  'tests/continuum-assistant-v1-headless.test.ts',
  'tests/continuum-assistant-state.test.ts',
  'tests/continuum-assistant-intents.test.ts',
  'tests/continuum-assistant-actions.test.ts',
  'tests/security-channel.test.ts',
  'tests/zero-ui-web-minimal.test.ts',
];

const selectedTests = process.env.RUN_ALL_NODE_TESTS === '1'
  ? walk(testsRoot)
  : PREFLIGHT_MANIFEST.map((file) => resolve(process.cwd(), file));

const missingTests = selectedTests.filter((file) => !existsSync(file));
if (missingTests.length > 0) {
  console.error(`Missing pre-flight test files: ${JSON.stringify(missingTests)}`);
  process.exit(1);
}

const nodeCompatibleTests = selectedTests.filter((file) => {
  const content = readFileSync(file, 'utf8');
  return !content.includes("from '@playwright/test'");
});

if (nodeCompatibleTests.length === 0) {
  console.error('No node-compatible tests found.');
  process.exit(1);
}

let hasFailures = false;
const failedFiles = [];

for (const testFile of nodeCompatibleTests) {
  const result = spawnSync(
    process.execPath,
    [tsxCli, '--test', testFile],
    { stdio: 'inherit', cwd: process.cwd() }
  );

  if (result.error) {
    console.error(`Failed to execute test file ${testFile}:`, result.error.message);
    hasFailures = true;
    failedFiles.push(testFile);
    continue;
  }

  if ((result.status ?? 1) !== 0) {
    console.error(`Test file failed: ${testFile} (exit ${(result.status ?? 1)})`);
    hasFailures = true;
    failedFiles.push(testFile);
  }
}

if (failedFiles.length > 0) {
  console.log(`NODE_TEST_RUNNER_FAILED_FILES=${JSON.stringify(failedFiles)}`);
} else {
  console.log('NODE_TEST_RUNNER_FAILED_FILES=[]');
}

process.exit(hasFailures ? 1 : 0);
