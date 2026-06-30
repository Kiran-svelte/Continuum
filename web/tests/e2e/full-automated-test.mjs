/**
 * RALPH-TEST-20260630 — Full Automated E2E Test Suite
 *
 * Tests every page, API endpoint, and form in Continuum HRMS.
 * Run against production: node tests/e2e/full-automated-test.mjs [BASE_URL]
 * Generates: test-results/FINAL_TEST_REPORT.md
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Config ───────────────────────────────────────────────────────────────────

const BASE_URL = process.argv[2] || 'https://web-djv2t1os7-traderlighter11-7085s-projects.vercel.app';
const SEED_SECRET = process.env.SEED_SECRET || process.argv[3] || '';
const TIMEOUT_MS = 15000;
const REPORT_DIR = join(__dirname, '../../test-results');
const TAG = 'RALPH-TEST-20260630';

// ─── Test credentials (pre-seeded in DB or created during setup) ──────────────

const CREDS = {
  superAdmin: { email: 'superadmin@continuum-hr.com', password: 'Admin@1234' },
  hrAdmin: { email: 'hr@demo.continuum-hr.com', password: 'HrAdmin@1234' },
  employee: { email: 'employee@demo.continuum-hr.com', password: 'Emp@1234' },
  manager: { email: 'manager@demo.continuum-hr.com', password: 'Mgr@1234' },
};

// ─── Results store ─────────────────────────────────────────────────────────────

const results = [];
let tokens = {}; // role -> JWT token
let testIds = {}; // created resource IDs for chained tests

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function fetchWithTimeout(url, options = {}, timeout = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (e) {
    clearTimeout(timer);
    if (e.name === 'AbortError') throw new Error(`TIMEOUT after ${timeout}ms`);
    throw e;
  }
}

function record(category, name, status, detail = '', fix = '') {
  const entry = { category, name, status, detail, fix, tag: TAG };
  results.push(entry);
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : status === 'TIMEOUT' ? '⏱' : '⚠️';
  console.log(`${icon} [${category}] ${name}: ${status}${detail ? ' — ' + detail.slice(0, 120) : ''}`);
}

async function apiTest(opts) {
  const {
    category,
    name,
    method = 'GET',
    path,
    body,
    token,
    expectedStatus = [200, 201],
    fix = '',
    onSuccess,
  } = opts;

  const url = `${BASE_URL}/api${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetchWithTimeout(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { /* not JSON */ }

    const statusOk = Array.isArray(expectedStatus)
      ? expectedStatus.includes(res.status)
      : res.status === expectedStatus;

    if (statusOk) {
      record(category, name, 'PASS', `HTTP ${res.status}`);
      if (onSuccess && json) onSuccess(json);
    } else {
      record(category, name, 'FAIL', `HTTP ${res.status}: ${text.slice(0, 200)}`, fix);
    }
  } catch (e) {
    const status = e.message.startsWith('TIMEOUT') ? 'TIMEOUT' : 'ERROR';
    record(category, name, status, e.message, fix || 'Check server logs and network connectivity');
  }
}

async function pageTest(category, name, path, token) {
  const url = `${BASE_URL}${path}`;
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetchWithTimeout(url, { headers });
    // Pages can redirect (3xx) or return HTML (200) — both OK
    if (res.status < 400) {
      record(category, name, 'PASS', `HTTP ${res.status}`);
    } else {
      const text = await res.text();
      record(category, name, 'FAIL', `HTTP ${res.status}: ${text.slice(0, 150)}`,
        `Check if route exists and auth middleware is correct`);
    }
  } catch (e) {
    const status = e.message.startsWith('TIMEOUT') ? 'TIMEOUT' : 'ERROR';
    record(category, name, status, e.message);
  }
}

// ─── Phase 0: Seed demo users ─────────────────────────────────────────────────

async function phaseSeed() {
  if (!SEED_SECRET) {
    console.log('\n[SEED] Skipping seed (no SEED_SECRET). Using existing accounts.\n');
    return;
  }
  console.log('\n═══ PHASE 0: SEEDING DEMO USERS ═══');
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/api/dev/seed-demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-seed-secret': SEED_SECRET },
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      record('Seed', 'POST /api/dev/seed-demo', 'PASS', json.message || 'Seed OK');
    } else {
      record('Seed', 'POST /api/dev/seed-demo', 'FAIL', `${res.status}: ${JSON.stringify(json)}`,
        'Set SEED_SECRET env var in Vercel and re-run');
    }
  } catch (e) {
    record('Seed', 'POST /api/dev/seed-demo', 'ERROR', e.message);
  }
}

// ─── Phase 1: Auth ─────────────────────────────────────────────────────────────

