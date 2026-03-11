import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireRole } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/backup
 *
 * Exports all company data as a downloadable JSON file.
 * Admin-only. Excludes sensitive auth data (passwords, tokens).
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const rateLimit = checkApiRateLimit(ip, 'export');
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const employee = await getAuthEmployee();
    requireRole(employee, 'admin');

    const companyId = employee.org_id;

    // Fetch all company data in parallel
    const [
      company,
      employees,
      leaveTypes,
      leaveBalances,
      leaveRequests,
      attendances,
      reimbursements,
      documents,
      payrollRuns,
      payrollSlips,
      exitChecklists,
      auditLogs,
      notifications,
    ] = await Promise.all([
      prisma.company.findUnique({
        where: { id: companyId },
        select: {
          id: true, name: true, industry: true, size: true, country_code: true,
          join_code: true, timezone: true, work_start: true, work_end: true,
          work_days: true, grace_period_minutes: true, half_day_hours: true,
          leave_year_start: true, probation_period_days: true, notice_period_days: true,
          sla_hours: true, created_at: true,
        },
      }),
      prisma.employee.findMany({
        where: { org_id: companyId, deleted_at: null },
        select: {
          id: true, email: true, first_name: true, last_name: true, phone: true,
          primary_role: true, secondary_roles: true, department: true, designation: true,
          date_of_joining: true, gender: true, status: true, manager_id: true,
          probation_end_date: true, created_at: true,
          // Exclude: auth_id, bank details, emergency contacts (PII)
        },
      }),
      prisma.leaveType.findMany({
        where: { company_id: companyId },
        select: {
          id: true, code: true, name: true, category: true, default_quota: true,
          carry_forward: true, max_carry_forward: true, encashment_enabled: true,
          paid: true, is_active: true,
        },
      }),
      prisma.leaveBalance.findMany({
        where: { company_id: companyId },
        select: {
          emp_id: true, leave_type: true, year: true, annual_entitlement: true,
          carried_forward: true, used_days: true, pending_days: true, remaining: true,
        },
      }),
      prisma.leaveRequest.findMany({
        where: { company_id: companyId },
        select: {
          id: true, emp_id: true, leave_type: true, start_date: true, end_date: true,
          total_days: true, is_half_day: true, reason: true, status: true,
          approved_by: true, approved_at: true, created_at: true,
        },
      }),
      prisma.attendance.findMany({
        where: { company_id: companyId },
        select: {
          id: true, emp_id: true, date: true, check_in: true, check_out: true,
          status: true, is_wfh: true, total_hours: true,
        },
      }),
      prisma.reimbursement.findMany({
        where: { company_id: companyId },
        select: {
          id: true, emp_id: true, category: true, amount: true, description: true,
          status: true, approved_by: true, created_at: true,
          // Exclude: receipt_url (may contain base64 blobs)
        },
      }),
      prisma.document.findMany({
        where: { company_id: companyId, deleted_at: null },
        select: {
          id: true, emp_id: true, name: true, type: true, status: true,
          verified_by: true, verified_at: true, created_at: true,
          // Exclude: url (storage reference)
        },
      }),
      prisma.payrollRun.findMany({
        where: { company_id: companyId },
        select: {
          id: true, month: true, year: true, status: true,
          total_gross: true, total_deductions: true, total_net: true,
          employee_count: true, created_at: true,
        },
      }),
      prisma.payrollSlip.findMany({
        where: { company_id: companyId },
        select: {
          id: true, emp_id: true, month: true, year: true,
          basic: true, hra: true, gross: true, total_deductions: true, net_pay: true,
          working_days: true, present_days: true, leave_days: true, absent_days: true,
        },
      }),
      prisma.exitChecklist.findMany({
        where: { company_id: companyId },
        select: { id: true, emp_id: true, items: true, status: true, completed_at: true },
      }),
      prisma.auditLog.findMany({
        where: { company_id: companyId },
        orderBy: { created_at: 'desc' },
        take: 5000, // Last 5000 audit entries
        select: {
          id: true, action: true, entity_type: true, entity_id: true,
          ip_address: true, integrity_hash: true, created_at: true,
          // Exclude: previous_state, new_state (may contain PII)
        },
      }),
      prisma.notification.findMany({
        where: { company_id: companyId },
        orderBy: { created_at: 'desc' },
        take: 1000,
        select: {
          id: true, emp_id: true, type: true, title: true, is_read: true, created_at: true,
        },
      }),
    ]);

    const backup = {
      _metadata: {
        version: '1.0',
        exported_at: new Date().toISOString(),
        exported_by: employee.email,
        company_id: companyId,
        company_name: company?.name || 'Unknown',
      },
      company,
      employees,
      leave_types: leaveTypes,
      leave_balances: leaveBalances,
      leave_requests: leaveRequests,
      attendances,
      reimbursements,
      documents,
      payroll_runs: payrollRuns,
      payroll_slips: payrollSlips,
      exit_checklists: exitChecklists,
      audit_logs: auditLogs,
      notifications,
    };

    // Audit the backup export
    void createAuditLog({
      companyId,
      actorId: employee.id,
      action: AUDIT_ACTIONS.DATA_EXPORT,
      entityType: 'Company',
      entityId: companyId,
      ipAddress: ip,
      newState: {
        type: 'full_backup',
        tables: Object.keys(backup).filter((k) => k !== '_metadata').length,
        total_records:
          employees.length + leaveBalances.length + leaveRequests.length +
          attendances.length + reimbursements.length + documents.length +
          payrollRuns.length + payrollSlips.length + auditLogs.length,
      },
    }).catch(() => {});

    const filename = `continuum-backup-${companyId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[Backup] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
