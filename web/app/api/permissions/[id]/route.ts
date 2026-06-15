import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Validation schema
const permissionSchema = z.object({
  code: z.string().min(1, 'Permission code is required'),
  module: z.string().min(1, 'Module is required'),
  description: z.string().optional(),
});

/**
 * GET /api/permissions/[id]
 * Get a permission by ID
 * Requires: Super Admin or Admin with permission.manage_roles
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const employee = await getAuthEmployee(request);
    
    // Rate limiting
    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    // Authorization: Super Admin or Admin with manage_roles permission
    requirePermissionGuard(employee, 'security.manage_roles');

    const { id } = await params;
    
    const permission = await prisma.permission.findUnique({
      where: { id },
    });
    
    if (!permission) {
      return NextResponse.json(
        { error: 'Permission not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ permission });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/permissions/[id]
 * Update a permission by ID
 * Requires: Super Admin or Admin with permission.manage_roles
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const employee = await getAuthEmployee(request);
    
    // Rate limiting
    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    // Authorization: Super Admin or Admin with manage_roles permission
    requirePermissionGuard(employee, 'security.manage_roles');

    const { id } = await params;
    
    const body = await request.json();
    
    // Validate request body
    const validatedData = permissionSchema.partial().parse(body);
    
    // Check if permission exists
    const existingPermission = await prisma.permission.findUnique({
      where: { id },
    });
    
    if (!existingPermission) {
      return NextResponse.json(
        { error: 'Permission not found' },
        { status: 404 }
      );
    }

    // If updating code, check if new code already exists
    if (validatedData.code && validatedData.code !== existingPermission.code) {
      const duplicatePermission = await prisma.permission.findUnique({
        where: { code: validatedData.code },
      });
      
      if (duplicatePermission) {
        return NextResponse.json(
          { error: 'Permission with this code already exists' },
          { status: 409 }
        );
      }
    }

    // Update permission
    const permission = await prisma.permission.update({
      where: { id },
      data: validatedData,
    });

    return NextResponse.json({
      message: 'Permission updated successfully',
      permission,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/permissions/[id]
 * Delete a permission by ID
 * Requires: Super Admin or Admin with permission.manage_roles
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const employee = await getAuthEmployee(request);
    
    // Rate limiting
    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    // Authorization: Super Admin or Admin with manage_roles permission
    requirePermissionGuard(employee, 'security.manage_roles');

    const { id } = await params;
    
    // Check if permission exists
    const existingPermission = await prisma.permission.findUnique({
      where: { id },
    });
    
    if (!existingPermission) {
      return NextResponse.json(
        { error: 'Permission not found' },
        { status: 404 }
      );
    }

    // Check if permission is being used by any roles
    const rolePermissions = await prisma.rolePermission.findFirst({
      where: { permission_id: id },
    });
    
    if (rolePermissions) {
      return NextResponse.json(
        { error: 'Cannot delete permission that is assigned to roles' },
        { status: 400 }
      );
    }

    // Check if permission is being used by company roles
    const companyRolePermissions = await prisma.companyRolePermission.findFirst({
      where: { permission_id: id },
    });
    
    if (companyRolePermissions) {
      return NextResponse.json(
        { error: 'Cannot delete permission that is assigned to company roles' },
        { status: 400 }
      );
    }

    // Delete permission
    await prisma.permission.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Permission deleted successfully',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