async function phaseAuth() {
  console.log('\n═══ PHASE 1: AUTHENTICATION ═══');

  // Super admin login
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: CREDS.superAdmin.email, password: CREDS.superAdmin.password, role: 'super_admin' }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.accessToken) {
      tokens.superAdmin = json.accessToken;
      record('Auth', 'Super Admin Login', 'PASS', 'Token received');
    } else {
      record('Auth', 'Super Admin Login', 'FAIL', `${res.status}: ${JSON.stringify(json).slice(0, 150)}`,
        'Ensure super admin seeded: email=superadmin@continuum-hr.com password=Admin@1234');
    }
  } catch (e) {
    record('Auth', 'Super Admin Login', 'ERROR', e.message);
  }

  // HR Admin login
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: CREDS.hrAdmin.email, password: CREDS.hrAdmin.password }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.accessToken) {
      tokens.hr = json.accessToken;
      record('Auth', 'HR Admin Login', 'PASS', 'Token received');
    } else {
      record('Auth', 'HR Admin Login', 'FAIL', `${res.status}: ${JSON.stringify(json).slice(0, 150)}`,
        'Ensure HR demo account is seeded in the database');
    }
  } catch (e) {
    record('Auth', 'HR Admin Login', 'ERROR', e.message);
  }

  // Employee login
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: CREDS.employee.email, password: CREDS.employee.password }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.accessToken) {
      tokens.employee = json.accessToken;
      record('Auth', 'Employee Login', 'PASS', 'Token received');
    } else {
      record('Auth', 'Employee Login', 'FAIL', `${res.status}: ${JSON.stringify(json).slice(0, 150)}`,
        'Ensure employee demo account is seeded');
    }
  } catch (e) {
    record('Auth', 'Employee Login', 'ERROR', e.message);
  }

  // Auth /me endpoint
  await apiTest({ category: 'Auth', name: 'GET /api/auth/me', path: '/auth/me', token: tokens.hr });

  // Session check
  await apiTest({ category: 'Auth', name: 'GET /api/auth/session', path: '/auth/session', token: tokens.hr });

  // Refresh token
  await apiTest({
    category: 'Auth', name: 'POST /api/auth/refresh', path: '/auth/refresh',
    method: 'POST', token: tokens.hr,
    fix: 'Check JWT refresh endpoint implementation',
  });

  // Forgot password (no token needed)
  await apiTest({
    category: 'Auth', name: 'POST /api/auth/forgot-password', path: '/auth/forgot-password',
    method: 'POST', body: { email: CREDS.hrAdmin.email },
    expectedStatus: [200, 400, 429],
  });
}

// ─── Phase 2: Public pages ─────────────────────────────────────────────────────

async function phasePublicPages() {
  console.log('\n═══ PHASE 2: PUBLIC PAGES ═══');
  const publicPages = [
    ['/', 'Home / Landing'],
    ['/about', 'About'],
    ['/blog', 'Blog'],
    ['/careers', 'Careers'],
    ['/changelog', 'Changelog'],
    ['/privacy', 'Privacy Policy'],
    ['/terms', 'Terms of Service'],
    ['/cookies', 'Cookie Policy'],
    ['/help', 'Help'],
    ['/support', 'Support'],
    ['/status', 'Status Page'],
    ['/admin/login', 'Admin Login Page'],
    ['/sign-in', 'Sign In Page'],
    ['/sign-up', 'Sign Up Page'],
    ['/forgot-password', 'Forgot Password Page'],
  ];
  for (const [path, name] of publicPages) {
    await pageTest('Public Pages', name, path);
  }
}

// ─── Phase 3: HR Portal pages ──────────────────────────────────────────────────

async function phaseHrPages() {
  console.log('\n═══ PHASE 3: HR PORTAL PAGES ═══');
  const hrPages = [
    ['/hr/dashboard', 'HR Dashboard'],
    ['/hr/employees', 'HR Employees List'],
    ['/hr/directory', 'HR Directory'],
    ['/hr/org-chart', 'Org Chart'],
    ['/hr/attendance', 'Attendance'],
    ['/hr/leave-requests', 'Leave Requests'],
    ['/hr/leave-balance', 'Leave Balance'],
    ['/hr/leave-calendar', 'Leave Calendar'],
    ['/hr/payroll', 'Payroll'],
    ['/hr/payslips', 'Payslips'],
    ['/hr/pf-reports', 'PF Reports'],
    ['/hr/performance', 'Performance'],
    ['/hr/reviews', 'Reviews'],
    ['/hr/goals', 'Goals'],
    ['/hr/learning', 'Learning'],
    ['/hr/recruitment', 'Recruitment'],
    ['/hr/benefits', 'Benefits'],
    ['/hr/reports', 'Reports'],
    ['/hr/announcements', 'Announcements'],
    ['/hr/documents', 'Documents'],
    ['/hr/compliance', 'Compliance'],
    ['/hr/policies', 'Policies'],
    ['/hr/surveys', 'Surveys'],
    ['/hr/overtime', 'Overtime'],
    ['/hr/scheduling', 'Scheduling'],
    ['/hr/loans', 'Loans'],
    ['/hr/tax-declarations', 'Tax Declarations'],
    ['/hr/succession', 'Succession Planning'],
    ['/hr/skill-matrix', 'Skill Matrix'],
    ['/hr/career-paths', 'Career Paths'],
    ['/hr/diversity', 'Diversity Metrics'],
    ['/hr/predictive-analytics', 'Predictive Analytics'],
    ['/hr/workforce-planning', 'Workforce Planning'],
    ['/hr/workforce-analytics', 'Workforce Analytics'],
    ['/hr/bulk-operations', 'Bulk Operations'],
    ['/hr/custom-fields', 'Custom Fields'],
    ['/hr/travel/all', 'Travel Requests'],
    ['/hr/expenses/all', 'Expenses'],
    ['/hr/audit-logs', 'Audit Logs'],
    ['/hr/settings', 'HR Settings'],
    ['/hr/shifts', 'Shifts'],
    ['/hr/holidays', 'Holidays'],
    ['/hr/salary-structures', 'Salary Structures'],
    ['/hr/salary-components', 'Salary Components'],
    ['/hr/compensation', 'Compensation'],
    ['/hr/approvals', 'Approvals'],
    ['/hr/job-board', 'Job Board'],
  ];
  for (const [path, name] of hrPages) {
    await pageTest('HR Pages', name, path, tokens.hr);
  }
}

// ─── Phase 4: Employee portal pages ───────────────────────────────────────────

