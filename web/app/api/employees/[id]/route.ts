import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireRole, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/employees/[id]
 *
 * Returns full details for a single employee including manager info,
 * leave balances, and recent leave requests.
 * Accessible by admin, hr, director, or manager roles.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const employee = await getAuthEmployee();

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    requireRole(employee, 'admin', 'hr', 'director', 'manager');

    const target = await prisma.employee.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone: true,
        org_id: true,
        primary_role: true,
        secondary_roles: true,
        department: true,
        designation: true,
        gender: true,
        date_of_joining: true,
        status: true,
        manager_id: true,
        manager: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
        created_at: true,
        updated_at: true,
        deleted_at: true,
        leave_balances: {
          where: { year: new Date().getFullYear() },
          select: {
            id: true,
            leave_type: true,
            year: true,
            annual_entitlement: true,
            carried_forward: true,
            used_days: true,
            pending_days: true,
            encashed_days: true,
            remaining: true,
          },
          orderBy: { leave_type: 'asc' },
        },
        leave_requests: {
          take: 10,
          orderBy: { created_at: 'desc' },
          select: {
            id: true,
            leave_type: true,
            start_date: true,
            end_date: true,
            total_days: true,
            status: true,
            reason: true,
            created_at: true,
          },
        },
      },
    });

    if (!target) {
      return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
    }

    // Verify same company
    if (target.org_id !== employee.org_id!) {
      return NextResponse.json(
        { error: 'Employee not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ employee: target });
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
 * PUT /api/employees/[id]
 *
 * Updates an employee record. Only accessible by admin and hr roles.
 *
 * Body:
 *   firstName?, lastName?, phone?, department?, designation?,
 *   managerId?, status?, role?
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const employee = await getAuthEmployee();

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    requireRole(employee, 'admin', 'hr');

    // Fetch existing employee
    const target = await prisma.employee.findUnique({
      where: { id },
      select: {
        id: true,
        org_id: true,
        first_name: true,
        last_name: true,
        phone: true,
        department: true,
        designation: true,
        manager_id: true,
        status: true,
        primary_role: true,
      },
    });

    if (!target) {
      return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
    }

    if (target.org_id !== employee.org_id!) {
      return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
    }

    const body = await request.json();
    const { firstName, lastName, phone, department, designation, managerId, status, role } = body;

    // Build update data
    const updateData: Record<string, unknown> = {};
    const previousState: Record<string, unknown> = {};
    const newState: Record<string, unknown> = {};

    if (firstName !== undefined && firstName.trim()) {
      previousState.first_name = target.first_name;
      updateData.first_name = firstName.trim();
      newState.first_name = firstName.trim();
    }
    if (lastName !== undefined && lastName.trim()) {
      previousState.last_name = target.last_name;
      updateData.last_name = lastName.trim();
      newState.last_name = lastName.trim();
    }
    if (phone !== undefined) {
      previousState.phone = target.phone;
      updateData.phone = phone?.trim() || null;
      newState.phone = phone?.trim() || null;
    }
    if (department !== undefined) {
      previousState.department = target.department;
      updateData.department = department?.trim() || null;
      newState.department = department?.trim() || null;
    }
    if (designation !== undefined) {
      previousState.designation = target.designation;
      updateData.designation = designation?.trim() || null;
      newState.designation = designation?.trim() || null;
    }
    if (managerId !== undefined) {
      previousState.manager_id = target.manager_id;
      updateData.manager_id = managerId || null;
      newState.manager_id = managerId || null;
    }
    if (role !== undefined) {
      const validRoles = ['admin', 'hr', 'director', 'manager', 'team_lead', 'employee'];
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: `Role must be one of: ${validRoles.join(', ')}.` },
          { status: 400 }
        );
      }
      previousState.primary_role = target.primary_role;
      updateData.primary_role = role;
      newState.primary_role = role;
    }

    // Handle status change
    if (status !== undefined && status !== target.status) {
      const validStatuses = [
        'onboarding', 'probation', 'active', 'on_notice',
        'suspended', 'resigned', 'terminated', 'exited',
      ];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Status must be one of: ${validStatuses.join(', ')}.` },
          { status: 400 }
        );
      }

      previousState.status = target.status;
      updateData.status = status;
      newState.status = status;

      // Create status history record
      await prisma.employeeStatusHistory.create({
        data: {
          emp_id: target.id,
          company_id: employee.org_id!,
          from_status: target.status,
          to_status: status,
          changed_by: employee.id,
        },
      });
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update.' }, { status: 400 });
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone: true,
        primary_role: true,
        department: true,
        designation: true,
        status: true,
        manager_id: true,
        date_of_joining: true,
      },
    });

    // Audit log
    await createAuditLog({
      companyId: employee.org_id!,
      actorId: employee.id,
      action: AUDIT_ACTIONS.EMPLOYEE_UPDATE,
      entityType: 'Employee',
      entityId: target.id,
      previousState,
      newState,
    });

    return NextResponse.json({
      message: 'Employee updated successfully.',
      employee: updated,
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

/**
 * DELETE /api/employees/[id]
 *
 * Soft-deletes (deactivates) an employee by setting status to 'terminated'
 * and recording deleted_at. Only accessible by admin and hr roles.
 *
 * Query params or body:
 *   reason? - reason for deactivation
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const employee = await getAuthEmployee();

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    requireRole(employee, 'admin', 'hr');

    // Cannot deactivate yourself
    if (id === employee.id) {
      return NextResponse.json(
        { error: 'You cannot deactivate your own account.' },
        { status: 400 }
      );
    }

    const target = await prisma.employee.findUnique({
      where: { id },
      select: {
        id: true,
        org_id: true,
        email: true,
        first_name: true,
        last_name: true,
        status: true,
      },
    });

    if (!target) {
      return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
    }

    if (target.org_id !== employee.org_id!) {
      return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
    }

    if (target.status === 'terminated' || target.status === 'exited') {
      return NextResponse.json(
        { error: 'Employee is already deactivated.' },
        { status: 400 }
      );
    }

    // Get reason from searchParams or body
    let reason: string | null = null;
    const { searchParams } = new URL(request.url);
    reason = searchParams.get('reason');

    if (!reason) {
      try {
        const body = await request.json();
        reason = body.reason || null;
      } catch {
        // No body provided, reason stays null
      }
    }

    // Soft delete
    await prisma.employee.update({
      where: { id },
      data: {
        status: 'terminated',
        deleted_at: new Date(),
      },
    });

    // Status history
    await prisma.employeeStatusHistory.create({
      data: {
        emp_id: target.id,
        company_id: employee.org_id!,
        from_status: target.status,
        to_status: 'terminated',
        changed_by: employee.id,
        reason,
      },
    });

    // Audit log
    await createAuditLog({
      companyId: employee.org_id!,
      actorId: employee.id,
      action: AUDIT_ACTIONS.EMPLOYEE_DELETE,
      entityType: 'Employee',
      entityId: target.id,
      previousState: {
        status: target.status,
        email: target.email,
        name: `${target.first_name} ${target.last_name}`,
      },
      newState: {
        status: 'terminated',
        reason,
      },
    });

    return NextResponse.json({
      message: 'Employee deactivated successfully.',
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

