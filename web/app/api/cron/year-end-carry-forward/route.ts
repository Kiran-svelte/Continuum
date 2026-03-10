import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/cron/year-end-carry-forward
 *
 * Year-end carry-forward job — run on January 1st (or the last working day
 * of December) to:
 *
 * 1. Roll over unexpired leave balances into the new year for leave types
 *    that have `carry_forward = true`, capped at `max_carry_forward` days.
 * 2. Create new LeaveBalance rows for the incoming year for every active
 *    employee, seeded with their annual entitlement + carry-forward amount.
 * 3. Zero out the `remaining` column on the previous year's rows to close
 *    the books (used_days / pending_days are kept for audit purposes).
 *
 * Idempotent: if the new-year balance already exists, the job skips that
 * employee/type combination.
 *
 * Requires header `x-cron-secret: $CRON_SECRET`.
 */
export async function GET(request: NextRequest) {
  const cronSecret = request.headers.get('x-cron-secret');
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    // Allow running in December (advance prep) or January (post year-end)
    const currentYear = now.getFullYear();
    const processYear = now.getMonth() === 0 ? currentYear - 1 : currentYear; // previous year if run in Jan
    const newYear = processYear + 1;

    // Fetch all companies with their active leave types so we know carry-forward caps
    const companies = await prisma.company.findMany({
      where: { onboarding_completed: true },
      select: {
        id: true,
        leave_types: {
          where: { is_active: true, deleted_at: null },
          select: {
            code: true,
            default_quota: true,
            carry_forward: true,
            max_carry_forward: true,
          },
        },
      },
    });

    let processedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const company of companies) {
      // Build a quick lookup of carry-forward config by leave type code
      const carryForwardConfig = new Map(
        company.leave_types.map((lt) => [
          lt.code,
          { carryForward: lt.carry_forward, maxCarryForward: lt.max_carry_forward, quota: lt.default_quota },
        ])
      );

      // Fetch all active employees for this company
      const employees = await prisma.employee.findMany({
        where: {
          org_id: company.id,
          status: { in: ['active', 'probation'] },
          deleted_at: null,
        },
        select: { id: true },
      });

      for (const employee of employees) {
        // Fetch previous-year balances for this employee
        const prevBalances = await prisma.leaveBalance.findMany({
          where: {
            emp_id: employee.id,
            company_id: company.id,
            year: processYear,
          },
          select: {
            id: true,
            leave_type: true,
            annual_entitlement: true,
            remaining: true,
            used_days: true,
            pending_days: true,
            encashed_days: true,
          },
        });

        for (const prevBal of prevBalances) {
          const config = carryForwardConfig.get(prevBal.leave_type);
          if (!config) continue;

          // Check if new-year balance already exists (idempotency)
          const existing = await prisma.leaveBalance.findUnique({
            where: {
              emp_id_leave_type_year: {
                emp_id: employee.id,
                leave_type: prevBal.leave_type,
                year: newYear,
              },
            },
            select: { id: true },
          });

          if (existing) {
            skippedCount++;
            continue;
          }

          // Calculate carry-forward amount.
          //
          // Business rule: pending leave requests are treated as if they will be
          // approved when computing carry-forward eligibility.  This is the
          // conservative (employee-friendly) interpretation — if a pending request
          // is later rejected, the employee retains those days in the new year's
          // balance through normal balance restoration on rejection.
          //
          // Alternative: carry forward the full `remaining` balance and let the
          // rejection flow restore days.  That would be more generous but creates
          // a window where employees hold more balance than intended.
          const effectiveRemaining = Math.max(0, prevBal.remaining - (prevBal.pending_days ?? 0));
          const carryAmount = config.carryForward
            ? Math.min(effectiveRemaining, config.maxCarryForward ?? 0)
            : 0;

          const newEntitlement = config.quota;

          try {
            await prisma.$transaction(async (tx) => {
              // Create new-year balance
              await tx.leaveBalance.create({
                data: {
                  emp_id: employee.id,
                  company_id: company.id,
                  leave_type: prevBal.leave_type,
                  year: newYear,
                  annual_entitlement: newEntitlement,
                  carried_forward: carryAmount,
                  remaining: newEntitlement + carryAmount,
                },
              });

              // Close out previous year — zero remaining (preserve used/pending/encashed for audit)
              await tx.leaveBalance.update({
                where: { id: prevBal.id },
                data: { remaining: 0 },
              });
            });

            await createAuditLog({
              companyId: company.id,
              actorId: null,
              action: AUDIT_ACTIONS.LEAVE_BALANCE_ADJUSTED,
              entityType: 'LeaveBalance',
              entityId: employee.id,
              previousState: {
                year: processYear,
                leave_type: prevBal.leave_type,
                remaining: prevBal.remaining,
              },
              newState: {
                year: newYear,
                leave_type: prevBal.leave_type,
                annual_entitlement: newEntitlement,
                carried_forward: carryAmount,
                remaining: newEntitlement + carryAmount,
                carry_forward_applied: config.carryForward,
              },
            });

            processedCount++;
          } catch (err) {
            errors.push(
              `emp=${employee.id} type=${prevBal.leave_type}: ${err instanceof Error ? err.message : String(err)}`
            );
          }
        }
      }
    }

    return NextResponse.json({
      processed_at: now.toISOString(),
      process_year: processYear,
      new_year: newYear,
      processed_count: processedCount,
      skipped_count: skippedCount,
      error_count: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    const message =
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : `Year-end carry-forward failed: ${error instanceof Error ? error.message : String(error)}`;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