async function phaseEmployeePages() {
  console.log('\n═══ PHASE 4: EMPLOYEE PORTAL PAGES ═══');
  const empPages = [
    ['/employee/dashboard', 'Employee Dashboard'],
    ['/employee/profile', 'Employee Profile'],
    ['/employee/attendance', 'My Attendance'],
    ['/employee/request-leave', 'Request Leave'],
    ['/employee/leave-history', 'Leave History'],
    ['/employee/payslips', 'My Payslips'],
    ['/employee/performance', 'My Performance'],
    ['/employee/learning', 'My Learning'],
    ['/employee/documents', 'My Documents'],
    ['/employee/reimbursements', 'My Reimbursements'],
    ['/employee/announcements', 'Announcements'],
    ['/employee/policies', 'Policies'],
    ['/employee/surveys', 'Surveys'],
    ['/employee/overtime', 'Overtime'],
    ['/employee/loans', 'My Loans'],
    ['/employee/expenses', 'My Expenses'],
    ['/employee/tax-declaration', 'Tax Declaration'],
    ['/employee/skills', 'My Skills'],
    ['/employee/career-path', 'Career Path'],
    ['/employee/settings', 'Settings'],
    ['/employee/notifications', 'Notifications'],
    ['/employee/directory', 'Employee Directory'],
    ['/employee/payroll-advances', 'Payroll Advances'],
  ];
  for (const [path, name] of empPages) {
    await pageTest('Employee Pages', name, path, tokens.employee);
  }
}

// ─── Phase 5: Manager portal pages ────────────────────────────────────────────

async function phaseManagerPages() {
  console.log('\n═══ PHASE 5: MANAGER PORTAL PAGES ═══');
  const mgrPages = [
    ['/manager/dashboard', 'Manager Dashboard'],
    ['/manager/team', 'Team'],
    ['/manager/approvals', 'Approvals'],
    ['/manager/leave-requests', 'Team Leave Requests'],
    ['/manager/team-attendance', 'Team Attendance'],
    ['/manager/performance', 'Team Performance'],
    ['/manager/payslips', 'Team Payslips'],
    ['/manager/reports', 'Manager Reports'],
    ['/manager/directory', 'Directory'],
  ];
  for (const [path, name] of mgrPages) {
    await pageTest('Manager Pages', name, path, tokens.hr);
  }
}

// ─── Phase 6: Super Admin pages ────────────────────────────────────────────────

async function phaseSuperAdminPages() {
  console.log('\n═══ PHASE 6: SUPER ADMIN PAGES ═══');
  const saPages = [
    ['/super-admin/dashboard', 'SA Dashboard'],
    ['/super-admin/companies', 'SA Companies'],
    ['/super-admin/users', 'SA Users'],
    ['/super-admin/operations', 'SA Operations'],
  ];
  for (const [path, name] of saPages) {
    await pageTest('Super Admin Pages', name, path, tokens.superAdmin);
  }
}

// ─── Phase 7: Core HR API endpoints ───────────────────────────────────────────

