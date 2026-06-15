/**
 * GET /api/reports/document-expiry
 *
 * Returns documents that have expired status for the company.
 * The Document model has no expiry_date column — expiry is tracked via status.
 *
 * Query params:
 *   status - filter by document status (default: 'expired')
 *
 * Auth: documents module + employee.view_all permission
 * @throws {AuthError} 401/403 on auth failures
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  getAuthEmployee,
  requireCompanyContext,
  requirePermissionGuard,
  AuthError,
} from '@/lib/auth-guard';
import { assertModule } from '@/lib/core-functions/assert-module';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';

export const dynamic = 'force-dynamic';

/** Document statuses that warrant HR attention. */
const ATTENTION_STATUSES = ['expired', 'rejected'] as const;

export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const moduleGuard = await assertModule(employee.org_id!, 'documents');
    if (moduleGuard) return moduleGuard;

    requirePermissionGuard(employee, 'employee.view_all');

    const rateLimit = checkApiRateLimit(employee.id, 'reporting');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') ?? 'expired';

    // Only allow valid status values to prevent injection
    const allowedStatuses = ['expired', 'rejected', 'pending', 'verified'] as const;
    const resolvedStatus = allowedStatuses.includes(statusFilter as typeof allowedStatuses[number])
      ? (statusFilter as typeof allowedStatuses[number])
      : 'expired';

    const [expired, pending] = await Promise.all([
      prisma.document.findMany({
        where: {
          company_id: employee.org_id,
          deleted_at: null,
          status: 'expired',
        },
        select: {
          id: true,
          emp_id: true,
          name: true,
          type: true,
          status: true,
          verified_at: true,
          employee: {
            select: { first_name: true, last_name: true, department: true },
          },
        },
        orderBy: { created_at: 'desc' },
        take: 1000,
      }),
      prisma.document.findMany({
        where: {
          company_id: employee.org_id,
          deleted_at: null,
          status: 'pending',
        },
        select: {
          id: true,
          emp_id: true,
          name: true,
          type: true,
          status: true,
          verified_at: true,
          employee: {
            select: { first_name: true, last_name: true, department: true },
          },
        },
        orderBy: { created_at: 'desc' },
        take: 1000,
      }),
    ]);

    const formatDoc = (doc: typeof expired[0]) => ({
      id: doc.id,
      empId: doc.emp_id,
      employeeName: `${doc.employee.first_name} ${doc.employee.last_name}`,
      department: doc.employee.department,
      documentName: doc.name,
      documentType: doc.type,
      status: doc.status,
      lastVerifiedAt: doc.verified_at?.toISOString() ?? null,
    });

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      expired: expired.map(formatDoc),
      pendingVerification: pending.map(formatDoc),
      summary: {
        expiredCount: expired.length,
        pendingCount: pending.length,
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
