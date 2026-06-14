import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { getFullTeamEmployeeIds } from '@/lib/team-hierarchy';
import { resolveLeaveApprovers } from '@/lib/leave-approval-routing';

type AuthenticatedEmployee = {
  id: string;
  org_id: string;
  primary_role: string;
  secondary_roles?: string[] | null;
  permissions?: string[];
};

/** Resolved pending approver shown on leave history cards. */
type PendingApproverSummary = {
  id: string;
  name: string;
  role: string;
  department: string | null;
} | null;

/**
 * Resolves the first (primary) pending approver for a batch of in-flight leave requests.
 * Uses the same routing logic as the submit endpoint for consistency.
 * Returns a Map keyed by leaveRequest.id → PendingApproverSummary.
 *
 * Design: batch-resolves unique employee IDs to avoid N+1 queries.
 */
async function resolvePendingApprovers(
  pendingRequests: Array<{ leaveId: string; empId: string }>,
  companyId: string
): Promise<Map<string, PendingApproverSummary>> {
  const result = new Map<string, PendingApproverSummary>();
  if (pendingRequests.length === 0) return result;

  const uniqueEmpIds = [...new Set(pendingRequests.map((r) => r.empId))];

  const routingResults = await Promise.all(
    uniqueEmpIds.map((empId) => resolveLeaveApprovers(companyId, empId))
  );

  const empIdToApproverId = new Map<string, string | null>(
    uniqueEmpIds.map((empId, i) => [empId, routingResults[i].approverId])
  );

  const allApproverIds = [
    ...new Set(
      routingResults
        .map((r) => r.approverId)
        .filter((id): id is string => id !== null)
    ),
  ];

  const approverProfiles =
    allApproverIds.length > 0
      ? await prisma.employee.findMany({
          where: { id: { in: allApproverIds } },
          select: {
            id: true,
            first_name: true,
            last_name: true,
            primary_role: true,
            designation: true,
            department: true,
          },
        })
      : [];

  const approverById = new Map(approverProfiles.map((a) => [a.id, a]));

  for (const { leaveId, empId } of pendingRequests) {
    const approverId = empIdToApproverId.get(empId) ?? null;
    const profile = approverId ? approverById.get(approverId) : null;

    result.set(
      leaveId,
      profile
        ? {
            id: profile.id,
            name: `${profile.first_name} ${profile.last_name}`.trim(),
            role: profile.designation || profile.primary_role,
            department: profile.department,
          }
        : null
    );
  }

  return result;
}

/**
 * Shared execution path for leave list endpoints.
 * Guard checks remain at route entrypoints by design.
 *
 * Each returned leave record includes:
 * - `employee`: requester summary
 * - `approver`: who made the final approve/reject decision
 * - `pendingApprover`: who currently holds the pending request (null if resolved)
 */
export async function executeLeaveList(
  request: NextRequest,
  employee: AuthenticatedEmployee
) {
  const rateLimit = checkApiRateLimit(employee.id, 'general');
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded.' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const status = searchParams.get('status') ?? undefined;
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()), 10);
  const empIdFilter = searchParams.get('emp_id') ?? undefined;

  const effectiveRoles = new Set<string>([
    employee.primary_role,
    ...(employee.secondary_roles ?? []),
  ]);

  const hasLeaveAllAccess = Boolean(
    employee.permissions?.includes('*') ||
    employee.permissions?.includes('leave.view_all') ||
    employee.permissions?.includes('leave.approve_any')
  );

  const isHrOrAdmin =
    hasLeaveAllAccess ||
    effectiveRoles.has('hr') ||
    effectiveRoles.has('admin') ||
    effectiveRoles.has('director');

  const isManager =
    effectiveRoles.has('manager') || effectiveRoles.has('team_lead');

  const where: Record<string, unknown> = { company_id: employee.org_id };

  if (!isHrOrAdmin) {
    if (isManager) {
      const teamIds = await getFullTeamEmployeeIds(employee.id, employee.org_id);
      const inviteLinked = await prisma.employee.findMany({
        where: {
          org_id: employee.org_id,
          invited_by_id: employee.id,
          deleted_at: null,
          status: { in: ['active', 'probation', 'onboarding'] },
        },
        select: { id: true },
      });
      const visible = new Set<string>([employee.id, ...teamIds, ...inviteLinked.map((e) => e.id)]);
      where.emp_id = { in: [...visible] };
    } else {
      where.emp_id = employee.id;
    }
  } else if (empIdFilter) {
    where.emp_id = empIdFilter;
  }

  if (status) {
    const statuses = status.split(',').map((s) => s.trim()).filter(Boolean);
    where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
  }

  where.start_date = {
    gte: new Date(`${year}-01-01`),
    lt: new Date(`${year + 1}-01-01`),
  };

  const [rows, total] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            department: true,
            designation: true,
          },
        },
        approver: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            primary_role: true,
            designation: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.leaveRequest.count({ where }),
  ]);

  // Batch-resolve pending approver for in-flight requests (no N+1).
  const inflightRequests = rows
    .filter((r) => r.status === 'pending' || r.status === 'escalated')
    .map((r) => ({ leaveId: r.id, empId: r.emp_id }));

  const pendingApprovers = await resolvePendingApprovers(inflightRequests, employee.org_id);

  const requests = rows.map((row) => {
    const employeeSummary = row.employee;
    const approverSummary = row.approver;

    return {
      ...row,
      employee: employeeSummary
        ? {
            id: employeeSummary.id,
            first_name: employeeSummary.first_name,
            last_name: employeeSummary.last_name,
            department: employeeSummary.department,
            designation: employeeSummary.designation,
          }
        : { id: row.emp_id, first_name: 'Unknown', last_name: 'Employee', department: null, designation: null },
      // Who made the final approve/reject decision
      approver: approverSummary
        ? {
            id: approverSummary.id,
            first_name: approverSummary.first_name,
            last_name: approverSummary.last_name,
            role: approverSummary.designation || approverSummary.primary_role,
          }
        : null,
      // Who currently holds the pending request
      pendingApprover: pendingApprovers.get(row.id) ?? null,
    };
  });

  return NextResponse.json({
    requests,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}