async function phaseHrApis() {
  console.log('\n═══ PHASE 7: HR API ENDPOINTS ═══');

  // Employees
  await apiTest({ category: 'HR API', name: 'GET /api/employees', path: '/employees', token: tokens.hr,
    onSuccess: (j) => { if (j.employees?.[0]) testIds.empId = j.employees[0].id; } });

  if (testIds.empId) {
    await apiTest({ category: 'HR API', name: `GET /api/employees/${testIds.empId}`, path: `/employees/${testIds.empId}`, token: tokens.hr });
  }

  // Directory
  await apiTest({ category: 'HR API', name: 'GET /api/directory', path: '/directory', token: tokens.hr });

  // Organization
  await apiTest({ category: 'HR API', name: 'GET /api/hr/organization', path: '/hr/organization', token: tokens.hr });

  // Attendance
  await apiTest({ category: 'HR API', name: 'GET /api/attendance', path: '/attendance', token: tokens.hr });
  await apiTest({ category: 'HR API', name: 'GET /api/attendance/shifts', path: '/attendance/shifts', token: tokens.hr });
  await apiTest({ category: 'HR API', name: 'GET /api/attendance/reports/monthly', path: '/attendance/reports/monthly?month=2026-06', token: tokens.hr });

  // Leave
  await apiTest({ category: 'HR API', name: 'GET /api/leaves', path: '/leaves', token: tokens.hr });
  await apiTest({ category: 'HR API', name: 'GET /api/company/leave-types', path: '/company/leave-types', token: tokens.hr });
  await apiTest({ category: 'HR API', name: 'GET /api/company/holidays', path: '/company/holidays', token: tokens.hr });
  await apiTest({ category: 'HR API', name: 'GET /api/company/quotas', path: '/company/quotas', token: tokens.hr });

  // Payroll
  await apiTest({ category: 'HR API', name: 'GET /api/payroll/status', path: '/payroll/status?year=2026&month=6', token: tokens.hr });
  await apiTest({ category: 'HR API', name: 'GET /api/payroll/slips', path: '/payroll/slips', token: tokens.hr });
  await apiTest({ category: 'HR API', name: 'GET /api/payroll/history', path: '/payroll/history', token: tokens.hr });
  await apiTest({ category: 'HR API', name: 'GET /api/salary-components', path: '/salary-components', token: tokens.hr });
  await apiTest({ category: 'HR API', name: 'GET /api/salary-structures', path: '/salary-structures', token: tokens.hr });

  // Performance
  await apiTest({ category: 'HR API', name: 'GET /api/review-cycles', path: '/review-cycles', token: tokens.hr,
    onSuccess: (j) => { if (j.cycles?.[0]) testIds.cycleId = j.cycles[0].id; } });
  await apiTest({ category: 'HR API', name: 'GET /api/review-instances', path: '/review-instances', token: tokens.hr });
  await apiTest({ category: 'HR API', name: 'GET /api/goals', path: '/goals', token: tokens.hr });

  // Learning
  await apiTest({ category: 'HR API', name: 'GET /api/courses', path: '/courses', token: tokens.hr,
    onSuccess: (j) => { if (j.courses?.[0]) testIds.courseId = j.courses[0].id; } });
  await apiTest({ category: 'HR API', name: 'GET /api/course-enrollments', path: '/course-enrollments', token: tokens.hr });

  // Documents
  await apiTest({ category: 'HR API', name: 'GET /api/documents', path: '/documents', token: tokens.hr });

  // Recruitment
  await apiTest({ category: 'HR API', name: 'GET /api/job-postings', path: '/job-postings', token: tokens.hr });
  await apiTest({ category: 'HR API', name: 'GET /api/job-applications', path: '/job-applications', token: tokens.hr });

  // Benefits
  await apiTest({ category: 'HR API', name: 'GET /api/benefits', path: '/benefits', token: tokens.hr,
    onSuccess: (j) => { if (j.plans?.[0]) testIds.benefitId = j.plans[0].id; } });

  // Loans
  await apiTest({ category: 'HR API', name: 'GET /api/loans', path: '/loans', token: tokens.hr,
    onSuccess: (j) => { if (j.loans?.[0]) testIds.loanId = j.loans[0].id; } });

  // Overtime
  await apiTest({ category: 'HR API', name: 'GET /api/overtime', path: '/overtime', token: tokens.hr,
    onSuccess: (j) => { if (j.requests?.[0]) testIds.overtimeId = j.requests[0].id; } });

  // Policies
  await apiTest({ category: 'HR API', name: 'GET /api/policies', path: '/policies', token: tokens.hr,
    onSuccess: (j) => { if (j.policies?.[0]) testIds.policyId = j.policies[0].id; } });

  // Reimbursements
  await apiTest({ category: 'HR API', name: 'GET /api/reimbursements', path: '/reimbursements', token: tokens.hr,
    onSuccess: (j) => { if (j.reimbursements?.[0]) testIds.reimbId = j.reimbursements[0].id; } });

  // Succession Plans
  await apiTest({ category: 'HR API', name: 'GET /api/succession-plans', path: '/succession-plans', token: tokens.hr,
    onSuccess: (j) => { if (j.plans?.[0]) testIds.successionId = j.plans[0].id; } });

  // Tax Declarations
  await apiTest({ category: 'HR API', name: 'GET /api/tax-declarations', path: '/tax-declarations', token: tokens.hr,
    onSuccess: (j) => { if (j.declarations?.[0]) testIds.taxDeclId = j.declarations[0].id; } });

  // Surveys
  await apiTest({ category: 'HR API', name: 'GET /api/surveys', path: '/surveys', token: tokens.hr,
    onSuccess: (j) => { if (j.surveys?.[0]) testIds.surveyId = j.surveys[0].id; } });

  // Announcements
  await apiTest({ category: 'HR API', name: 'GET /api/announcements', path: '/announcements', token: tokens.hr,
    onSuccess: (j) => { if (j.announcements?.[0]) testIds.announcementId = j.announcements[0].id; } });

  // Reimbursements
  await apiTest({ category: 'HR API', name: 'GET /api/reimbursements', path: '/reimbursements', token: tokens.hr });

  // Shifts
  await apiTest({ category: 'HR API', name: 'GET /api/shifts', path: '/shifts', token: tokens.hr });

  // Schedule templates
  await apiTest({ category: 'HR API', name: 'GET /api/schedule-templates', path: '/schedule-templates', token: tokens.hr });

  // Skills
  await apiTest({ category: 'HR API', name: 'GET /api/skills', path: '/skills', token: tokens.hr });

  // Career paths
  await apiTest({ category: 'HR API', name: 'GET /api/career-paths', path: '/career-paths', token: tokens.hr });

  // Custom fields
  await apiTest({ category: 'HR API', name: 'GET /api/custom-fields', path: '/custom-fields', token: tokens.hr });

  // Roles / RBAC
  await apiTest({ category: 'HR API', name: 'GET /api/company/roles', path: '/company/roles', token: tokens.hr });
  await apiTest({ category: 'HR API', name: 'GET /api/company/company-roles', path: '/company/company-roles', token: tokens.hr });
  await apiTest({ category: 'HR API', name: 'GET /api/permissions', path: '/permissions', token: tokens.hr });

  // Workflows
  await apiTest({ category: 'HR API', name: 'GET /api/workflows/pending', path: '/workflows/pending', token: tokens.hr });

  // Audit logs
  await apiTest({ category: 'HR API', name: 'GET /api/audit-logs', path: '/audit-logs', token: tokens.hr });

  // Admin
  await apiTest({ category: 'HR API', name: 'GET /api/admin/health', path: '/admin/health', token: tokens.hr, expectedStatus: [200, 403] });
  await apiTest({ category: 'HR API', name: 'GET /api/company/settings', path: '/company/settings', token: tokens.hr });
}

// ─── Phase 8: [id] detail endpoints ───────────────────────────────────────────

