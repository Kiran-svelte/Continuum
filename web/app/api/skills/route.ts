/**
 * Skills API — RALPH-20260630-009
 *
 * GET  /api/skills — List skills catalog
 * POST /api/skills — Add a new skill to catalog (HR/Admin)
 *
 * For employee skill assignments: GET/POST /api/skills/employee/[empId]
 *
 * Propagated to: app/hr/(main)/skill-matrix/, employee profile
 *
 * @module api/skills
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireCompanyContext, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import { hasPermission } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const url = new URL(request.url);
    const empId = url.searchParams.get('empId');
    const category = url.searchParams.get('category');

    if (empId) {
      const canViewAll = hasPermission(employee.permissions, 'employee.view_all');
      if (empId !== employee.id && !canViewAll) {
        return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Access denied' } }, { status: 403 });
      }

      const employeeSkills = await prisma.employeeSkill.findMany({
        where: { emp_id: empId, company_id: employee.org_id! },
        include: { Skill: true },
        orderBy: [{ Skill: { category: 'asc' } }, { proficiency: 'desc' }],
      });

      return NextResponse.json({ employeeSkills });
    }

    const skills = await prisma.skill.findMany({
      where: {
        company_id: employee.org_id!,
        ...(category ? { category } : {}),
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({ skills });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const url = new URL(request.url);
    const isEmployeeSkill = url.searchParams.get('type') === 'employee';

    const body = await request.json() as {
      name?: string;
      category?: string;
      description?: string;
      empId?: string;
      skillId?: string;
      proficiency?: number;
      yearsExp?: number;
    };

    if (isEmployeeSkill) {
      if (!body.skillId || !body.empId) {
        return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'skillId and empId required' } }, { status: 400 });
      }

      const isOwnProfile = body.empId === employee.id;
      const canManage = hasPermission(employee.permissions, 'employee.edit_any');
      if (!isOwnProfile && !canManage) {
        return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Access denied' } }, { status: 403 });
      }

      const employeeSkill = await prisma.employeeSkill.upsert({
        where: { emp_id_skill_id: { emp_id: body.empId, skill_id: body.skillId } },
        create: {
          id: crypto.randomUUID(),
          company_id: employee.org_id!,
          emp_id: body.empId,
          skill_id: body.skillId,
          proficiency: body.proficiency ?? 1,
          years_exp: body.yearsExp ?? null,
          last_assessed: new Date(),
        },
        update: {
          proficiency: body.proficiency ?? 1,
          years_exp: body.yearsExp ?? null,
          last_assessed: new Date(),
        },
        include: { Skill: true },
      });

      return NextResponse.json({ employeeSkill }, { status: 201 });
    }

    requirePermissionGuard(employee, 'employee.edit_any');

    if (!body.name?.trim()) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Skill name is required' } }, { status: 400 });
    }

    const skill = await prisma.skill.create({
      data: {
        id: crypto.randomUUID(),
        company_id: employee.org_id!,
        name: body.name.trim(),
        category: body.category ?? null,
        description: body.description ?? null,
      },
    });

    return NextResponse.json({ skill }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

function handleApiError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: { code: 'AUTH_ERROR', message: error.message } }, { status: error.status });
  }
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
  return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
}
