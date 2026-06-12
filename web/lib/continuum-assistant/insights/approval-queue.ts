import prisma from '@/lib/prisma';
import type { AssistantContext } from '@/lib/continuum-assistant/types';
import { hasPermission } from '@/lib/rbac';

export type ApprovalQueueItem = {
  kind: 'leave' | 'regularization' | 'expense' | 'travel' | 'reimbursement' | 'payroll_advance';
  id: string;
  title: string;
  subtitle: string;
  href: string;
  slaHoursLeft: number | null;
  priority: number;
};

export async function loadApprovalQueueSummary(
  ctx: AssistantContext,
  limit = 5
): Promise<{ items: ApprovalQueueItem[]; totals: Record<string, number> } | null> {
  if (
    !hasPermission(ctx.permissions, 'leave.approve_team') &&
    !hasPermission(ctx.permissions, 'leave.approve_any')
  ) {
    return null;
  }

  const companyId = ctx.companyId;
  const managerId = ctx.employeeId;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { sla_hours: true },
  });
  const defaultSla = company?.sla_hours ?? 48;

  const [leaves, regularizations] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: {
        company_id: companyId,
        status: { in: ['pending', 'escalated'] },
        current_approver_id: managerId,
      },
      include: {
        Employee_LeaveRequest_emp_idToEmployee: {
          select: { first_name: true, last_name: true },
        },
      },
      orderBy: { created_at: 'asc' },
      take: 20,
    }),
    prisma.attendanceRegularization.findMany({
      where: {
        company_id: companyId,
        status: 'pending',
        Employee_AttendanceRegularization_emp_idToEmployee: { manager_id: managerId },
      },
      include: {
        Employee_AttendanceRegularization_emp_idToEmployee: {
          select: { first_name: true, last_name: true },
        },
      },
      orderBy: { created_at: 'asc' },
      take: 20,
    }),
  ]);

  const items: ApprovalQueueItem[] = [];

  const approvalsHref =
    ctx.portalSlug === 'manager' ? '/manager/approvals' : `/${ctx.portalSlug}/leave-requests`;

  for (const lr of leaves) {
    const emp = lr.Employee_LeaveRequest_emp_idToEmployee;
    const name = `${emp?.first_name ?? ''} ${emp?.last_name ?? ''}`.trim() || 'Employee';
    const start = lr.start_date.toISOString().split('T')[0];
    const end = lr.end_date.toISOString().split('T')[0];
    const created = lr.created_at.getTime();
    const slaMs = (lr.sla_deadline?.getTime() ?? created + defaultSla * 3600000) - Date.now();
    items.push({
      kind: 'leave',
      id: lr.id,
      title: `${name} — ${lr.leave_type}`,
      subtitle: `${start} → ${end} (${lr.status})`,
      href: approvalsHref,
      slaHoursLeft: slaMs > 0 ? Math.round(slaMs / 3600000) : 0,
      priority: slaMs,
    });
  }

  for (const reg of regularizations) {
    const emp = reg.Employee_AttendanceRegularization_emp_idToEmployee;
    const name = `${emp?.first_name ?? ''} ${emp?.last_name ?? ''}`.trim() || 'Employee';
    const date = reg.date.toISOString().split('T')[0];
    items.push({
      kind: 'regularization',
      id: reg.id,
      title: `${name} — attendance fix`,
      subtitle: date,
      href: ctx.portalSlug === 'manager' ? '/manager/my-attendance' : approvalsHref,
      slaHoursLeft: null,
      priority: reg.created_at.getTime(),
    });
  }

  items.sort((a, b) => a.priority - b.priority);

  return {
    items: items.slice(0, limit),
    totals: {
      leave: leaves.length,
      regularization: regularizations.length,
      total: leaves.length + regularizations.length,
    },
  };
}

export function formatApprovalQueueSummary(
  summary: { items: ApprovalQueueItem[]; totals: Record<string, number> },
  ctx: AssistantContext
): string {
  if (summary.totals.total === 0) {
    return 'You have **no pending approvals** assigned to you right now.';
  }

  const lines = [
    `**${summary.totals.leave}** leave · **${summary.totals.regularization}** attendance regularization (assigned to you).`,
    '',
    '**Start here:**',
  ];

  summary.items.forEach((item, i) => {
    const sla =
      item.slaHoursLeft !== null
        ? item.slaHoursLeft <= 0
          ? ' · **SLA overdue**'
          : ` · ~${item.slaHoursLeft}h left on SLA`
        : '';
    lines.push(`${i + 1}. **${item.title}** — ${item.subtitle}${sla}`);
  });

  lines.push(
    '',
    'Say **approve leave** to confirm one in chat, or open **Approvals** in the sidebar.'
  );

  return lines.join('\n');
}