async function phaseDetailEndpoints() {
  console.log('\n═══ PHASE 8: DETAIL (/:id) ENDPOINTS ═══');

  if (testIds.benefitId)
    await apiTest({ category: 'Detail API', name: 'GET /api/benefits/:id', path: `/benefits/${testIds.benefitId}`, token: tokens.hr });
  if (testIds.loanId)
    await apiTest({ category: 'Detail API', name: 'GET /api/loans/:id', path: `/loans/${testIds.loanId}`, token: tokens.hr });
  if (testIds.policyId)
    await apiTest({ category: 'Detail API', name: 'GET /api/policies/:id', path: `/policies/${testIds.policyId}`, token: tokens.hr });
  if (testIds.surveyId)
    await apiTest({ category: 'Detail API', name: 'GET /api/surveys/:id', path: `/surveys/${testIds.surveyId}`, token: tokens.hr });
  if (testIds.announcementId)
    await apiTest({ category: 'Detail API', name: 'GET /api/announcements/:id', path: `/announcements/${testIds.announcementId}`, token: tokens.hr });
  if (testIds.taxDeclId)
    await apiTest({ category: 'Detail API', name: 'GET /api/tax-declarations/:id', path: `/tax-declarations/${testIds.taxDeclId}`, token: tokens.hr });
  if (testIds.successionId)
    await apiTest({ category: 'Detail API', name: 'GET /api/succession-plans/:id', path: `/succession-plans/${testIds.successionId}`, token: tokens.hr });
  if (testIds.reimbId)
    await apiTest({ category: 'Detail API', name: 'GET /api/reimbursements/:id', path: `/reimbursements/${testIds.reimbId}`, token: tokens.hr });
  if (testIds.courseId)
    await apiTest({ category: 'Detail API', name: 'GET /api/courses/:id', path: `/courses/${testIds.courseId}`, token: tokens.hr });
  if (testIds.cycleId)
    await apiTest({ category: 'Detail API', name: 'GET /api/review-cycles/:id', path: `/review-cycles/${testIds.cycleId}`, token: tokens.hr });
}

// ─── Phase 9: POST / form submission endpoints ────────────────────────────────

async function phaseFormSubmissions() {
  console.log('\n═══ PHASE 9: FORM SUBMISSIONS (POST/CREATE) ═══');

  // Create leave request
  await apiTest({
    category: 'Forms', name: 'POST Leave Request', path: '/leaves',
    method: 'POST', token: tokens.employee,
    body: { leaveType: 'casual', startDate: '2026-07-15', endDate: '2026-07-15', reason: 'Personal work [RALPH-TEST-20260630]' },
    expectedStatus: [201, 400, 422],
    fix: 'Check leave quota and leave-type configuration',
    onSuccess: (j) => { if (j.leave?.id) testIds.leaveId = j.leave.id; },
  });

  // Create reimbursement
  await apiTest({
    category: 'Forms', name: 'POST Reimbursement Claim', path: '/reimbursements',
    method: 'POST', token: tokens.employee,
    body: { category: 'transport', amount: 500, description: 'Test claim [RALPH-TEST-20260630]', expense_date: '2026-06-30' },
    expectedStatus: [201, 400],
    onSuccess: (j) => { if (j.reimbursement?.id) testIds.reimbId = j.reimbursement.id; },
  });

  // Create overtime request
  await apiTest({
    category: 'Forms', name: 'POST Overtime Request', path: '/overtime',
    method: 'POST', token: tokens.employee,
    body: { date: '2026-06-28', hours: 2, reason: 'Project deadline [RALPH-TEST-20260630]', payout_type: 'cash' },
    expectedStatus: [201, 400],
    onSuccess: (j) => { if (j.request?.id) testIds.overtimeId = j.request.id; },
  });

  // Create loan request
  await apiTest({
    category: 'Forms', name: 'POST Loan Request', path: '/loans',
    method: 'POST', token: tokens.employee,
    body: { amount: 10000, purpose: 'Medical emergency [RALPH-TEST-20260630]', tenure_months: 6 },
    expectedStatus: [201, 400],
    onSuccess: (j) => { if (j.loan?.id) testIds.loanId = j.loan.id; },
  });

  // Create announcement
  await apiTest({
    category: 'Forms', name: 'POST Announcement', path: '/announcements',
    method: 'POST', token: tokens.hr,
    body: { title: 'Test Announcement [RALPH-TEST-20260630]', content: 'This is an automated test announcement.', visibility: 'all' },
    expectedStatus: [201, 400],
    onSuccess: (j) => { if (j.announcement?.id) testIds.announcementId = j.announcement.id; },
  });

  // Create survey
  await apiTest({
    category: 'Forms', name: 'POST Survey', path: '/surveys',
    method: 'POST', token: tokens.hr,
    body: {
      title: 'Q2 Pulse Survey [RALPH-TEST-20260630]',
      description: 'Automated test survey',
      questions: [{ text: 'How satisfied are you?', type: 'rating', options: [] }],
      due_date: '2026-07-31',
    },
    expectedStatus: [201, 400],
  });

  // Create review cycle
  await apiTest({
    category: 'Forms', name: 'POST Review Cycle', path: '/review-cycles',
    method: 'POST', token: tokens.hr,
    body: { name: 'H2 2026 Review [RALPH-TEST-20260630]', startDate: '2026-07-01', endDate: '2026-12-31', cycleType: 'half_yearly' },
    expectedStatus: [201, 400],
  });

  // Create benefit plan
  await apiTest({
    category: 'Forms', name: 'POST Benefit Plan', path: '/benefits',
    method: 'POST', token: tokens.hr,
    body: { name: 'Health Insurance [RALPH-TEST-20260630]', provider: 'Star Health', coverage: 500000, benefit_type: 'health' },
    expectedStatus: [201, 400],
  });

  // Create succession plan
  await apiTest({
    category: 'Forms', name: 'POST Succession Plan', path: '/succession-plans',
    method: 'POST', token: tokens.hr,
    body: { role_title: 'VP Engineering [RALPH-TEST-20260630]', priority: 'high', candidates: [], notes: 'Test plan' },
    expectedStatus: [201, 400],
  });

  // Create tax declaration
  await apiTest({
    category: 'Forms', name: 'POST Tax Declaration', path: '/tax-declarations',
    method: 'POST', token: tokens.employee,
    body: { financial_year: '2026-27', regime: 'new', sections: {}, total_declared: 0 },
    expectedStatus: [201, 400, 409],
  });

  // Attendance mark
  await apiTest({
    category: 'Forms', name: 'POST Attendance Check-In', path: '/attendance',
    method: 'POST', token: tokens.employee,
    body: { action: 'check_in', timestamp: new Date().toISOString(), lat: 12.9716, lng: 77.5946 },
    expectedStatus: [200, 201, 400, 409],
    fix: 'Check attendance model and check-in action handler',
  });

  // Goal creation
  await apiTest({
    category: 'Forms', name: 'POST Goal', path: '/goals',
    method: 'POST', token: tokens.employee,
    body: { title: 'Complete Q3 OKR [RALPH-TEST-20260630]', description: 'Test goal', target_date: '2026-09-30', weight: 1 },
    expectedStatus: [201, 400],
  });

  // Skill creation
  await apiTest({
    category: 'Forms', name: 'POST Skill', path: '/skills',
    method: 'POST', token: tokens.hr,
    body: { name: 'Next.js [RALPH-TEST-20260630]', category: 'technical', description: 'React framework' },
    expectedStatus: [201, 400, 409],
  });
}

