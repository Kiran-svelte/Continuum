import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireRole, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { sanitizeInput } from '@/lib/security';

export const dynamic = 'force-dynamic';

const VALID_ORG_UNIT_TYPES = ['department', 'division', 'team', 'branch'];

/**
 * GET /api/hr/organization
 * Returns department-level organization data aggregated from employee records,
 * plus explicit OrganizationUnit records.
 * Only accessible by admin, hr, director roles.
 */
export async function GET() {
  try {
    const employee = await getAuthEmployee();
    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }
    requireRole(employee, 'admin', 'hr', 'director');

    const companyId = employee.org_id!;

    // Get all active employees with their department and role info
    const employees = await prisma.employee.findMany({
      where: {
        org_id: companyId,
        deleted_at: null,
        status: { in: ['active', 'probation'] },
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        department: true,
        primary_role: true,
        designation: true,
        status: true,
        date_of_joining: true,
      },
      orderBy: { first_name: 'asc' },
    });

    // Group by department
    const deptMap = new Map<string, typeof employees>();
    for (const emp of employees) {
      const dept = emp.department || 'Unassigned';
      if (!deptMap.has(dept)) deptMap.set(dept, []);
      deptMap.get(dept)!.push(emp);
    }

    const departments = Array.from(deptMap.entries()).map(([name, members]) => {
      // Find the most senior person (manager/director/hr) as dept head
      const head = members.find(m =>
        m.primary_role === 'director' || m.primary_role === 'manager' || m.primary_role === 'hr'
      );
      const roles = new Set(members.map(m => m.primary_role));
      return {
        name,
        employeeCount: members.length,
        head: head ? `${head.first_name} ${head.last_name}` : null,
        headRole: head?.primary_role ?? null,
        roles: Array.from(roles),
        members: members.map(m => ({
          id: m.id,
          name: `${m.first_name} ${m.last_name}`,
          role: m.primary_role,
          designation: m.designation,
          status: m.status,
          joinDate: m.date_of_joining?.toISOString().split('T')[0] ?? null,
        })),
      };
    }).sort((a, b) => b.employeeCount - a.employeeCount);

    // Get company info
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true, size: true, industry: true },
    });

    // Get organization units
    const orgUnits = await prisma.organizationUnit.findMany({
      where: {
        company_id: companyId,
        deleted_at: null,
      },
      include: {
        parent: { select: { id: true, name: true } },
        head: { select: { id: true, first_name: true, last_name: true } },
        children: {
          where: { deleted_at: null },
          select: { id: true, name: true, type: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      company,
      departments,
      totalEmployees: employees.length,
      totalDepartments: departments.length,
      orgUnits,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/hr/organization
 * Create a new organization unit.
 * Requires admin or hr role.
 * Body: { name, type, parentId?, headId?, costCenter? }
 */
export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    requireRole(employee, 'admin', 'hr');

    const body = await request.json().catch(() => ({}));
    const { name, type, parentId, headId, costCenter } = body as {
      name?: string;
      type?: string;
      parentId?: string;
      headId?: string;
      costCenter?: string;
    };

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
    }
    if (name.length > 200) {
      return NextResponse.json({ error: 'Name must be 200 characters or fewer.' }, { status: 400 });
    }

    // Validate type
    if (!type || !VALID_ORG_UNIT_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Type must be one of: ${VALID_ORG_UNIT_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    const sanitizedName = sanitizeInput(name.trim());
    const sanitizedCostCenter = costCenter ? sanitizeInput(costCenter.trim()) : null;

    // If parentId provided, verify it belongs to the same company
    if (parentId) {
      const parentUnit = await prisma.organizationUnit.findFirst({
        where: { id: parentId, company_id: employee.org_id!, deleted_at: null },
      });
      if (!parentUnit) {
        return NextResponse.json({ error: 'Parent unit not found.' }, { status: 404 });
      }
    }

    // If headId provided, verify employee exists in same company
    if (headId) {
      const headEmployee = await prisma.employee.findFirst({
        where: { id: headId, org_id: employee.org_id!, deleted_at: null },
      });
      if (!headEmployee) {
        return NextResponse.json({ error: 'Head employee not found.' }, { status: 404 });
      }
    }

    const unit = await prisma.organizationUnit.create({
      data: {
        company_id: employee.org_id!,
        name: sanitizedName,
        type: type as 'department' | 'division' | 'team' | 'branch',
        parent_id: parentId ?? null,
        head_id: headId ?? null,
        cost_center: sanitizedCostCenter,
      },
    });

    await createAuditLog({
      companyId: employee.org_id!,
      actorId: employee.id,
      action: AUDIT_ACTIONS.ORG_UNIT_CREATE,
      entityType: 'OrganizationUnit',
      entityId: unit.id,
      newState: {
        name: sanitizedName,
        type,
        parent_id: parentId ?? null,
        head_id: headId ?? null,
        cost_center: sanitizedCostCenter,
      },
    });

    return NextResponse.json(unit, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT /api/hr/organization
 * Update an existing organization unit.
 * Requires admin or hr role.
 * Body: { id, name?, type?, parentId?, headId?, costCenter? }
 */
export async function PUT(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    requireRole(employee, 'admin', 'hr');

    const body = await request.json().catch(() => ({}));
    const { id, name, type, parentId, headId, costCenter } = body as {
      id?: string;
      name?: string;
      type?: string;
      parentId?: string | null;
      headId?: string | null;
      costCenter?: string | null;
    };

    if (!id) {
      return NextResponse.json({ error: 'Unit id is required.' }, { status: 400 });
    }

    // Verify unit exists and belongs to company
    const existing = await prisma.organizationUnit.findFirst({
      where: { id, company_id: employee.org_id!, deleted_at: null },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Organization unit not found.' }, { status: 404 });
    }

    // Build update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'Name cannot be empty.' }, { status: 400 });
      }
      if (name.length > 200) {
        return NextResponse.json({ error: 'Name must be 200 characters or fewer.' }, { status: 400 });
      }
      updateData.name = sanitizeInput(name.trim());
    }

    if (type !== undefined) {
      if (!VALID_ORG_UNIT_TYPES.includes(type)) {
        return NextResponse.json(
          { error: `Type must be one of: ${VALID_ORG_UNIT_TYPES.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.type = type;
    }

    if (parentId !== undefined) {
      if (parentId === null) {
        updateData.parent_id = null;
      } else {
        // Prevent circular reference (direct self-reference)
        if (parentId === id) {
          return NextResponse.json({ error: 'A unit cannot be its own parent.' }, { status: 400 });
        }

        // Walk up the parent chain to detect cycles (max 20 levels deep)
        let currentParentId: string | null = parentId;
        const visited = new Set<string>([id]);
        for (let depth = 0; depth < 20 && currentParentId; depth++) {
          if (visited.has(currentParentId)) {
            return NextResponse.json(
              { error: 'Cannot set parent: would create a circular reference.' },
              { status: 400 }
            );
          }
          visited.add(currentParentId);
          const ancestor: { parent_id: string | null } | null = await prisma.organizationUnit.findUnique({
            where: { id: currentParentId },
            select: { parent_id: true },
          });
          currentParentId = ancestor?.parent_id ?? null;
        }

        const parentUnit = await prisma.organizationUnit.findFirst({
          where: { id: parentId, company_id: employee.org_id!, deleted_at: null },
        });
        if (!parentUnit) {
          return NextResponse.json({ error: 'Parent unit not found.' }, { status: 404 });
        }
        updateData.parent_id = parentId;
      }
    }

    if (headId !== undefined) {
      if (headId === null) {
        updateData.head_id = null;
      } else {
        const headEmployee = await prisma.employee.findFirst({
          where: { id: headId, org_id: employee.org_id!, deleted_at: null },
        });
        if (!headEmployee) {
          return NextResponse.json({ error: 'Head employee not found.' }, { status: 404 });
        }
        updateData.head_id = headId;
      }
    }

    if (costCenter !== undefined) {
      updateData.cost_center = costCenter ? sanitizeInput(costCenter.trim()) : null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update.' }, { status: 400 });
    }

    const previousState = {
      name: existing.name,
      type: existing.type,
      parent_id: existing.parent_id,
      head_id: existing.head_id,
      cost_center: existing.cost_center,
    };

    const updated = await prisma.organizationUnit.update({
      where: { id },
      data: updateData,
    });

    await createAuditLog({
      companyId: employee.org_id!,
      actorId: employee.id,
      action: AUDIT_ACTIONS.ORG_UNIT_UPDATE,
      entityType: 'OrganizationUnit',
      entityId: id,
      previousState,
      newState: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/hr/organization
 * Soft-delete an organization unit (sets deleted_at).
 * Requires admin or hr role.
 * Body: { id }
 */
export async function DELETE(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    requireRole(employee, 'admin', 'hr');

    const body = await request.json().catch(() => ({}));
    const { id } = body as { id?: string };

    if (!id) {
      return NextResponse.json({ error: 'Unit id is required.' }, { status: 400 });
    }

    // Verify unit exists and belongs to company
    const existing = await prisma.organizationUnit.findFirst({
      where: { id, company_id: employee.org_id!, deleted_at: null },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Organization unit not found.' }, { status: 404 });
    }

    // Check for active child units to prevent orphans
    const activeChildCount = await prisma.organizationUnit.count({
      where: { parent_id: id, company_id: employee.org_id!, deleted_at: null },
    });
    if (activeChildCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete a unit that has active child units. Reassign or delete child units first.' },
        { status: 400 }
      );
    }

    const previousState = {
      name: existing.name,
      type: existing.type,
      deleted_at: existing.deleted_at,
    };

    await prisma.organizationUnit.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    await createAuditLog({
      companyId: employee.org_id!,
      actorId: employee.id,
      action: AUDIT_ACTIONS.ORG_UNIT_DELETE,
      entityType: 'OrganizationUnit',
      entityId: id,
      previousState,
      newState: { deleted_at: new Date().toISOString() },
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
