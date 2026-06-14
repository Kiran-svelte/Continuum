import Link from 'next/link';
import { Target, Users, Clock, AlertCircle, BarChart2, MessageSquare, ChevronRight } from 'lucide-react';
import { DashboardTemplate } from '@/components/layouts/dashboard-template';
import { BentoCell, BentoGrid, StatCard } from '@/components/design-system';
import { LeavePulseRow, LEAVE_PULSE_ICONS } from '@/components/dashboard/leave-pulse-row';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requirePermissionGuard, requireRole, AuthError } from '@/lib/auth-guard';

function pctClass(value: number): string {
  if (value >= 90) return 'w-full';
  if (value >= 75) return 'w-3/4';
  if (value >= 60) return 'w-2/3';
  if (value >= 50) return 'w-1/2';
  if (value >= 33) return 'w-1/3';
  if (value >= 25) return 'w-1/4';
  if (value > 0) return 'w-1/12';
  return 'w-0';
}

export default async function DashboardView() {
  let manager;
  try {
    manager = await getAuthEmployee();
    requireRole(manager, 'manager', 'team_lead', 'admin', 'hr', 'director', 'super_admin');
    requirePermissionGuard(manager, 'employee.view_team');
  } catch (err) {
    if (err instanceof AuthError) {
      redirect(`/sign-in?redirect=/manager/dashboard&error=auth_required`);
    }
    throw err;
  }

  if (!manager.org_id) {
    throw new Error('Manager dashboard requires company context.');
  }

  const companyId = manager.org_id;
  const next30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const [
    teamMembers,
    pendingApprovals,
    slaBreaches,
    upcomingLeaves,
  ] = await Promise.all([
    prisma.employee.findMany({
      where: {
        org_id: companyId,
        manager_id: manager.id,
        deleted_at: null,
        status: { not: 'exited' },
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        designation: true,
        status: true,
      },
      orderBy: { first_name: 'asc' },
    }),
    prisma.leaveRequest.findMany({
      where: {
        company_id: companyId,
        status: { in: ['pending', 'escalated'] },
        employee: {
          manager_id: manager.id,
        },
      },
      include: {
        employee: {
          select: {
            first_name: true,
            last_name: true,
          },
        },
      },
      orderBy: { created_at: 'asc' },
      take: 3,
    }),
    prisma.leaveRequest.count({
      where: {
        company_id: companyId,
        status: { in: ['pending', 'escalated'] },
        sla_breached: true,
        employee: {
          manager_id: manager.id,
        },
      },
    }),
    prisma.leaveRequest.findMany({
      where: {
        company_id: companyId,
        status: 'approved',
        start_date: { gte: new Date(), lte: next30Days },
        employee: {
          manager_id: manager.id,
        },
      },
      include: {
        employee: {
          select: {
            first_name: true,
            last_name: true,
          },
        },
      },
      orderBy: { start_date: 'asc' },
    }),
  ]);

  const teamSize = teamMembers.length;
  const onLeaveNow = upcomingLeaves.filter((leave) => leave.start_date <= new Date() && leave.end_date >= new Date()).length;
  const availableNow = Math.max(teamSize - onLeaveNow, 0);
  const coveragePct = teamSize > 0 ? Math.round((availableNow / teamSize) * 100) : 0;
  const pendingCount = pendingApprovals.length;

  const topMember = teamMembers[0]
    ? `${teamMembers[0].first_name} ${teamMembers[0].last_name}`
    : 'No team members';
  const lowCoverageMember = teamMembers[teamMembers.length - 1]
    ? `${teamMembers[teamMembers.length - 1].first_name} ${teamMembers[teamMembers.length - 1].last_name}`
    : 'No team members';

  return (
    <DashboardTemplate
      title="Team Overview"
      description={`You have ${pendingCount} approval item(s) and ${coveragePct}% team coverage.`}
      actions={
        <Link href="/manager/notifications" className="btn btn-outline btn-sm no-underline">
          <MessageSquare className="w-4 h-4" /> Message Team
        </Link>
      }
    >
      <LeavePulseRow
        actions={[
          {
            label: 'My team',
            description: teamSize > 0 ? `${teamSize} direct report(s)` : 'Assign reporting lines and view roster',
            href: '/manager/team',
            icon: Users,
            emphasis: teamSize === 0 ? 'primary' : 'default',
          },
          {
            label: 'Company directory',
            description: 'See who reports to whom org-wide',
            href: '/manager/directory',
            icon: LEAVE_PULSE_ICONS.balance,
          },
          {
            label: 'Request leave',
            description: 'Submit your own time-off request',
            href: '/manager/request-leave',
            icon: LEAVE_PULSE_ICONS.request,
            emphasis: 'primary',
          },
          {
            label: 'Pending approvals',
            description: `${pendingCount} team request(s) need your decision`,
            href: '/manager/approvals',
            icon: LEAVE_PULSE_ICONS.approvals,
            badge: pendingCount,
          },
          {
            label: 'Team availability',
            description: `${availableNow} of ${teamSize} available today (${coveragePct}%)`,
            href: '/manager/team-calendar',
            icon: Users,
          },
          {
            label: 'Upcoming leave',
            description: `${upcomingLeaves.length} approved leave(s) in the next 30 days`,
            href: '/manager/team-calendar',
            icon: LEAVE_PULSE_ICONS.balance,
          },
        ]}
      />

      <BentoGrid className="mb-6">
        <BentoCell span={4}>
          <StatCard label="Team size" value={teamSize} icon={Users} tone="primary" />
        </BentoCell>
        <BentoCell span={4}>
          <StatCard label="Pending approvals" value={pendingCount} icon={Clock} tone="warning" href="/manager/approvals" />
        </BentoCell>
        <BentoCell span={4}>
          <StatCard label="Coverage" value={`${coveragePct}%`} icon={Target} tone="success" />
        </BentoCell>
      </BentoGrid>

      <section className="card border-[var(--info-border)] bg-[var(--info-bg)] p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-h3 font-semibold text-[var(--info)] flex items-center gap-2">
              <Target className="w-5 h-5" /> Team Availability Goal
            </h3>
            <p className="text-sm mt-1 opacity-80">Operational coverage in current scheduling window.</p>
          </div>
          <span className="text-h1 font-bold text-[var(--info)]">{coveragePct}%</span>
        </div>
        <div className="w-full bg-[var(--bg-surface)] rounded-full h-3 mb-2 overflow-hidden border border-[var(--border)]">
          <div className={`bg-[var(--info)] h-3 rounded-full ${pctClass(coveragePct)}`}></div>
        </div>
        <div className="flex justify-between text-xs font-medium opacity-70">
          <span>{availableNow} Available</span>
          <span>Total Team: {teamSize}</span>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="flex flex-col gap-3">
          <h3 className="text-h4 font-semibold flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-[var(--warning)]" /> Pending Approvals ({pendingCount})
          </h3>

          {pendingApprovals.length === 0 && (
            <div className="card p-4 text-sm text-[var(--muted-foreground)]">No pending approvals for your team right now.</div>
          )}

          {pendingApprovals.map((item) => {
            const name = `${item.employee.first_name} ${item.employee.last_name}`.trim();
            return (
              <div key={item.id} className="card p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold uppercase text-[var(--muted-foreground)]">{item.leave_type}</span>
                    {item.status === 'escalated' && <span className="badge-warning text-[9px] px-1.5 py-0.5 rounded-sm">Escalated</span>}
                  </div>
                  <p className="text-sm font-medium">{name || item.emp_id}</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    {item.start_date.toLocaleDateString()} - {item.end_date.toLocaleDateString()} ({item.total_days} day(s))
                  </p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                  <Link href="/manager/approvals" className="btn btn-ghost btn-sm text-[var(--danger)] hover:bg-[var(--danger-bg)]">Reject</Link>
                  <Link href="/manager/approvals" className="btn btn-primary btn-sm flex-1 sm:flex-none">Approve</Link>
                </div>
              </div>
            );
          })}
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex justify-between items-end mb-2">
            <h3 className="text-h4 font-semibold flex items-center gap-2">
              <BarChart2 className="w-4 h-4" /> Team Snapshot
            </h3>
            <Link href="/manager/reports" className="text-xs font-semibold text-[var(--primary)] hover:underline">View Detailed Report</Link>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="card p-4">
              <span className="text-sm text-[var(--muted-foreground)] block mb-1">Team Lead</span>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--primary)] text-primary-foreground flex items-center justify-center font-bold text-sm shadow-md">TL</div>
                <div>
                  <span className="text-sm font-semibold block">{topMember}</span>
                  <span className="text-xs text-[var(--success)] block flex items-center font-medium">Available now <ChevronRight className="w-3 h-3"/></span>
                </div>
              </div>
            </div>

            <div className="card p-4">
              <span className="text-sm text-[var(--muted-foreground)] block mb-1">Watchlist</span>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)] flex items-center justify-center font-bold text-sm">W</div>
                <div>
                  <span className="text-sm font-semibold block">{lowCoverageMember}</span>
                  <span className="text-xs text-[var(--warning)] block flex items-center font-medium">Capacity watch <ChevronRight className="w-3 h-3"/></span>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-0 mt-2 overflow-hidden border-[var(--border)]">
            <div className="bg-[var(--muted)] px-4 py-2 border-b border-[var(--border)]">
              <span className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">System Alerts</span>
            </div>
            <div className="p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[var(--warning)] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">SLA Breach Risk</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  {slaBreaches} approval item(s) have breached SLA and require immediate review.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </DashboardTemplate>
  );
}