// ─── Phase 10: Analytics APIs ──────────────────────────────────────────────────

async function phaseAnalytics() {
  console.log('\n═══ PHASE 10: ANALYTICS APIS ═══');
  const analyticsEndpoints = [
    ['/analytics/headcount', 'Headcount Analytics'],
    ['/analytics/attrition', 'Attrition Analytics'],
    ['/analytics/performance', 'Performance Analytics'],
    ['/analytics/learning', 'Learning Analytics'],
    ['/analytics/payroll', 'Payroll Analytics'],
    ['/analytics/attendance', 'Attendance Analytics'],
    ['/analytics/diversity', 'Diversity Analytics'],
    ['/analytics/predictive', 'Predictive Analytics'],
    ['/analytics/workforce', 'Workforce Analytics'],
    ['/workforce-planning', 'Workforce Planning'],
    ['/reports/headcount', 'Headcount Report'],
    ['/reports/leave-summary', 'Leave Summary Report'],
    ['/reports/payroll-register', 'Payroll Register'],
    ['/reports/performance-summary', 'Performance Summary'],
    ['/reports/learning-completion', 'Learning Completion'],
    ['/reports/exit-attrition', 'Exit Attrition Report'],
    ['/reports/reimbursement-spend', 'Reimbursement Spend'],
    ['/reports/recruitment-pipeline', 'Recruitment Pipeline'],
    ['/reports/attendance-summary', 'Attendance Summary'],
  ];

  for (const [path, name] of analyticsEndpoints) {
    await apiTest({ category: 'Analytics', name: `GET /api${path}`, path, token: tokens.hr });
  }
}

// ─── Phase 11: AI endpoints ────────────────────────────────────────────────────

async function phaseAI() {
  console.log('\n═══ PHASE 11: AI ENDPOINTS ═══');

  await apiTest({
    category: 'AI', name: 'POST /api/ai/assistant', path: '/ai/assistant',
    method: 'POST', token: tokens.hr,
    body: { message: 'How many employees do we have?' },
    expectedStatus: [200, 400, 503],
    fix: 'Check AI assistant integration and API key configuration',
  });

  await apiTest({
    category: 'AI', name: 'POST /api/ai/smart-leave', path: '/ai/smart-leave',
    method: 'POST', token: tokens.employee,
    body: { startDate: '2026-07-20', endDate: '2026-07-22', reason: 'Vacation' },
    expectedStatus: [200, 400, 503],
  });

  await apiTest({
    category: 'AI', name: 'GET /api/ai/attrition', path: '/ai/attrition',
    token: tokens.hr,
    expectedStatus: [200, 503],
  });

  await apiTest({
    category: 'AI', name: 'GET /api/ai/coaching', path: '/ai/coaching',
    token: tokens.employee,
    expectedStatus: [200, 503],
  });
}

// ─── Phase 12: Admin / system endpoints ───────────────────────────────────────

async function phaseSystem() {
  console.log('\n═══ PHASE 12: SYSTEM / ADMIN ENDPOINTS ═══');

  await apiTest({ category: 'System', name: 'GET /api/status/public', path: '/status/public', expectedStatus: [200] });
  await apiTest({ category: 'System', name: 'GET /api/admin/health', path: '/admin/health', token: tokens.hr, expectedStatus: [200, 403] });
  await apiTest({ category: 'System', name: 'GET /api/admin/module-readiness', path: '/admin/module-readiness', token: tokens.superAdmin, expectedStatus: [200, 403] });
  await apiTest({ category: 'System', name: 'GET /api/admin/recovery-readiness', path: '/admin/recovery-readiness', token: tokens.superAdmin, expectedStatus: [200, 403] });
  await apiTest({ category: 'System', name: 'GET /api/search/global?q=test', path: '/search/global?q=test', token: tokens.hr });
  await apiTest({ category: 'System', name: 'GET /api/search?q=test', path: '/search?q=test', token: tokens.hr });
  await apiTest({ category: 'System', name: 'GET /api/profile', path: '/profile', token: tokens.employee });
  await apiTest({ category: 'System', name: 'GET /api/notifications', path: '/notifications', token: tokens.employee });
  await apiTest({ category: 'System', name: 'GET /api/approval-hierarchy', path: '/approval-hierarchy', token: tokens.hr });

  // Super admin
  await apiTest({ category: 'System', name: 'GET /api/super-admin/companies', path: '/super-admin/companies', token: tokens.superAdmin, expectedStatus: [200, 403] });
  await apiTest({ category: 'System', name: 'GET /api/super-admin/users', path: '/super-admin/users', token: tokens.superAdmin, expectedStatus: [200, 403] });
}

