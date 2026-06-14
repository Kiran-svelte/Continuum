import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireCompanyContext, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { parseBoundedInt } from '@/lib/api-guards';
import { assertModule } from '@/lib/core-functions/assert-module';

export const dynamic = 'force-dynamic';

/**
 * GET /api/directory
 *
 * Company people directory (read-only). Requires the directory module.
 * All active employees may browse colleagues in their company (read-only).
 */
export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const moduleGuard = await assertModule(employee.org_id!, 'directory');
    if (moduleGuard) return moduleGuard;

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseBoundedInt(searchParams.get('page'), {
      defaultValue: 1,
      min: 1,
      max: 10000,
    });
    const limit = parseBoundedInt(searchParams.get('limit'), {
      defaultValue: 50,
      min: 1,
      max: 100,
    });
    const search = searchParams.get('search')?.trim() ?? '';
    const department = searchParams.get('department')?.trim() ?? undefined;

    const where: Record<string, unknown> = {
      org_id: employee.org_id,
      deleted_at: null,
      status: { in: ['active', 'probation', 'onboarding'] },
    };

    if (department) {
      where.department = { contains: department, mode: 'insensitive' };
    }

    if (search) {
      where.OR = [
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } },
        { designation: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          department: true,
          designation: true,
          primary_role: true,
          status: true,
          date_of_joining: true,
          manager: {
            select: { first_name: true, last_name: true },
          },
        },
        orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.employee.count({ where }),
    ]);

    return NextResponse.json({
      employees: employees.map((row) => ({
        id: row.id,
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
        department: row.department,
        designation: row.designation,
        primary_role: row.primary_role,
        status: row.status,
        date_of_joining: row.date_of_joining,
        manager_name: row.manager
          ? `${row.manager.first_name} ${row.manager.last_name}`.trim()
          : null,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
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
