import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireRole, requireCompanyAccess, AuthError } from '@/lib/auth-guard';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { sendNotification } from '@/lib/notification-service';

export const dynamic = 'force-dynamic';

// Valid roles matching Prisma schema
const VALID_ROLES = ['admin', 'hr', 'director', 'manager', 'team_lead', 'employee'] as const;
type ValidRole = typeof VALID_ROLES[number];

const roleUpdateSchema = z.object({
  primary_role: z.enum(VALID_ROLES).optional(),
  secondary_roles: z.array(z.enum(VALID_ROLES)).optional(),
});

/**
 * PUT /api/employees/[id]/role
 *
 * Update an employee's primary and/or secondary roles.
 * Requires admin or HR role.
 * Cannot demote the last admin of a company.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const employee = await getAuthEmployee();
    requireRole(employee, 'admin', 'hr');

    const { id: targetId } = await params;

    // Get target employee
    const target = await prisma.employee.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        org_id: true,
        primary_role: true,
        secondary_roles: true,
        first_name: true,
        last_name: true,
        email: true,
      },
    });

    if (!target) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Ensure same company
    requireCompanyAccess(employee, target.org_id!);

    const body = await request.json();
    const parsed = roleUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { primary_role: newPrimaryRole, secondary_roles: newSecondaryRoles } = parsed.data;

    // Check: Cannot demote the last admin
    if (target.primary_role === 'admin' && newPrimaryRole && newPrimaryRole !== 'admin') {
      const adminCount = await prisma.employee.count({
        where: {
          org_id: target.org_id!,
          primary_role: 'admin',
          status: { notIn: ['terminated', 'exited'] },
        },
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot demote the last admin of the company' },
          { status: 400 }
        );
      }
    }

    // Check: Only admin can promote to admin
    if (newPrimaryRole === 'admin' && employee.primary_role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can promote employees to admin' },
        { status: 403 }
      );
    }

    // Build update data
    const updateData: { primary_role?: ValidRole; secondary_roles?: ValidRole[] } = {};
    if (newPrimaryRole) {
      updateData.primary_role = newPrimaryRole;
    }
    if (newSecondaryRoles !== undefined) {
      // Filter out the primary role from secondary roles to avoid duplication
      const primaryRole = newPrimaryRole || target.primary_role;
      updateData.secondary_roles = newSecondaryRoles.filter((r) => r !== primaryRole);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No changes provided' }, { status: 400 });
    }

    // Update employee
    const updated = await prisma.employee.update({
      where: { id: targetId },
      data: updateData,
      select: {
        id: true,
        primary_role: true,
        secondary_roles: true,
      },
    });

    // Audit log
    await createAuditLog({
      companyId: target.org_id!,
      actorId: employee.id,
      action: AUDIT_ACTIONS.EMPLOYEE_ROLE_CHANGE || 'EMPLOYEE_ROLE_CHANGE',
      entityType: 'Employee',
      entityId: target.id,
      previousState: {
        primary_role: target.primary_role,
        secondary_roles: target.secondary_roles,
      },
      newState: {
        primary_role: updated.primary_role,
        secondary_roles: updated.secondary_roles,
      },
    });

    // Notify the employee about their role change
    const roleChangeParts: string[] = [];
    if (newPrimaryRole && newPrimaryRole !== target.primary_role) {
      roleChangeParts.push(`primary role changed from ${target.primary_role} to ${newPrimaryRole}`);
    }
    if (newSecondaryRoles !== undefined) {
      roleChangeParts.push(`secondary roles updated to ${updated.secondary_roles && Array.isArray(updated.secondary_roles) && updated.secondary_roles.length > 0 ? (updated.secondary_roles as string[]).join(', ') : 'none'}`);
    }
    if (roleChangeParts.length > 0) {
      void sendNotification(
        target.id,
        target.org_id!,
        'employee',
        'Role Updated',
        `Your ${roleChangeParts.join(' and ')} by ${employee.first_name} ${employee.last_name}.`
      ).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      employee: {
        id: updated.id,
        primary_role: updated.primary_role,
        secondary_roles: updated.secondary_roles,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : 'Role update failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

