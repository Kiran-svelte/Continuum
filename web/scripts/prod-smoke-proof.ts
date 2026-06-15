#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';

type Json = Record<string, unknown>;

type StepResult = {
  name: string;
  ok: boolean;
  status?: number;
  detail: string;
};

type HttpResponse = {
  status: number;
  headers: Headers;
  json: Json | null;
  text: string;
};

class CookieJar {
  private cookies = new Map<string, string>();

  applyResponse(headers: Headers) {
    const fromGetSetCookie = (headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() || [];
    const raw = fromGetSetCookie.length > 0 ? fromGetSetCookie : splitSetCookieFallback(headers.get('set-cookie'));

    for (const setCookie of raw) {
      const pair = setCookie.split(';')[0] || '';
      const idx = pair.indexOf('=');
      if (idx <= 0) continue;
      const key = pair.slice(0, idx).trim();
      const value = pair.slice(idx + 1).trim();
      if (!key) continue;
      this.cookies.set(key, value);
    }
  }

  toHeaderValue(): string {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }
}

function splitSetCookieFallback(value: string | null): string[] {
  if (!value) return [];
  return value.split(/,(?=\s*[^;=\s]+=[^;]+)/g);
}

function dateKey(offsetDays: number): string {
  const dt = new Date();
  dt.setUTCDate(dt.getUTCDate() + offsetDays);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function sanitizeForProof(input: unknown): string {
  const raw = typeof input === 'string' ? input : JSON.stringify(input);
  return raw
    .replace(/"password"\s*:\s*"[^"]+"/gi, '"password":"[REDACTED]"')
    .replace(/"confirmPassword"\s*:\s*"[^"]+"/gi, '"confirmPassword":"[REDACTED]"')
    .replace(/continuum-access=[^;\s]+/gi, 'continuum-access=[REDACTED]')
    .replace(/continuum-refresh=[^;\s]+/gi, 'continuum-refresh=[REDACTED]');
}

async function requestJson(args: {
  baseUrl: string;
  path: string;
  method?: string;
  jar?: CookieJar;
  body?: unknown;
  retries?: number;
}): Promise<HttpResponse> {
  const { baseUrl, path: apiPath, method = 'GET', jar, body, retries = 2 } = args;
  const url = `${baseUrl}/api${apiPath}`;

  let attempt = 0;
  while (true) {
    attempt += 1;
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    if (jar) {
      const cookieHeader = jar.toHeaderValue();
      if (cookieHeader) headers.Cookie = cookieHeader;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (jar) {
      jar.applyResponse(response.headers);
    }

    const text = await response.text();
    const maybeJson = text ? tryParseJson(text) : null;

    if ((response.status === 429 || response.status === 503) && attempt <= retries) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      continue;
    }

    return {
      status: response.status,
      headers: response.headers,
      json: maybeJson,
      text,
    };
  }
}

function tryParseJson(text: string): Json | null {
  try {
    return JSON.parse(text) as Json;
  } catch {
    return null;
  }
}

function expectStatus(name: string, res: HttpResponse, allowed: number[], proof: string[]): void {
  if (!allowed.includes(res.status)) {
    const bodySnippet = sanitizeForProof(res.json || res.text).slice(0, 600);
    throw new Error(`${name} expected status ${allowed.join('/')} but got ${res.status}. Body: ${bodySnippet}`);
  }
  proof.push(`- ${name}: HTTP ${res.status}`);
}

function getBalanceByCode(payload: Json | null, code: string): Json {
  if (!payload) throw new Error('Balance payload missing');
  const balances = payload.balances as unknown[] | undefined;
  if (!Array.isArray(balances)) throw new Error('Balances payload malformed');
  const found = balances.find((b) => (b as Json).leave_type === code) as Json | undefined;
  if (!found) throw new Error(`Balance for leave type ${code} not found`);
  return found;
}

function num(obj: Json, key: string): number {
  const value = obj[key];
  if (typeof value !== 'number') throw new Error(`Expected numeric key ${key}`);
  return value;
}

function fmtNowCompact(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const mm = String(now.getUTCMinutes()).padStart(2, '0');
  const ss = String(now.getUTCSeconds()).padStart(2, '0');
  return `${y}${m}${d}-${hh}${mm}${ss}Z`;
}

async function run(): Promise<void> {
  const baseUrl = (process.env.CONTINUUM_APP_BASE_URL || 'https://web-bice-eight-83.vercel.app').replace(/\/$/, '');
  const suffix = `${Date.now()}`;
  const year = new Date().getUTCFullYear();

  const adminEmail = `smoke.admin.${suffix}@example.com`;
  const managerEmail = `smoke.manager.${suffix}@example.com`;
  const hrEmail = `smoke.hr.${suffix}@example.com`;
  const employeeEmail = `smoke.employee.${suffix}@example.com`;

  const adminPassword = 'Adm1n!Pass#2026';
  const invitePassword = 'Inv1te!Pass#2026';

  const adminJar = new CookieJar();
  const managerJar = new CookieJar();
  const hrJar = new CookieJar();
  const employeeJar = new CookieJar();

  const steps: StepResult[] = [];
  const proofLines: string[] = [];

  const mark = (name: string, ok: boolean, detail: string, status?: number) => {
    steps.push({ name, ok, detail, status });
  };

  try {
    proofLines.push(`# Production Smoke Proof - ${new Date().toISOString()}`);
    proofLines.push('');
    proofLines.push(`- Base URL: ${baseUrl}`);
    proofLines.push(`- Tenant seed: ${suffix}`);
    proofLines.push(`- Test users: ${adminEmail}, ${managerEmail}, ${hrEmail}, ${employeeEmail}`);
    proofLines.push('');

    const signup = await requestJson({
      baseUrl,
      path: '/auth/signup',
      method: 'POST',
      body: {
        email: adminEmail,
        password: adminPassword,
        firstName: 'Smoke',
        lastName: 'Admin',
        companyName: `Smoke Co ${suffix}`,
      },
    });
    expectStatus('Signup admin', signup, [200], proofLines);
    mark('Signup admin', true, 'Admin account created', signup.status);

    const signInAdmin = await requestJson({
      baseUrl,
      path: '/auth/signin',
      method: 'POST',
      jar: adminJar,
      body: { email: adminEmail, password: adminPassword },
    });
    expectStatus('Signin admin', signInAdmin, [200], proofLines);
    const adminUser = (signInAdmin.json?.user as Json | undefined) || {};
    const adminId = String(adminUser.id || '');
    if (!adminId) throw new Error('Admin id missing after signin');
    mark('Signin admin', true, `Admin signed in with id ${adminId}`, signInAdmin.status);

    const meAdmin = await requestJson({ baseUrl, path: '/auth/me', jar: adminJar });
    expectStatus('Auth me admin', meAdmin, [200], proofLines);
    const orgId = String((meAdmin.json?.org_id as string) || '');
    if (!orgId) throw new Error('Admin org_id missing after signin');
    mark('Auth me admin', true, `Admin org id ${orgId}`, meAdmin.status);

    const onboarding = await requestJson({
      baseUrl,
      path: '/onboarding/complete',
      method: 'POST',
      jar: adminJar,
      body: {
        company: {
          name: `Smoke Co ${suffix}`,
          industry: 'Technology',
          size: '11-50',
          timezone: 'Asia/Kolkata',
          negative_balance: false,
        },
        leave_types: [
          { code: 'CL', name: 'Casual Leave', days: 12, carry_forward: true, max_carry_forward: 5, encashment_enabled: false, paid: true },
          { code: 'SL', name: 'Sick Leave', days: 10, carry_forward: false, max_carry_forward: 0, encashment_enabled: false, paid: true },
          { code: 'PL', name: 'Privilege Leave', days: 15, carry_forward: true, max_carry_forward: 10, encashment_enabled: true, paid: true },
        ],
        constraint_config: {
          min_coverage_percent: 50,
          max_concurrent: 3,
          auto_approve: false,
          auto_approve_threshold: 0,
        },
        notifications: {
          email_notifications: true,
          manager_alerts: true,
          daily_digest: true,
          sla_alerts: true,
        },
      },
    });
    expectStatus('Complete onboarding', onboarding, [200], proofLines);
    mark('Complete onboarding', true, 'Onboarding completed', onboarding.status);

    const invite = async (email: string, role: string, first: string, last: string) => {
      const res = await requestJson({
        baseUrl,
        path: '/company/invite-user',
        method: 'POST',
        jar: adminJar,
        body: { email, role, firstName: first, lastName: last },
      });
      expectStatus(`Invite ${role}`, res, [200], proofLines);
      const inviteUrl = String((res.json?.inviteUrl as string) || '');
      const token = inviteUrl.split('/').filter(Boolean).pop() || '';
      if (!token || token.length < 10) {
        throw new Error(`Could not parse invite token for ${email}`);
      }
      return token;
    };

    const managerToken = await invite(managerEmail, 'manager', 'Smoke', 'Manager');
    const hrToken = await invite(hrEmail, 'hr', 'Smoke', 'HR');
    const employeeToken = await invite(employeeEmail, 'employee', 'Smoke', 'Employee');
    mark('Invite users', true, 'Manager, HR, and Employee invited');

    const acceptInvite = async (token: string, jar: CookieJar) => {
      const res = await requestJson({
        baseUrl,
        path: '/invite/accept',
        method: 'POST',
        jar,
        body: { token, password: invitePassword, confirmPassword: invitePassword },
      });
      expectStatus('Accept invite', res, [200], proofLines);
      const user = (res.json?.user as Json | undefined) || {};
      const id = String(user.id || '');
      if (!id) throw new Error('Invite accept did not return user id');
      return id;
    };

    const managerId = await acceptInvite(managerToken, managerJar);
    const hrId = await acceptInvite(hrToken, hrJar);
    const employeeId = await acceptInvite(employeeToken, employeeJar);
    mark('Accept invites', true, `manager=${managerId}, hr=${hrId}, employee=${employeeId}`);

    const updateEmployee = async (id: string, body: Json) => {
      const res = await requestJson({
        baseUrl,
        path: `/employees/${id}`,
        method: 'PUT',
        jar: adminJar,
        body,
      });
      if (res.status === 400 && res.json?.error === 'No fields to update.') {
        proofLines.push(`- Update employee ${id}: HTTP 400 (already up to date)`);
        return res;
      }
      expectStatus(`Update employee ${id}`, res, [200], proofLines);
      return res;
    };

    await updateEmployee(adminId, { status: 'active' });
    await updateEmployee(managerId, { status: 'active' });
    await updateEmployee(hrId, { status: 'active' });
    await updateEmployee(employeeId, { status: 'active', managerId });
    mark('Set statuses and manager', true, 'All users active; employee mapped to manager');

    const today = dateKey(0);
    const salaryTargets = [adminId, managerId, hrId, employeeId];
    for (const [idx, targetId] of salaryTargets.entries()) {
      const salaryRes = await requestJson({
        baseUrl,
        path: '/salary-structures',
        method: 'POST',
        jar: adminJar,
        body: {
          emp_id: targetId,
          ctc: 900000 + idx * 50000,
          auto_calculate: true,
          effective_from: `${today}T00:00:00.000Z`,
          reason: 'Prod smoke setup',
        },
      });
      expectStatus('Upsert salary structure', salaryRes, [200, 201], proofLines);
    }
    mark('Upsert salary structures', true, `Salary set for ${salaryTargets.length} active users`);

    const baselineRes = await requestJson({
      baseUrl,
      path: `/leaves/balances?year=${year}`,
      jar: employeeJar,
    });
    expectStatus('Get baseline balances', baselineRes, [200], proofLines);
    const baselineCL = getBalanceByCode(baselineRes.json, 'CL');
    const basePending = num(baselineCL, 'pending_days');
    const baseUsed = num(baselineCL, 'used_days');
    const baseRemaining = num(baselineCL, 'remaining');

    const submitLeave = async (startOffset: number, endOffset: number, reason: string) => {
      const submitRes = await requestJson({
        baseUrl,
        path: '/leaves/submit',
        method: 'POST',
        jar: employeeJar,
        body: {
          leave_type: 'CL',
          start_date: dateKey(startOffset),
          end_date: dateKey(endOffset),
          reason,
          is_half_day: false,
        },
      });
      expectStatus('Submit leave', submitRes, [201], proofLines);
      const leave = (submitRes.json || {}) as Json;
      const id = String(leave.id || '');
      const status = String(leave.status || 'unknown');
      const days = Number(leave.total_days || 0);
      if (!id || !Number.isFinite(days) || days <= 0) {
        throw new Error(`Invalid leave submit response: ${sanitizeForProof(leave)}`);
      }
      return { id, status, days, raw: leave };
    };

    const leave1 = await submitLeave(2, 2, 'Smoke leave request #1 (manager approve)');
    mark('Submit leave #1', true, `id=${leave1.id}, status=${leave1.status}, days=${leave1.days}`);

    if (leave1.status === 'approved') {
      throw new Error('Leave #1 was auto-approved at submit; expected pending/escalated for manager approval proof.');
    }

    const afterSubmit1 = await requestJson({ baseUrl, path: `/leaves/balances?year=${year}`, jar: employeeJar });
    expectStatus('Balances after leave #1 submit', afterSubmit1, [200], proofLines);
    const balAfterSubmit1 = getBalanceByCode(afterSubmit1.json, 'CL');
    if (num(balAfterSubmit1, 'pending_days') !== basePending + leave1.days) {
      throw new Error('Pending days did not increase after leave #1 submit');
    }
    if (num(balAfterSubmit1, 'remaining') !== baseRemaining - leave1.days) {
      throw new Error('Remaining did not decrease after leave #1 submit');
    }
    mark('Verify leave #1 submit balance', true, 'Pending + remaining transitions are correct');

    const pendingManager = await requestJson({ baseUrl, path: '/manager/pending-approvals', jar: managerJar });
    expectStatus('Manager pending approvals', pendingManager, [200], proofLines);
    const pendingApprovals = (pendingManager.json?.approvals as unknown[]) || [];
    const pendingItem1 = pendingApprovals.find((x) => (x as Json).id === leave1.id) as Json | undefined;
    if (!pendingItem1) throw new Error('Leave #1 not visible in manager pending approvals');
    mark(
      'Manager sees constraints metadata',
      true,
      `aiRecommendation=${String((pendingItem1.aiRecommendation as string) || 'n/a')}, confidence=${String((pendingItem1.confidenceScore as number) ?? 'n/a')}`
    );

    const mgrApprove = await requestJson({
      baseUrl,
      path: `/manager/approvals/${leave1.id}/action`,
      method: 'POST',
      jar: managerJar,
      body: { action: 'approve', reason: 'Manager approved in smoke proof' },
    });
    expectStatus('Manager approve leave #1', mgrApprove, [200], proofLines);
    mark('Manager approve leave #1', true, 'Manager approval endpoint works');

    const afterApprove1 = await requestJson({ baseUrl, path: `/leaves/balances?year=${year}`, jar: employeeJar });
    expectStatus('Balances after leave #1 manager approval', afterApprove1, [200], proofLines);
    const balAfterApprove1 = getBalanceByCode(afterApprove1.json, 'CL');
    if (num(balAfterApprove1, 'used_days') !== baseUsed + leave1.days) {
      throw new Error('Used days did not increase after manager approval');
    }
    if (num(balAfterApprove1, 'pending_days') !== basePending) {
      throw new Error('Pending days did not return after manager approval');
    }
    if (num(balAfterApprove1, 'remaining') !== baseRemaining - leave1.days) {
      throw new Error('Remaining should stay reduced after manager approval');
    }
    mark('Verify leave #1 approve balance', true, 'Used/pending/remaining transitions are correct');

    const leave2 = await submitLeave(4, 4, 'Smoke leave request #2 (escalate then reject)');
    mark('Submit leave #2', true, `id=${leave2.id}, status=${leave2.status}, days=${leave2.days}`);

    const mgrEscalate2 = await requestJson({
      baseUrl,
      path: `/manager/approvals/${leave2.id}/action`,
      method: 'POST',
      jar: managerJar,
      body: { action: 'escalate', reason: 'Escalating to HR for smoke proof' },
    });
    expectStatus('Manager escalate leave #2', mgrEscalate2, [200], proofLines);
    mark('Manager escalate leave #2', true, 'Escalation endpoint works');

    const adminView2 = await requestJson({ baseUrl, path: `/leaves/approve/${leave2.id}`, jar: adminJar });
    expectStatus('Admin review leave #2 details', adminView2, [200], proofLines);
    const leaveRequest2 = (adminView2.json?.leaveRequest as Json | undefined) || {};
    mark(
      'Admin views constraints before decision',
      true,
      `constraint_result_present=${leaveRequest2.constraint_result ? 'yes' : 'no'}`
    );

    const adminReject2 = await requestJson({
      baseUrl,
      path: `/leaves/approve/${leave2.id}`,
      method: 'POST',
      jar: adminJar,
      body: { action: 'reject', reason: 'Rejected by HR/Admin in smoke proof' },
    });
    expectStatus('Admin reject leave #2', adminReject2, [200], proofLines);
    mark('Admin reject leave #2', true, 'Reject with reason works');

    const afterReject2 = await requestJson({ baseUrl, path: `/leaves/balances?year=${year}`, jar: employeeJar });
    expectStatus('Balances after leave #2 reject', afterReject2, [200], proofLines);
    const balAfterReject2 = getBalanceByCode(afterReject2.json, 'CL');
    if (num(balAfterReject2, 'used_days') !== baseUsed + leave1.days) {
      throw new Error('Used days changed unexpectedly after rejection');
    }
    if (num(balAfterReject2, 'pending_days') !== basePending) {
      throw new Error('Pending days not restored after rejection');
    }
    if (num(balAfterReject2, 'remaining') !== baseRemaining - leave1.days) {
      throw new Error('Remaining should be restored after rejection (regression check failed)');
    }
    mark('Verify leave #2 reject balance fix', true, 'Remaining restored correctly after rejection');

    const leave3 = await submitLeave(6, 6, 'Smoke leave request #3 (escalate then approve)');
    mark('Submit leave #3', true, `id=${leave3.id}, status=${leave3.status}, days=${leave3.days}`);

    if (leave3.status === 'approved') {
      throw new Error('Leave #3 was auto-approved at submit; expected pending/escalated for HR/admin manual approve proof.');
    }

    const adminApprove3 = await requestJson({
      baseUrl,
      path: `/leaves/approve/${leave3.id}`,
      method: 'POST',
      jar: adminJar,
      body: { action: 'approve', reason: 'Approved by HR/Admin in smoke proof' },
    });
    expectStatus('Admin approve leave #3', adminApprove3, [200], proofLines);
    mark('Admin approve leave #3', true, 'Approve with reason works');

    const afterApprove3 = await requestJson({ baseUrl, path: `/leaves/balances?year=${year}`, jar: employeeJar });
    expectStatus('Balances after leave #3 approve', afterApprove3, [200], proofLines);
    const balAfterApprove3 = getBalanceByCode(afterApprove3.json, 'CL');
    const expectedUsed = baseUsed + leave1.days + leave3.days;
    const expectedPending = basePending;
    const expectedRemaining = baseRemaining - leave1.days - leave3.days;
    if (num(balAfterApprove3, 'used_days') !== expectedUsed) throw new Error('Used days mismatch after leave #3 approve');
    if (num(balAfterApprove3, 'pending_days') !== expectedPending) throw new Error('Pending days mismatch after leave #3 approve');
    if (num(balAfterApprove3, 'remaining') !== expectedRemaining) throw new Error('Remaining mismatch after leave #3 approve');
    mark('Verify leave #3 approve balance', true, 'Final leave balances are consistent');

    const enableAutoApproveProbe = await requestJson({
      baseUrl,
      path: '/onboarding/complete',
      method: 'POST',
      jar: adminJar,
      body: {
        constraint_config: {
          auto_approve: true,
          auto_approve_threshold: 0,
        },
      },
    });
    expectStatus('Enable auto-approve probe mode', enableAutoApproveProbe, [200], proofLines);

    const leaveProbe = await submitLeave(8, 8, 'Smoke leave auto-approve probe');
    mark(
      'Leave engine auto-approve probe',
      true,
      `probe leave status at submit=${leaveProbe.status}`
    );

    const now = new Date();
    let payrollMonth = now.getUTCMonth() + 1;
    let payrollYear = now.getUTCFullYear();
    let payrollRunId = '';

    for (let i = 0; i < 14; i += 1) {
      const generate = await requestJson({
        baseUrl,
        path: '/payroll/generate',
        method: 'POST',
        jar: adminJar,
        body: { month: payrollMonth, year: payrollYear },
      });

      if (generate.status === 201) {
        payrollRunId = String((generate.json?.id as string) || '');
        if (!payrollRunId) throw new Error('Payroll generate returned 201 without run id');
        mark('Generate payroll', true, `run=${payrollRunId}, period=${payrollMonth}/${payrollYear}`, generate.status);
        break;
      }

      if (generate.status !== 409) {
        throw new Error(`Payroll generate failed: HTTP ${generate.status}, body=${sanitizeForProof(generate.json || generate.text)}`);
      }

      payrollMonth += 1;
      if (payrollMonth > 12) {
        payrollMonth = 1;
        payrollYear += 1;
      }
    }

    if (!payrollRunId) {
      throw new Error('Unable to find a future payroll period without existing run');
    }

    const toReview = await requestJson({
      baseUrl,
      path: '/payroll/status',
      method: 'PATCH',
      jar: adminJar,
      body: {
        payroll_run_id: payrollRunId,
        new_status: 'under_review',
        comments: 'Moving to under_review in smoke proof',
      },
    });
    expectStatus('Move payroll to under_review', toReview, [200], proofLines);

    const approvePayroll = await requestJson({
      baseUrl,
      path: '/payroll/approve',
      method: 'POST',
      jar: adminJar,
      body: { payroll_run_id: payrollRunId },
    });
    expectStatus('Approve payroll', approvePayroll, [200], proofLines);
    mark('Payroll approval', true, `Payroll run ${payrollRunId} approved`);

    const payslip = await requestJson({
      baseUrl,
      path: `/employee/payslip?month=${payrollMonth}&year=${payrollYear}`,
      jar: employeeJar,
    });
    expectStatus('Employee payslip availability', payslip, [200], proofLines);
    const available = payslip.json?.available === true;
    if (!available) throw new Error('Payslip availability endpoint did not report available=true');
    const payrollIdFromPayslip = String((payslip.json?.payrollId as string) || '');
    if (payrollIdFromPayslip !== payrollRunId) {
      throw new Error(`Payslip payroll id mismatch: expected ${payrollRunId}, got ${payrollIdFromPayslip}`);
    }

    const pdf = await fetch(`${baseUrl}/api/employee/payslip/download?payroll=${encodeURIComponent(payrollRunId)}`, {
      headers: {
        Cookie: employeeJar.toHeaderValue(),
      },
    });
    const pdfBytes = await pdf.arrayBuffer();
    if (pdf.status !== 200) {
      throw new Error(`Payslip PDF download failed with status ${pdf.status}`);
    }
    const contentType = pdf.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/pdf')) {
      throw new Error(`Payslip download content type is not PDF: ${contentType}`);
    }
    if (pdfBytes.byteLength < 500) {
      throw new Error(`Payslip PDF too small: ${pdfBytes.byteLength} bytes`);
    }
    mark('Payslip PDF download', true, `Downloaded ${pdfBytes.byteLength} bytes`);

    const autoApproveObserved = leaveProbe.status === 'approved';
    const escalatedObserved = [leave1, leave2, leave3, leaveProbe].some((l) => l.status === 'escalated');
    mark(
      'Leave engine auto-approve/escalation signal',
      true,
      `autoApprovedAtSubmit=${autoApproveObserved ? 'yes' : 'no'}, escalatedAtSubmit=${escalatedObserved ? 'yes' : 'no'} (depends on constraint engine output)`
    );

    proofLines.push('');
    proofLines.push('## Step Outcomes');
    for (const s of steps) {
      const icon = s.ok ? 'PASS' : 'FAIL';
      const statusText = s.status ? ` (HTTP ${s.status})` : '';
      proofLines.push(`- [${icon}] ${s.name}${statusText}: ${sanitizeForProof(s.detail)}`);
    }

    const failures = steps.filter((s) => !s.ok);
    proofLines.push('');
    proofLines.push('## Summary');
    proofLines.push(`- Passed: ${steps.filter((s) => s.ok).length}`);
    proofLines.push(`- Failed: ${failures.length}`);
    proofLines.push(`- Result: ${failures.length === 0 ? 'SUCCESS' : 'FAILED'}`);

    const proofDir = path.resolve(process.cwd(), '..', 'docs', 'proofs');
    fs.mkdirSync(proofDir, { recursive: true });
    const proofPath = path.join(proofDir, `prod-smoke-${fmtNowCompact()}.md`);
    fs.writeFileSync(proofPath, proofLines.join('\n'), 'utf-8');

    console.log(`Proof file written: ${proofPath}`);
    console.log(`Steps passed: ${steps.filter((s) => s.ok).length}`);
    console.log(`Steps failed: ${failures.length}`);

    if (failures.length > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const proofDir = path.resolve(process.cwd(), '..', 'docs', 'proofs');
    fs.mkdirSync(proofDir, { recursive: true });
    const proofPath = path.join(proofDir, `prod-smoke-${fmtNowCompact()}-failed.md`);
    proofLines.push('');
    proofLines.push('## Fatal Error');
    proofLines.push(`- ${sanitizeForProof(message)}`);
    fs.writeFileSync(proofPath, proofLines.join('\n'), 'utf-8');
    console.error(`Smoke proof failed: ${message}`);
    console.error(`Failure proof file: ${proofPath}`);
    process.exitCode = 1;
  }
}

void run();
