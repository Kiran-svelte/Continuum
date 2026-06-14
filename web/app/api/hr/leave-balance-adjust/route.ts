/**
 * POST /api/hr/leave-balance-adjust
 * Manually adjust an employee's leave balance.
 * Used by HR to grant additional days, correct mistakes, etc.
 *
 * @module api/hr/leave-balance-adjust
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getAuthEmployee, AuthError, requirePermissionGuard} from '@/lib/auth-guard';
import { assertModule } from '@/lib/core-functions/assert-module';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { sanitizeInput } from '@/lib/security';

export const dynamic = 'force-dynamic';

const adjustSchema = z.object({
  employeeId: z.string().uuid('Invalid employee ID'),
  leaveType: z.string().min(1).max(50),
  year: z.number().int().min(2020).max(2050),
  adjustment: z.number().min(-365).max(365),
  reason: z.string().min(3).max(500),
});

/**
 * POST handler: Adjust a leave balance for an employee.
 *
 * @param request - Incoming request with adjustment details
 * @returns JSON response with updated balance
 * @throws AuthError if not HR/admin
 */
export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();
    requirePermissionGuard(employee, 'leave.adjust_balance');

    const moduleGuard = await assertModule(employee.org_id!, 'leave');
    if (moduleGuard) return moduleGuard;

    const body = await request.json();
    const parsed = adjustSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { employeeId, leaveType, year, adjustment, reason } = parsed.data;
    const sanitizedReason = sanitizeInput(reason);

    const targetEmployee = await prisma.employee.findFirst({
      where: { id: employeeId, org_id: employee.org_id, deleted_at: null },
      select: { id: true, first_name: true, last_name: true },
    });

    if (!targetEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const existingBalance = await prisma.leaveBalance.findFirst({
      where: {
        emp_id: employeeId,
        leave_type: leaveType,
        year,
      },
    });

    if (!existingBalance) {
      return NextResponse.json(
        { error: `No leave balance found for ${leaveType} in ${year}` },
        { status: 404 }
      );
    }

    const newAllocated = existingBalance.annual_entitlement + adjustment;
    const newRemaining = existingBalance.remaining + adjustment;

    if (newAllocated < 0) {
      return NextResponse.json(
        { error: 'Adjustment would result in negative allocated days' },
        { status: 400 }
      );
    }

    if (newRemaining < 0) {
      return NextResponse.json(
        { error: 'Adjustment would result in negative remaining days' },
        { status: 400 }
      );
    }

    const updatedBalance = await prisma.leaveBalance.update({
      where: { id: existingBalance.id },
      data: {
        annual_entitlement: newAllocated,
        remaining: newRemaining,
        updated_at: new Date(),
      },
    });

    await createAuditLog({
      companyId: employee.org_id!,
      actorId: employee.id,
      action: AUDIT_ACTIONS.LEAVE_BALANCE_ADJUST,
      entityType: 'LeaveBalance',
      entityId: existingBalance.id,
      previousState: {
        annual_entitlement: existingBalance.annual_entitlement,
        remaining: existingBalance.remaining,
      },
      newState: {
        annual_entitlement: updatedBalance.annual_entitlement,
        remaining: updatedBalance.remaining,
        adjustment,
        reason: sanitizedReason,
      },
    });

    return NextResponse.json({
      success: true,
      balance: {
        leaveType,
        year,
        allocated: updatedBalance.annual_entitlement,
        remaining: updatedBalance.remaining,
        used: updatedBalance.used_days,
        adjustment,
      },
      message: `Adjusted ${targetEmployee.first_name} ${targetEmployee.last_name}'s ${leaveType} balance by ${adjustment > 0 ? '+' : ''}${adjustment} days`,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[LEAVE BALANCE ADJUST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
