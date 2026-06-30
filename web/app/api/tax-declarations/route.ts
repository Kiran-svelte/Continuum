/**
 * Tax Declarations API — RALPH-20260630-015
 * GET  /api/tax-declarations  — get own declaration (or all with payroll.view_all)
 * POST /api/tax-declarations  — create/upsert declaration for fiscal year
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';
import { hasPermission } from '@/lib/rbac';
import { assertModule } from '@/lib/core-functions/assert-module';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const employee = await getAuthEmployee(req);
    await assertModule(employee.org_id!, 'payroll');

    const url = new URL(req.url);
    const fiscal_year = url.searchParams.get('fiscal_year') ?? getCurrentFiscalYear();
    const isAdmin = hasPermission(employee.permissions, 'payroll.view_all');

    if (isAdmin) {
      const declarations = await prisma.taxDeclaration.findMany({
        where: { company_id: employee.org_id!, fiscal_year },
        include: { Employee: { select: { id: true, first_name: true, last_name: true, designation: true } } },
        orderBy: { created_at: 'desc' },
      });
      return NextResponse.json({ declarations });
    }

    const declaration = await prisma.taxDeclaration.findUnique({
      where: { emp_id_fiscal_year: { emp_id: employee.id, fiscal_year } },
    });
    return NextResponse.json({ declaration });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const employee = await getAuthEmployee(req);
    await assertModule(employee.org_id!, 'payroll');

    const body = await req.json();
    const { fiscal_year, regime, sections, total_declared } = body;
    const fy = fiscal_year ?? getCurrentFiscalYear();

    const declaration = await prisma.taxDeclaration.upsert({
      where: { emp_id_fiscal_year: { emp_id: employee.id, fiscal_year: fy } },
      create: {
        company_id: employee.org_id!,
        emp_id: employee.id,
        fiscal_year: fy,
        regime: regime ?? 'new',
        sections: sections ?? {},
        total_declared: Number(total_declared ?? 0),
        status: 'draft',
      },
      update: {
        regime,
        sections,
        total_declared: total_declared !== undefined ? Number(total_declared) : undefined,
        status: 'draft',
      },
    });
    return NextResponse.json({ declaration }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getCurrentFiscalYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 4 ? `${year}-${(year + 1).toString().slice(2)}` : `${year - 1}-${year.toString().slice(2)}`;
}
