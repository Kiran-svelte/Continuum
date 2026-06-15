import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Validation schemas
const permissionSchema = z.object({
  code: z.string().min(1, 'Permission code is required'),
  module: z.string().min(1, 'Module is required'),
  description: z.string().optional(),
});

// Pagination schema
const paginationSchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('50'),
  search: z.string().optional(),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * GET /api/permissions
 * List all permissions with pagination, filtering, and sorting
 * Requires: Super Admin or Admin with permission.manage_roles
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const paginationParams = {
      page: searchParams.get('page') ?? '1',
      limit: searchParams.get('limit') ?? '50',
      search: searchParams.get('search') ?? undefined,
      sortBy: searchParams.get('sortBy') ?? 'createdAt',
      sortOrder: searchParams.get('sortOrder') as 'asc' | 'desc' ?? 'desc',
    };

    // Validate pagination params
    const pagination = paginationSchema.parse(paginationParams);
    
    const page = Math.max(1, parseInt(pagination.page, 10));
    const limit = Math.min(100, Math.max(1, parseInt(pagination.limit, 10)));
    const search = pagination.search?.trim() ?? '';
    const sortBy = pagination.sortBy;
    const sortOrder = pagination.sortOrder;

    // Build where clause
    const where: Record<string, unknown> = {};
    
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { module: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get permissions with pagination
    const [permissions, total] = await Promise.all([
      prisma.permission.findMany({
        where,
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.permission.count({ where }),
    ]);

    return NextResponse.json({
      permissions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
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
 * POST /api/permissions
 * Create a new permission
 * Requires: Super Admin or Admin with permission.manage_roles
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    
    // Validate request body
    const validatedData = permissionSchema.parse(body);
    
    // Check if permission code already exists
    const existingPermission = await prisma.permission.findUnique({
      where: { code: validatedData.code },
    });
    
    if (existingPermission) {
      return NextResponse.json(
        { error: 'Permission with this code already exists' },
        { status: 409 }
      );
    }

    // Create permission
    const permission = await prisma.permission.create({
      data: {
        id: crypto.randomUUID(),
        code: validatedData.code,
        module: validatedData.module,
        description: validatedData.description,
      },
    });

    return NextResponse.json(
      {
        message: 'Permission created successfully',
        permission,
      },
      { status: 201 }
    );
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