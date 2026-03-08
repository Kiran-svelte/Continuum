import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/leaves/list
 *
 * Returns leave requests.
 * - Employees see only their own requests.
 * - Managers see their direct reports' requests.
 * - HR/admin/director see all company requests.
 *
 * Query params:
 *   page    - page number (default: 1)
 *   limit   - results per page (default: 20, max: 100)
 *   status  - filter by LeaveRequestStatus (comma-separated for multiple, e.g. "pending,approved")
 *   year    - filter by year (default: current year)
 *   emp_id  - filter by specific employee (HR/admin only)
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

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const status = searchParams.get('status') ?? undefined;
    const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()), 10);
    const empIdFilter = searchParams.get('emp_id') ?? undefined;

    const isHrOrAdmin =
      employee.primary_role === 'hr' ||
      employee.primary_role === 'admin' ||
      employee.primary_role === 'director';

    const isManager = employee.primary_role === 'manager' || employee.primary_role === 'team_lead';

    const where: Record<string, unknown> = {
      company_id: employee.org_id,
    };

    // Scope results based on role
    if (!isHrOrAdmin) {
      if (isManager) {
        // Managers see their team's requests
        const teamIds = await prisma.employee
          .findMany({
            where: { manager_id: employee.id, deleted_at: null },
            select: { id: true },
          })
          .then((rows) => rows.map((r) => r.id));
        // Also include own requests
        teamIds.push(employee.id);
        where.emp_id = { in: teamIds };
      } else {
        // Regular employees see only their own
        where.emp_id = employee.id;
      }
    } else if (empIdFilter) {
      where.emp_id = empIdFilter;
    }

    if (status) {
      const statuses = status.split(',').map((s) => s.trim()).filter(Boolean);
      if (statuses.length === 1) {
        where.status = statuses[0];
      } else if (statuses.length > 1) {
        where.status = { in: statuses };
      }
    }

    // Year filter using date range
    where.start_date = {
      gte: new Date(`${year}-01-01`),
      lt: new Date(`${year + 1}-01-01`),
    };

    const [requests, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              department: true,
              designation: true,
            },
          },
          approver: {
            select: { first_name: true, last_name: true },
          },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.leaveRequest.count({ where }),
    ]);

    return NextResponse.json({
      requests,
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
