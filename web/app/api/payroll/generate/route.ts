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

    // Create draft payroll run
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

      const netPayResult = calculateNetPay({
        basic: salary.basic,
        hra: salary.hra,
        da: salary.da,
        specialAllowance: salary.special_allowance,
        workingDays: 30,
        presentDays: 30,
        leaveDays: 0,
        absentDays: 0,
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
        lop_deduction: 0,
        total_deductions: netPayResult.totalDeductions,
        net_pay: netPayResult.netPay,
        working_days: 30,
        present_days: 30,
        leave_days: 0,
        absent_days: 0,
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
