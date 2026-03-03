import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireRole, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/employees
 *
 * Returns a paginated list of employees for the authenticated user's company.
 * Only accessible by admin, hr, and director roles.
 *
 * Query params:
 *   page        - page number (default: 1)
 *   limit       - results per page (default: 50, max: 100)
 *   search      - filter by name or email
 *   status      - filter by EmployeeStatus
 *   department  - filter by department
 *   role        - filter by primary_role
 */
export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    requireRole(employee, 'admin', 'hr', 'director', 'manager');

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
    const search = searchParams.get('search')?.trim() ?? '';
    const status = searchParams.get('status') ?? undefined;
    const department = searchParams.get('department')?.trim() ?? undefined;
    const role = searchParams.get('role') ?? undefined;

    const where: Record<string, unknown> = {
      org_id: employee.org_id,
      deleted_at: null,
    };

    if (search) {
      where.OR = [
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { designation: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;
    if (department) where.department = { contains: department, mode: 'insensitive' };
    if (role) where.primary_role = role;

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          phone: true,
          primary_role: true,
          department: true,
          designation: true,
          status: true,
          date_of_joining: true,
          manager_id: true,
          manager: { select: { first_name: true, last_name: true } },
          created_at: true,
        },
        orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.employee.count({ where }),
    ]);

    return NextResponse.json({
      employees,
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
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
