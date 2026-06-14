import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';
import { getCurrentUser } from '@/lib/auth-service';
import { validateTenantAccess } from '@/lib/tenant-service';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * Role Structure Templates
 * Pre-configured role hierarchies for quick company setup
 */

const ROLE_TEMPLATES = {
  // 2 Roles: HR + Employee (Small Startup)
  '2_roles': {
    name: '2 Roles: HR + Employee',
    description: 'Simple structure for small startups (1-10 employees)',
    roles: [
      {
        name: 'HR Manager',
        slug: 'hr',
        description: 'Manages all HR operations and approvals',
        authority_level: 1,
        reports_to: null,
        can_create_users: true,
        can_create_roles: ['employee'],
        color: '#8B5CF6',
        permissions: ['all'], // Will be expanded to actual permissions
      },
      {
        name: 'Employee',
        slug: 'employee',
        description: 'Standard employee self-service',
        authority_level: 2,
        reports_to: 'hr',
        can_create_users: false,
        can_create_roles: [],
        color: '#3B82F6',
        permissions: ['self'],
      },
    ],
  },

  // 3 Roles: HR + Manager + Employee (Medium Business)
  '3_roles': {
    name: '3 Roles: HR + Manager + Employee',
    description: 'Standard structure for growing businesses (11-100 employees)',
    roles: [
      {
        name: 'HR Manager',
        slug: 'hr',
        description: 'Handles HR operations and sensitive matters',
        authority_level: 1,
        reports_to: null,
        can_create_users: true,
        can_create_roles: ['manager'],
        color: '#8B5CF6',
        permissions: ['all'],
      },
      {
        name: 'Manager',
        slug: 'manager',
        description: 'Manages teams and approves leave requests',
        authority_level: 2,
        reports_to: 'hr',
        can_create_users: true,
        can_create_roles: ['employee'],
        color: '#10B981',
        permissions: ['team'],
      },
      {
        name: 'Employee',
        slug: 'employee',
        description: 'Standard employee self-service',
        authority_level: 3,
        reports_to: 'manager',
        can_create_users: false,
        can_create_roles: [],
        color: '#3B82F6',
        permissions: ['self'],
      },
    ],
  },

  // 4 Roles: Admin + HR + Manager + Employee (Large Enterprise)
  '4_roles': {
    name: '4 Roles: Admin + HR + Manager + Employee',
    description: 'Enterprise structure with dedicated administration (100+ employees)',
    roles: [
      {
        name: 'Administrator',
        slug: 'admin',
        description: 'System administrator with full access',
        authority_level: 1,
        reports_to: null,
        can_create_users: true,
        can_create_roles: ['hr'],
        color: '#EF4444',
        permissions: ['all'],
      },
      {
        name: 'HR Manager',
        slug: 'hr',
        description: 'Handles HR operations and people management',
        authority_level: 2,
        reports_to: 'admin',
        can_create_users: true,
        can_create_roles: ['manager'],
        color: '#8B5CF6',
        permissions: ['all'],
      },
      {
        name: 'Manager',
        slug: 'manager',
        description: 'Manages departments and teams',
        authority_level: 3,
        reports_to: 'hr',
        can_create_users: true,
        can_create_roles: ['employee'],
        color: '#10B981',
        permissions: ['team'],
      },
      {
        name: 'Employee',
        slug: 'employee',
        description: 'Standard employee self-service',
        authority_level: 4,
        reports_to: 'manager',
        can_create_users: false,
        can_create_roles: [],
        color: '#3B82F6',
        permissions: ['self'],
      },
    ],
  },

  // 5 Roles: Admin + HR + Director + Manager + Employee (Complex Enterprise)
  '5_roles': {
    name: '5 Roles: Admin + HR + Director + Manager + Employee',
    description: 'Complex structure with multiple management layers',
    roles: [
      {
        name: 'Administrator',
        slug: 'admin',
        description: 'System administrator',
        authority_level: 1,
        reports_to: null,
        can_create_users: true,
        can_create_roles: ['hr'],
        color: '#EF4444',
        permissions: ['all'],
      },
      {
        name: 'HR Manager',
        slug: 'hr',
        description: 'HR operations',
        authority_level: 2,
        reports_to: 'admin',
        can_create_users: true,
        can_create_roles: ['director'],
        color: '#8B5CF6',
        permissions: ['all'],
      },
      {
        name: 'Director',
        slug: 'director',
        description: 'Department director',
        authority_level: 3,
        reports_to: 'admin',
        can_create_users: true,
        can_create_roles: ['manager'],
        color: '#F59E0B',
        permissions: ['department'],
      },
      {
        name: 'Manager',
        slug: 'manager',
        description: 'Team manager',
        authority_level: 4,
        reports_to: 'director',
        can_create_users: true,
        can_create_roles: ['employee'],
        color: '#10B981',
        permissions: ['team'],
      },
      {
        name: 'Employee',
        slug: 'employee',
        description: 'Standard employee',
        authority_level: 5,
        reports_to: 'manager',
        can_create_users: false,
        can_create_roles: [],
        color: '#3B82F6',
        permissions: ['self'],
      },
    ],
  },
};

