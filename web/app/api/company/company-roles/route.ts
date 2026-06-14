import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';
import { getCurrentUser } from '@/lib/auth-service';
import { validateTenantAccess } from '@/lib/tenant-service';
import { createAuditLog } from '@/lib/audit';
import { resolveDefaultCreationTargets } from '@/lib/company-hierarchy-policy';

export const dynamic = 'force-dynamic';

// Validation schemas
const rolePermissionSchema = z.object({
  permissionId: z.string().uuid(),
  granted: z.boolean().default(true),
  scope: z.enum(['all', 'team', 'self']).default('all'),
});

const createRoleSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9_-]+$/),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  authorityLevel: z.number().int().min(1).max(100),
  reportsToId: z.string().uuid().optional(),
  canCreateUsers: z.boolean().default(false),
  canCreateRoles: z.array(z.string()).default([]),
  permissions: z.array(rolePermissionSchema).optional(),
});

/**
 * GET /api/company/company-roles
 * 
 * Lists all roles configured for the company.
 * Returns role hierarchy, permissions, and metadata.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user || !user.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await validateTenantAccess(user.orgId);

    // Fetch all company roles with hierarchy and permissions
    const roles = await prisma.companyRole.findMany({
      where: { company_id: user.orgId },
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
          include: { Permission: {
              select: {
                id: true,
                code: true,
              },
            },
          },
        },
        _count: {
          select: {
            Employee: true,
          },
        },
      },
      orderBy: { authority_level: 'asc' }, // Highest authority first
    });

    // Transform to frontend-friendly format
    const rolesResponse = roles.map(role => ({
      id: role.id,
      name: role.name,
      slug: role.slug,
      description: role.description,
      color: role.color,
      authorityLevel: role.authority_level,
      isOwnerRole: role.is_owner_role,
      
      hierarchy: {
        reportsToId: role.reports_to_id,
        reportsTo: role.CompanyRole ? {
          id: role.CompanyRole.id,
          name: role.CompanyRole.name,
          slug: role.CompanyRole.slug,
          authorityLevel: role.CompanyRole.authority_level,
        } : null,
        subordinates: role.other_CompanyRole.map(sub => ({
          id: sub.id,
          name: sub.name,
          slug: sub.slug,
          authorityLevel: sub.authority_level,
        })),
      },
      
      capabilities: {
        canCreateUsers: role.can_create_users,
        canCreateRoles: role.can_create_roles,
      },
      
      permissions: role.CompanyRolePermission.map(p => ({
        id: p.id,
        granted: p.granted,
        scope: p.scope,
        permission: {
          id: p.Permission.id,
          code: p.Permission.code,
        },
      })),
      
      stats: {
        employeeCount: role._count.Employee,
      },
      
      createdAt: role.created_at,
      updatedAt: role.updated_at,
    }));

    return NextResponse.json({
      roles: rolesResponse,
      meta: {
        total: rolesResponse.length,
        hierarchy: buildRoleHierarchy(rolesResponse),
      },
    });
  } catch (error) {
    console.error('[GET COMPANY ROLES] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch roles', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/company/company-roles
 * 
 * Creates a new custom role for the company.
 * Only admins and owners can create roles.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || !user.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can create roles
    if (!['admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only admins can create roles.' },
        { status: 403 }
      );
    }

    await validateTenantAccess(user.orgId);

    const body = await request.json();
    
    // Validate request body
    const validation = createRoleSchema.safeParse(body);
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

    const allowedCreateRoles = resolveDefaultCreationTargets(
      data.canCreateUsers ? data.slug : data.slug,
      companyRecord?.enabled_roles || []
    );

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

    // Check if slug already exists
    const existingRole = await prisma.companyRole.findFirst({
      where: {
        company_id: user.orgId,
        slug: data.slug,
      },
    });

    if (existingRole) {
      return NextResponse.json(
        { error: 'A role with this slug already exists' },
        { status: 400 }
      );
    }

    // Validate reports_to exists if provided
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
    }

    // Create role
    const role = await prisma.companyRole.create({
      data: {
        id: randomUUID(),
        updated_at: new Date(),
        company_id: user.orgId,
        name: data.name,
        slug: data.slug,
        description: data.description,
        color: data.color,
        authority_level: data.authorityLevel,
        reports_to_id: data.reportsToId,
        can_create_users: data.canCreateUsers,
        can_create_roles: data.canCreateRoles,
      },
      include: {
        CompanyRole: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // Create permissions if provided
    if (data.permissions && data.permissions.length > 0) {
      await prisma.companyRolePermission.createMany({
        data: data.permissions.map(p => ({
          id: randomUUID(),
          company_id: user.orgId!,
          company_role_id: role.id,
          permission_id: p.permissionId,
          granted: p.granted,
          scope: p.scope,
        })),
      });
    }

    // Audit log
    await createAuditLog({
      companyId: user.orgId,
      actorId: user.id,
      action: 'role_created',
      entityType: 'company_role',
      entityId: role.id,
      newState: {
        role_name: role.name,
        role_slug: role.slug,
        authority_level: role.authority_level,
        created_by: user.email,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      message: 'Role created successfully',
      role: {
        id: role.id,
        name: role.name,
        slug: role.slug,
        authorityLevel: role.authority_level,
        reportsTo: role.CompanyRole,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('[CREATE COMPANY ROLE] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create role', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Helper function to build role hierarchy tree
 */
type RoleHierarchyInput = {
  id: string;
  hierarchy: {
    reportsToId: string | null;
  };
  [key: string]: unknown;
};

type RoleHierarchyNode = RoleHierarchyInput & {
  children: RoleHierarchyNode[];
};

function buildRoleHierarchy(roles: RoleHierarchyInput[]): RoleHierarchyNode[] {
  const roleMap = new Map<string, RoleHierarchyNode>(
    roles.map((role) => [role.id, { ...role, children: [] }])
  );
  const roots: RoleHierarchyNode[] = [];

  roles.forEach(role => {
    const node = roleMap.get(role.id)!;
    if (role.hierarchy.reportsToId) {
      const parent = roleMap.get(role.hierarchy.reportsToId);
      if (parent) {
        parent.children.push(node);
      }
    } else {
      roots.push(node);
    }
  });

  return roots;
}












