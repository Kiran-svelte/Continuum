import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-service';
import { validateTenantAccess } from '@/lib/tenant-service';
import { buildCompanyRoleUpdateData } from '@/lib/company-role-update-builder';
import { createAuditLog } from '@/lib/audit';
import { resolveDefaultCreationTargets } from '@/lib/company-hierarchy-policy';

export const dynamic = 'force-dynamic';

const updateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  authorityLevel: z.number().int().min(1).max(100).optional(),
  reportsToId: z.string().uuid().nullable().optional(),
  canCreateUsers: z.boolean().optional(),
  canCreateRoles: z.array(z.string()).optional(),
});

/**
 * GET /api/company/company-roles/[id]
 * 
 * Fetches details of a specific role.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await getCurrentUser();
    
    if (!user || !user.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await validateTenantAccess(user.orgId);

    const role = await prisma.companyRole.findUnique({
      where: { id },
      include: {
        CompanyRole: {
          select: {
            id: true,
            name: true,
            slug: true,
            authority_level: true,
          },
        },
        other_CompanyRole: {
          select: {
            id: true,
            name: true,
            slug: true,
            authority_level: true,
          },
        },
        CompanyRolePermission: {
          include: { Permission: true,
          },
        },
        Employee: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            status: true,
          },
          take: 10, // Limit for performance
        },
        _count: {
          select: {
            Employee: true,
          },
        },
      },
    });

    if (!role || role.company_id !== user.orgId) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: role.id,
      name: role.name,
      slug: role.slug,
      description: role.description,
      color: role.color,
      authorityLevel: role.authority_level,
      isOwnerRole: role.is_owner_role,
      
      hierarchy: {
        reportsToId: role.reports_to_id,
        reportsTo: role.CompanyRole,
        subordinates: role.other_CompanyRole,
      },
      
      capabilities: {
        canCreateUsers: role.can_create_users,
        canCreateRoles: role.can_create_roles,
      },
      
      permissions: role.CompanyRolePermission.map((permission) => ({
        id: permission.id,
        granted: permission.granted,
        scope: permission.scope,
        permission: permission.Permission,
      })),
      
      employees: role.Employee,
      
      stats: {
        totalEmployees: role._count.Employee,
      },
      
      createdAt: role.created_at,
      updatedAt: role.updated_at,
    });
  } catch (error) {
    console.error('[GET COMPANY ROLE] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch role', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/company/company-roles/[id]
 * 
 * Updates a role's configuration.
 * Cannot update owner role or roles with active employees (by default).
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await getCurrentUser();
    
    if (!user || !user.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    await validateTenantAccess(user.orgId);

    const body = await request.json();
    const validation = updateRoleSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    const companyRecord = await prisma.company.findUnique({
      where: { id: user.orgId },
      select: { enabled_roles: true },
    });

    // Fetch existing role
    const existingRole = await prisma.companyRole.findUnique({
      where: { id },
      include: {
        _count: {
          select: { Employee: true },
        },
      },
    });

    if (!existingRole || existingRole.company_id !== user.orgId) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Cannot modify owner role
    if (existingRole.is_owner_role) {
      return NextResponse.json(
        { error: 'Cannot modify the owner role' },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: Prisma.CompanyRoleUncheckedUpdateInput = buildCompanyRoleUpdateData(data);

    // Validate reports_to if being updated
    if (data.reportsToId) {
      const reportsToRole = await prisma.companyRole.findUnique({
        where: { id: data.reportsToId },
      });

      if (!reportsToRole || reportsToRole.company_id !== user.orgId) {
        return NextResponse.json(
          { error: 'Invalid reports_to role' },
          { status: 400 }
        );
      }

      // Prevent circular reporting
      if (data.reportsToId === id) {
        return NextResponse.json(
          { error: 'Role cannot report to itself' },
          { status: 400 }
        );
      }
    }

    const allowedCreateRoles = resolveDefaultCreationTargets(
      data.name ? existingRole?.base_role || existingRole?.slug || 'employee' : existingRole?.base_role || existingRole?.slug || 'employee',
      companyRecord?.enabled_roles || []
    );

    if (data.canCreateRoles) {
      const invalidCreateRoles = data.canCreateRoles.filter(
        (candidate) => !allowedCreateRoles.includes(candidate)
      );

      if (invalidCreateRoles.length > 0) {
        return NextResponse.json(
          {
            error: 'Role creation rights exceed the company hierarchy policy.',
            invalidCreateRoles,
            allowedCreateRoles,
          },
          { status: 400 }
        );
      }
    }

    // Update role
    const updatedRole = await prisma.companyRole.update({
      where: { id },
      data: updateData,
    });

    // Audit log
    await createAuditLog({
      companyId: user.orgId,
      actorId: user.id,
      action: 'role_updated',
      entityType: 'company_role',
      entityId: updatedRole.id,
      newState: {
        role_name: updatedRole.name,
        updated_fields: Object.keys(updateData),
        updated_by: user.email,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      message: 'Role updated successfully',
      role: {
        id: updatedRole.id,
        name: updatedRole.name,
        slug: updatedRole.slug,
        updatedAt: updatedRole.updated_at,
      },
    });
  } catch (error) {
    console.error('[UPDATE COMPANY ROLE] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update role', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/company/company-roles/[id]
 * 
 * Deletes a role. Only allowed if:
 * - Not the owner role
 * - No employees currently assigned
 * - No roles report to it
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await getCurrentUser();
    
    if (!user || !user.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    await validateTenantAccess(user.orgId);

    // Fetch role with counts
    const role = await prisma.companyRole.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            Employee: true,
            other_CompanyRole: true,
          },
        },
      },
    });

    if (!role || role.company_id !== user.orgId) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Cannot delete owner role
    if (role.is_owner_role) {
      return NextResponse.json(
        { error: 'Cannot delete the owner role' },
        { status: 400 }
      );
    }

    // Cannot delete if employees assigned
    if (role._count.Employee > 0) {
      return NextResponse.json(
        { error: `Cannot delete role with ${role._count.Employee} assigned employees. Reassign them first.` },
        { status: 400 }
      );
    }

    // Cannot delete if other roles report to it
    if (role._count.other_CompanyRole > 0) {
      return NextResponse.json(
        { error: `Cannot delete role with ${role._count.other_CompanyRole} subordinate roles. Reassign them first.` },
        { status: 400 }
      );
    }

    // Delete role and associated permissions
    await prisma.$transaction([
      prisma.companyRolePermission.deleteMany({
        where: { company_role_id: id },
      }),
      prisma.companyRole.delete({
        where: { id },
      }),
    ]);

    // Audit log
    await createAuditLog({
      companyId: user.orgId,
      actorId: user.id,
      action: 'role_deleted',
      entityType: 'company_role',
      entityId: id,
      previousState: {
        role_name: role.name,
        role_slug: role.slug,
        deleted_by: user.email,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      message: 'Role deleted successfully',
    });
  } catch (error) {
    console.error('[DELETE COMPANY ROLE] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to delete role', details: errorMessage },
      { status: 500 }
    );
  }
}





