/**
 * POST /api/cron/probation-check
 *
 * Finds employees whose probation period ends within the next 7 days
 * and sends a notification to HR employees in the same company.
 *
 * Protected by CRON_SECRET bearer token.
 * Idempotent: running twice in the same day produces the same result.
 *
 * @throws Never — logs errors, always returns 200 to prevent cron retry loops.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isValidCronRequest } from '@/lib/cron-auth';
import { sendNotification } from '@/lib/notification-service';
import { logger } from '@/lib/logger';
import { getCompanyIdsWithModuleEnabled } from '@/lib/cron-module-filter';

export const dynamic = 'force-dynamic';

/** Days ahead to look for probation end dates. */
const PROBATION_LOOKAHEAD_DAYS = 7;

export async function POST(request: NextRequest) {
  if (!isValidCronRequest(request.headers)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const thresholdDate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + PROBATION_LOOKAHEAD_DAYS
  ));

  logger.info('[cron/probation-check] Running', { thresholdDate: thresholdDate.toISOString() });

  try {
    // employees module is mandatory (CF-001), so this returns all companies.
    // The filter is included for consistency with other cron jobs and future-proofing.
    const enabledCompanyIds = await getCompanyIdsWithModuleEnabled('employees');
    const probationEmployees = await prisma.employee.findMany({
      where: {
        status: 'probation',
        deleted_at: null,
        org_id: { in: enabledCompanyIds },
        probation_end_date: { gte: now, lte: thresholdDate },
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        org_id: true,
        probation_end_date: true,
      },
    });

    if (probationEmployees.length === 0) {
      logger.info('[cron/probation-check] No employees ending probation soon');
      return NextResponse.json({ processed: 0 });
    }

    // Group by company, then notify HR per company
    const byCompany = new Map<string, typeof probationEmployees>();
    for (const emp of probationEmployees) {
      if (!emp.org_id) continue;
      if (!byCompany.has(emp.org_id)) byCompany.set(emp.org_id, []);
      byCompany.get(emp.org_id)!.push(emp);
    }

    let notified = 0;

    for (const [companyId, employees] of byCompany) {
      const hrEmployees = await prisma.employee.findMany({
        where: {
          org_id: companyId,
          primary_role: { in: ['hr', 'admin'] },
          status: 'active',
          deleted_at: null,
        },
        select: { id: true },
      });

      for (const hrEmp of hrEmployees) {
        for (const emp of employees) {
          const endDate = emp.probation_end_date!.toISOString().split('T')[0];
          void sendNotification(
            hrEmp.id,
            companyId,
            'probation_ending',
            'Probation Period Ending Soon',
            `${emp.first_name} ${emp.last_name}'s probation ends on ${endDate}. Please review and update their status.`
          ).catch((err: unknown) =>
            logger.error('[cron/probation-check] notify failed', {
              hrEmpId: hrEmp.id,
              targetEmpId: emp.id,
              error: err instanceof Error ? err.message : String(err),
            })
          );
          notified++;
        }
      }
    }

    logger.info('[cron/probation-check] Complete', { probationCount: probationEmployees.length, notified });
    return NextResponse.json({ processed: probationEmployees.length, notified });
  } catch (error) {
    logger.error('[cron/probation-check] Failed', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal error', processed: 0 }, { status: 500 });
  }
}