/**
 * GET /api/company/company-roles/templates
 * 
 * Returns available role structure templates
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user || !user.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      templates: Object.entries(ROLE_TEMPLATES).map(([key, template]) => ({
        id: key,
        name: template.name,
        description: template.description,
        roleCount: template.roles.length,
        preview: template.roles.map(r => ({
          name: r.name,
          slug: r.slug,
          authorityLevel: r.authority_level,
          reportsTo: r.reports_to,
        })),
      })),
    });
  } catch (error) {
    console.error('[GET ROLE TEMPLATES] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/company/company-roles/templates
 * 
 * Applies a role structure template to the company
 */
export async function POST(request: NextRequest) {
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

    const companyId = user.orgId;
    await validateTenantAccess(companyId);
    const body = await request.json();
    const { templateId, overwrite = false } = body;

    if (!templateId || !ROLE_TEMPLATES[templateId as keyof typeof ROLE_TEMPLATES]) {
      return NextResponse.json(
        { error: 'Invalid template ID' },
        { status: 400 }
      );
    }

    // Check if roles already exist
    const existingRoles = await prisma.companyRole.findMany({
      where: { company_id: companyId },
    });

    if (existingRoles.length > 0 && !overwrite) {
      return NextResponse.json(
        { 
          error: 'Roles already exist. Set overwrite=true to replace them.',
          existingCount: existingRoles.length,
        },
        { status: 400 }
      );
    }

    const template = ROLE_TEMPLATES[templateId as keyof typeof ROLE_TEMPLATES];

    // Transaction: Delete existing roles (if overwrite) and create new ones
    const result = await prisma.$transaction(async (tx) => {
      // Delete existing roles if overwrite
      if (overwrite && existingRoles.length > 0) {
        // Delete permissions first
        await tx.companyRolePermission.deleteMany({
          where: {
            company_role_id: {
              in: existingRoles.map(r => r.id),
            },
          },
        });

        // Delete roles
        await tx.companyRole.deleteMany({
          where: { company_id: companyId },
        });
      }

      // Create roles in two passes (first pass without reports_to, second pass to link)
      type CreatedRoleWithTemplate = Awaited<ReturnType<typeof tx.companyRole.create>> & {
        template: (typeof template.roles)[number];
      };
      const createdRoles: CreatedRoleWithTemplate[] = [];
      
      // First pass: Create all roles
      for (const roleTemplate of template.roles) {
        const role = await tx.companyRole.create({
          data: {
              id: randomUUID(),
            updated_at: new Date(),
              company_id: companyId,
            name: roleTemplate.name,
            slug: roleTemplate.slug,
            description: roleTemplate.description,
            authority_level: roleTemplate.authority_level,
            color: roleTemplate.color,
            can_create_users: roleTemplate.can_create_users,
            can_create_roles: roleTemplate.can_create_roles,
            reports_to_id: null, // Will be set in second pass
          },
        });
        createdRoles.push({ ...role, template: roleTemplate });
      }

      // Second pass: Set reports_to relationships
      for (const { template: roleTemplate, ...role } of createdRoles) {
        if (roleTemplate.reports_to) {
          const reportsToRole = createdRoles.find(
            r => r.template.slug === roleTemplate.reports_to
          );
          
          if (reportsToRole) {
            await tx.companyRole.update({
              where: { id: role.id },
              data: { reports_to_id: reportsToRole.id },
            });
          }
        }
      }

      return createdRoles;
    });

    // Audit log
    await createAuditLog({
      companyId,
      actorId: user.id,
      action: 'role_template_applied',
      entityType: 'company_role',
      entityId: companyId,
      newState: {
        template_id: templateId,
        template_name: template.name,
        roles_created: result.length,
        overwrite,
        applied_by: user.email,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      message: `${template.name} applied successfully`,
      rolesCreated: result.length,
      roles: result.map(r => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        authorityLevel: r.authority_level,
      })),
    }, { status: 201 });
  } catch (error) {
    console.error('[APPLY ROLE TEMPLATE] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to apply template', details: errorMessage },
      { status: 500 }
    );
  }
}





