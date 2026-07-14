import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import {
  getAuthEmployee,
  requireRole,
  requirePermissionGuard,
  AuthError,
} from '@/lib/auth-guard';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { calculateNetPay } from '@/lib/india-tax';
import { summarizePayrollAttendance } from '@/lib/payroll-attendance';

export const dynamic = 'force-dynamic';

const generateSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
});

export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();
    requireRole(employee, 'hr', 'admin');
    requirePermissionGuard(employee, 'payroll.generate');

    const body = await request.json();
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { month, year } = parsed.data;

    // Check if payroll already exists for this period
    const existing = await prisma.payrollRun.findUnique({
      where: { company_id_month_year: { company_id: employee.org_id!, month, year } },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Payroll already exists for ${month}/${year} with status '${existing.status}'` },
        { status: 409 }
      );
    }

    // Create draft payroll run (placeholder — will be updated inside the transaction)
    const payrollRun = await prisma.payrollRun.create({
      data: {
        company_id: employee.org_id!,
        month,
        year,
        status: 'draft',
        generated_by: employee.id,
      },
    });

    // Fetch all active employees with salary structures
    const employees = await prisma.employee.findMany({
      where: {
        org_id: employee.org_id!,
        status: { in: ['active', 'probation'] },
      },
      include: {
        salary_structure: true,
      },
    });

    // Fetch attendance summary for the pay period (approved leave + attendance logs)
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0); // last day of month

    const empIds = employees.map((e) => e.id);
    const [company, attendanceLogs, approvedLeaves, publicHolidays] = await Promise.all([
      prisma.company.findUniqueOrThrow({
        where: { id: employee.org_id! },
        select: { work_days: true, country_code: true },
      }),
      prisma.attendance.findMany({
        where: {
          company_id: employee.org_id!,
          date: { gte: periodStart, lte: periodEnd },
          emp_id: { in: empIds },
        },
        select: { emp_id: true, date: true, status: true, is_wfh: true },
      }),
      prisma.leaveRequest.findMany({
        where: {
          company_id: employee.org_id!,
          status: 'approved',
          start_date: { lte: periodEnd },
          end_date: { gte: periodStart },
          emp_id: { in: empIds },
        },
        select: { emp_id: true, start_date: true, end_date: true, is_half_day: true },
      }),
      prisma.publicHoliday.findMany({
        where: {
          date: { gte: periodStart, lte: periodEnd },
          OR: [{ company_id: employee.org_id! }, { company_id: null }],
        },
        select: { date: true, company_id: true },
      }),
    ]);

    // Company-specific holidays take precedence over global ones on the same date.
    const holidayDateKeys = new Set<string>();
    for (const h of publicHolidays) {
      if (h.company_id === employee.org_id) holidayDateKeys.add(h.date.toISOString().slice(0, 10));
    }
    for (const h of publicHolidays) {
      if (h.company_id === null) holidayDateKeys.add(h.date.toISOString().slice(0, 10));
    }
    const holidayDates = [...holidayDateKeys].map((key) => new Date(`${key}T00:00:00Z`));

    // Group attendance/leave records per employee for summarizePayrollAttendance
    const attendanceByEmp = new Map<string, { emp_id: string; date: Date; status: string; is_wfh: boolean }[]>();
    for (const log of attendanceLogs) {
      const list = attendanceByEmp.get(log.emp_id) ?? [];
      list.push(log);
      attendanceByEmp.set(log.emp_id, list);
    }
    const leavesByEmp = new Map<string, { emp_id: string; start_date: Date; end_date: Date; is_half_day: boolean }[]>();
    for (const lr of approvedLeaves) {
      const list = leavesByEmp.get(lr.emp_id) ?? [];
      list.push(lr);
      leavesByEmp.set(lr.emp_id, list);
    }

    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;
    let totalPf = 0;
    let totalEsi = 0;
    let totalTds = 0;
    const slips: Array<{
      payroll_run_id: string;
      emp_id: string;
      company_id: string;
      month: number;
      year: number;
      basic: number;
      hra: number;
      da: number;
      special_allowance: number;
      gross: number;
      pf_employee: number;
      pf_employer: number;
      esi_employee: number;
      esi_employer: number;
      professional_tax: number;
      tds: number;
      lop_deduction: number;
      total_deductions: number;
      net_pay: number;
      working_days: number;
      present_days: number;
      leave_days: number;
      absent_days: number;
    }> = [];

    for (const emp of employees) {
      const salary = emp.salary_structure;
      if (!salary) continue;

      const gross = salary.basic + salary.hra + salary.da + salary.special_allowance;

      const summary = summarizePayrollAttendance({
        year,
        month,
        workDays: company.work_days,
        attendance: attendanceByEmp.get(emp.id) ?? [],
        leaveRequests: leavesByEmp.get(emp.id) ?? [],
        holidayDates,
      });
      const { workingDays: workingDaysInMonth, presentDays, leaveDays: empLeaveDays, absentDays } = summary;

      const netPayResult = calculateNetPay({
        basic: salary.basic,
        hra: salary.hra,
        da: salary.da,
        specialAllowance: salary.special_allowance,
        workingDays: workingDaysInMonth,
        presentDays,
        leaveDays: empLeaveDays,
        absentDays,
        annualIncome: salary.ctc,
      });

      totalGross += gross;
      totalDeductions += netPayResult.totalDeductions;
      totalNet += netPayResult.netPay;
      totalPf += netPayResult.pf.employeeContribution;
      totalEsi += netPayResult.esi.employeeContribution;
      totalTds += netPayResult.tds.monthlyTax;

      slips.push({
        payroll_run_id: payrollRun.id,
        emp_id: emp.id,
        company_id: employee.org_id!,
        month,
        year,
        basic: salary.basic,
        hra: salary.hra,
        da: salary.da,
        special_allowance: salary.special_allowance,
        gross,
        pf_employee: netPayResult.pf.employeeContribution,
        pf_employer: netPayResult.pf.employerContribution,
        esi_employee: netPayResult.esi.employeeContribution,
        esi_employer: netPayResult.esi.employerContribution,
        professional_tax: netPayResult.professionalTax.monthlyTax,
        tds: netPayResult.tds.monthlyTax,
        lop_deduction: netPayResult.lopDeduction ?? 0,
        total_deductions: netPayResult.totalDeductions,
        net_pay: netPayResult.netPay,
        working_days: workingDaysInMonth,
        present_days: presentDays,
        leave_days: empLeaveDays,
        absent_days: absentDays,
      });
    }

    // Wrap slip creation and run status update in a transaction so a partial
    // failure doesn't leave the run stuck in 'draft' with zero slips.
    let updatedRun;
    try {
      updatedRun = await prisma.$transaction(async (tx) => {
        if (slips.length > 0) {
          await tx.payrollSlip.createMany({ data: slips });
        }
        return tx.payrollRun.update({
          where: { id: payrollRun.id },
          data: {
            status: 'generated',
            total_gross: totalGross,
            total_deductions: totalDeductions,
            total_net: totalNet,
            total_pf: totalPf,
            total_esi: totalEsi,
            total_tds: totalTds,
            employee_count: slips.length,
          },
        });
      });
    } catch (txError) {
      // Roll back the payroll run record so it can be re-generated next time
      await prisma.payrollRun.delete({ where: { id: payrollRun.id } }).catch(() => undefined);
      throw txError;
    }

    await createAuditLog({
      companyId: employee.org_id!,
      actorId: employee.id,
      action: AUDIT_ACTIONS.PAYROLL_GENERATE,
      entityType: 'PayrollRun',
      entityId: payrollRun.id,
      newState: {
        month,
        year,
        employee_count: slips.length,
        total_gross: totalGross,
        total_net: totalNet,
        status: 'generated',
      },
    });

    return NextResponse.json(updatedRun, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
