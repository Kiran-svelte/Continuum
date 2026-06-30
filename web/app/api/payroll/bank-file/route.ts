import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import {
  getAuthEmployee,
  requireCompanyContext,
  requirePermissionGuard,
  AuthError,
} from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { requireModuleForOrg } from '@/lib/core-functions/guard-handler';

export const dynamic = 'force-dynamic';

const bankFileSchema = z.object({
  payroll_run_id: z.string().uuid(),
  mark_processed: z.boolean().optional().default(false),
});

const EXPORTABLE_STATUSES = new Set(['approved', 'processed', 'paid']);

function csvCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function buildBankCsv(
  rows: Array<{
    employeeId: string;
    employeeName: string;
    email: string;
    bankName: string;
    accountNumber: string;
    ifsc: string;
    amount: number;
    narration: string;
  }>
): string {
  const header = [
    'employee_id',
    'employee_name',
    'email',
    'bank_name',
    'account_number',
    'ifsc_code',
    'amount_inr',
    'narration',
  ];

  return [
    header.map(csvCell).join(','),
    ...rows.map((row) =>
      [
        row.employeeId,
        row.employeeName,
        row.email,
        row.bankName,
        row.accountNumber,
        row.ifsc,
        row.amount.toFixed(2),
        row.narration,
      ].map(csvCell).join(',')
    ),
  ].join('\r\n');
}

export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'payroll.process');
    const moduleGuard = await requireModuleForOrg(employee.org_id, 'payroll');
    if (moduleGuard) return moduleGuard;

    const rateLimit = checkApiRateLimit(employee.id, 'export');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = bankFileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { payroll_run_id: payrollRunId, mark_processed: markProcessed } = parsed.data;
    const payrollRun = await prisma.payrollRun.findUnique({
      where: { id: payrollRunId },
      select: {
        id: true,
        company_id: true,
        month: true,
        year: true,
        status: true,
      },
    });

    if (!payrollRun) {
      return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });
    }

    if (payrollRun.company_id !== employee.org_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!EXPORTABLE_STATUSES.has(payrollRun.status)) {
      return NextResponse.json(
        { error: `Bank file can only be generated for approved, processed, or paid payroll runs. Current status: ${payrollRun.status}` },
        { status: 409 }
      );
    }

    const slips = await prisma.payrollSlip.findMany({
      where: { payroll_run_id: payrollRun.id, company_id: employee.org_id },
      orderBy: { emp_id: 'asc' },
      select: {
        emp_id: true,
        net_pay: true,
        employee: {
          select: {
            email: true,
            first_name: true,
            last_name: true,
            employee_id: true,
            bank_name: true,
            bank_account_number: true,
            ifsc_code: true,
          },
        },
      },
    });

    if (slips.length === 0) {
      return NextResponse.json({ error: 'No payslips found for this payroll run' }, { status: 404 });
    }

    const missingBankDetails = slips
      .filter((slip) => !slip.employee.bank_account_number || !slip.employee.ifsc_code)
      .map((slip) => ({
        emp_id: slip.emp_id,
        email: slip.employee.email,
        missing: [
          !slip.employee.bank_account_number ? 'bank_account_number' : null,
          !slip.employee.ifsc_code ? 'ifsc_code' : null,
        ].filter(Boolean),
      }));

    if (missingBankDetails.length > 0) {
      return NextResponse.json(
        { error: 'Bank file blocked because one or more employees are missing bank details', missingBankDetails },
        { status: 409 }
      );
    }

    if (markProcessed && payrollRun.status === 'approved') {
      const update = await prisma.payrollRun.updateMany({
        where: { id: payrollRun.id, company_id: employee.org_id, status: 'approved' },
        data: { status: 'processed' },
      });
      if (update.count === 0) {
        return NextResponse.json(
          { error: 'Payroll run status changed concurrently; refresh and retry' },
          { status: 409 }
        );
      }
    }

    const narration = `SALARY ${String(payrollRun.month).padStart(2, '0')}/${payrollRun.year}`;
    const csv = buildBankCsv(
      slips.map((slip) => ({
        employeeId: slip.employee.employee_id || slip.emp_id,
        employeeName: `${slip.employee.first_name} ${slip.employee.last_name}`.trim(),
        email: slip.employee.email,
        bankName: slip.employee.bank_name || '',
        accountNumber: slip.employee.bank_account_number || '',
        ifsc: slip.employee.ifsc_code || '',
        amount: slip.net_pay,
        narration,
      }))
    );

    await createAuditLog({
      companyId: employee.org_id,
      actorId: employee.id,
      action: AUDIT_ACTIONS.PAYROLL_PROCESS,
      entityType: 'PayrollRun',
      entityId: payrollRun.id,
      previousState: { status: payrollRun.status },
      newState: {
        bank_file_generated: true,
        mark_processed: markProcessed,
        row_count: slips.length,
        status: markProcessed && payrollRun.status === 'approved' ? 'processed' : payrollRun.status,
      },
    });

    const filename = `payroll-bank-file-${payrollRun.year}-${String(payrollRun.month).padStart(2, '0')}.csv`;
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
