/**
 * Report Builder API
 *
 * POST /api/reports/builder — Execute a custom report definition
 * GET  /api/reports/builder/templates — Fetch available templates
 *
 * Supports: headcount, leave, attendance, payroll, performance, recruitment reports.
 * Output: paginated JSON rows + total. CSV export handled client-side or via export-bundle.
 *
 * @module api/reports/builder
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireCompanyContext, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import { assertModule } from '@/lib/core-functions/assert-module';

export const dynamic = 'force-dynamic';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Default page size for report output. */
const DEFAULT_PAGE_SIZE = 50;

/** Maximum allowed page size per rule #47. */
const MAX_PAGE_SIZE = 1000;

/** Supported report types. */
const REPORT_TYPES = [
  'headcount',
  'leave_balance',
  'leave_requests',
  'attendance_summary',
  'payroll_summary',
  'performance_summary',
  'recruitment_funnel',
  'attrition_risk',
  'expense_summary',
  'travel_summary',
] as const;

type ReportType = typeof REPORT_TYPES[number];

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportFilters {
  startDate?: string;
  endDate?: string;
  department?: string;
  status?: string;
  year?: number;
  month?: number;
}

interface ReportDefinition {
  type: ReportType;
  filters?: ReportFilters;
  page?: number;
  pageSize?: number;
}

// ─── GET — Report Templates ───────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'reports.view_all');

    const moduleGuard = await assertModule(employee.org_id!, 'analytics');
    if (moduleGuard) return moduleGuard;

    const templates = REPORT_TYPES.map((type) => ({
      type,
      label: formatLabel(type),
      description: REPORT_DESCRIPTIONS[type],
      supportedFilters: REPORT_FILTERS[type],
    }));

    return NextResponse.json({ templates });
  } catch (error) {
    return handleApiError(error);
  }
}

// ─── POST — Execute Report ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'reports.view_all');

    const moduleGuard = await assertModule(employee.org_id!, 'analytics');
    if (moduleGuard) return moduleGuard;

    const body = await request.json() as ReportDefinition;

    if (!body.type || !REPORT_TYPES.includes(body.type)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: `type must be one of: ${REPORT_TYPES.join(', ')}` } },
        { status: 400 }
      );
    }

    const pageSize = Math.min(body.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const page = Math.max(1, body.page ?? 1);
    const skip = (page - 1) * pageSize;

    const { rows, total } = await executeReport(body.type, employee.org_id, body.filters ?? {}, skip, pageSize);

    return NextResponse.json({
      type: body.type,
      rows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// ─── Report Executors ─────────────────────────────────────────────────────────

async function executeReport(
  type: ReportType,
  companyId: string,
  filters: ReportFilters,
  skip: number,
  take: number
): Promise<{ rows: Record<string, unknown>[]; total: number }> {
  const executors: Record<ReportType, () => Promise<{ rows: Record<string, unknown>[]; total: number }>> = {
    headcount: () => runHeadcountReport(companyId, filters, skip, take),
    leave_balance: () => runLeaveBalanceReport(companyId, filters, skip, take),
    leave_requests: () => runLeaveRequestsReport(companyId, filters, skip, take),
    attendance_summary: () => runAttendanceSummaryReport(companyId, filters, skip, take),
    payroll_summary: () => runPayrollSummaryReport(companyId, filters, skip, take),
    performance_summary: () => runPerformanceSummaryReport(companyId, filters, skip, take),
    recruitment_funnel: () => runRecruitmentFunnelReport(companyId, filters, skip, take),
    attrition_risk: () => runAttritionRiskReport(companyId, filters, skip, take),
    expense_summary: () => runExpenseSummaryReport(companyId, filters, skip, take),
    travel_summary: () => runTravelSummaryReport(companyId, filters, skip, take),
  };

  return executors[type]();
}

async function runHeadcountReport(companyId: string, filters: ReportFilters, skip: number, take: number) {
  const where: Record<string, unknown> = { org_id: companyId, deleted_at: null };
  if (filters.department) where.department = filters.department;
  if (filters.status) where.status = filters.status;

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      select: { id: true, first_name: true, last_name: true, email: true, department: true, primary_role: true, status: true, date_of_joining: true },
      orderBy: { date_of_joining: 'desc' },
      skip,
      take,
    }),
    prisma.employee.count({ where }),
  ]);

  return {
    rows: employees.map((e) => ({ id: e.id, name: `${e.first_name} ${e.last_name}`, email: e.email, department: e.department, role: e.primary_role, status: e.status, joinedAt: e.date_of_joining })),
    total,
  };
}

