import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireRole, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog } from '@/lib/audit';
import { sendNotification } from '@/lib/notification-service';

export const dynamic = 'force-dynamic';

// ─── GET: List Exit Checklist Items ─────────────────────────────────────────

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
    const employeeIdFilter = searchParams.get('employee_id') || undefined;
    const statusFilter = searchParams.get('status') || undefined;

    const isHrOrAdmin =
      employee.primary_role === 'admin' ||
      employee.primary_role === 'hr' ||
      employee.primary_role === 'director' ||
      (employee.secondary_roles &&
        (employee.secondary_roles.includes('admin') ||
          employee.secondary_roles.includes('hr') ||
          employee.secondary_roles.includes('director')));

    // Build where clause with tenant isolation
    const where: Record<string, unknown> = {
      company_id: employee.org_id,
    };

    // Employees can only see their own; HR/admin see all in company
    if (!isHrOrAdmin) {
      where.emp_id = employee.id;
    } else if (employeeIdFilter) {
      where.emp_id = employeeIdFilter;
    }

    if (statusFilter) {
      where.status = statusFilter;
    }

    const checklists = await prisma.exitChecklist.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            department: true,
            email: true,
            designation: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ checklists });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[ExitChecklist GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST: Create Exit Checklist Item ───────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();
    requireRole(employee, 'admin', 'hr');

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const body = await request.json();
    const { emp_id, items, custom_items, status } = body;

    // Validation
    const errors: string[] = [];

    if (!emp_id || typeof emp_id !== 'string') {
      errors.push('Employee ID is required.');
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      errors.push('Items array is required and must not be empty.');
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(' ') }, { status: 400 });
    }

    // Verify the target employee belongs to the same company
    const targetEmployee = await prisma.employee.findFirst({
      where: {
        id: emp_id,
        org_id: employee.org_id,
        deleted_at: null,
      },
      select: { id: true, first_name: true, last_name: true },
    });

    if (!targetEmployee) {
      return NextResponse.json(
        { error: 'Employee not found in your organization.' },
        { status: 404 }
      );
    }

    const checklist = await prisma.exitChecklist.create({
      data: {
        emp_id,
        company_id: employee.org_id,
        items: items,
        custom_items: custom_items || null,
        status: status || 'not_started',
      },
      include: {
        employee: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            department: true,
            email: true,
            designation: true,
          },
        },
      },
    });

    // Audit log
    await createAuditLog({
      companyId: employee.org_id,
      actorId: employee.id,
      action: 'EXIT_CHECKLIST_CREATE',
      entityType: 'ExitChecklist',
      entityId: checklist.id,
      newState: {
        emp_id,
        items,
        custom_items: custom_items || null,
        status: checklist.status,
      },
    }).catch((err) => console.error('[Audit log error]', err));

    // Notify the assigned employee about their exit checklist
    const itemCount = Array.isArray(items) ? items.length : 0;
    void sendNotification(
      emp_id,
      employee.org_id,
      'exit_checklist',
      'Exit Checklist Assigned',
      `${itemCount} exit checklist item${itemCount !== 1 ? 's have' : ' has'} been assigned to you. Please review and complete them.`
    ).catch(() => {});

    return NextResponse.json({ checklist }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[ExitChecklist POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── PATCH: Update Exit Checklist (Mark Complete/Incomplete) ────────────────

export async function PATCH(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const body = await request.json();
    const { id, completed } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Checklist ID is required.' }, { status: 400 });
    }

    if (typeof completed !== 'boolean') {
      return NextResponse.json(
        { error: 'Completed field must be a boolean.' },
        { status: 400 }
      );
    }

    // Fetch with tenant isolation
    const checklist = await prisma.exitChecklist.findFirst({
      where: {
        id,
        company_id: employee.org_id,
      },
    });

    if (!checklist) {
      return NextResponse.json({ error: 'Exit checklist not found.' }, { status: 404 });
    }

    const previousState = {
      status: checklist.status,
      completed_at: checklist.completed_at,
    };

    const newStatus = completed ? 'completed' : 'in_progress';
    const completedAt = completed ? new Date() : null;

    const updated = await prisma.exitChecklist.update({
      where: { id },
      data: {
        status: newStatus,
        completed_at: completedAt,
      },
      include: {
        employee: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            department: true,
            email: true,
            designation: true,
          },
        },
      },
    });

    // Audit log
    await createAuditLog({
      companyId: employee.org_id,
      actorId: employee.id,
      action: completed ? 'EXIT_CHECKLIST_COMPLETE' : 'EXIT_CHECKLIST_REOPEN',
      entityType: 'ExitChecklist',
      entityId: id,
      previousState,
      newState: {
        status: newStatus,
        completed_at: completedAt?.toISOString() || null,
      },
    }).catch((err) => console.error('[Audit log error]', err));

    return NextResponse.json({ checklist: updated });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[ExitChecklist PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── DELETE: Remove Exit Checklist Item ─────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();
    requireRole(employee, 'admin', 'hr');

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const body = await request.json();
    const { id } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Checklist ID is required.' }, { status: 400 });
    }

    // Fetch with tenant isolation
    const checklist = await prisma.exitChecklist.findFirst({
      where: {
        id,
        company_id: employee.org_id,
      },
    });

    if (!checklist) {
      return NextResponse.json({ error: 'Exit checklist not found.' }, { status: 404 });
    }

    const previousState = {
      emp_id: checklist.emp_id,
      items: checklist.items,
      custom_items: checklist.custom_items,
      status: checklist.status,
      completed_at: checklist.completed_at,
    };

    await prisma.exitChecklist.delete({ where: { id } });

    // Audit log
    await createAuditLog({
      companyId: employee.org_id,
      actorId: employee.id,
      action: 'EXIT_CHECKLIST_DELETE',
      entityType: 'ExitChecklist',
      entityId: id,
      previousState,
    }).catch((err) => console.error('[Audit log error]', err));

    return NextResponse.json({ message: 'Exit checklist deleted successfully.' });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[ExitChecklist DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
