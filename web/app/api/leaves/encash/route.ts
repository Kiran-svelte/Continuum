import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { sanitizeInput } from '@/lib/security';

export const dynamic = 'force-dynamic';

// ─── Validation ─────────────────────────────────────────────────────────────

const encashmentSchema = z.object({
  leaveType: z.string().min(1).max(20),
  days: z.number().positive('days must be greater than 0'),
});

// ─── POST - Submit encashment request ───────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();

    const rateLimit = checkApiRateLimit(employee.id, 'leaves/submit');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const body = await request.json();
    const parsed = encashmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { days } = parsed.data;
    const leaveType = sanitizeInput(parsed.data.leaveType);
    const currentYear = new Date().getFullYear();

    // Look up company leave type configuration
    const leaveTypeConfig = await prisma.leaveType.findUnique({
      where: {
        company_id_code: { company_id: employee.org_id, code: leaveType },
      },
      select: {
        encashment_enabled: true,
        encashment_max_days: true,
        is_active: true,
        name: true,
      },
    });

    if (!leaveTypeConfig || !leaveTypeConfig.is_active) {
      return NextResponse.json(
        { error: 'This leave type is not configured for your company' },
        { status: 400 }
      );
    }

    if (!leaveTypeConfig.encashment_enabled) {
      return NextResponse.json(
        { error: 'Encashment is not enabled for this leave type' },
        { status: 400 }
      );
    }

    if (days > leaveTypeConfig.encashment_max_days) {
      return NextResponse.json(
        {
          error: `Cannot encash more than ${leaveTypeConfig.encashment_max_days} days for ${leaveTypeConfig.name}`,
          max_days: leaveTypeConfig.encashment_max_days,
        },
        { status: 400 }
      );
    }

    // Check leave balance
    const balance = await prisma.leaveBalance.findUnique({
      where: {
        emp_id_leave_type_year: {
          emp_id: employee.id,
          leave_type: leaveType,
          year: currentYear,
        },
      },
    });

    if (!balance) {
      return NextResponse.json(
        { error: 'No leave balance found for this leave type in the current year' },
        { status: 400 }
      );
    }

    if (balance.remaining < days) {
      return NextResponse.json(
        {
          error: 'Insufficient leave balance for encashment',
          remaining: balance.remaining,
          requested: days,
        },
        { status: 400 }
      );
    }

    // Create the encashment record with status 'pending'
    const encashment = await prisma.leaveEncashment.create({
      data: {
        emp_id: employee.id,
        company_id: employee.org_id,
        leave_type: leaveType,
        days,
        amount: 0, // Amount to be calculated by HR/payroll on approval
        status: 'pending',
      },
    });

    // Audit log
    await createAuditLog({
      companyId: employee.org_id,
      actorId: employee.id,
      action: AUDIT_ACTIONS.LEAVE_ENCASHMENT_REQUEST,
      entityType: 'LeaveEncashment',
      entityId: encashment.id,
      newState: {
        leave_type: leaveType,
        days,
        status: 'pending',
      },
    });

    return NextResponse.json(encashment, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── GET - List encashment requests ─────────────────────────────────────────

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

    const isHrOrAdmin =
      employee.primary_role === 'hr' ||
      employee.primary_role === 'admin' ||
      employee.primary_role === 'director';

    const where: Record<string, unknown> = {
      company_id: employee.org_id,
    };

    // Employees see only their own; HR/admin see all for company
    if (!isHrOrAdmin) {
      where.emp_id = employee.id;
    }

    if (status) {
      where.status = status;
    }

    const [encashments, total] = await Promise.all([
      prisma.leaveEncashment.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              department: true,
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
      prisma.leaveEncashment.count({ where }),
    ]);

    return NextResponse.json({
      encashments,
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