async function runLeaveBalanceReport(companyId: string, filters: ReportFilters, skip: number, take: number) {
  const year = filters.year ?? new Date().getFullYear();
  const where: Record<string, unknown> = { company_id: companyId, year };
  if (filters.department) where.employee = { department: filters.department };

  const [balances, total] = await Promise.all([
    prisma.leaveBalance.findMany({
      where,
      include: { employee: { select: { first_name: true, last_name: true, department: true } } },
      skip,
      take,
    }),
    prisma.leaveBalance.count({ where }),
  ]);

  return {
    rows: balances.map((b) => ({
      employee: `${b.employee.first_name} ${b.employee.last_name}`,
      department: b.employee.department,
      leaveType: b.leave_type,
      allocated: b.annual_entitlement + b.carried_forward,
      used: b.used_days,
      remaining: b.remaining,
      year: b.year,
    })),
    total,
  };
}

async function runLeaveRequestsReport(companyId: string, filters: ReportFilters, skip: number, take: number) {
  const where: Record<string, unknown> = { company_id: companyId };
  if (filters.status) where.status = filters.status;
  if (filters.startDate) where.start_date = { gte: new Date(filters.startDate) };
  if (filters.endDate) where.end_date = { lte: new Date(filters.endDate) };

  const [leaves, total] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      include: { employee: { select: { first_name: true, last_name: true, department: true } } },
      orderBy: { created_at: 'desc' },
      skip,
      take,
    }),
    prisma.leaveRequest.count({ where }),
  ]);

  return {
    rows: leaves.map((l) => ({
      employee: `${l.employee.first_name} ${l.employee.last_name}`,
      department: l.employee.department,
      leaveType: l.leave_type,
      startDate: l.start_date,
      endDate: l.end_date,
      days: l.total_days,
      status: l.status,
      reason: l.reason,
    })),
    total,
  };
}

async function runAttendanceSummaryReport(companyId: string, filters: ReportFilters, skip: number, take: number) {
  const where: Record<string, unknown> = { company_id: companyId };
  if (filters.startDate) where.date = { gte: new Date(filters.startDate) };
  if (filters.endDate && where.date) (where.date as Record<string, Date>).lte = new Date(filters.endDate);

  const [records, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      include: { employee: { select: { first_name: true, last_name: true, department: true } } },
      orderBy: { date: 'desc' },
      skip,
      take,
    }),
    prisma.attendance.count({ where }),
  ]);

  return {
    rows: records.map((r) => ({
      employee: `${r.employee.first_name} ${r.employee.last_name}`,
      department: r.employee.department,
      date: r.date,
      status: r.status,
      checkIn: r.check_in,
      checkOut: r.check_out,
      hoursWorked: r.total_hours,
    })),
    total,
  };
}

async function runPayrollSummaryReport(companyId: string, filters: ReportFilters, skip: number, take: number) {
  const where: Record<string, unknown> = { company_id: companyId };
  if (filters.year) where.year = filters.year;
  if (filters.month) where.month = filters.month;

  const [runs, total] = await Promise.all([
    prisma.payrollRun.findMany({ where, orderBy: [{ year: 'desc' }, { month: 'desc' }], skip, take }),
    prisma.payrollRun.count({ where }),
  ]);

  return {
    rows: runs.map((r) => ({ period: `${r.year}-${String(r.month).padStart(2, '0')}`, status: r.status, totalGross: r.total_gross, totalNet: r.total_net, employeeCount: r.employee_count })),
    total,
  };
}

async function runPerformanceSummaryReport(companyId: string, filters: ReportFilters, skip: number, take: number) {
  const where: Record<string, unknown> = { company_id: companyId };
  if (filters.status) where.status = filters.status;

  const [instances, total] = await Promise.all([
    prisma.reviewInstance.findMany({
      where,
      include: {
        Reviewee: { select: { first_name: true, last_name: true, department: true } },
        ReviewCycle: { select: { name: true } },
      },
      skip,
      take,
    }),
    prisma.reviewInstance.count({ where }),
  ]);

  return {
    rows: instances.map((i) => ({
      employee: `${i.Reviewee.first_name} ${i.Reviewee.last_name}`,
      department: i.Reviewee.department,
      cycle: i.ReviewCycle.name,
      status: i.status,
      overallRating: i.overall_rating,
      selfRating: i.self_rating,
    })),
    total,
  };
}

