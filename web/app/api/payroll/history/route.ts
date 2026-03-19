import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireRole, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';

export const dynamic = 'force-dynamic';

const VALID_STATUSES = ['draft', 'generated', 'under_review', 'approved', 'rejected', 'processed', 'paid'] as const;

export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();
    requireRole(employee, 'hr', 'admin');

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const yearStr = searchParams.get('year');
    const year = yearStr ? parseInt(yearStr, 10) : undefined;
    const status = searchParams.get('status') || undefined;

    const where: Record<string, unknown> = { company_id: employee.org_id! };
    if (year && !isNaN(year)) where.year = year;
    if (status && (VALID_STATUSES as readonly string[]).includes(status)) where.status = status;

    const [runs, total] = await Promise.all([
      prisma.payrollRun.findMany({
        where,
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          generator: { select: { first_name: true, last_name: true } },
          approver: { select: { first_name: true, last_name: true } },
          _count: { select: { slips: true } },
        },
      }),
      prisma.payrollRun.count({ where }),
    ]);

    return NextResponse.json({
      runs: runs.map((r) => ({
        id: r.id,
        month: r.month,
        year: r.year,
        status: r.status,
        total_gross: r.total_gross,
        total_deductions: r.total_deductions,
        total_net: r.total_net,
        total_pf: r.total_pf,
        total_esi: r.total_esi,
        total_tds: r.total_tds,
        employee_count: r.employee_count,
        slip_count: r._count.slips,
        generated_by: r.generator
          ? `${r.generator.first_name} ${r.generator.last_name}`
          : null,
        approved_by: r.approver
          ? `${r.approver.first_name} ${r.approver.last_name}`
          : null,
        created_at: r.created_at,
        updated_at: r.updated_at,
      })),
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
