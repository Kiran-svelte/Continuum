import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireRole, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// ─── GET: List salary revisions ─────────────────────────────────────────────

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
    const employeeId = searchParams.get('employee_id');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

    const isHrOrAdmin =
      employee.primary_role === 'hr' ||
      employee.primary_role === 'admin' ||
      (employee.secondary_roles && (employee.secondary_roles.includes('hr') || employee.secondary_roles.includes('admin')));

    // Build where clause
    const where: Record<string, unknown> = { company_id: employee.org_id };

    if (employeeId) {
      // Non-HR/admin employees can only view their own revisions
      if (!isHrOrAdmin && employeeId !== employee.id) {
        return NextResponse.json(
          { error: 'Forbidden: you can only view your own revision history' },
          { status: 403 }
        );
      }
      where.emp_id = employeeId;
    } else if (!isHrOrAdmin) {
      // Regular employees can only see their own
      where.emp_id = employee.id;
    }

    const [revisions, total] = await Promise.all([
      prisma.salaryRevision.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          employee: {
            select: {
              first_name: true,
              last_name: true,
              email: true,
              department: true,
              designation: true,
            },
          },
          approver: {
            select: {
              first_name: true,
              last_name: true,
            },
          },
        },
      }),
      prisma.salaryRevision.count({ where }),
    ]);

    const formatted = revisions.map((r) => ({
      id: r.id,
      emp_id: r.emp_id,
      employee_name: `${r.employee.first_name} ${r.employee.last_name}`,
      email: r.employee.email,
      department: r.employee.department,
      designation: r.employee.designation,
      old_ctc: r.old_ctc,
      new_ctc: r.new_ctc,
      change_percent: r.old_ctc > 0 ? ((r.new_ctc - r.old_ctc) / r.old_ctc) * 100 : 0,
      effective_from: r.effective_from,
      reason: r.reason,
      approved_by: r.approved_by,
      approver_name: r.approver ? `${r.approver.first_name} ${r.approver.last_name}` : null,
      created_at: r.created_at,
    }));

    return NextResponse.json({
      revisions: formatted,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
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

// ─── POST: Create a salary revision record (HR/admin only) ──────────────────

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { employee_id, previous_ctc, new_ctc, effective_date, reason } = body;

    // Validation
    if (!employee_id || typeof employee_id !== 'string') {
      return NextResponse.json({ error: 'employee_id is required' }, { status: 400 });
    }

    if (typeof previous_ctc !== 'number' || previous_ctc < 0) {
      return NextResponse.json({ error: 'previous_ctc must be a non-negative number' }, { status: 400 });
    }

    if (typeof new_ctc !== 'number' || new_ctc <= 0) {
      return NextResponse.json({ error: 'new_ctc must be a positive number' }, { status: 400 });
    }

    if (!effective_date) {
      return NextResponse.json({ error: 'effective_date is required' }, { status: 400 });
    }

    // Verify target employee exists in the same company
    const targetEmp = await prisma.employee.findUnique({
      where: { id: employee_id },
      select: { id: true, org_id: true, first_name: true, last_name: true },
    });

    if (!targetEmp || targetEmp.org_id !== employee.org_id) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const revision = await prisma.salaryRevision.create({
      data: {
        emp_id: employee_id,
        company_id: employee.org_id,
        old_ctc: previous_ctc,
        new_ctc,
        effective_from: new Date(effective_date),
        reason: reason || null,
        approved_by: employee.id,
      },
    });

    await createAuditLog({
      companyId: employee.org_id,
      actorId: employee.id,
      action: AUDIT_ACTIONS.EMPLOYEE_UPDATE,
      entityType: 'SalaryRevision',
      entityId: revision.id,
      previousState: { ctc: previous_ctc },
      newState: { ctc: new_ctc, effective_from: effective_date, emp_id: employee_id },
    });

    return NextResponse.json(revision, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