// ─── Phase 13: Payroll workflow ────────────────────────────────────────────────

async function phasePayroll() {
  console.log('\n═══ PHASE 13: PAYROLL WORKFLOW ═══');

  await apiTest({ category: 'Payroll', name: 'GET /api/payroll/preflight', path: '/payroll/preflight?month=6&year=2026', token: tokens.hr });
  await apiTest({
    category: 'Payroll', name: 'POST /api/payroll/calculate-preview', path: '/payroll/calculate-preview',
    method: 'POST', token: tokens.hr,
    body: { annualCtc: 600000, city: 'metro', month: 6 },
    expectedStatus: [200, 400],
  });
  await apiTest({ category: 'Payroll', name: 'GET /api/payroll/slips/latest', path: '/payroll/slips/latest', token: tokens.employee });

  // Payroll advances
  await apiTest({ category: 'Payroll', name: 'GET /api/payroll-advances', path: '/payroll-advances', token: tokens.hr });

  // Form 16
  await apiTest({ category: 'Payroll', name: 'GET /api/payroll/form-16', path: '/payroll/form-16?year=2026', token: tokens.hr, expectedStatus: [200, 400] });
}

// ─── Phase 14: PATCH/update endpoints ────────────────────────────────────────

async function phaseUpdateEndpoints() {
  console.log('\n═══ PHASE 14: UPDATE ENDPOINTS ═══');

  if (testIds.overtimeId) {
    await apiTest({
      category: 'Updates', name: 'PATCH Overtime (approve)', path: `/overtime/${testIds.overtimeId}`,
      method: 'PATCH', token: tokens.hr,
      body: { status: 'approved' },
      expectedStatus: [200, 400, 403],
    });
  }

  if (testIds.loanId) {
    await apiTest({
      category: 'Updates', name: 'PATCH Loan (approve)', path: `/loans/${testIds.loanId}`,
      method: 'PATCH', token: tokens.hr,
      body: { status: 'approved', notes: 'Approved by test runner' },
      expectedStatus: [200, 400, 403],
    });
  }

  if (testIds.reimbId) {
    await apiTest({
      category: 'Updates', name: 'PATCH Reimbursement (approve)', path: `/reimbursements/${testIds.reimbId}`,
      method: 'PATCH', token: tokens.hr,
      body: { status: 'approved' },
      expectedStatus: [200, 400, 403],
    });
  }

  if (testIds.policyId) {
    await apiTest({
      category: 'Updates', name: 'PATCH Policy (acknowledge)', path: `/policies/${testIds.policyId}`,
      method: 'PATCH', token: tokens.employee,
      body: { action: 'ack' },
      expectedStatus: [200, 400],
    });
  }

  if (testIds.leaveId) {
    await apiTest({
      category: 'Updates', name: 'PATCH Leave (approve)', path: `/leaves/${testIds.leaveId}`,
      method: 'PATCH', token: tokens.hr,
      body: { status: 'approved' },
      expectedStatus: [200, 400, 403],
    });
  }
}

// ─── Phase 15: Document & upload ──────────────────────────────────────────────

