import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-service';
import { validateTenantAccess } from '@/lib/tenant-service';
import { createAuditLog } from '@/lib/audit';
import {
  readRoleQuotaMap,
  sanitizeLeaveTypeCode,
  sanitizeRoleSlug,
} from '@/lib/onboarding-runtime-config';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user?.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['admin', 'hr', 'super_admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const companyId = user.orgId;
    await validateTenantAccess(companyId);

    const body = (await request.json().catch(() => ({}))) as {
      year?: number;
      overwrite?: boolean;
    };
    const year = Number.isInteger(body.year) ? body.year! : new Date().getFullYear();
    const overwrite = body.overwrite === true;

    const employees = await prisma.employee.findMany({
      where: {
        org_id: companyId,
        status: 'active',
        deleted_at: null,
      },
      select: {
        id: true,
        gender: true,
        date_of_joining: true,
        primary_role: true,
        company_role_id: true,
      },
    });

    if (employees.length === 0) {
      return NextResponse.json({ error: 'No active employees found' }, { status: 400 });
    }

    const leaveTypes = await prisma.leaveType.findMany({
      where: {
        company_id: companyId,
        is_active: true,
        deleted_at: null,
      },
    });

    if (leaveTypes.length === 0) {
      return NextResponse.json({ error: 'No active leave types found' }, { status: 400 });
    }

    const [companyRoles, settings] = await Promise.all([
      prisma.companyRole.findMany({
        where: { company_id: companyId, is_active: true },
        select: { id: true, slug: true },
      }),
      prisma.companySettings.findUnique({
        where: { company_id: companyId },
        select: { hr_alerts: true },
      }),
    ]);

    const roleQuotaMap = readRoleQuotaMap(settings?.hr_alerts);
    const roleSlugById = new Map(
      companyRoles.map((role) => [role.id, sanitizeRoleSlug(role.slug)])
    );

    const balancesToCreate: Prisma.LeaveBalanceCreateManyInput[] = [];

    for (const employee of employees) {
      for (const leaveType of leaveTypes) {
        if (
          leaveType.gender_specific &&
          leaveType.gender_specific !== 'all' &&
          leaveType.gender_specific !== employee.gender
        ) {
          continue;
        }

        const employeeRoleSlug =
          (employee.company_role_id ? roleSlugById.get(employee.company_role_id) : null) ||
          sanitizeRoleSlug(employee.primary_role || '');
        const leaveCode = sanitizeLeaveTypeCode(leaveType.code);
        const roleSpecificQuota = employeeRoleSlug
          ? roleQuotaMap[employeeRoleSlug]?.[leaveCode]
          : undefined;

        let calculatedQuota =
          typeof roleSpecificQuota === 'number' && Number.isFinite(roleSpecificQuota)
            ? roleSpecificQuota
            : leaveType.default_quota;

        if (employee.date_of_joining) {
          const joiningDate = new Date(employee.date_of_joining);
          if (joiningDate.getFullYear() === year && joiningDate.getMonth() > 0) {
            const monthsRemaining = 12 - joiningDate.getMonth();
            calculatedQuota = Math.floor((calculatedQuota / 12) * monthsRemaining);
          }
        }

        balancesToCreate.push({
          id: randomUUID(),
          emp_id: employee.id,
          leave_type: leaveType.code,
          year,
          annual_entitlement: calculatedQuota,
          carried_forward: 0,
          used_days: 0,
          pending_days: 0,
          encashed_days: 0,
          remaining: calculatedQuota,
          company_id: companyId,
          updated_at: new Date(),
        });
      }
    }

    if (balancesToCreate.length === 0) {
      return NextResponse.json({ error: 'No eligible balances to create' }, { status: 400 });
    }

    let createdCount = balancesToCreate.length;
    let skippedCount = 0;

    if (overwrite) {
      const employeeIdsToOverwrite = balancesToCreate.map((b) => b.emp_id);
      await prisma.$transaction(async (tx) => {
        await tx.leaveBalance.deleteMany({ where: { company_id: companyId, year, emp_id: { in: employeeIdsToOverwrite } } });
        await tx.leaveBalance.createMany({ data: balancesToCreate });
      });
    } else {
      const existingBalances = await prisma.leaveBalance.findMany({
        where: {
          employee: { org_id: companyId },
          year,
        },
        select: {
          emp_id: true,
          leave_type: true,
        },
      });

      const existingKeys = new Set(
        existingBalances.map((balance) => `${balance.emp_id}-${balance.leave_type}`)
      );
      const filtered = balancesToCreate.filter(
        (balance) => !existingKeys.has(`${balance.emp_id}-${balance.leave_type}`)
      );

      if (filtered.length === 0) {
        return NextResponse.json(
          {
            error: 'All balances already exist. Set overwrite=true to replace.',
            existingCount: balancesToCreate.length,
          },
          { status: 400 }
        );
      }

      const result = await prisma.leaveBalance.createMany({ data: filtered });
      createdCount = result.count;
      skippedCount = balancesToCreate.length - filtered.length;
    }

    await createAuditLog({
      companyId,
      actorId: user.id,
      action: 'balances_initialized',
      entityType: 'leave_balance',
      entityId: companyId,
      newState: {
        year,
        employees: employees.length,
        balances_created: createdCount,
        balances_skipped: skippedCount,
        overwrite,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    });

    return NextResponse.json(
      {
        success: true,
        message: overwrite
          ? `${createdCount} balances initialized (overwrite)`
          : `${createdCount} balances initialized`,
        balancesCreated: createdCount,
        balancesSkipped: skippedCount,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[INITIALIZE BALANCES] Error:', error);
    return NextResponse.json({ error: 'Failed to initialize balances' }, { status: 500 });
  }
}
