import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requirePermissionGuard, requireRole, AuthError } from '@/lib/auth-guard';
import {
  CheckSquare, FileSignature, UploadCloud, Users, ChevronRight,
  PieChart, TrendingUp, Building2, Search, CalendarDays,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DashboardTemplate } from '@/components/layouts/dashboard-template';
import { BentoCell, BentoGrid, StatCard } from '@/components/design-system';
import { GlobalSearchTrigger } from '@/components/hr/global-search-trigger';
import { LeavePulseRow, LEAVE_PULSE_ICONS } from '@/components/dashboard/leave-pulse-row';

/**
 * HR DASHBOARD
 *
 * Server-side data fetching. Displays:
 * - Quick-access tiles (live counts from DB)
 * - Active onboarding pipeline table
 * - Headcount summary
 * - 6-month leave trend chart (CSS bars)
 * - Department headcount breakdown
 * - SLA breach action panel
 */

/** Maps an employee status to an onboarding completion percentage. */
function onboardingProgressFromStatus(status: string): number {
  const progressMap: Record<string, number> = {
    onboarding: 25,
    probation: 60,
    active: 100,
  };
  return progressMap[status] ?? 10;
}

/** Maps a 0–100 progress value to a Tailwind width class. */
function progressWidthClass(value: number): string {
  if (value >= 90) return 'w-full';
  if (value >= 75) return 'w-3/4';
  if (value >= 60) return 'w-2/3';
  if (value >= 50) return 'w-1/2';
  if (value >= 33) return 'w-1/3';
  if (value >= 25) return 'w-1/4';
  if (value > 0) return 'w-1/12';
  return 'w-0';
}

