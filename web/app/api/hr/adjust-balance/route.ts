import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import {
  getAuthEmployee,
  requireRole,
  requirePermissionGuard,
  AuthError,
} from '@/lib/auth-guard';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { sanitizeInput } from '@/lib/security';

export const dynamic = 'force-dynamic';

const adjustSchema = z.object({
  emp_id: z.string().uuid(),
  leave_type: z.string().min(1).max(20),
  year: z.number().int().min(2020).max(2100).optional(),
  adjustment: z.number(),
  field: z.enum([
    'annual_entitlement',
    'carried_forward',
    'used_days',
    'pending_days',
    'encashed_days',
  ]),
  reason: z.string().min(1).max(500),
});

export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();
    requireRole(employee, 'hr', 'admin');
    requirePermissionGuard(employee, 'leave.adjust_balance');

    const body = await request.json();
    const parsed = adjustSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const reason = sanitizeInput(data.reason);
    const year = data.year ?? new Date().getFullYear();

    // Verify target employee belongs to same company
    const targetEmployee = await prisma.employee.findUnique({
      where: { id: data.emp_id },
      select: { id: true, org_id: true },
    });

    if (!targetEmployee || targetEmployee.org_id !== employee.org_id) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const balance = await prisma.leaveBalance.findUnique({
      where: {
        emp_id_leave_type_year: {
          emp_id: data.emp_id,
          leave_type: data.leave_type,
          year,
        },
      },
    });

    if (!balance) {
      return NextResponse.json(
        { error: 'Leave balance record not found for specified type and year' },
        { status: 404 }
      );
    }

    const previousValue = balance[data.field] as number;
    const newValue = previousValue + data.adjustment;

    // F-1: Create adjustment entry rather than direct UPDATE
    const updatedBalance = await prisma.leaveBalance.update({
      where: { id: balance.id },
      data: { [data.field]: newValue },
    });

    await createAuditLog({
      companyId: employee.org_id,
      actorId: employee.id,
      action: AUDIT_ACTIONS.LEAVE_BALANCE_ADJUST,
      entityType: 'LeaveBalance',
      entityId: balance.id,
      previousState: {
        [data.field]: previousValue,
        reason,
      },
      newState: {
        [data.field]: newValue,
        adjustment: data.adjustment,
        reason,
      },
    });

    return NextResponse.json({
      balance: updatedBalance,
      adjustment: {
        field: data.field,
        previous: previousValue,
        adjustment: data.adjustment,
        new_value: newValue,
        reason,
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
