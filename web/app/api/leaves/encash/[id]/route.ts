import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireRole, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { requireModuleForOrg } from '@/lib/core-functions/guard-handler';

export const dynamic = 'force-dynamic';

const actionSchema = z.object({
  action: z.enum(['approve', 'reject']),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const employee = await getAuthEmployee();
    requireRole(employee, 'hr', 'admin', 'director');
    const moduleGuard = await requireModuleForOrg(employee.org_id, 'leave');
    if (moduleGuard) return moduleGuard;

    const rateLimit = checkApiRateLimit(employee.id, 'leaves/approve');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const { id } = await params;

    const body = await request.json();
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { action } = parsed.data;

    // Fetch the encashment record
    const encashment = await prisma.leaveEncashment.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            org_id: true,
          },
        },
      },
    });

    if (!encashment) {
      return NextResponse.json({ error: 'Encashment request not found' }, { status: 404 });
    }

    // Tenant isolation
    if (encashment.company_id !== employee.org_id!) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Cannot approve own request
    if (encashment.emp_id === employee.id) {
      return NextResponse.json(
        { error: 'Cannot approve or reject your own encashment request' },
        { status: 403 }
      );
    }

    // Must be pending
    if (encashment.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot ${action} a request with status '${encashment.status}'` },
        { status: 400 }
      );
    }

    const previousState = {
      status: encashment.status,
      approved_by: encashment.approved_by,
    };

    if (action === 'approve') {
      // Approve: update status, deduct from balance in a transaction
      const currentYear = new Date().getFullYear();

      const updatedEncashment = await prisma.$transaction(async (tx) => {
        const requestUpdate = await tx.leaveEncashment.updateMany({
          where: { id, status: 'pending' },
          data: {
            status: 'approved',
            approved_by: employee.id,
          },
        });

        if (requestUpdate.count === 0) {
          throw new Error('Encashment request was modified concurrently; please retry');
        }

        const balance = await tx.leaveBalance.findUnique({
          where: {
            emp_id_leave_type_year: {
              emp_id: encashment.emp_id,
              leave_type: encashment.leave_type,
              year: currentYear,
            },
          },
          select: { updated_at: true, remaining: true },
        });

        if (!balance) {
          throw new Error('Leave balance not found for encashment year');
        }

        if (balance.remaining < encashment.days) {
          throw new Error('Insufficient leave balance for encashment');
        }

        const balanceUpdate = await tx.leaveBalance.updateMany({
          where: {
            emp_id: encashment.emp_id,
            leave_type: encashment.leave_type,
            year: currentYear,
            updated_at: balance.updated_at,
            remaining: { gte: encashment.days },
          },
          data: {
            remaining: { decrement: encashment.days },
            encashed_days: { increment: encashment.days },
          },
        });

        if (balanceUpdate.count === 0) {
          throw new Error('Leave balance was modified concurrently; please retry');
        }

        const updated = await tx.leaveEncashment.findUnique({
          where: { id },
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
        });

        if (!updated) throw new Error('Encashment request not found');
        return updated;
      });

      await createAuditLog({
        companyId: employee.org_id!,
        actorId: employee.id,
        action: AUDIT_ACTIONS.LEAVE_ENCASHMENT_APPROVE,
        entityType: 'LeaveEncashment',
        entityId: id,
        previousState,
        newState: {
          status: 'approved',
          approved_by: employee.id,
          days: encashment.days,
          leave_type: encashment.leave_type,
        },
      });

      return NextResponse.json(updatedEncashment);
    } else {
      // Reject: update status to 'rejected'
      const updatedEncashment = await prisma.$transaction(async (tx) => {
        const requestUpdate = await tx.leaveEncashment.updateMany({
          where: { id, status: 'pending' },
          data: {
            status: 'rejected',
            approved_by: employee.id,
          },
        });
        if (requestUpdate.count === 0) {
          throw new Error('Encashment request was modified concurrently; please retry');
        }
        const updated = await tx.leaveEncashment.findUnique({
          where: { id },
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
        });
        if (!updated) throw new Error('Encashment request not found');
        return updated;
      });

      await createAuditLog({
        companyId: employee.org_id!,
        actorId: employee.id,
        action: AUDIT_ACTIONS.LEAVE_ENCASHMENT_REJECT,
        entityType: 'LeaveEncashment',
        entityId: id,
        previousState,
        newState: {
          status: 'rejected',
          approved_by: employee.id,
          days: encashment.days,
          leave_type: encashment.leave_type,
        },
      });

      return NextResponse.json(updatedEncashment);
    }
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Error && error.message.includes('concurrently')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof Error && error.message.includes('Insufficient')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

