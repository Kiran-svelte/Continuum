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
import { requireModuleForOrg } from '@/lib/core-functions/guard-handler';

export const dynamic = 'force-dynamic';

const generateSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
});

const DAY_MS = 24 * 60 * 60 * 1000;

function getPayrollPeriod(month: number, year: number) {
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    endExclusive: new Date(Date.UTC(year, month, 1)),
  };
}

function countWeekdays(start: Date, endExclusive: Date): number {
  let count = 0;
  for (let time = start.getTime(); time < endExclusive.getTime(); time += DAY_MS) {
    const day = new Date(time).getUTCDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function countOverlappingLeaveDays(
  startDate: Date,
  endDate: Date,
  periodStart: Date,
  periodEndExclusive: Date,
  isHalfDay: boolean
): number {
  const overlapStart = Math.max(startOfUtcDay(startDate).getTime(), periodStart.getTime());
  const overlapEnd = Math.min(startOfUtcDay(endDate).getTime() + DAY_MS, periodEndExclusive.getTime());
  if (overlapEnd <= overlapStart) return 0;
  const days = (overlapEnd - overlapStart) / DAY_MS;
  return isHalfDay ? Math.min(days, 0.5) : days;
}

export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();
    requireRole(employee, 'hr', 'admin');
    const moduleGuard = await requireModuleForOrg(employee.org_id, 'payroll');
    if (moduleGuard) return moduleGuard;
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

    const salariedEmployees = employees.filter((emp) => emp.salary_structure);
    if (salariedEmployees.length === 0) {
      return NextResponse.json(
        { error: 'No active employees with salary structures found for payroll generation' },
        { status: 422 }
      );
    }

    const { start, endExclusive } = getPayrollPeriod(month, year);
    const workingDays = countWeekdays(start, endExclusive);
    const employeeIds = salariedEmployees.map((emp) => emp.id);

    const [attendanceRecords, approvedLeaves] = await Promise.all([
      prisma.attendance.findMany({
        where: {
          company_id: employee.org_id!,
          emp_id: { in: employeeIds },
          date: { gte: start, lt: endExclusive },
        },
        select: { emp_id: true, status: true },
      }),
      prisma.leaveRequest.findMany({
        where: {
          company_id: employee.org_id!,
          emp_id: { in: employeeIds },
          status: 'approved',
          start_date: { lt: endExclusive },
          end_date: { gte: start },
        },
        select: {
          emp_id: true,
          start_date: true,
          end_date: true,
          is_half_day: true,
        },
      }),
    ]);

    if (attendanceRecords.length === 0) {
      return NextResponse.json(
        {
          error: 'Cannot generate payroll without attendance data for the selected period',
          details: { month, year },
        },
        { status: 422 }
      );
    }

    const attendanceByEmployee = new Map<string, { present: number; absent: number; leave: number }>();
    for (const record of attendanceRecords) {
      const stats = attendanceByEmployee.get(record.emp_id) ?? { present: 0, absent: 0, leave: 0 };
      if (record.status === 'present' || record.status === 'late') stats.present += 1;
      if (record.status === 'half_day') {
        stats.present += 0.5;
        stats.absent += 0.5;
      }
      if (record.status === 'absent') stats.absent += 1;
      if (record.status === 'on_leave') stats.leave += 1;
      attendanceByEmployee.set(record.emp_id, stats);
    }

    const approvedLeaveDaysByEmployee = new Map<string, number>();
    for (const leave of approvedLeaves) {
      const current = approvedLeaveDaysByEmployee.get(leave.emp_id) ?? 0;
      approvedLeaveDaysByEmployee.set(
        leave.emp_id,
        current + countOverlappingLeaveDays(leave.start_date, leave.end_date, start, endExclusive, leave.is_half_day)
      );
    }

    const payrollRun = await prisma.payrollRun.create({
      data: {
        company_id: employee.org_id!,
        month,
        year,
        status: 'draft',
        generated_by: employee.id,
      },
    });

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

    for (const emp of salariedEmployees) {
      const salary = emp.salary_structure;
      if (!salary) continue;

      const gross = salary.basic + salary.hra + salary.da + salary.special_allowance;
      const attendanceStats = attendanceByEmployee.get(emp.id) ?? { present: 0, absent: 0, leave: 0 };
      const approvedLeaveDays = approvedLeaveDaysByEmployee.get(emp.id) ?? 0;
      const leaveDays = Math.max(attendanceStats.leave, approvedLeaveDays);
      const absentDays = attendanceStats.absent;

      const netPayResult = calculateNetPay({
        basic: salary.basic,
        hra: salary.hra,
        da: salary.da,
        specialAllowance: salary.special_allowance,
        workingDays,
        presentDays: attendanceStats.present,
        leaveDays,
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
        lop_deduction: netPayResult.lopDeduction,
        total_deductions: netPayResult.totalDeductions,
        net_pay: netPayResult.netPay,
        working_days: workingDays,
        present_days: attendanceStats.present,
        leave_days: leaveDays,
        absent_days: absentDays,
      });
    }

    if (slips.length > 0) {
      await prisma.payrollSlip.createMany({ data: slips });
    }

    // Update payroll run totals and status
    const updatedRun = await prisma.payrollRun.update({
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
