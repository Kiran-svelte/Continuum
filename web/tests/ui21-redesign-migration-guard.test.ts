import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(TEST_DIR, '..');
const APP_DIR = path.join(WEB_ROOT, 'app');

function readWorkspaceFile(relativePathFromTests: string): string {
  const filePath = fileURLToPath(new URL(relativePathFromTests, import.meta.url));
  return fs.readFileSync(filePath, 'utf-8');
}

function listFilesRecursive(rootDir: string, extension: string): string[] {
  const out: string[] = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && fullPath.endsWith(extension)) {
        out.push(fullPath);
      }
    }
  }

  return out;
}

function getPayslipPrintCssLineSet(fileContent: string): Set<number> {
  const lines = fileContent.split('\n');
  const allowed = new Set<number>();

  let inPrintableBlock = false;
  for (let idx = 0; idx < lines.length; idx += 1) {
    const line = lines[idx];
    if (line.includes('const html = `<!DOCTYPE html>')) {
      inPrintableBlock = true;
    }
    if (inPrintableBlock) {
      allowed.add(idx + 1);
    }
    if (inPrintableBlock && line.includes('</body></html>`;')) {
      inPrintableBlock = false;
    }
  }

  return allowed;
}

describe('ui21 redesign: route-level visual scaffolding for key cohorts', () => {
  it('keeps key cohort routes on tokenized interactive surfaces', () => {
    const cohortRoutes = [
      '../components/pages/hr/employees-invite-view.tsx',
      '../components/pages/hr/employees-invite-view.tsx',
      '../components/pages/manager/reimbursements-view.tsx',
      '../components/pages/manager/approvals-view.tsx',
      '../components/pages/employee/request-leave-view.tsx',
      '../components/pages/super-admin/companies-new-view.tsx',
      '../components/pages/super-admin/users-new-view.tsx',
    ];

    const tokenSemanticRegex = /(bg-\[var\(--|border-\[var\(--|text-(?:foreground|muted-foreground|primary))/;
    const interactiveSurfaceRegex = /(<button|<input|<select|<textarea|<Button|<Input|<Textarea)/;

    for (const route of cohortRoutes) {
      const content = readWorkspaceFile(route);

      assert.ok(tokenSemanticRegex.test(content), `${route} should include tokenized semantic styling`);
      assert.ok(
        interactiveSurfaceRegex.test(content),
        `${route} should expose interactive control surfaces for cohort-level regression scaffolding`
      );
    }
  });
});

describe('ui21 redesign: theme switching contract assertions', () => {
  it('preserves root theme synchronization behavior', () => {
    const provider = readWorkspaceFile('../components/theme-provider.tsx');

    assert.ok(provider.includes('localStorage.getItem(storageKey)'), 'theme provider should read persisted theme');
    assert.ok(provider.includes('localStorage.setItem(storageKey, newTheme)'), 'theme provider should persist user theme choice');
    assert.ok(provider.includes("root.classList.remove('light', 'dark')"), 'theme provider should reset root theme classes');
    assert.ok(provider.includes('root.classList.add(resolvedTheme)'), 'theme provider should apply resolved theme class');
    assert.ok(provider.includes('root.style.colorScheme = resolvedTheme'), 'theme provider should sync color-scheme');
  });

  it('preserves explicit theme mode switching affordances', () => {
    const toggle = readWorkspaceFile('../components/theme-toggle.tsx');

    assert.ok(toggle.includes("setTheme('light')"), 'theme toggle should support light mode');
    assert.ok(toggle.includes("setTheme('dark')"), 'theme toggle should support dark mode');
    assert.ok(toggle.includes("setTheme('system')"), 'theme toggle should support system mode');
  });
});

describe('ui21 redesign: hardcoded hex guard in app routes', () => {
  it('fails if route TSX files contain hex color literals outside allowed payslip print CSS', () => {
    const tsxFiles = listFilesRecursive(APP_DIR, '.tsx');
    const hexLiteralRegex = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;

    // Next.js `ImageResponse` (edge runtime, Satori) icon generators are not part of the
    // themed React/CSS render tree — Satori cannot resolve `var(--...)` custom properties at
    // all, so these files structurally require literal color values. Not a migration gap.
    const SATORI_ICON_ROUTES = new Set(['app/icon.tsx', 'app/apple-icon.tsx']);

    const violations: string[] = [];

    for (const absolutePath of tsxFiles) {
      const relativePath = path.relative(WEB_ROOT, absolutePath).replaceAll('\\', '/');
      if (SATORI_ICON_ROUTES.has(relativePath)) {
        continue;
      }
      const content = fs.readFileSync(absolutePath, 'utf-8');
      const lines = content.split('\n');

      const isPayslipRoute = relativePath === 'app/employee/(main)/payslips/page.tsx';
      const allowedPayslipLines = isPayslipRoute ? getPayslipPrintCssLineSet(content) : new Set<number>();

      for (let i = 0; i < lines.length; i += 1) {
        const lineNumber = i + 1;
        const line = lines[i];
        const matches = line.match(hexLiteralRegex);
        if (!matches) {
          continue;
        }

        if (isPayslipRoute && allowedPayslipLines.has(lineNumber)) {
          continue;
        }

        violations.push(`${relativePath}:${lineNumber} -> ${matches.join(', ')}`);
      }
    }

    assert.deepStrictEqual(
      violations,
      [],
      `Found hardcoded hex literals in app routes:\n${violations.join('\n')}`
    );
  });
});

describe('ui21 redesign: migration wave guard for shared primitives', () => {
  it('keeps top-offender routes on shared adapter-backed primitives', () => {
    const migratedRoutes = [
      '../components/pages/onboarding/onboarding-view.tsx',
      '../components/pages/hr/policy-settings-view.tsx',
      '../components/pages/hr/shifts-view.tsx',
      '../components/pages/hr/employees-invite-view.tsx',
      '../components/pages/hr/leave-requests-view.tsx',
      '../app/onboarding/steps/step-1-company.tsx',
      '../components/pages/manager/approvals-view.tsx',
      '../components/pages/hr/employee-movements-view.tsx',
      '../components/pages/hr/salary-components-view.tsx',
      '../components/pages/super-admin/companies-new-view.tsx',
      '../components/pages/admin/company-settings-view.tsx',
      '../components/pages/employee/leave-history-view.tsx',
      '../components/pages/hr/employees-id-view.tsx',
      '../components/pages/onboarding/onboarding-company-view.tsx',
      '../components/pages/hr/employees-invite-view.tsx',
      '../components/pages/manager/people-invite-view.tsx',
      '../components/pages/hr/audit-logs-view.tsx',
      '../components/pages/super-admin/companies-id-settings-view.tsx',
      '../components/pages/hr/organization-view.tsx',
      '../components/pages/super-admin/companies-view.tsx',
      '../components/pages/hr/salary-structures-view.tsx',
      '../components/pages/employee/documents-view.tsx',
      '../components/pages/onboarding/onboarding-invite-team-view.tsx',
      '../components/pages/manager/reports-view.tsx',
      '../components/pages/hr/exit-checklist-view.tsx',
    ];

    for (const route of migratedRoutes) {
      const content = readWorkspaceFile(route);

      assert.ok(
        /<Button\b|<Input\b|<Textarea\b|<Select\b/.test(content),
        `${route} should contain shared adapter-backed primitives`
      );

      const nativeButtons = content.match(/<button\b/g) ?? [];
      const nativeTextareas = content.match(/<textarea\b/g) ?? [];
      const nativeSelects = content.match(/<select\b/g) ?? [];
      const disallowedNativeInputs = (content.match(/<input\b[^>]*>/g) ?? []).filter((inputTag) => {
        const typeMatch = inputTag.match(/type\s*=\s*["']([^"']+)["']/i);
        const inputType = (typeMatch?.[1] ?? 'text').toLowerCase();
        return !['checkbox', 'file', 'hidden'].includes(inputType);
      });

      assert.strictEqual(nativeButtons.length, 0, `${route} should not contain native <button> controls`);
      assert.strictEqual(nativeTextareas.length, 0, `${route} should not contain native <textarea> controls`);
      assert.strictEqual(nativeSelects.length, 0, `${route} should not contain native <select> controls`);
      assert.strictEqual(
        disallowedNativeInputs.length,
        0,
        `${route} should not contain non-checkbox native <input> controls`
      );
    }
  });
});

describe('ui21 redesign: final cleanup wave guard for shared primitives', () => {
  it('prevents native lowercase controls in final-wave critical files with explicit exceptions', () => {
    const finalWaveRoutes = [
      '../app/(auth)/error.tsx',
      '../app/admin/(main)/error.tsx',
      '../app/admin/(main)/system-health/page.tsx',
      '../app/admin/login/page.tsx',
      '../app/employee/(main)/error.tsx',
      '../app/employee/(main)/exit-checklist/page.tsx',
      '../app/employee/(main)/payslips/page.tsx',
      '../app/employee/(main)/reimbursements/page.tsx',
      '../components/pages/employee/request-leave-view.tsx',
      '../app/employee/(main)/settings/page.tsx',
      '../app/hr/(main)/approvals/page.tsx',
      '../components/pages/hr/leave-requests-view.tsx',
      '../components/pages/hr/policy-settings-view.tsx',
      '../app/hr/(main)/reimbursements/page.tsx',
      '../components/pages/hr/salary-components-view.tsx',
      '../app/hr/(main)/settings/page.tsx',
      '../components/pages/hr/shifts-view.tsx',
      '../app/invite/accept/[token]/page.tsx',
      '../components/pages/manager/reimbursements-view.tsx',
      '../app/manager/(main)/settings/page.tsx',
      '../app/manager/(main)/team-attendance/page.tsx',
      '../app/support/page.tsx',
      '../app/super-admin/users/page.tsx',
    ];

    const allowedNativeInputTypesByRoute: Record<string, Set<string>> = {
      '../app/employee/(main)/reimbursements/page.tsx': new Set(['file']),
      '../components/pages/employee/request-leave-view.tsx': new Set(['checkbox']),
      '../app/hr/(main)/approvals/page.tsx': new Set(['checkbox']),
      '../components/pages/hr/leave-requests-view.tsx': new Set(['checkbox']),
      '../components/pages/hr/policy-settings-view.tsx': new Set(['checkbox']),
      '../components/pages/hr/salary-components-view.tsx': new Set(['checkbox']),
      '../app/hr/(main)/settings/page.tsx': new Set(['text', 'range']),
      '../components/pages/hr/shifts-view.tsx': new Set(['checkbox']),
      '../app/invite/accept/[token]/page.tsx': new Set(['password']),
      '../app/super-admin/users/page.tsx': new Set(['hidden']),
    };

    for (const route of finalWaveRoutes) {
      const content = readWorkspaceFile(route);

      const nativeButtons = content.match(/<button\b/g) ?? [];
      const nativeTextareas = content.match(/<textarea\b/g) ?? [];
      const nativeSelects = content.match(/<select\b/g) ?? [];
      const nativeInputs = content.match(/<input\b[^>]*>/g) ?? [];
      const allowedInputTypes = allowedNativeInputTypesByRoute[route] ?? new Set<string>();
      const disallowedNativeInputs = nativeInputs.filter((inputTag) => {
        const typeMatch = inputTag.match(/type\s*=\s*["']([^"']+)["']/i);
        const inputType = (typeMatch?.[1] ?? 'text').toLowerCase();
        return !allowedInputTypes.has(inputType);
      });

      assert.strictEqual(nativeButtons.length, 0, `${route} should not contain native <button> controls`);
      assert.strictEqual(nativeTextareas.length, 0, `${route} should not contain native <textarea> controls`);
      assert.strictEqual(nativeSelects.length, 0, `${route} should not contain native <select> controls`);
      assert.strictEqual(
        disallowedNativeInputs.length,
        0,
        `${route} should not contain disallowed native <input> controls outside explicit route exceptions`
      );
    }
  });
});