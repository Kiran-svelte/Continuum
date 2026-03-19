import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireRole, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// ─── GET ────────────────────────────────────────────────────────────────────
// List all shifts for the company.
// If ?employee_id= is provided, also return that employee's current shift assignment.

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

    // Fetch all active shifts for the company
    const shifts = await prisma.shift.findMany({
      where: {
        company_id: employee.org_id!,
        deleted_at: null,
      },
      orderBy: { created_at: 'desc' },
      include: {
        employee_shifts: {
          where: { effective_to: null },
          select: {
            id: true,
            emp_id: true,
            effective_from: true,
            employee: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                department: true,
              },
            },
          },
        },
      },
    });

    const result: Record<string, unknown> = {
      shifts: shifts.map((s) => ({
        id: s.id,
        name: s.name,
        start_time: s.start_time,
        end_time: s.end_time,
        is_default: s.is_default,
        created_at: s.created_at,
        assigned_count: s.employee_shifts.length,
        assigned_employees: s.employee_shifts.map((es) => ({
          assignment_id: es.id,
          emp_id: es.emp_id,
          employee_name: `${es.employee.first_name} ${es.employee.last_name}`,
          department: es.employee.department,
          effective_from: es.effective_from,
        })),
      })),
    };

    // If employee_id is provided, include their current assignment
    if (employeeId) {
      const currentAssignment = await prisma.employeeShift.findFirst({
        where: {
          emp_id: employeeId,
          company_id: employee.org_id!,
          effective_to: null,
        },
        include: {
          shift: {
            select: {
              id: true,
              name: true,
              start_time: true,
              end_time: true,
              is_default: true,
            },
          },
        },
        orderBy: { effective_from: 'desc' },
      });

      result.employee_assignment = currentAssignment
        ? {
            assignment_id: currentAssignment.id,
            shift_id: currentAssignment.shift_id,
            shift_name: currentAssignment.shift.name,
            start_time: currentAssignment.shift.start_time,
            end_time: currentAssignment.shift.end_time,
            effective_from: currentAssignment.effective_from,
          }
        : null;
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── POST ───────────────────────────────────────────────────────────────────
// Create a new shift (HR/admin only).
// Body: { name, start_time, end_time, grace_minutes?, is_night_shift? }

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
    const { name, start_time, end_time, is_default } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    if (!start_time || typeof start_time !== 'string') {
      return NextResponse.json({ error: 'start_time is required (HH:MM format)' }, { status: 400 });
    }
    if (!end_time || typeof end_time !== 'string') {
      return NextResponse.json({ error: 'end_time is required (HH:MM format)' }, { status: 400 });
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timeRegex.test(start_time)) {
      return NextResponse.json({ error: 'start_time must be in HH:MM format (e.g. 09:00)' }, { status: 400 });
    }
    if (!timeRegex.test(end_time)) {
      return NextResponse.json({ error: 'end_time must be in HH:MM format (e.g. 18:00)' }, { status: 400 });
    }

    // Check for duplicate shift name within company
    const existing = await prisma.shift.findFirst({
      where: {
        company_id: employee.org_id!,
        name: name.trim(),
        deleted_at: null,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A shift with this name already exists' },
        { status: 409 }
      );
    }

    // If setting as default, unset other defaults
    if (is_default) {
      await prisma.shift.updateMany({
        where: {
          company_id: employee.org_id!,
          is_default: true,
          deleted_at: null,
        },
        data: { is_default: false },
      });
    }

    const shift = await prisma.shift.create({
      data: {
        company_id: employee.org_id!,
        name: name.trim(),
        start_time,
        end_time,
        is_default: !!is_default,
      },
    });

    await createAuditLog({
      companyId: employee.org_id!,
      actorId: employee.id,
      action: AUDIT_ACTIONS.COMPANY_SETTINGS_UPDATE,
      entityType: 'Shift',
      entityId: shift.id,
      previousState: null,
      newState: { name: shift.name, start_time, end_time, is_default: shift.is_default },
    });

    return NextResponse.json(shift, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── PATCH ──────────────────────────────────────────────────────────────────
// Update a shift or assign an employee to a shift.
// Shift update body: { id, name?, start_time?, end_time?, is_default? }
// Assignment body:   { employee_id, shift_id, effective_from }

export async function PATCH(request: NextRequest) {
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

    // Determine if this is a shift assignment or shift update
    if (body.employee_id && body.shift_id) {
      // ── Employee shift assignment ──────────────────────────────────────
      const { employee_id: targetEmpId, shift_id: shiftId, effective_from } = body;

      if (!effective_from) {
        return NextResponse.json({ error: 'effective_from is required' }, { status: 400 });
      }

      // Verify target employee belongs to the same company
      const targetEmp = await prisma.employee.findUnique({
        where: { id: targetEmpId },
        select: { id: true, org_id: true, first_name: true, last_name: true },
      });

      if (!targetEmp || targetEmp.org_id !== employee.org_id!) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      }

      // Verify shift exists and belongs to the same company
      const shift = await prisma.shift.findUnique({
        where: { id: shiftId },
        select: { id: true, company_id: true, name: true, deleted_at: true },
      });

      if (!shift || shift.company_id !== employee.org_id! || shift.deleted_at) {
        return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
      }

      // End current assignment (if any) and create new one
      const result = await prisma.$transaction(async (tx) => {
        // Close existing active assignment
        await tx.employeeShift.updateMany({
          where: {
            emp_id: targetEmpId,
            company_id: employee.org_id!,
            effective_to: null,
          },
          data: {
            effective_to: new Date(effective_from),
          },
        });

        // Create new assignment
        return tx.employeeShift.create({
          data: {
            emp_id: targetEmpId,
            company_id: employee.org_id!,
            shift_id: shiftId,
            effective_from: new Date(effective_from),
          },
          include: {
            shift: { select: { name: true } },
            employee: { select: { first_name: true, last_name: true } },
          },
        });
      });

      await createAuditLog({
        companyId: employee.org_id!,
        actorId: employee.id,
        action: AUDIT_ACTIONS.EMPLOYEE_UPDATE,
        entityType: 'EmployeeShift',
        entityId: result.id,
        previousState: null,
        newState: {
          emp_id: targetEmpId,
          shift_id: shiftId,
          shift_name: result.shift.name,
          effective_from,
        },
      });

      return NextResponse.json({
        assignment: {
          id: result.id,
          emp_id: targetEmpId,
          employee_name: `${result.employee.first_name} ${result.employee.last_name}`,
          shift_id: shiftId,
          shift_name: result.shift.name,
          effective_from: result.effective_from,
        },
      });
    }

    // ── Shift update ──────────────────────────────────────────────────────
    const { id, name, start_time, end_time, is_default } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id is required for shift update, or provide employee_id + shift_id for assignment' },
        { status: 400 }
      );
    }

    // Fetch existing shift
    const existing = await prisma.shift.findUnique({
      where: { id },
      select: {
        id: true,
        company_id: true,
        name: true,
        start_time: true,
        end_time: true,
        is_default: true,
        deleted_at: true,
      },
    });

    if (!existing || existing.company_id !== employee.org_id! || existing.deleted_at) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    // Validate time formats if provided
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (start_time && !timeRegex.test(start_time)) {
      return NextResponse.json({ error: 'start_time must be in HH:MM format' }, { status: 400 });
    }
    if (end_time && !timeRegex.test(end_time)) {
      return NextResponse.json({ error: 'end_time must be in HH:MM format' }, { status: 400 });
    }

    // Check duplicate name if renaming
    if (name && name.trim() !== existing.name) {
      const duplicate = await prisma.shift.findFirst({
        where: {
          company_id: employee.org_id!,
          name: name.trim(),
          deleted_at: null,
          id: { not: id },
        },
      });
      if (duplicate) {
        return NextResponse.json({ error: 'A shift with this name already exists' }, { status: 409 });
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (start_time !== undefined) updateData.start_time = start_time;
    if (end_time !== undefined) updateData.end_time = end_time;
    if (is_default !== undefined) updateData.is_default = !!is_default;

    // If setting as default, unset other defaults
    if (is_default) {
      await prisma.shift.updateMany({
        where: {
          company_id: employee.org_id!,
          is_default: true,
          deleted_at: null,
          id: { not: id },
        },
        data: { is_default: false },
      });
    }

    const updated = await prisma.shift.update({
      where: { id },
      data: updateData,
    });

    await createAuditLog({
      companyId: employee.org_id!,
      actorId: employee.id,
      action: AUDIT_ACTIONS.COMPANY_SETTINGS_UPDATE,
      entityType: 'Shift',
      entityId: id,
      previousState: {
        name: existing.name,
        start_time: existing.start_time,
        end_time: existing.end_time,
        is_default: existing.is_default,
      },
      newState: {
        name: updated.name,
        start_time: updated.start_time,
        end_time: updated.end_time,
        is_default: updated.is_default,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── DELETE ─────────────────────────────────────────────────────────────────
// Soft-delete a shift (HR/admin only). Fails if employees are currently assigned.
// Body: { id }

export async function DELETE(request: NextRequest) {
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
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const existing = await prisma.shift.findUnique({
      where: { id },
      select: {
        id: true,
        company_id: true,
        name: true,
        deleted_at: true,
        employee_shifts: {
          where: { effective_to: null },
          select: { id: true },
        },
      },
    });

    if (!existing || existing.company_id !== employee.org_id! || existing.deleted_at) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    // Prevent deletion if employees are currently assigned
    if (existing.employee_shifts.length > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete shift: ${existing.employee_shifts.length} employee(s) currently assigned. Reassign them first.`,
        },
        { status: 409 }
      );
    }

    // Soft delete
    await prisma.shift.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    await createAuditLog({
      companyId: employee.org_id!,
      actorId: employee.id,
      action: AUDIT_ACTIONS.COMPANY_SETTINGS_UPDATE,
      entityType: 'Shift',
      entityId: id,
      previousState: { name: existing.name },
      newState: null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