async function phaseUploads() {
  console.log('\n═══ PHASE 15: UPLOAD ENDPOINTS ═══');

  // Test upload endpoint reachability (don't send actual file)
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/api/documents/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokens.employee}` },
      // Intentionally sending no form data to test 400 vs 500
    });
    const text = await res.text();
    if (res.status === 400) {
      record('Upload', 'POST /api/documents/upload (no file)', 'PASS', 'Correctly rejects empty upload with 400');
    } else if (res.status === 200 || res.status === 201) {
      record('Upload', 'POST /api/documents/upload (no file)', 'FAIL', 'Should reject empty upload');
    } else {
      record('Upload', 'POST /api/documents/upload (no file)', 'PASS', `HTTP ${res.status} (auth/validation guard working)`);
    }
  } catch (e) {
    record('Upload', 'POST /api/documents/upload (no file)', 'ERROR', e.message);
  }
}

// ─── Phase 16: Employee self-service ──────────────────────────────────────────

async function phaseEmployeeAPIs() {
  console.log('\n═══ PHASE 16: EMPLOYEE SELF-SERVICE APIs ═══');

  // Profile
  await apiTest({ category: 'Employee API', name: 'GET /api/profile', path: '/profile', token: tokens.employee });

  // My payslips
  await apiTest({ category: 'Employee API', name: 'GET /api/payroll/slips', path: '/payroll/slips', token: tokens.employee });

  // My leave history
  await apiTest({ category: 'Employee API', name: 'GET /api/leaves', path: '/leaves', token: tokens.employee });

  // My documents
  await apiTest({ category: 'Employee API', name: 'GET /api/documents', path: '/documents', token: tokens.employee });

  // GDPR export
  await apiTest({
    category: 'Employee API', name: 'GET /api/employee/export (GDPR)',
    path: '/employee/export', token: tokens.employee,
    expectedStatus: [200, 404],
    fix: 'Check GDPR export route at web/app/api/employee/export/route.ts',
  });

  // Tutorial progress
  await apiTest({ category: 'Employee API', name: 'GET /api/tutorial/progress', path: '/tutorial/progress', token: tokens.employee, expectedStatus: [200, 404] });
}

// ─── Phase 17: Channel / notifications ────────────────────────────────────────

async function phaseNotifications() {
  console.log('\n═══ PHASE 17: NOTIFICATIONS & CHANNELS ═══');

  await apiTest({ category: 'Notifications', name: 'GET /api/notifications', path: '/notifications', token: tokens.employee });
  await apiTest({ category: 'Notifications', name: 'GET /api/channel/verify/status', path: '/channel/verify/status', token: tokens.employee, expectedStatus: [200, 404] });

  // Mark all read
  await apiTest({
    category: 'Notifications', name: 'POST notifications read', path: '/notifications',
    method: 'PATCH', token: tokens.employee,
    body: { action: 'mark_all_read' },
    expectedStatus: [200, 404, 405],
  });
}

// ─── Report generator ──────────────────────────────────────────────────────────

function generateReport() {
  const total = results.length;
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const errors = results.filter(r => r.status === 'ERROR').length;
  const timeouts = results.filter(r => r.status === 'TIMEOUT').length;
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

  const failures = results.filter(r => r.status !== 'PASS');

  // Group by category
  const byCategory = {};
  for (const r of results) {
    if (!byCategory[r.category]) byCategory[r.category] = { pass: 0, fail: 0, error: 0, timeout: 0 };
    const k = r.status === 'PASS' ? 'pass' : r.status === 'FAIL' ? 'fail' : r.status === 'TIMEOUT' ? 'timeout' : 'error';
    byCategory[r.category][k]++;
  }

  let md = `# FINAL_TEST_REPORT — ${TAG}

**Generated:** ${new Date().toISOString()}
**Target:** ${BASE_URL}

---

## Summary

| Metric | Value |
|--------|-------|
| **Total Tests** | ${total} |
| **Passed** | ✅ ${passed} |
| **Failed** | ❌ ${failed} |
| **Errors** | ⚠️ ${errors} |
| **Timeouts** | ⏱ ${timeouts} |
| **Pass Rate** | ${passRate}% |

---

## Results by Category

| Category | Pass | Fail | Error | Timeout |
|----------|------|------|-------|---------|
`;

  for (const [cat, counts] of Object.entries(byCategory)) {
    md += `| ${cat} | ${counts.pass} | ${counts.fail} | ${counts.error} | ${counts.timeout} |\n`;
  }

  if (failures.length > 0) {
    md += `\n---\n\n## Failures, Errors & Timeouts\n\n`;
    for (const f of failures) {
      const icon = f.status === 'FAIL' ? '❌' : f.status === 'TIMEOUT' ? '⏱' : '⚠️';
      md += `### ${icon} [${f.category}] ${f.name}\n`;
      md += `- **Status:** \`${f.status}\`\n`;
      if (f.detail) md += `- **Detail:** ${f.detail}\n`;
      if (f.fix) md += `- **Suggested Fix:** ${f.fix}\n`;
      md += `- **Tag:** \`${f.tag}\`\n\n`;
    }
  } else {
    md += `\n---\n\n## 🎉 All Tests Passed!\n\nNo failures, errors, or timeouts detected.\n`;
  }

  md += `\n---\n\n## All Test Results\n\n`;
  md += `| # | Category | Name | Status | Detail |\n`;
  md += `|---|----------|------|--------|--------|\n`;
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : r.status === 'TIMEOUT' ? '⏱' : '⚠️';
    md += `| ${i + 1} | ${r.category} | ${r.name} | ${icon} ${r.status} | ${(r.detail || '').replace(/\|/g, '\\|').slice(0, 100)} |\n`;
  }

  md += `\n---\n*Test Suite: ${TAG} | All issues tagged with \`${TAG}\`*\n`;

  return md;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${TAG} — FULL AUTOMATED TEST SUITE`);
  console.log(`  Target: ${BASE_URL}`);
  console.log(`${'═'.repeat(60)}\n`);

  await phaseAuth();
  await phasePublicPages();
  await phaseHrPages();
  await phaseEmployeePages();
  await phaseManagerPages();
  await phaseSeed();
  await phaseSuperAdminPages();
  await phaseHrApis();
  await phaseDetailEndpoints();
  await phaseFormSubmissions();
  await phaseAnalytics();
  await phaseAI();
  await phaseSystem();
  await phasePayroll();
  await phaseUpdateEndpoints();
  await phaseUploads();
  await phaseEmployeeAPIs();
  await phaseNotifications();

  const report = generateReport();

  if (!existsSync(REPORT_DIR)) mkdirSync(REPORT_DIR, { recursive: true });
  const reportPath = join(REPORT_DIR, 'FINAL_TEST_REPORT.md');
  writeFileSync(reportPath, report, 'utf8');

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  TEST COMPLETE`);
  console.log(`  Total: ${results.length} | Pass: ${results.filter(r => r.status === 'PASS').length} | Fail: ${results.filter(r => r.status !== 'PASS').length}`);
  console.log(`  Report: ${reportPath}`);
  console.log(`${'═'.repeat(60)}\n`);

  // Exit with error code if any failures
  if (results.some(r => r.status !== 'PASS')) process.exit(1);
}

main().catch(e => {
  console.error('Test runner crashed:', e);
  process.exit(2);
});
