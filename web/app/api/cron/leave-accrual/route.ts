import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/cron/leave-accrual
 *
 * Monthly leave accrual job — run on the 1st of each month via Vercel Cron
 * or an external scheduler.  Only leave types in the ACCRUAL_CODES set
 * (Earned Leave / Privilege Leave) receive monthly top-ups; all other types
 * are granted as full-year lump-sum balances at join time.
 *
 * Accrual rate: annual_entitlement / 12 per month (rounded to nearest 0.5).
 * The running `remaining` balance is incremented; `annual_entitlement` is
 * left unchanged so pro-rata calculations remain intact.
 *
 * Requires header `x-cron-secret: $CRON_SECRET` to prevent unauthorised runs.
 */

// Leave type codes that accrue monthly rather than being granted up-front.
const ACCRUAL_CODES = new Set(['EL', 'PL']);

function roundToHalfDay(value: number): number {
  return Math.round(value * 2) / 2;
}

export async function GET(request: NextRequest) {
  const cronSecret = request.headers.get('x-cron-secret');
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const year = now.getFullYear();

    // Fetch all active employees who have accrual-type balances for the
    // current year.  Only employees with status 'active' or 'probation'
    // receive accruals.
    const balances = await prisma.leaveBalance.findMany({
      where: {
        year,
        leave_type: { in: Array.from(ACCRUAL_CODES) },
        employee: {
          status: { in: ['active', 'probation'] },
          deleted_at: null,
        },
      },
      select: {
        id: true,
        emp_id: true,
        company_id: true,
        leave_type: true,
        annual_entitlement: true,
        carried_forward: true,
        remaining: true,
      },
    });

    if (balances.length === 0) {
      return NextResponse.json({
        accrued_at: now.toISOString(),
        processed_count: 0,
        message: 'No accrual-eligible balances found',
      });
    }

    let processedCount = 0;
    const errors: string[] = [];

    for (const balance of balances) {
      try {
        // Monthly accrual = annual_entitlement / 12, rounded to 0.5-day granularity
        const monthlyAccrual = roundToHalfDay(balance.annual_entitlement / 12);
        if (monthlyAccrual <= 0) continue;

        // Cap: `remaining` may not exceed `annual_entitlement + carried_forward`.
        // `remaining` already reflects used/pending/encashed deductions, so the
        // gap between the cap and the current remaining is the most we can add.
        const cap = balance.annual_entitlement + (balance.carried_forward ?? 0);
        const gap = cap - balance.remaining;
        const actualAccrual = Math.min(monthlyAccrual, Math.max(0, gap));

        if (actualAccrual <= 0) continue;

        const previousRemaining = balance.remaining;

        await prisma.leaveBalance.update({
          where: { id: balance.id },
          data: { remaining: { increment: actualAccrual } },
        });

        await createAuditLog({
          companyId: balance.company_id,
          actorId: null,
          action: AUDIT_ACTIONS.LEAVE_BALANCE_ADJUST,
          entityType: 'LeaveBalance',
          entityId: balance.id,
          previousState: {
            remaining: previousRemaining,
            leave_type: balance.leave_type,
          },
          newState: {
            remaining: previousRemaining + actualAccrual,
            accrual_amount: actualAccrual,
            accrual_month: `${year}-${String(now.getMonth() + 1).padStart(2, '0')}`,
            leave_type: balance.leave_type,
          },
        });

        processedCount++;
      } catch (err) {
        errors.push(`Balance ${balance.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return NextResponse.json({
      accrued_at: now.toISOString(),
      processed_count: processedCount,
      error_count: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    const message =
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : `Accrual failed: ${error instanceof Error ? error.message : String(error)}`;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