async function runRecruitmentFunnelReport(companyId: string, _filters: ReportFilters, skip: number, take: number) {
  const [postings, total] = await Promise.all([
    prisma.jobPosting.findMany({
      where: { company_id: companyId },
      include: { _count: { select: { applications: true } } },
      orderBy: { created_at: 'desc' },
      skip,
      take,
    }),
    prisma.jobPosting.count({ where: { company_id: companyId } }),
  ]);

  return {
    rows: postings.map((p) => ({ title: p.title, department: p.department, status: p.status, applications: p._count.applications, openedAt: p.created_at })),
    total,
  };
}

async function runAttritionRiskReport(companyId: string, _filters: ReportFilters, skip: number, take: number) {
  const employees = await prisma.employee.findMany({
    where: { org_id: companyId, status: 'active', deleted_at: null },
    select: { id: true, first_name: true, last_name: true, department: true, date_of_joining: true },
    orderBy: { date_of_joining: 'asc' },
    skip,
    take,
  });

  const total = await prisma.employee.count({ where: { org_id: companyId, status: 'active', deleted_at: null } });

  return {
    rows: employees.map((e) => {
      const tenureMonths = e.date_of_joining ? Math.floor((Date.now() - new Date(e.date_of_joining).getTime()) / (1000 * 60 * 60 * 24 * 30)) : 0;
      return { id: e.id, name: `${e.first_name} ${e.last_name}`, department: e.department, tenureMonths, joinedAt: e.date_of_joining };
    }),
    total,
  };
}

async function runExpenseSummaryReport(companyId: string, filters: ReportFilters, skip: number, take: number) {
  const where: Record<string, unknown> = { company_id: companyId, deleted_at: null };
  if (filters.status) where.status = filters.status;

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: { Employee: { select: { first_name: true, last_name: true, department: true } } },
      orderBy: { created_at: 'desc' },
      skip,
      take,
    }),
    prisma.expense.count({ where }),
  ]);

  return {
    rows: expenses.map((e) => ({ employee: `${e.Employee.first_name} ${e.Employee.last_name}`, department: e.Employee.department, category: e.category, amount: e.amount, currency: e.currency, status: e.status, date: e.created_at })),
    total,
  };
}

async function runTravelSummaryReport(companyId: string, filters: ReportFilters, skip: number, take: number) {
  const where: Record<string, unknown> = { company_id: companyId, deleted_at: null };
  if (filters.status) where.status = filters.status;

  const [requests, total] = await Promise.all([
    prisma.travelRequest.findMany({
      where,
      include: { Employee: { select: { first_name: true, last_name: true, department: true } } },
      orderBy: { departure_date: 'desc' },
      skip,
      take,
    }),
    prisma.travelRequest.count({ where }),
  ]);

  return {
    rows: requests.map((r) => ({ employee: `${r.Employee.first_name} ${r.Employee.last_name}`, department: r.Employee.department, purpose: r.purpose, destination: r.destination, departure: r.departure_date, return: r.return_date, estimatedCost: r.estimated_cost, currency: r.currency, status: r.status })),
    total,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatLabel(type: ReportType): string {
  return type.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

const REPORT_DESCRIPTIONS: Record<ReportType, string> = {
  headcount: 'Active employee roster with department, role, and status breakdown.',
  leave_balance: 'Remaining leave balances per employee for the selected year.',
  leave_requests: 'All leave requests with status, type, and duration.',
  attendance_summary: 'Daily attendance records with check-in/out times and hours worked.',
  payroll_summary: 'Monthly payroll run totals and status.',
  performance_summary: 'Review instance ratings per employee per cycle.',
  recruitment_funnel: 'Job postings with application counts.',
  attrition_risk: 'Active employees with tenure data for risk assessment.',
  expense_summary: 'Expense claims by employee with amount and approval status.',
  travel_summary: 'Travel requests with destination, cost, and status.',
};

const REPORT_FILTERS: Record<ReportType, string[]> = {
  headcount: ['department', 'status'],
  leave_balance: ['department', 'year'],
  leave_requests: ['status', 'startDate', 'endDate'],
  attendance_summary: ['startDate', 'endDate', 'department'],
  payroll_summary: ['year', 'month'],
  performance_summary: ['status'],
  recruitment_funnel: [],
  attrition_risk: ['department'],
  expense_summary: ['status'],
  travel_summary: ['status', 'startDate', 'endDate'],
};

function handleApiError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: { code: 'AUTH_ERROR', message: error.message } }, { status: error.status });
  }
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
  return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
}
