import Link from 'next/link';
import { Calendar, CheckCircle2, Navigation, Bell, BookOpen, Shield, PieChart, PartyPopper, Sun } from 'lucide-react';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requirePermissionGuard, requireRole, AuthError } from '@/lib/auth-guard';
import { LeaveBalanceCards } from '@/components/employee/leave-balance-cards';
import { UpcomingHolidays } from '@/components/employee/upcoming-holidays';
import { LeavePulseRow, LEAVE_PULSE_ICONS } from '@/components/dashboard/leave-pulse-row';

/**
 * Formats a Date into a readable string like "Monday, May 5".
 */
function formatPrettyDate(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

/** Returns a time-of-day greeting string. */
function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Employee Dashboard — server component.
 *
 * Fetches core data server-side (attendance, pending leaves, upcoming leave).
 * Leave balance cards and holidays are rendered by client components that
 * call their own APIs so the dashboard shell renders instantly.
 */
export default async function DashboardView() {
  let employee;
  try {
    employee = await getAuthEmployee();
    requireRole(employee, 'employee', 'manager', 'team_lead', 'admin', 'hr', 'director', 'super_admin');
    requirePermissionGuard(employee, 'employee.view_own');
  } catch (err) {
    if (err instanceof AuthError) {
      redirect(`/sign-in?redirect=/employee/dashboard&error=auth_required`);
    }
    throw err;
  }

  if (!employee.org_id) {
    redirect('/onboarding');
  }

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const [todayAttendance, pendingLeave, upcomingLeave] = await Promise.all([
    prisma.attendance.findFirst({
      where: {
        emp_id: employee.id,
        company_id: employee.org_id,
        date: { gte: startOfDay, lt: endOfDay },
      },
      orderBy: { date: 'desc' },
      select: { check_in: true, check_out: true, total_hours: true, status: true },
    }),
    prisma.leaveRequest.findMany({
      where: {
        emp_id: employee.id,
        company_id: employee.org_id,
        status: { in: ['pending', 'escalated'] },
      },
      orderBy: { created_at: 'desc' },
      take: 3,
      select: { id: true, leave_type: true, start_date: true, end_date: true, status: true },
    }),
    prisma.leaveRequest.findFirst({
      where: {
        emp_id: employee.id,
        company_id: employee.org_id,
        status: 'approved',
        start_date: { gte: now },
      },
      orderBy: { start_date: 'asc' },
      select: { leave_type: true, start_date: true, end_date: true },
    }),
  ]);

  const todayLabel = formatPrettyDate(now);
  const greeting = getTimeGreeting();
  const greetingName = employee.first_name || employee.email?.split('@')[0] || 'there';
  const pendingCount = pendingLeave.length;

  return (
    <div className="flex flex-col gap-8 p-4 md:p-10 max-w-[1100px] mx-auto w-full">

      {/* Hero greeting */}
      <section className="flex flex-col gap-1 relative">
        <h1 className="text-display">
          {greeting}, {greetingName}.
        </h1>
        <p className="text-h3 text-[var(--muted-foreground)] font-normal">
          It&apos;s {todayLabel}.{pendingCount > 0 && ` You have ${pendingCount} pending request${pendingCount > 1 ? 's' : ''}.`}
        </p>
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-[var(--primary)] opacity-5 rounded-full blur-3xl pointer-events-none" />
      </section>

      <LeavePulseRow
        title="Your leave hub"
        actions={[
          {
            label: 'Request leave',
            description: 'Apply for time off with attachments',
            href: '/employee/request-leave',
            icon: LEAVE_PULSE_ICONS.request,
            emphasis: 'primary',
          },
          {
            label: 'Leave balance',
            description: 'See remaining quota by leave type',
            href: '/employee/dashboard',
            icon: LEAVE_PULSE_ICONS.balance,
          },
          {
            label: 'Pending requests',
            description: `${pendingCount} request(s) awaiting approval`,
            href: '/employee/leave-history',
            icon: LEAVE_PULSE_ICONS.approvals,
            badge: pendingCount,
          },
          {
            label: 'Upcoming holidays',
            description: 'Company and regional holiday calendar',
            href: '/employee/dashboard',
            icon: Calendar,
          },
        ]}
      />

      {/* Upcoming approved leave banner */}
      <section
        className="card p-4 flex sm:flex-row flex-col items-start sm:items-center justify-between gap-4 shadow-sm bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white bg-blue-600 dark:bg-blue-500">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-blue-700 dark:text-blue-300">Next Approved Leave</h3>
            <p className="text-xs max-w-md opacity-80 mt-0.5">
              {upcomingLeave
                ? `${upcomingLeave.leave_type}: ${upcomingLeave.start_date.toLocaleDateString()} – ${upcomingLeave.end_date?.toLocaleDateString() ?? ''}`
                : 'No upcoming approved leave on your calendar.'}
            </p>
          </div>
        </div>
        <Link href="/employee/request-leave" className="btn btn-primary sm:w-auto w-full">
          <Navigation className="w-4 h-4 mr-1" /> Request Leave
        </Link>
      </section>

      {/* Leave Balance Cards — client component, calls /api/employee/dashboard/kpis */}
      <section>
        <h2 className="text-h4 font-semibold mb-3 flex items-center gap-2">
          <PieChart className="w-4 h-4 text-[var(--primary)]" /> Leave Balances
        </h2>
        <LeaveBalanceCards />
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Action items + attendance */}
        <section className="md:col-span-2 flex flex-col gap-6">

          {/* Pending requests */}
          <div>
            <h3 className="text-h4 font-semibold mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> My Action Items
            </h3>
            <div className="card p-0 divide-y divide-[var(--border)] overflow-hidden relative">
              {pendingLeave.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <CheckCircle2 className="mx-auto h-10 w-10 mb-2" style={{ color: 'var(--success)', opacity: 0.7 }} />
                  <p className="text-sm">All caught up. No pending leave requests.</p>
                </div>
              ) : (
                pendingLeave.map((item) => (
                  <div key={item.id} className="p-4 flex items-center gap-4 hover:bg-[var(--accent)] transition-colors group">
                    <div className="w-5 h-5 rounded-full border-2 border-[var(--border)] group-hover:border-[var(--success)] transition-colors flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium line-clamp-1">
                        {item.leave_type} request is <span className="capitalize">{item.status}</span>
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {item.start_date.toLocaleDateString()} – {item.end_date?.toLocaleDateString() ?? ''}
                      </p>
                    </div>
                    <Link href="/employee/leave-history" className="text-[10px] px-2 py-0.5 rounded-xl font-medium whitespace-nowrap badge-warning">
                      Track
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Today's attendance */}
          <div>
            <h3 className="text-h4 font-semibold mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Today&apos;s Attendance
            </h3>
          <div className="card p-4">
              {!todayAttendance ? (
                <p className="text-sm text-[var(--muted-foreground)]">No attendance record found for today yet.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Status', value: todayAttendance.status },
                    { label: 'Check In', value: todayAttendance.check_in ? new Date(todayAttendance.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—' },
                    { label: 'Check Out', value: todayAttendance.check_out ? new Date(todayAttendance.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—' },
                    { label: 'Hours', value: todayAttendance.total_hours ? `${todayAttendance.total_hours}h` : '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center p-3 rounded-lg bg-[var(--accent)]">
                      <p className="text-xs text-[var(--muted-foreground)] mb-1">{label}</p>
                      <p className="text-sm font-semibold capitalize">{String(value)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Right sidebar */}
        <section className="md:col-span-1 flex flex-col gap-4">

          {/* Upcoming holidays — client component */}
          <div>
            <h3 className="text-h4 font-semibold mb-3 flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-400" /> Upcoming Holidays
            </h3>
            <UpcomingHolidays />
          </div>

          {/* Apps & Tools */}
          <div className="card p-0 overflow-hidden">
            <div className="p-3 border-b border-[var(--border)] bg-[var(--muted)]">
              <span className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">Apps &amp; Tools</span>
            </div>
            <div className="flex flex-col">
              {[
                { href: '/employee/request-leave', label: 'Request Time Off', Icon: Shield, color: 'text-[var(--primary)]' },
                { href: '/help', label: 'Employee Handbook', Icon: BookOpen, color: 'text-[var(--info)]' },
                { href: '/employee/payslips', label: 'My Payslips', Icon: PieChart, color: 'text-[var(--success)]' },
                { href: '/employee/leave-history', label: 'Leave History', Icon: PartyPopper, color: 'text-amber-500' },
              ].map(({ href, label, Icon, color }) => (
                <Link key={href} href={href} className="p-3 text-sm text-left hover:bg-[var(--accent)] border-b border-[var(--border)] last:border-0 flex items-center gap-3 transition-colors">
                  <Icon className={`w-4 h-4 ${color}`} />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