/** Returns the last N month labels ending with the current month. */
function buildLastNMonths(n: number): Array<{ label: string; year: number; month: number }> {
  const result: Array<{ label: string; year: number; month: number }> = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({
      label: d.toLocaleString('default', { month: 'short' }),
      year: d.getFullYear(),
      month: d.getMonth() + 1,
    });
  }
  return result;
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DashboardView({ searchParams }: PageProps) {
  let authEmployee;
  try {
    authEmployee = await getAuthEmployee();
    requireRole(authEmployee, 'hr', 'admin', 'super_admin');
    requirePermissionGuard(authEmployee, 'reports.view_all');
  } catch (err) {
    if (err instanceof AuthError) {
      redirect(`/sign-in?redirect=/hr/dashboard&error=auth_required`);
    }
    throw err;
  }

  if (!authEmployee.org_id) {
    redirect('/onboarding');
  }

  const companyId = authEmployee.org_id;
  const params = await searchParams;
  const searchQuery = typeof params.search === 'string' ? params.search.trim() : '';

  const last6Months = buildLastNMonths(6);
  const trendStart = new Date(last6Months[0].year, last6Months[0].month - 1, 1);
  const now = new Date();

  const [
    allOnboardingRows,
    totalEmployees,
    activeEmployees,
    pendingInvites,
    pendingLeaveApprovals,
    documentCount,
    slaBreachedCount,
    leaveRequestsForTrend,
    departmentBreakdown,
  ] = await Promise.all([
    // Onboarding pipeline
    prisma.employee.findMany({
      where: { org_id: companyId, deleted_at: null, status: { in: ['onboarding', 'probation'] } },
      orderBy: { created_at: 'desc' },
      take: 50,
      select: { id: true, first_name: true, last_name: true, designation: true, date_of_joining: true, status: true },
    }),
    // Headcount
    prisma.employee.count({ where: { org_id: companyId, deleted_at: null, status: { not: 'exited' } } }),
    prisma.employee.count({ where: { org_id: companyId, deleted_at: null, status: 'active' } }),
    // Invites
    prisma.userInvite.count({ where: { company_id: companyId, status: 'pending' } }),
    // Leave approvals
    prisma.leaveRequest.count({ where: { company_id: companyId, status: { in: ['pending', 'escalated'] } } }),
    // Documents
    prisma.document.count({ where: { company_id: companyId, deleted_at: null } }),
    // SLA breaches
    prisma.leaveRequest.count({ where: { company_id: companyId, status: { in: ['pending', 'escalated'] }, sla_breached: true } }),
    // Leave requests for 6-month trend
    prisma.leaveRequest.findMany({
      where: {
        company_id: companyId,
        status: 'approved',
        start_date: { gte: trendStart, lte: now },
      },
      select: { start_date: true, total_days: true },
    }),
    // Department breakdown
    prisma.employee.groupBy({
      by: ['department'],
      where: { org_id: companyId, deleted_at: null, status: { not: 'exited' } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 6,
    }),
  ]);

  // Filter onboarding rows by search
  const onboardingRows = searchQuery
    ? allOnboardingRows.filter((row) => {
        const fullName = `${row.first_name} ${row.last_name}`.toLowerCase();
        const designation = (row.designation ?? '').toLowerCase();
        const query = searchQuery.toLowerCase();
        return fullName.includes(query) || designation.includes(query);
      })
    : allOnboardingRows.slice(0, 8);

  const contractorCount = Math.max(totalEmployees - activeEmployees, 0);
  const fullTimePct = totalEmployees > 0 ? Math.round((activeEmployees / totalEmployees) * 100) : 0;
  const contractorPct = totalEmployees > 0 ? Math.round((contractorCount / totalEmployees) * 100) : 0;

  // Build leave trend data — count approved days per month
  const trendData = last6Months.map(({ label, year, month }) => {
    const count = leaveRequestsForTrend.filter((r) => {
      const d = new Date(r.start_date);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    }).reduce((sum, r) => sum + r.total_days, 0);
    return { label, count };
  });
  const maxTrendCount = Math.max(...trendData.map((d) => d.count), 1);

  // Department chart data
  const maxDeptCount = Math.max(...departmentBreakdown.map((d) => d._count.id), 1);

  const tileData = [
    { icon: Users, label: 'Onboarding Pipeline', count: `${onboardingRows.length} active`, href: '/hr/employees' },
    { icon: CheckSquare, label: 'Leave Approvals', count: `${pendingLeaveApprovals} pending`, href: '/hr/leave-requests' },
    { icon: FileSignature, label: 'Pending Invites', count: `${pendingInvites} invites`, href: '/hr/employees/invite' },
    { icon: UploadCloud, label: 'Document Center', count: `${documentCount} records`, href: '/hr/documents' },
  ];

  return (
    <DashboardTemplate
      title="HR Operations"
      description="Platform-wide overview and administrative actions."
        actions={<GlobalSearchTrigger />}
    >
      <LeavePulseRow
        actions={[
          {
            label: 'Request leave',
            description: 'Submit HR self-service leave',
            href: '/hr/request-leave',
            icon: LEAVE_PULSE_ICONS.request,
            emphasis: 'primary',
          },
          {
            label: 'Leave statistics',
            description: `${pendingLeaveApprovals} pending approval(s) company-wide`,
            href: '/hr/leave-requests',
            icon: LEAVE_PULSE_ICONS.approvals,
            badge: pendingLeaveApprovals,
          },
          {
            label: 'Policy exceptions',
            description: `${slaBreachedCount} SLA breach(es) in escalation queue`,
            href: '/hr/escalation',
            icon: LEAVE_PULSE_ICONS.balance,
            badge: slaBreachedCount,
          },
          {
            label: 'Team calendar',
            description: 'Availability, holidays, and leave overlap',
            href: '/hr/leave-calendar',
            icon: CalendarDays,
          },
        ]}
      />

      {/* Quick Access Tiles */}
      <BentoGrid className="mb-6">
        {tileData.map((item) => (
          <BentoCell key={item.label} span={3}>
            <StatCard label={item.label} value={item.count} icon={item.icon} href={item.href} tone="primary" />
          </BentoCell>
        ))}
      </BentoGrid>

      {/* Main 3-col grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Onboarding table — 2 cols */}
        <section className="card p-0 col-span-1 lg:col-span-2 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[var(--border)] flex flex-wrap justify-between items-center gap-3 bg-[var(--card)]">
            <h3 className="text-h4 font-semibold">
              Active Onboarding
              {searchQuery && (
                <span className="ml-2 text-xs font-normal text-[var(--muted-foreground)]">
                  — filtered by &quot;{searchQuery}&quot;
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2">
              {/* Scoped onboarding filter — clearly labelled as a table filter */}
              <form className="relative" method="GET">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted-foreground)]" />
                <Input
                  name="search"
                  placeholder="Filter by name or role..."
                  defaultValue={searchQuery}
                  className="pl-8 h-8 text-xs w-[180px] bg-[var(--muted)] border-[var(--border)]"
                  title="Filter onboarding pipeline by employee name or role"
                />
              </form>
              <Link href="/hr/employees" className="text-xs font-semibold text-[var(--info)] hover:underline flex items-center whitespace-nowrap">
                View Pipeline <ChevronRight className="w-3 h-3 ml-1" />
              </Link>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
                  {['Candidate', 'Role', 'Start Date', 'Progress'].map((h) => (
                    <th key={h} className="py-2 px-4 text-[11px] font-semibold text-[var(--muted-foreground)] uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-sm">
                {onboardingRows.length === 0 ? (
                  <tr>
                    <td className="py-8 px-4 text-sm text-[var(--muted-foreground)]" colSpan={4}>
                      {searchQuery ? `No onboarding records match "${searchQuery}".` : 'No active onboarding records found.'}
                    </td>
                  </tr>
                ) : (
                  onboardingRows.map((row) => {
                    const progress = onboardingProgressFromStatus(row.status);
                    const name = `${row.first_name} ${row.last_name}`.trim();
                    const startDate = row.date_of_joining
                      ? row.date_of_joining.toLocaleDateString('en-IN')
                      : 'TBD';
                    return (
                      <tr key={row.id} className="border-b border-[var(--border)] hover:bg-[var(--accent)] transition-colors">
                        <td className="py-3 px-4 font-medium text-sm">{name || row.id}</td>
                        <td className="py-3 px-4 text-xs text-[var(--muted-foreground)]">{row.designation || 'Pending Role'}</td>
                        <td className="py-3 px-4 text-xs">{startDate}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-[var(--muted)] rounded-full h-2 max-w-[100px]">
                              <div className={`h-2 rounded-full bg-[var(--primary)] ${progressWidthClass(progress)}`} />
                            </div>
                            <span className="text-xs font-mono text-[var(--muted-foreground)]">{progress}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Right column — Headcount + SLA */}
        <section className="col-span-1 flex flex-col gap-6">
          {/* Headcount summary */}
          <div className="card p-5">
            <h3 className="text-h4 font-semibold flex items-center gap-2 mb-4">
              <PieChart className="w-4 h-4" /> Headcount Summary
            </h3>
            <div className="flex justify-between items-end mb-6">
              <div className="text-display line-height-1">{totalEmployees}</div>
              <div className="text-sm font-medium text-[var(--success)]">Live</div>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Full-Time', pct: fullTimePct, color: 'bg-[var(--primary)]' },
                { label: 'Contractors', pct: contractorPct, color: 'bg-[var(--info)]' },
              ].map(({ label, pct, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium">{label}</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="w-full bg-[var(--muted)] rounded-full h-1.5">
                    <div className={`${color} h-1.5 rounded-full ${progressWidthClass(pct)}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SLA breach */}
          <div className="card p-0" style={{ borderColor: 'var(--danger-border)' }}>
            <div className="p-3 rounded-t-[var(--radius)]" style={{ backgroundColor: 'var(--danger-bg)', borderBottom: '1px solid var(--danger-border)' }}>
              <span className="text-xs font-bold uppercase" style={{ color: 'var(--danger)' }}>Action Required</span>
            </div>
            <div className="p-4">
              <p className="text-sm font-medium mb-1">SLA Breached Leave Requests</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {slaBreachedCount > 0
                  ? `${slaBreachedCount} request(s) are past 48h SLA and need escalation.`
                  : 'No SLA breaches. All requests are within the 48h window.'}
              </p>
              <Link href="/hr/escalation" className="btn btn-outline btn-sm w-full mt-3">
                Open Escalation Queue
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* Analytics row — leave trend + dept breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 6-month leave trend */}
        <section className="card p-5">
          <h3 className="text-h4 font-semibold flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4 text-[var(--primary)]" /> Leave Trend (Last 6 Months)
          </h3>
          <div className="flex items-end gap-3 h-32">
            {trendData.map(({ label, count }) => {
              const heightPct = Math.round((count / maxTrendCount) * 100);
              return (
                <div key={label} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-mono text-[var(--muted-foreground)]">{count}</span>
                  <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                    <div
                      className="w-full rounded-t-md bg-[var(--primary)] opacity-80 hover:opacity-100 transition-opacity"
                      style={{ height: `${Math.max(heightPct, 4)}%` }}
                      title={`${count} approved leave days`}
                    />
                  </div>
                  <span className="text-[10px] text-[var(--muted-foreground)] font-medium">{label}</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mt-3">Approved leave days per month</p>
        </section>

        {/* Department headcount */}
        <section className="card p-5">
          <h3 className="text-h4 font-semibold flex items-center gap-2 mb-5">
            <Building2 className="w-4 h-4 text-[var(--info)]" /> Department Headcount
          </h3>
          <div className="space-y-3">
            {departmentBreakdown.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No department data available.</p>
            ) : (
              departmentBreakdown.map((dept) => {
                const count = dept._count.id;
                const barWidthPct = Math.round((count / maxDeptCount) * 100);
                const deptName = dept.department || 'Unassigned';
                return (
                  <div key={deptName}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium truncate max-w-[60%]">{deptName}</span>
                      <span className="text-[var(--muted-foreground)]">{count} employee{count !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="w-full bg-[var(--muted)] rounded-full h-2">
                      <div
                        className="bg-[var(--info)] h-2 rounded-full transition-all"
                        style={{ width: `${barWidthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </DashboardTemplate>
  );
}
