import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireRole, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// Indian payroll auto-calculation from CTC (annual)
function calculateBreakdown(ctcAnnual: number) {
  const monthly = ctcAnnual / 12;
  const basic = Math.round(ctcAnnual * 0.4);
  const hra = Math.round(basic * 0.5);
  const basicMonthly = basic / 12;

  // PF: 12% of basic monthly, capped at ₹1800/mo
  const pfEmployee = Math.round(Math.min(basicMonthly * 0.12, 1800) * 12);
  const pfEmployer = pfEmployee;

  // ESI: applicable only if gross monthly <= ₹21000
  const grossMonthly = monthly;
  const esiEmployee = grossMonthly <= 21000 ? Math.round(grossMonthly * 0.0075 * 12) : 0;
  const esiEmployer = grossMonthly <= 21000 ? Math.round(grossMonthly * 0.0325 * 12) : 0;

  // Professional Tax: ₹200/month = ₹2400/year
  const professionalTax = 2400;

  // TDS: rough 10% of taxable income above 5L (simplified)
  const taxableIncome = ctcAnnual - pfEmployee - professionalTax;
  let tds = 0;
  if (taxableIncome > 1000000) {
    tds = Math.round((taxableIncome - 500000) * 0.2);
  } else if (taxableIncome > 500000) {
    tds = Math.round((taxableIncome - 500000) * 0.1);
  }

  const da = 0;
  const totalDeductions = pfEmployee + esiEmployee + professionalTax + tds;
  const specialAllowance = Math.max(0, ctcAnnual - basic - hra - da - pfEmployer - esiEmployer);

  return {
    basic, hra, da, special_allowance: specialAllowance,
    pf_employee: pfEmployee, pf_employer: pfEmployer,
    esi_employee: esiEmployee, esi_employer: esiEmployer,
    professional_tax: professionalTax, tds,
  };
}

const upsertSchema = z.object({
  emp_id: z.string().min(1),
  ctc: z.number().positive(),
  auto_calculate: z.boolean().optional().default(true),
  basic: z.number().optional(),
  hra: z.number().optional(),
  da: z.number().optional(),
  special_allowance: z.number().optional(),
  pf_employee: z.number().optional(),
  pf_employer: z.number().optional(),
  esi_employee: z.number().optional(),
  esi_employer: z.number().optional(),
  professional_tax: z.number().optional(),
  tds: z.number().optional(),
  effective_from: z.string().min(1),
  reason: z.string().max(500).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();
    requireRole(employee, 'hr', 'admin');

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const { searchParams } = new URL(request.url);
    const empId = searchParams.get('emp_id');
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

    const where: Record<string, unknown> = { company_id: employee.org_id! };
    if (empId) where.emp_id = empId;

    const structures = await prisma.salaryStructure.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        employee: {
          select: {
            first_name: true,
            last_name: true,
            email: true,
            department: true,
            designation: true,
          },
        },
      },
    });

    let filtered = structures.map((s) => ({
      id: s.id,
      emp_id: s.emp_id,
      employee_name: `${s.employee.first_name} ${s.employee.last_name}`,
      email: s.employee.email,
      department: s.employee.department,
      designation: s.employee.designation,
      ctc: s.ctc,
      basic: s.basic,
      hra: s.hra,
      da: s.da,
      special_allowance: s.special_allowance,
      pf_employee: s.pf_employee,
      pf_employer: s.pf_employer,
      esi_employee: s.esi_employee,
      esi_employer: s.esi_employer,
      professional_tax: s.professional_tax,
      tds: s.tds,
      effective_from: s.effective_from,
      created_at: s.created_at,
    }));

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.employee_name.toLowerCase().includes(q) ||
          (s.department && s.department.toLowerCase().includes(q))
      );
    }

    const total = await prisma.salaryStructure.count({ where });

    return NextResponse.json({
      structures: filtered,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();
    requireRole(employee, 'hr', 'admin');

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const body = await request.json();
    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { emp_id, ctc, auto_calculate, effective_from, reason, ...manualComponents } = parsed.data;

    // Verify employee exists in same company
    const targetEmp = await prisma.employee.findUnique({
      where: { id: emp_id },
      select: { id: true, org_id: true, first_name: true, last_name: true },
    });

    if (!targetEmp || targetEmp.org_id !== employee.org_id!) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Calculate breakdown
    const components = auto_calculate
      ? calculateBreakdown(ctc)
      : {
          basic: manualComponents.basic ?? 0,
          hra: manualComponents.hra ?? 0,
          da: manualComponents.da ?? 0,
          special_allowance: manualComponents.special_allowance ?? 0,
          pf_employee: manualComponents.pf_employee ?? 0,
          pf_employer: manualComponents.pf_employer ?? 0,
          esi_employee: manualComponents.esi_employee ?? 0,
          esi_employer: manualComponents.esi_employer ?? 0,
          professional_tax: manualComponents.professional_tax ?? 0,
          tds: manualComponents.tds ?? 0,
        };

    // Check if structure already exists for this employee
    const existing = await prisma.salaryStructure.findUnique({
      where: { emp_id },
    });

    const result = await prisma.$transaction(async (tx) => {
      // If updating, create a revision record
      if (existing && existing.ctc !== ctc) {
        await tx.salaryRevision.create({
          data: {
            emp_id,
            company_id: employee.org_id!,
            old_ctc: existing.ctc,
            new_ctc: ctc,
            effective_from: new Date(effective_from),
            reason: reason || null,
            approved_by: employee.id,
          },
        });
      }

      // Upsert salary structure
      return tx.salaryStructure.upsert({
        where: { emp_id },
        create: {
          emp_id,
          company_id: employee.org_id!,
          ctc,
          ...components,
          effective_from: new Date(effective_from),
        },
        update: {
          ctc,
          ...components,
          effective_from: new Date(effective_from),
        },
      });
    });

    await createAuditLog({
      companyId: employee.org_id!,
      actorId: employee.id,
      action: AUDIT_ACTIONS.EMPLOYEE_UPDATE,
      entityType: 'SalaryStructure',
      entityId: result.id,
      previousState: existing ? { ctc: existing.ctc } : null,
      newState: { ctc, emp_id, effective_from },
    });

    return NextResponse.json(result, { status: existing ? 200 : 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();
    requireRole(employee, 'admin');

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const body = await request.json();
    const { emp_id } = body;
    if (!emp_id) {
      return NextResponse.json({ error: 'emp_id is required' }, { status: 400 });
    }

    const existing = await prisma.salaryStructure.findUnique({ where: { emp_id } });
    if (!existing || existing.company_id !== employee.org_id!) {
      return NextResponse.json({ error: 'Salary structure not found' }, { status: 404 });
    }

    await prisma.salaryStructure.delete({ where: { emp_id } });

    await createAuditLog({
      companyId: employee.org_id!,
      actorId: employee.id,
      action: AUDIT_ACTIONS.EMPLOYEE_UPDATE,
      entityType: 'SalaryStructure',
      entityId: existing.id,
      previousState: { ctc: existing.ctc, emp_id },
      newState: null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
