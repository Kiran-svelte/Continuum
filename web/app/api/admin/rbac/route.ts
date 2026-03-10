import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireRole, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { PERMISSION_CATALOG, DEFAULT_ROLE_PERMISSIONS, VALID_ROLES } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

/**
 * GET: Fetch the full RBAC matrix for the company.
 * Returns: permission catalog + per-role assignments (DB overrides or defaults).
 */
export async function GET(request: NextRequest) {
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

    // Fetch company-specific overrides from DB
    const dbPermissions = await prisma.rolePermission.findMany({
      where: { company_id: employee.org_id },
      include: { permission: { select: { code: true } } },
    });

    // Build a map: role → Set of permission codes from DB
    const dbMatrix: Record<string, Set<string>> = {};
    for (const rp of dbPermissions) {
      if (!dbMatrix[rp.role]) dbMatrix[rp.role] = new Set();
      dbMatrix[rp.role].add(rp.permission.code);
    }

    const hasOverrides = dbPermissions.length > 0;

    // Build the response matrix: for each role, list permission codes
    const matrix: Record<string, string[]> = {};
    for (const role of VALID_ROLES) {
      if (hasOverrides && dbMatrix[role]) {
        matrix[role] = [...dbMatrix[role]];
      } else {
        matrix[role] = DEFAULT_ROLE_PERMISSIONS[role] || [];
      }
    }

    return NextResponse.json({
      permissions: PERMISSION_CATALOG,
      roles: VALID_ROLES,
      matrix,
      has_overrides: hasOverrides,
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

const toggleSchema = z.object({
  role: z.enum(['admin', 'hr', 'director', 'manager', 'team_lead', 'employee']),
  permission_code: z.string().min(1),
  enabled: z.boolean(),
});

/**
 * PATCH: Toggle a single role-permission assignment.
 * If no company overrides exist yet, seeds from defaults first.
 */
export async function PATCH(request: NextRequest) {
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
    const parsed = toggleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { role, permission_code, enabled } = parsed.data;

    // Find the permission record
    const permission = await prisma.permission.findUnique({
      where: { code: permission_code },
    });

    if (!permission) {
      return NextResponse.json({ error: 'Permission not found' }, { status: 404 });
    }

    // Check if company has any overrides yet
    const existingOverrides = await prisma.rolePermission.count({
      where: { company_id: employee.org_id },
    });

    // If no overrides exist, seed from defaults first
    if (existingOverrides === 0) {
      const allPermissions = await prisma.permission.findMany();
      const permCodeToId: Record<string, string> = {};
      for (const p of allPermissions) {
        permCodeToId[p.code] = p.id;
      }

      const seedData: { role: 'admin' | 'hr' | 'director' | 'manager' | 'team_lead' | 'employee'; permission_id: string; company_id: string }[] = [];
      for (const r of VALID_ROLES) {
        const perms = DEFAULT_ROLE_PERMISSIONS[r] || [];
        for (const code of perms) {
          if (permCodeToId[code]) {
            seedData.push({
              role: r as 'admin' | 'hr' | 'director' | 'manager' | 'team_lead' | 'employee',
              permission_id: permCodeToId[code],
              company_id: employee.org_id,
            });
          }
        }
      }

      if (seedData.length > 0) {
        await prisma.rolePermission.createMany({
          data: seedData,
          skipDuplicates: true,
        });
      }
    }

    if (enabled) {
      // Grant: create role-permission if not exists
      await prisma.rolePermission.upsert({
        where: {
          role_permission_id_company_id: {
            role: role as 'admin' | 'hr' | 'director' | 'manager' | 'team_lead' | 'employee',
            permission_id: permission.id,
            company_id: employee.org_id,
          },
        },
        create: {
          role: role as 'admin' | 'hr' | 'director' | 'manager' | 'team_lead' | 'employee',
          permission_id: permission.id,
          company_id: employee.org_id,
        },
        update: {},
      });
    } else {
      // Revoke: delete role-permission
      await prisma.rolePermission.deleteMany({
        where: {
          role: role as 'admin' | 'hr' | 'director' | 'manager' | 'team_lead' | 'employee',
          permission_id: permission.id,
          company_id: employee.org_id,
        },
      });
    }

    await createAuditLog({
      companyId: employee.org_id,
      actorId: employee.id,
      action: AUDIT_ACTIONS.PERMISSION_CHANGE,
      entityType: 'RolePermission',
      entityId: permission.id,
      previousState: { role, permission_code, enabled: !enabled },
      newState: { role, permission_code, enabled },
    });

    return NextResponse.json({ success: true, role, permission_code, enabled });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
