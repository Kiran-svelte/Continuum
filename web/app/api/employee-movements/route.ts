import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireRole, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// ─── Zod Schemas ────────────────────────────────────────────────────────────

const createMovementSchema = z.object({
  emp_id: z.string().uuid('Invalid employee ID'),
  type: z.enum(['transfer', 'promotion', 'role_change', 'department_change']),
  from_value: z.string().min(1, 'From value is required'),
  to_value: z.string().min(1, 'To value is required'),
  effective_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid ISO date string',
  }),
});

const patchMovementSchema = z.object({
  id: z.string().uuid('Invalid movement ID'),
  action: z.enum(['approve', 'reject']),
});

// ─── GET /api/employee-movements ─────────────────────────────────────────────

/**
 * Lists employee movements for the authenticated user's company.
 * HR/admin see all movements. Supports pagination and filters.
 *
 * Query params:
 *   page   - page number (default: 1)
 *   limit  - results per page (default: 20, max: 100)
 *   status - filter by ApprovalStatus (pending, approved, rejected)
 *   type   - filter by MovementType
 *   emp_id - filter by employee ID
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

    requireRole(employee, 'admin', 'hr');

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const status = searchParams.get('status') ?? undefined;
    const type = searchParams.get('type') ?? undefined;
    const empId = searchParams.get('emp_id') ?? undefined;

    const where: Record<string, unknown> = {
      company_id: employee.org_id!,
    };

    if (status) where.status = status;
    if (type) where.type = type;
    if (empId) where.emp_id = empId;

    const [movements, total] = await Promise.all([
      prisma.employeeMovement.findMany({
        where,
        select: {
          id: true,
          emp_id: true,
          type: true,
          from_value: true,
          to_value: true,
          effective_date: true,
          status: true,
          approved_by: true,
          created_at: true,
          employee: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              department: true,
              designation: true,
              primary_role: true,
            },
          },
          approver: {
            select: {
              first_name: true,
              last_name: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.employeeMovement.count({ where }),
    ]);

    return NextResponse.json({
      movements,
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

// ─── POST /api/employee-movements ────────────────────────────────────────────

/**
 * Creates a new employee movement record.
 * Only accessible by admin and hr roles.
 */
export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    requireRole(employee, 'admin', 'hr');

    const body = await request.json();
    const parsed = createMovementSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => e.message).join(' ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { emp_id, type, from_value, to_value, effective_date } = parsed.data;

    // Verify employee exists and belongs to the same company
    const targetEmployee = await prisma.employee.findFirst({
      where: {
        id: emp_id,
        org_id: employee.org_id!,
        deleted_at: null,
      },
      select: { id: true, first_name: true, last_name: true },
    });

    if (!targetEmployee) {
      return NextResponse.json(
        { error: 'Employee not found or does not belong to your company.' },
        { status: 404 }
      );
    }

    const movement = await prisma.employeeMovement.create({
      data: {
        emp_id,
        company_id: employee.org_id!,
        type,
        from_value,
        to_value,
        effective_date: new Date(effective_date),
        status: 'pending',
      },
    });

    await createAuditLog({
      companyId: employee.org_id!,
      actorId: employee.id,
      action: AUDIT_ACTIONS.EMPLOYEE_MOVEMENT,
      entityType: 'EmployeeMovement',
      entityId: movement.id,
      newState: {
        emp_id,
        type,
        from_value,
        to_value,
        effective_date,
        employee_name: `${targetEmployee.first_name} ${targetEmployee.last_name}`,
      },
    });

    return NextResponse.json(
      { message: 'Movement created successfully.', movement },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── PATCH /api/employee-movements ───────────────────────────────────────────

/**
 * Approves or rejects an employee movement.
 * On approval, updates the relevant employee field in a transaction.
 * Cannot approve own movement.
 */
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

    requireRole(employee, 'admin', 'hr');

    const body = await request.json();
    const parsed = patchMovementSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => e.message).join(' ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { id, action } = parsed.data;

    // Fetch the movement and ensure it belongs to the same company
    const movement = await prisma.employeeMovement.findFirst({
      where: {
        id,
        company_id: employee.org_id!,
      },
      include: {
        employee: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            department: true,
            designation: true,
            primary_role: true,
          },
        },
      },
    });

    if (!movement) {
      return NextResponse.json(
        { error: 'Movement not found.' },
        { status: 404 }
      );
    }

    if (movement.status !== 'pending') {
      return NextResponse.json(
        { error: `Movement has already been ${movement.status}.` },
        { status: 400 }
      );
    }

    // Cannot approve own movement
    if (movement.emp_id === employee.id) {
      return NextResponse.json(
        { error: 'You cannot approve or reject your own movement.' },
        { status: 403 }
      );
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    if (action === 'approve') {
      // Use a transaction to update movement status and employee record atomically
      await prisma.$transaction(async (tx) => {
        // Update movement status
        await tx.employeeMovement.update({
          where: { id },
          data: {
            status: newStatus,
            approved_by: employee.id,
          },
        });

        // Update the employee's relevant field based on movement type
        const updateData: Record<string, unknown> = {};

        if (movement.type === 'department_change') {
          updateData.department = movement.to_value;
        } else if (movement.type === 'role_change') {
          updateData.primary_role = movement.to_value;
        } else if (movement.type === 'promotion') {
          updateData.designation = movement.to_value;
        }
        // For 'transfer', no automatic employee field update (transfer is org-unit level)

        if (Object.keys(updateData).length > 0) {
          await tx.employee.update({
            where: { id: movement.emp_id },
            data: updateData,
          });
        }
      });
    } else {
      // Rejection: just update the movement status
      await prisma.employeeMovement.update({
        where: { id },
        data: {
          status: newStatus,
          approved_by: employee.id,
        },
      });
    }

    await createAuditLog({
      companyId: employee.org_id!,
      actorId: employee.id,
      action: AUDIT_ACTIONS.EMPLOYEE_MOVEMENT,
      entityType: 'EmployeeMovement',
      entityId: id,
      previousState: {
        status: 'pending',
      },
      newState: {
        status: newStatus,
        approved_by: employee.id,
        type: movement.type,
        emp_id: movement.emp_id,
        employee_name: `${movement.employee.first_name} ${movement.employee.last_name}`,
      },
    });

    return NextResponse.json({
      message: `Movement ${newStatus} successfully.`,
      movement: { id, status: newStatus },
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

