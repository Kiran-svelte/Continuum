import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import {
  getAuthEmployee,
  requireCompanyContext,
  requirePermissionGuard,
  AuthError,
} from '@/lib/auth-guard';
import { assertModule } from '@/lib/core-functions/assert-module';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { revokeAllRefreshTokensForEmployee } from '@/lib/refresh-token';
import { revokeChannelLinksForEmployee } from '@/lib/channel/revoke-links';
import { sendNotification } from '@/lib/notification-service';

export const dynamic = 'force-dynamic';

const finalizeSchema = z.object({
  emp_id: z.string().min(1),
  last_working_date: z.string().datetime().optional(),
  reason: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const actor = await getAuthEmployee(request);
    requireCompanyContext(actor);
    requirePermissionGuard(actor, 'employee.terminate');
    const moduleGuard = await assertModule(actor.org_id, 'exit');
    if (moduleGuard) return moduleGuard;

    const body = await request.json().catch(() => ({}));
    const parsed = finalizeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { emp_id: employeeId, last_working_date: lastWorkingDate, reason } = parsed.data;
    if (employeeId === actor.id) {
      return NextResponse.json({ error: 'You cannot finalize your own exit' }, { status: 400 });
    }

    const target = await prisma.employee.findFirst({
      where: { id: employeeId, org_id: actor.org_id, deleted_at: null },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        status: true,
        last_working_date: true,
      },
    });

    if (!target) {
      return NextResponse.json({ error: 'Employee not found in your organization' }, { status: 404 });
    }

    if (target.status === 'exited' || target.status === 'terminated') {
      return NextResponse.json(
        { error: `Employee is already ${target.status}` },
        { status: 409 }
      );
    }

    const incompleteChecklists = await prisma.exitChecklist.count({
      where: {
        emp_id: employeeId,
        company_id: actor.org_id,
        status: { not: 'completed' },
      },
    });

    if (incompleteChecklists > 0) {
      return NextResponse.json(
        { error: 'Exit cannot be finalized until all exit checklist items are completed', incompleteChecklists },
        { status: 409 }
      );
    }

    const finalizedAt = new Date();
    const parsedLastWorkingDate = lastWorkingDate ? new Date(lastWorkingDate) : finalizedAt;
    await prisma.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id: employeeId },
        data: {
          status: 'exited',
          last_working_date: parsedLastWorkingDate,
        },
      });

      await tx.employeeStatusHistory.create({
        data: {
          emp_id: employeeId,
          company_id: actor.org_id,
          from_status: target.status,
          to_status: 'exited',
          changed_by: actor.id,
          reason: reason || 'Exit finalized after checklist completion',
        },
      });

      await revokeAllRefreshTokensForEmployee(tx, employeeId, finalizedAt);
    });

    const revokedChannelLinks = await revokeChannelLinksForEmployee(employeeId, 'employee_terminated');

    await createAuditLog({
      companyId: actor.org_id,
      actorId: actor.id,
      action: AUDIT_ACTIONS.EMPLOYEE_STATUS_CHANGE,
      entityType: 'Employee',
      entityId: employeeId,
      previousState: {
        status: target.status,
        last_working_date: target.last_working_date?.toISOString() ?? null,
      },
      newState: {
        status: 'exited',
        last_working_date: parsedLastWorkingDate.toISOString(),
        refresh_tokens_revoked: true,
        channel_links_revoked: revokedChannelLinks,
        reason: reason || null,
      },
    });

    void sendNotification(
      actor.id,
      actor.org_id,
      'exit_finalized',
      'Exit Finalized',
      `${target.first_name} ${target.last_name}'s exit has been finalized and active sessions were revoked.`
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      employee: {
        id: target.id,
        name: `${target.first_name} ${target.last_name}`.trim(),
        email: target.email,
        status: 'exited',
        lastWorkingDate: parsedLastWorkingDate.toISOString(),
      },
      accessRevoked: {
        refreshTokens: true,
        channelLinks: revokedChannelLinks,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
