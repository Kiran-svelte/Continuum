import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { sanitizeInput } from '@/lib/security';
import { sendNotification } from '@/lib/notification-service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/attendance/regularize
 *
 * Submit an attendance regularization request.
 * Any authenticated employee can submit.
 * Body: { date: string (YYYY-MM-DD), reason: string }
 */
export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { date, reason } = body as { date?: string; reason?: string };

    // Validate date
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'A valid date in YYYY-MM-DD format is required.' },
        { status: 400 }
      );
    }

    const parsedDate = new Date(date + 'T00:00:00Z');
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date value.' },
        { status: 400 }
      );
    }

    // Date must not be in the future
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (parsedDate > today) {
      return NextResponse.json(
        { error: 'Cannot submit regularization for a future date.' },
        { status: 400 }
      );
    }

    // Validate reason
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'A reason is required.' },
        { status: 400 }
      );
    }

    if (reason.length > 1000) {
      return NextResponse.json(
        { error: 'Reason must be 1000 characters or fewer.' },
        { status: 400 }
      );
    }

    const sanitizedReason = sanitizeInput(reason.trim());

    // Check for duplicate pending/approved regularization on the same date
    const existing = await prisma.attendanceRegularization.findFirst({
      where: {
        emp_id: employee.id,
        company_id: employee.org_id!,
        date: parsedDate,
        status: { in: ['pending', 'approved'] },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'You already have a pending regularization request for this date.' },
        { status: 409 }
      );
    }

    // Find matching attendance record for the date if it exists
    const startOfDay = new Date(date + 'T00:00:00Z');
    const endOfDay = new Date(date + 'T23:59:59.999Z');

    const attendanceRecord = await prisma.attendance.findFirst({
      where: {
        emp_id: employee.id,
        company_id: employee.org_id!,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: { id: true },
    });

    const regularization = await prisma.attendanceRegularization.create({
      data: {
        emp_id: employee.id,
        company_id: employee.org_id!,
        attendance_id: attendanceRecord?.id ?? null,
        date: parsedDate,
        reason: sanitizedReason,
        status: 'pending',
      },
    });

    await createAuditLog({
      companyId: employee.org_id!,
      actorId: employee.id,
      action: AUDIT_ACTIONS.ATTENDANCE_REGULARIZE,
      entityType: 'AttendanceRegularization',
      entityId: regularization.id,
      newState: {
        date,
        reason: sanitizedReason,
        status: 'pending',
        attendance_id: attendanceRecord?.id ?? null,
      },
    });

    // Notify the employee's manager about the regularization request
    const empRecord = await prisma.employee.findUnique({
      where: { id: employee.id },
      select: { manager_id: true },
    });
    if (empRecord?.manager_id) {
      void sendNotification(
        empRecord.manager_id,
        employee.org_id!,
        'attendance',
        'Regularization Request',
        `${employee.first_name} ${employee.last_name} submitted an attendance regularization for ${date}.`
      ).catch(() => {});
    }

    return NextResponse.json(regularization, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/attendance/regularize
 *
 * List regularization requests.
 * - Managers: pending requests from their direct reports
 * - HR / Admin: all pending requests for their company
 * - Employees: their own requests
 *
 * Query params:
 *   status - filter by status (pending | approved | rejected)
 *   page   - page number (default 1)
 *   limit  - items per page (default 20, max 100)
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
    const statusFilter = searchParams.get('status') as 'pending' | 'approved' | 'rejected' | null;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const skip = (page - 1) * limit;

    const isManager = employee.primary_role === 'manager' || employee.primary_role === 'director';
    const isHrOrAdmin = employee.primary_role === 'hr' || employee.primary_role === 'admin';

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      company_id: employee.org_id!,
    };

    if (statusFilter && ['pending', 'approved', 'rejected'].includes(statusFilter)) {
      where.status = statusFilter;
    }

    if (isHrOrAdmin) {
      // HR/Admin see all for their company -- no extra filter
    } else if (isManager) {
      // Managers see requests from their direct reports
      const directReports = await prisma.employee.findMany({
        where: {
          manager_id: employee.id,
          org_id: employee.org_id!,
          deleted_at: null,
        },
        select: { id: true },
      });
      const reportIds = directReports.map((r) => r.id);
      where.emp_id = { in: [...reportIds, employee.id] };
    } else {
      // Regular employees see only their own
      where.emp_id = employee.id;
    }

    const [regularizations, total] = await Promise.all([
      prisma.attendanceRegularization.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
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
        },
      }),
      prisma.attendanceRegularization.count({ where }),
    ]);

    return NextResponse.json({
      regularizations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
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
