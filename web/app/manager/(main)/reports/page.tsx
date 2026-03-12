'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { TiltCard, FadeIn, StaggerContainer } from '@/components/motion';
import { Skeleton } from '@/components/ui/skeleton';
import { GlassPanel } from '@/components/glass-panel';
import { PageHeader } from '@/components/page-header';
import {
  BarChart3,
  Download,
  Users,
  Calendar,
  CheckCircle2,
  ClipboardList,
  CalendarDays,
  ChevronDown,
  TrendingUp,
  Trophy,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  Loader2,
  Clock,
} from 'lucide-react';
import { downloadCSVLegacy, downloadPDF } from '@/lib/report-export';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AuthUser {
  id: string;
  first_name: string;
  last_name: string;
  primary_role: string;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  department: string | null;
  designation: string | null;
}

interface LeaveBalance {
  id: string;
  leave_type: string;
  year: number;
  annual_entitlement: number;
  carried_forward: number;
  used_days: number;
  pending_days: number;
  encashed_days: number;
  remaining: number;
}

interface LeaveRequest {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: string;
  reason: string | null;
  created_at: string;
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    department: string | null;
  };
}

interface MemberUtilization {
  id: string;
  name: string;
  department: string | null;
  totalEntitlement: number;
  usedDays: number;
  pendingDays: number;
  remaining: number;
  utilizationPct: number;
}

interface ByStatus {
  status: string;
  count: number;
}

interface ByLeaveType {
  leave_type: string;
  count: number;
  total_days: number;
}

interface MonthlyTrend {
  month: number;
  count: number;
}

interface TopTaker {
  employee_name: string;
  total_days: number;
}

interface LeaveSummary {
  year: number;
  total_employees: number;
  by_status: ByStatus[];
  by_leave_type: ByLeaveType[];
  monthly_trend?: MonthlyTrend[];
  top_takers?: TopTaker[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function buildFullTrend(raw?: MonthlyTrend[]): (MonthlyTrend & { label: string })[] {
  const map = new Map((raw ?? []).map(m => [m.month, m.count]));
  return Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    count: map.get(i + 1) ?? 0,
    label: MONTH_LABELS[i],
  }));
}

function getUtilizationBarColor(pct: number): string {
  if (pct >= 80) return 'bg-red-500';
  if (pct >= 60) return 'bg-amber-500';
  if (pct >= 40) return 'bg-emerald-500';
  return 'bg-blue-500';
}

function getUtilizationTextColor(pct: number): string {
  if (pct >= 80) return 'text-red-400';
  if (pct >= 60) return 'text-amber-400';
  if (pct >= 40) return 'text-emerald-400';
  return 'text-blue-400';
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'default' | 'info'> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'danger',
  cancelled: 'default',
  escalated: 'info',
};

const STATUS_BAR_COLORS: Record<string, string> = {
  approved: 'bg-green-400',
  pending: 'bg-amber-400',
  rejected: 'bg-red-400',
  cancelled: 'bg-slate-500',
  escalated: 'bg-orange-400',
};

const LEAVE_TYPE_COLORS = [
  'bg-blue-400',
  'bg-violet-400',
  'bg-cyan-300',
  'bg-rose-400',
  'bg-amber-400',
  'bg-emerald-400',
  'bg-indigo-400',
  'bg-pink-400',
];

const CHART_BAR_GRADIENT = 'bg-gradient-to-t from-primary to-blue-400';

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

const barVariants = {
  hidden: { scaleX: 0 },
  visible: (pct: number) => ({
    scaleX: 1,
    transition: { duration: 0.6, ease: 'easeOut' as const, delay: pct * 0.002 },
  }),
};

const chartBarVariants = {
  hidden: { scaleY: 0 },
  visible: (i: number) => ({
    scaleY: 1,
    transition: { duration: 0.5, ease: 'easeOut' as const, delay: i * 0.05 },
  }),
};

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */

function ReportsLoadingSkeleton() {
  return (
    <div className="p-4 sm:p-6 pb-32">
      <div className="space-y-8">
        {/* Header skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 bg-white/10" />
          <Skeleton className="h-4 w-64 bg-white/10" />
        </div>

        {/* Tabs skeleton */}
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32 bg-white/10 rounded-lg" />
          <Skeleton className="h-10 w-32 bg-white/10 rounded-lg" />
        </div>

        {/* Filters skeleton */}
        <div className="glass-panel rounded-2xl border border-white/10 p-4 flex flex-col sm:flex-row gap-3 items-center">
          <Skeleton className="h-10 flex-1 bg-white/10 rounded-lg" />
          <Skeleton className="h-10 flex-1 bg-white/10 rounded-lg" />
          <Skeleton className="h-10 w-24 bg-white/10 rounded-lg" />
        </div>

        {/* Metric cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-panel rounded-2xl border border-white/10 p-6 space-y-3">
              <Skeleton className="h-5 w-24 bg-white/10" />
              <Skeleton className="h-8 w-16 bg-white/10" />
              <Skeleton className="h-4 w-32 bg-white/10" />
            </div>
          ))}
        </div>

        {/* Chart and list skeletons */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-panel rounded-2xl border border-white/10 p-6 space-y-4">
            <Skeleton className="h-6 w-40 bg-white/10" />
            <div className="h-64 flex items-end gap-2">
              {[...Array(12)].map((_, i) => (
                <Skeleton key={i} className="w-full h-full bg-white/10" style={{ height: `${Math.random() * 80 + 10}%` }} />
              ))}
            </div>
          </div>
          <div className="glass-panel rounded-2xl border border-white/10 p-6 space-y-4">
            <Skeleton className="h-6 w-32 bg-white/10" />
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex justify-between items-center">
                  <Skeleton className="h-5 w-2/3 bg-white/10" />
                  <Skeleton className="h-5 w-1/4 bg-white/10" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ManagerReportsPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<LeaveSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeReportTab, setActiveReportTab] = useState<'leave' | 'attendance'>('leave');

  // Team-level data (manager-accessible APIs)
  const [team, setTeam] = useState<Employee[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [memberBalances, setMemberBalances] = useState<Map<string, LeaveBalance[]>>(
    new Map()
  );
  const [teamLoading, setTeamLoading] = useState(true);

  // Attendance tab state
  const [attendanceRecords, setAttendanceRecords] = useState<{
    employee_id: string; employee_name: string; department: string;
    date: string; check_in: string | null; check_out: string | null;
    total_hours: number | null; status: string; is_wfh: boolean;
  }[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceDateFrom, setAttendanceDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [attendanceDateTo, setAttendanceDateTo] = useState(() => new Date().toISOString().slice(0, 10));

  // Date range selector - defaults to current month
  const now = new Date();
  const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const defaultTo = now.toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);

  /* ---- Fetch leave summary (admin/hr/director) ---- */
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/reports/leave-summary?year=${year}`, {
          credentials: 'include',
        });
        const json = await res.json();
        if (!res.ok) {
          // Non-admin/hr users will get 403 - that's expected for managers
          if (!cancelled) {
            if (res.status !== 403) {
              setError(json.error ?? 'Failed to load report');
            }
          }
          return;
        }
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError('Network error. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [year]);

  /* ---- Fetch team data (manager-accessible) ---- */
  useEffect(() => {
    let cancelled = false;

    async function fetchTeamData() {
      setTeamLoading(true);
      try {
        // Step 1: Get current user
        const meRes = await fetch('/api/auth/me', { credentials: 'include' });
        if (!meRes.ok) return;
        const meData: AuthUser = await meRes.json();
        if (cancelled) return;

        // Step 2: Fetch team and leave requests in parallel
        const [empRes, leaveRes] = await Promise.all([
          fetch(`/api/employees?manager_id=${meData.id}&limit=50`, {
            credentials: 'include',
          }),
          fetch(`/api/leaves/list?limit=100&year=${year}`, {
            credentials: 'include',
          }),
        ]);

        if (!empRes.ok) return;
        const empData = await empRes.json();
        const employees: Employee[] = empData.employees ?? [];

        let requests: LeaveRequest[] = [];
        if (leaveRes.ok) {
          const leaveData = await leaveRes.json();
          requests = leaveData.requests ?? [];
        }

        if (cancelled) return;
        setTeam(employees);
        setLeaveRequests(requests);

        // Step 3: Fetch leave balances for each team member
        const balancesMap = new Map<string, LeaveBalance[]>();
        const detailPromises = employees.map(async (emp) => {
          try {
            const res = await fetch(`/api/employees/${emp.id}`, {
              credentials: 'include',
            });
            if (res.ok) {
              const json = await res.json();
              balancesMap.set(emp.id, json.employee?.leave_balances ?? []);
            }
          } catch {
            // Ignore individual failures
          }
        });
        await Promise.all(detailPromises);

        if (!cancelled) {
          setMemberBalances(balancesMap);
        }
      } catch {
        // Team data fetch is best-effort
      } finally {
        if (!cancelled) setTeamLoading(false);
      }
    }

    fetchTeamData();
    return () => { cancelled = true; };
  }, [year]);

  /* ---- Derived values from leave summary ---- */

  const totalRequests = useMemo(
    () => data?.by_status.reduce((acc, s) => acc + s.count, 0) ?? 0,
    [data],
  );

  const approvedCount = useMemo(
    () => data?.by_status.find((s) => s.status === 'approved')?.count ?? 0,
    [data],
  );

  const approvalRate = totalRequests > 0 ? Math.round((approvedCount / totalRequests) * 100) : 0;

  const totalLeaveDays = useMemo(
    () => data?.by_leave_type.reduce((acc, lt) => acc + lt.total_days, 0) ?? 0,
    [data],
  );

  const avgLeaveDays = data && data.total_employees > 0
    ? (totalLeaveDays / data.total_employees).toFixed(1)
    : '0';

  const monthlyTrend = useMemo(() => buildFullTrend(data?.monthly_trend), [data]);
  const maxMonthlyCount = useMemo(
    () => Math.max(1, ...monthlyTrend.map((m) => m.count)),
    [monthlyTrend],
  );

  const maxLeaveTypeDays = useMemo(
    () => Math.max(1, ...(data?.by_leave_type ?? []).map((lt) => lt.total_days)),
    [data],
  );

  const topTakers = useMemo(() => (data?.top_takers ?? []).slice(0, 5), [data]);

  /* ---- Filtered leave requests by date range ---- */
  const filteredRequests = useMemo(() => {
    if (!dateFrom && !dateTo) return leaveRequests;
    return leaveRequests.filter((req) => {
      const reqStart = req.start_date.slice(0, 10);
      const reqEnd = req.end_date.slice(0, 10);
      if (dateFrom && reqEnd < dateFrom) return false;
      if (dateTo && reqStart > dateTo) return false;
      return true;
    });
  }, [leaveRequests, dateFrom, dateTo]);

  /* ---- Team utilization data ---- */
  const utilizationData = useMemo<MemberUtilization[]>(() => {
    return team
      .map((emp) => {
        const balances = memberBalances.get(emp.id) ?? [];
        const totalEntitlement = balances.reduce(
          (sum, b) => sum + b.annual_entitlement + b.carried_forward,
          0
        );
        const usedDays = balances.reduce((sum, b) => sum + b.used_days, 0);
        const pendingDays = balances.reduce((sum, b) => sum + b.pending_days, 0);
        const remaining = balances.reduce((sum, b) => sum + b.remaining, 0);
        const utilizationPct =
          totalEntitlement > 0 ? Math.round((usedDays / totalEntitlement) * 100) : 0;

        return {
          id: emp.id,
          name: `${emp.first_name} ${emp.last_name}`,
          department: emp.department,
          totalEntitlement,
          usedDays,
          pendingDays,
          remaining,
          utilizationPct,
        };
      })
      .sort((a, b) => b.utilizationPct - a.utilizationPct);
  }, [team, memberBalances]);

  /* ---- Team attendance summary from leave requests ---- */
  const attendanceSummary = useMemo(() => {
    const totalMembers = team.length;
    const approvedInRange = filteredRequests.filter((r) => r.status === 'approved');
    const onLeaveIds = new Set(
      approvedInRange.map((r) => r.employee?.id).filter(Boolean)
    );
    const onLeaveCount = onLeaveIds.size;
    const pendingCount = filteredRequests.filter((r) => r.status === 'pending').length;
    const totalApprovedDays = approvedInRange.reduce((sum, r) => sum + r.total_days, 0);
    const presentCount = Math.max(0, totalMembers - onLeaveCount);

    return {
      totalMembers,
      present: presentCount,
      onLeave: onLeaveCount,
      totalLeaveDays: totalApprovedDays,
      pendingRequests: pendingCount,
    };
  }, [team, filteredRequests]);

  /* ---- Status counts from filtered requests ---- */
  const teamStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const req of filteredRequests) {
      counts[req.status] = (counts[req.status] || 0) + 1;
    }
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }, [filteredRequests]);

  const teamTotalRequests = teamStatusCounts.reduce((acc, s) => acc + s.count, 0);

  /* ---- Leave type breakdown from filtered requests ---- */
  const teamLeaveTypeBreakdown = useMemo(() => {
    const map: Record<string, { count: number; totalDays: number }> = {};
    for (const req of filteredRequests) {
      if (!map[req.leave_type]) map[req.leave_type] = { count: 0, totalDays: 0 };
      map[req.leave_type].count++;
      map[req.leave_type].totalDays += req.total_days;
    }
    return Object.entries(map)
      .map(([leave_type, d]) => ({ leave_type, ...d }))
      .sort((a, b) => b.count - a.count);
  }, [filteredRequests]);

  /* ---- CSV Export (enhanced with utilization data) ---- */

  const exportCSV = useCallback(() => {
    // Build comprehensive CSV with all available data
    const headers = [
      'Name',
      'Department',
      'Total Entitlement',
      'Used Days',
      'Pending Days',
      'Remaining',
      'Utilization %',
    ];
    const rows: (string | number)[][] = utilizationData.map((m) => [
      m.name,
      m.department ?? 'N/A',
      m.totalEntitlement,
      m.usedDays,
      m.pendingDays,
      m.remaining,
      `${m.utilizationPct}%`,
    ]);

    const dateStr = `${dateFrom}_to_${dateTo}`.replace(/-/g, '');
    downloadCSVLegacy(headers, rows, `team-leave-report-${dateStr}.csv`);
  }, [utilizationData, dateFrom, dateTo]);

  const exportPDFReport = useCallback(() => {
    const dateStr = `${dateFrom}_to_${dateTo}`.replace(/-/g, '');
    downloadPDF(
      'Team Leave Report',
      [
        {
          title: 'Leave Utilization by Employee',
          columns: ['Name', 'Department', 'Entitlement', 'Used', 'Pending', 'Remaining', 'Utilization %'],
          rows: utilizationData.map((m) => [
            m.name,
            m.department ?? 'N/A',
            m.totalEntitlement,
            m.usedDays,
            m.pendingDays,
            m.remaining,
            `${m.utilizationPct}%`,
          ]),
        },
        {
          title: 'Leave Types Breakdown',
          columns: ['Leave Type', 'Requests', 'Days', 'Avg Days/Request'],
          rows: teamLeaveTypeBreakdown.map((lt) => [
            lt.leave_type,
            lt.count,
            lt.totalDays,
            lt.count > 0 ? (lt.totalDays / lt.count).toFixed(1) : '0',
          ]),
        },
      ],
      `team-leave-report-${dateStr}`,
      [`Period: ${dateFrom} to ${dateTo}`, `Team Size: ${team.length}`],
    );
  }, [utilizationData, teamLeaveTypeBreakdown, dateFrom, dateTo, team.length]);

  /* ---- Combined loading state ---- */
  const isLoading = loading && teamLoading;

  /* ---- Attendance tab: fetch data for team members ---- */
  const fetchAttendanceData = useCallback(async () => {
    if (team.length === 0) return;
    setAttendanceLoading(true);
    try {
      // Fetch attendance from the HR API for the date range
      const allRecords: typeof attendanceRecords = [];
      // Fetch day by day between attendanceDateFrom and attendanceDateTo
      const start = new Date(attendanceDateFrom);
      const end = new Date(attendanceDateTo);
      const teamIds = new Set(team.map(e => e.id));

      // Use the HR attendance endpoint for each date (max 31 days to avoid overload)
      const days: string[] = [];
      const d = new Date(start);
      while (d <= end && days.length < 31) {
        days.push(d.toISOString().slice(0, 10));
        d.setDate(d.getDate() + 1);
      }

      // Batch fetch (max 5 concurrent)
      for (let i = 0; i < days.length; i += 5) {
        const batch = days.slice(i, i + 5);
        const results = await Promise.all(
          batch.map(async (date) => {
            try {
              const res = await fetch(`/api/hr/attendance?date=${date}`, { credentials: 'include' });
              if (!res.ok) return [];
              const data = await res.json();
              return (data.records ?? []).filter((r: { employee_id: string }) => teamIds.has(r.employee_id));
            } catch { return []; }
          })
        );
        for (const recs of results) {
          allRecords.push(...recs);
        }
      }
      setAttendanceRecords(allRecords);
    } catch {
      setAttendanceRecords([]);
    } finally {
      setAttendanceLoading(false);
    }
  }, [team, attendanceDateFrom, attendanceDateTo]);

  useEffect(() => {
    if (activeReportTab === 'attendance' && team.length > 0) {
      fetchAttendanceData();
    }
  }, [activeReportTab, fetchAttendanceData, team.length]);

  // Attendance per-employee summary
  const attendancePerEmployee = useMemo(() => {
    const map = new Map<string, { name: string; dept: string; present: number; halfDay: number; late: number; absent: number; wfh: number; totalHours: number }>();
    for (const rec of attendanceRecords) {
      let entry = map.get(rec.employee_id);
      if (!entry) {
        entry = { name: rec.employee_name, dept: rec.department, present: 0, halfDay: 0, late: 0, absent: 0, wfh: 0, totalHours: 0 };
        map.set(rec.employee_id, entry);
      }
      if (rec.status === 'present') entry.present++;
      else if (rec.status === 'half_day') entry.halfDay++;
      else if (rec.status === 'late') { entry.present++; entry.late++; }
      else if (rec.status === 'absent') entry.absent++;
      if (rec.is_wfh) entry.wfh++;
      entry.totalHours += rec.total_hours ?? 0;
    }
    return Array.from(map.entries()).map(([id, e]) => ({ id, ...e }));
  }, [attendanceRecords]);

  const exportAttendanceCSV = useCallback(() => {
    if (attendanceRecords.length === 0) return;
    const headers = ['Employee', 'Department', 'Date', 'Check In', 'Check Out', 'Hours', 'Status', 'Location'];
    const rows = attendanceRecords.map(r => [
      r.employee_name,
      r.department,
      r.date,
      r.check_in ? new Date(r.check_in).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '',
      r.check_out ? new Date(r.check_out).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '',
      r.total_hours !== null ? r.total_hours.toFixed(1) : '',
      r.status,
      r.is_wfh ? 'Remote' : 'Office',
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `team-attendance-${attendanceDateFrom}-to-${attendanceDateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [attendanceRecords, attendanceDateFrom, attendanceDateTo]);

  /* ---- Render --------------------------------------------------- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Team Reports"
        description="Leave analytics and insights for your team"
        icon={<BarChart3 className="w-6 h-6 text-primary" />}
        action={
          <div className="flex items-center gap-3">
            {/* Year Selector */}
            <div className="relative">
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10))}
                aria-label="Select report year"
                className="appearance-none rounded-lg border border-white/10 bg-black/20 text-white pl-3 pr-9 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors cursor-pointer"
              >
                {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none" />
            </div>

            {/* Export CSV */}
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              disabled={isLoading || (team.length === 0 && !data)}
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            {/* Export PDF */}
            <Button
              variant="outline"
              size="sm"
              onClick={exportPDFReport}
              disabled={isLoading || (team.length === 0 && !data)}
            >
              <FileText className="w-4 h-4" />
              Export PDF
            </Button>
          </div>
        }
      />

      {/* Date Range Selector */}
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-white/10 bg-black/20">
        <Calendar className="w-4 h-4 text-white/60 shrink-0" />
        <span className="text-xs font-medium text-white/60">Date Range:</span>
        <div className="flex items-center gap-2">
          <label className="text-xs text-white/60">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg border border-white/10 bg-black/30 text-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-white/60">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg border border-white/10 bg-black/30 text-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-white/10">
        <button
          onClick={() => setActiveReportTab('leave')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeReportTab === 'leave'
              ? 'border-primary text-primary'
              : 'border-transparent text-white/60 hover:text-white'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          Leave Reports
        </button>
        <button
          onClick={() => setActiveReportTab('attendance')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeReportTab === 'attendance'
              ? 'border-primary text-primary'
              : 'border-transparent text-white/60 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          Attendance
        </button>
      </div>

      {/* ================================================================ */}
      {/* ATTENDANCE TAB                                                    */}
      {/* ================================================================ */}
      {activeReportTab === 'attendance' && (
        <div className="space-y-6">
          {/* Attendance Controls */}
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-white/10 bg-black/20">
            <Calendar className="w-4 h-4 text-white/60 shrink-0" />
            <span className="text-xs font-medium text-white/60">Date Range:</span>
            <div className="flex items-center gap-2">
              <label className="text-xs text-white/60">From</label>
              <input
                type="date"
                value={attendanceDateFrom}
                onChange={(e) => setAttendanceDateFrom(e.target.value)}
                className="px-3 py-1.5 text-sm rounded-lg border border-white/10 bg-black/30 text-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-white/60">To</label>
              <input
                type="date"
                value={attendanceDateTo}
                onChange={(e) => setAttendanceDateTo(e.target.value)}
                className="px-3 py-1.5 text-sm rounded-lg border border-white/10 bg-black/30 text-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
              />
            </div>
            <Button variant="outline" size="sm" onClick={exportAttendanceCSV} disabled={attendanceRecords.length === 0}>
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>

          {attendanceLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="w-8 h-8 text-primary mx-auto animate-spin" />
              <p className="text-sm text-white/60 mt-3">Loading attendance data...</p>
            </div>
          ) : team.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="w-12 h-12 mx-auto text-white/20 mb-4" />
              <p className="text-lg font-medium text-white">No team members found</p>
              <p className="text-sm text-white/60 mt-1">Attendance data requires direct reports.</p>
            </div>
          ) : (
            <>
              {/* Per-Employee Attendance Summary */}
              <GlassPanel>
                <div className="p-6 border-b border-white/10">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Per-Employee Summary
                    <span className="text-sm font-normal text-white/60">
                      ({attendanceDateFrom} to {attendanceDateTo})
                    </span>
                  </h3>
                </div>
                <div className="p-6">
                  {attendancePerEmployee.length === 0 ? (
                    <p className="text-sm text-white/60 text-center py-8">No attendance records found for this period.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="text-left py-3 px-3 font-medium text-sm text-white/60">Employee</th>
                            <th className="text-center py-3 px-3 font-medium text-sm text-white/60">Present</th>
                            <th className="text-center py-3 px-3 font-medium text-sm text-white/60">Half Days</th>
                            <th className="text-center py-3 px-3 font-medium text-sm text-white/60">Late</th>
                            <th className="text-center py-3 px-3 font-medium text-sm text-white/60">Absent</th>
                            <th className="text-center py-3 px-3 font-medium text-sm text-white/60">WFH</th>
                            <th className="text-right py-3 px-3 font-medium text-sm text-white/60">Total Hours</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendancePerEmployee.map((emp) => (
                            <tr key={emp.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                              <td className="py-3 px-3">
                                <p className="font-medium text-sm text-white">{emp.name}</p>
                                <p className="text-xs text-white/60">{emp.dept}</p>
                              </td>
                              <td className="text-center py-3 px-3 text-sm font-medium text-green-400">{emp.present}</td>
                              <td className="text-center py-3 px-3 text-sm font-medium text-orange-400">{emp.halfDay}</td>
                              <td className="text-center py-3 px-3 text-sm font-medium text-yellow-400">{emp.late}</td>
                              <td className="text-center py-3 px-3 text-sm font-medium text-red-400">{emp.absent}</td>
                              <td className="text-center py-3 px-3 text-sm text-white">{emp.wfh}</td>
                              <td className="text-right py-3 px-3 text-sm font-mono text-white">{emp.totalHours.toFixed(1)}h</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </GlassPanel>

              {/* Detailed Records Table */}
              <GlassPanel>
                <div className="p-6 border-b border-white/10">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <ClipboardList className="w-5 h-5" />
                    Detailed Records
                    <span className="text-sm font-normal text-white/60">
                      ({attendanceRecords.length} records)
                    </span>
                  </h3>
                </div>
                <div className="p-6">
                  {attendanceRecords.length === 0 ? (
                    <p className="text-sm text-white/60 text-center py-8">No records for this period.</p>
                  ) : (
                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                      <table className="w-full">
                        <thead className="sticky top-0 bg-black/40 backdrop-blur-xl z-10">
                          <tr className="border-b border-white/10">
                            <th className="text-left py-3 px-3 font-medium text-sm text-white/60">Employee</th>
                            <th className="text-left py-3 px-3 font-medium text-sm text-white/60">Date</th>
                            <th className="text-left py-3 px-3 font-medium text-sm text-white/60">Check In</th>
                            <th className="text-left py-3 px-3 font-medium text-sm text-white/60">Check Out</th>
                            <th className="text-right py-3 px-3 font-medium text-sm text-white/60">Hours</th>
                            <th className="text-left py-3 px-3 font-medium text-sm text-white/60">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendanceRecords.map((rec, idx) => (
                            <tr key={`${rec.employee_id}-${rec.date}-${idx}`} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                              <td className="py-2.5 px-3 text-sm text-white">{rec.employee_name}</td>
                              <td className="py-2.5 px-3 text-sm text-white">{new Date(rec.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                              <td className="py-2.5 px-3 text-sm font-mono text-white">{rec.check_in ? new Date(rec.check_in).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '--'}</td>
                              <td className="py-2.5 px-3 text-sm font-mono text-white">{rec.check_out ? new Date(rec.check_out).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '--'}</td>
                              <td className="py-2.5 px-3 text-sm font-mono text-right text-white">{rec.total_hours !== null ? `${rec.total_hours.toFixed(1)}h` : '--'}</td>
                              <td className="py-2.5 px-3">
                                <Badge variant={
                                  rec.status === 'present' ? 'success' :
                                  rec.status === 'late' ? 'warning' :
                                  rec.status === 'absent' ? 'danger' :
                                  rec.status === 'half_day' ? 'info' : 'default'
                                } className="text-xs">
                                  {rec.status.replace('_', ' ')}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </GlassPanel>
            </>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* LEAVE TAB - Original content below                               */}
      {/* ================================================================ */}
      {activeReportTab === 'leave' && (<>

      {/* Loading State */}
      <AnimatePresence mode="wait">
        {isLoading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-16 text-center"
          >
            <Loader2 className="w-8 h-8 text-primary mx-auto animate-spin" />
            <p className="text-sm text-white/60 mt-3">Loading report data...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error State (only show if both data sources failed) */}
      <AnimatePresence>
        {error && !loading && team.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================================================================ */}
      {/*  Team Attendance Summary (from manager-accessible data)          */}
      {/* ================================================================ */}
      {!isLoading && team.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="space-y-6"
        >
          {/* Attendance Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: 'Team Size',
                value: attendanceSummary.totalMembers,
                icon: Users,
                iconColor: 'text-blue-400',
                bgColor: 'bg-blue-500/10',
              },
              {
                label: 'Present (est.)',
                value: attendanceSummary.present,
                icon: CheckCircle2,
                iconColor: 'text-emerald-400',
                bgColor: 'bg-emerald-500/10',
              },
              {
                label: 'On Leave',
                value: attendanceSummary.onLeave,
                icon: CalendarDays,
                iconColor: 'text-amber-400',
                bgColor: 'bg-amber-500/10',
              },
              {
                label: 'Pending Requests',
                value: attendanceSummary.pendingRequests,
                icon: Clock,
                iconColor: 'text-purple-400',
                bgColor: 'bg-purple-500/10',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <GlassPanel key={item.label}>
                  <div className="px-6 pt-5 pb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl ${item.bgColor} flex items-center justify-center shrink-0`}
                      >
                        <Icon className={`w-5 h-5 ${item.iconColor}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-white/60 font-medium">{item.label}</p>
                        <p className="text-2xl font-bold text-white leading-tight">
                          {item.value}
                        </p>
                      </div>
                    </div>
                  </div>
                </GlassPanel>
              );
            })}
          </div>

          {/* Leave Days Summary */}
          <GlassPanel>
            <div className="px-6 pt-5 pb-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-xs text-white/60 font-medium">Approved Leave Days</p>
                    <p className="text-xl font-bold text-white">
                      {attendanceSummary.totalLeaveDays}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white/60 font-medium">Requests in Period</p>
                  <p className="text-xl font-bold text-white">{teamTotalRequests}</p>
                </div>
              </div>
            </div>
          </GlassPanel>

          {/* ===== Team Leave Utilization Chart ===== */}
          <GlassPanel>
            <div className="p-6 border-b border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-white">Team Leave Utilization</h3>
                </div>
                <div className="flex items-center gap-3 text-xs text-white/60">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    &lt; 50%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                    50-80%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                    &gt; 80%
                  </span>
                </div>
              </div>
            </div>
            <div className="p-6">
              {utilizationData.length === 0 ? (
                <div className="py-8 text-center">
                  <FileSpreadsheet className="w-8 h-8 text-white/60/40 mx-auto" />
                  <p className="text-sm text-white/60 mt-2">
                    No utilization data available.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {utilizationData.map((member, i) => (
                    <div key={member.id} className="flex items-center gap-3">
                      {/* Name column */}
                      <div className="w-36 shrink-0">
                        <p className="text-sm font-medium text-white truncate">
                          {member.name}
                        </p>
                        <p className="text-[10px] text-white/60 truncate">
                          {member.department ?? 'No department'}
                        </p>
                      </div>

                      {/* Bar */}
                      <div className="flex-1 min-w-0">
                        <div className="w-full bg-white/5/60 rounded-full h-3 overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${getUtilizationBarColor(member.utilizationPct)}`}
                            style={{
                              width: `${Math.max(1, Math.min(100, member.utilizationPct))}%`,
                              originX: 0,
                            }}
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{
                              duration: 0.6,
                              ease: 'easeOut',
                              delay: i * 0.05,
                            }}
                          />
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="w-20 shrink-0 text-right">
                        <span
                          className={`text-sm font-bold ${getUtilizationTextColor(member.utilizationPct)}`}
                        >
                          {member.utilizationPct}%
                        </span>
                        <p className="text-[10px] text-white/60 tabular-nums">
                          {member.usedDays}/{member.totalEntitlement}d
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </GlassPanel>

          {/* ===== Team Requests by Status + Leave Types (date-range filtered) ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassPanel className="h-full">
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-white">Team Requests by Status</h3>
                </div>
              </div>
              <div className="p-6">
                {teamStatusCounts.length === 0 ? (
                  <div className="py-8 text-center">
                    <FileSpreadsheet className="w-8 h-8 text-white/60/40 mx-auto" />
                    <p className="text-sm text-white/60 mt-2">
                      No requests in this period.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {teamStatusCounts.map((s) => {
                      const pct =
                        teamTotalRequests > 0
                          ? (s.count / teamTotalRequests) * 100
                          : 0;
                      return (
                        <div key={s.status} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Badge
                              variant={STATUS_BADGE[s.status] ?? 'default'}
                              size="sm"
                            >
                              {s.status}
                            </Badge>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-white/60">
                                {pct.toFixed(0)}%
                              </span>
                              <span className="text-sm font-semibold text-white w-8 text-right tabular-nums">
                                {s.count}
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-white/5/60 rounded-full h-2.5 overflow-hidden">
                            <motion.div
                              className={`h-full rounded-full ${STATUS_BAR_COLORS[s.status] ?? 'bg-primary'}`}
                              style={{ width: `${pct}%`, originX: 0 }}
                              variants={barVariants}
                              custom={pct}
                              initial="hidden"
                              animate="visible"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </GlassPanel>

            <GlassPanel className="h-full">
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-white">Top Leave Types</h3>
                </div>
              </div>
              <div className="p-6">
                {teamLeaveTypeBreakdown.length === 0 ? (
                  <div className="py-8 text-center">
                    <FileSpreadsheet className="w-8 h-8 text-white/60/40 mx-auto" />
                    <p className="text-sm text-white/60 mt-2">
                      No leave data in this period.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {teamLeaveTypeBreakdown.slice(0, 8).map((lt, idx) => {
                      const maxDays = Math.max(
                        1,
                        ...teamLeaveTypeBreakdown.map((x) => x.totalDays)
                      );
                      const pct =
                        maxDays > 0 ? (lt.totalDays / maxDays) * 100 : 0;
                      const barColor =
                        LEAVE_TYPE_COLORS[idx % LEAVE_TYPE_COLORS.length];
                      return (
                        <div key={lt.leave_type} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-white capitalize">
                              {lt.leave_type.replace(/_/g, ' ')}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-white/60 tabular-nums">
                                {lt.count} req
                              </span>
                              <span className="text-sm font-semibold text-white tabular-nums">
                                {lt.totalDays} days
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-white/5/60 rounded-full h-2 overflow-hidden">
                            <motion.div
                              className={`h-full rounded-full ${barColor}`}
                              style={{ width: `${pct}%`, originX: 0 }}
                              variants={barVariants}
                              custom={pct}
                              initial="hidden"
                              animate="visible"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </GlassPanel>
          </div>
        </motion.div>
      )}

      {/* ================================================================ */}
      {/*  Company-wide Summary (from leave-summary API, admin/hr only)    */}
      {/* ================================================================ */}
      {!loading && data && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Divider heading for company data */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center gap-3 pt-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs font-medium text-white/60 uppercase tracking-wider">
                Company-wide Analytics ({year})
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>
          </motion.div>

          {/* ===== Company Summary Cards ===== */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <GlassPanel>
              <div className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                    <ClipboardList className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-white/60 font-medium">Total Requests</p>
                    <p className="text-2xl font-bold text-white leading-tight">{totalRequests}</p>
                  </div>
                </div>
              </div>
            </GlassPanel>

            <GlassPanel>
              <div className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-white/60 font-medium">Approval Rate</p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 leading-tight">
                      {totalRequests > 0 ? `${approvalRate}%` : '--'}
                    </p>
                  </div>
                </div>
              </div>
            </GlassPanel>

            <GlassPanel>
              <div className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-white/60 font-medium">All Employees</p>
                    <p className="text-2xl font-bold text-white leading-tight">{data.total_employees}</p>
                  </div>
                </div>
              </div>
            </GlassPanel>

            <GlassPanel>
              <div className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0">
                    <CalendarDays className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-white/60 font-medium">Avg Leave Days</p>
                    <p className="text-2xl font-bold text-white leading-tight">{avgLeaveDays}</p>
                    <p className="text-[10px] text-white/60">per employee</p>
                  </div>
                </div>
              </div>
            </GlassPanel>
          </motion.div>

          {/* ===== Company Requests by Status + Leave Types ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div variants={itemVariants}>
              <GlassPanel className="h-full">
                <div className="p-6 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold text-white">All Requests by Status</h3>
                  </div>
                </div>
                <div className="p-6">
                  {data.by_status.length === 0 ? (
                    <div className="py-8 text-center">
                      <FileSpreadsheet className="w-8 h-8 text-white/60/40 mx-auto" />
                      <p className="text-sm text-white/60 mt-2">No requests this year.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {data.by_status.map((s) => {
                        const pct = totalRequests > 0 ? (s.count / totalRequests) * 100 : 0;
                        return (
                          <div key={s.status} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <Badge variant={STATUS_BADGE[s.status] ?? 'default'} size="sm">
                                {s.status}
                              </Badge>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-white/60">
                                  {pct.toFixed(0)}%
                                </span>
                                <span className="text-sm font-semibold text-white w-8 text-right tabular-nums">
                                  {s.count}
                                </span>
                              </div>
                            </div>
                            <div className="w-full bg-white/5/60 rounded-full h-2.5 overflow-hidden">
                              <motion.div
                                className={`h-full rounded-full ${STATUS_BAR_COLORS[s.status] ?? 'bg-primary'}`}
                                style={{ width: `${pct}%`, originX: 0 }}
                                variants={barVariants}
                                custom={pct}
                                initial="hidden"
                                animate="visible"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </GlassPanel>
            </motion.div>

            <motion.div variants={itemVariants}>
              <GlassPanel className="h-full">
                <div className="p-6 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold text-white">Leave Types Breakdown</h3>
                  </div>
                </div>
                <div className="p-6">
                  {data.by_leave_type.length === 0 ? (
                    <div className="py-8 text-center">
                      <FileSpreadsheet className="w-8 h-8 text-white/60/40 mx-auto" />
                      <p className="text-sm text-white/60 mt-2">No leave data yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {data.by_leave_type.slice(0, 8).map((lt, idx) => {
                        const pct = maxLeaveTypeDays > 0 ? (lt.total_days / maxLeaveTypeDays) * 100 : 0;
                        const barColor = LEAVE_TYPE_COLORS[idx % LEAVE_TYPE_COLORS.length];
                        return (
                          <div key={lt.leave_type} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-white">{lt.leave_type}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-white/60 tabular-nums">
                                  {lt.count} req
                                </span>
                                <span className="text-sm font-semibold text-white tabular-nums">
                                  {lt.total_days} days
                                </span>
                              </div>
                            </div>
                            <div className="w-full bg-white/5/60 rounded-full h-2 overflow-hidden">
                              <motion.div
                                className={`h-full rounded-full ${barColor}`}
                                style={{ width: `${pct}%`, originX: 0 }}
                                variants={barVariants}
                                custom={pct}
                                initial="hidden"
                                animate="visible"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </GlassPanel>
            </motion.div>
          </div>

          {/* ===== Monthly Trend ===== */}
          <motion.div variants={itemVariants}>
            <GlassPanel>
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-white">Monthly Leave Trend ({year})</h3>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-end gap-1.5 sm:gap-2 h-48">
                  {monthlyTrend.map((m, i) => {
                    const heightPct = m.count > 0
                      ? Math.max(6, (m.count / maxMonthlyCount) * 100)
                      : 3;
                    const hasData = m.count > 0;
                    return (
                      <div
                        key={m.month}
                        className="flex-1 flex flex-col items-center justify-end h-full gap-1"
                      >
                        <span className="text-[10px] sm:text-xs font-medium text-white/60 tabular-nums">
                          {hasData ? m.count : ''}
                        </span>
                        <div className="w-full flex justify-center" style={{ height: `${heightPct}%` }}>
                          <motion.div
                            className={`w-full max-w-[40px] rounded-t-md ${
                              hasData
                                ? CHART_BAR_GRADIENT
                                : 'bg-white/5/60'
                            }`}
                            style={{ originY: 1, height: '100%' }}
                            variants={chartBarVariants}
                            custom={i}
                            initial="hidden"
                            animate="visible"
                            whileHover={hasData ? { scale: 1.05, transition: { duration: 0.15 } } : undefined}
                            title={`${MONTHS[m.month - 1]}: ${m.count} request${m.count !== 1 ? 's' : ''}`}
                          />
                        </div>
                        <span className="text-[10px] sm:text-xs text-white/60 font-medium">
                          {MONTHS[m.month - 1]}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {monthlyTrend.every((m) => m.count === 0) && (
                  <p className="text-xs text-white/60 text-center mt-4">
                    No monthly data available for {year}.
                  </p>
                )}
              </div>
            </GlassPanel>
          </motion.div>

          {/* ===== Top Leave Takers ===== */}
          {topTakers.length > 0 && (
            <motion.div variants={itemVariants}>
              <GlassPanel>
                <div className="p-6 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    <h3 className="text-lg font-semibold text-white">Top Leave Takers</h3>
                  </div>
                </div>
                <div className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10/40 dark:border-slate-800/40">
                          <th className="text-left text-xs font-medium text-white/60 uppercase tracking-wider px-6 py-3 w-12">
                            #
                          </th>
                          <th className="text-left text-xs font-medium text-white/60 uppercase tracking-wider px-6 py-3">
                            Employee
                          </th>
                          <th className="text-right text-xs font-medium text-white/60 uppercase tracking-wider px-6 py-3">
                            Total Days
                          </th>
                          <th className="text-right text-xs font-medium text-white/60 uppercase tracking-wider px-6 py-3 w-32 hidden sm:table-cell">
                            Share
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30 dark:divide-slate-800/30">
                        {topTakers.map((t, i) => {
                          const share = totalLeaveDays > 0
                            ? ((t.total_days / totalLeaveDays) * 100).toFixed(1)
                            : '0';
                          return (
                            <motion.tr
                              key={`${t.employee_name}-${i}`}
                              initial={{ opacity: 0, x: -12 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.3 + i * 0.06 }}
                              className="hover:bg-white/5/30 transition-colors"
                            >
                              <td className="px-6 py-3">
                                <span
                                  className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                    i === 0
                                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
                                      : i === 1
                                        ? 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400'
                                        : i === 2
                                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400'
                                          : 'bg-white/5 text-white/60'
                                  }`}
                                >
                                  {i + 1}
                                </span>
                              </td>
                              <td className="px-6 py-3 font-medium text-white">{t.employee_name}</td>
                              <td className="px-6 py-3 text-right font-semibold text-white tabular-nums">
                                {t.total_days}
                              </td>
                              <td className="px-6 py-3 text-right text-white/60 tabular-nums hidden sm:table-cell">
                                {share}%
                              </td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </GlassPanel>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Empty State */}
      {!isLoading && !error && !data && team.length === 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <GlassPanel>
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center mx-auto">
                <BarChart3 className="w-6 h-6 text-purple-500" />
              </div>
              <p className="text-white/60 mt-4 text-sm font-medium">
                No report data available.
              </p>
              <p className="text-white/60 mt-1 text-xs">
                Reports will appear once team members and leave requests are set up.
              </p>
            </div>
          </GlassPanel>
        </motion.div>
      )}

      </>)}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function MetricCard({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: number | string }) {
  return (
    <FadeIn>
      <TiltCard>
        <div className="glass-panel rounded-2xl border border-white/10 p-5 h-full">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/20 shadow-[0_0_10px_rgba(var(--primary-rgb),0.2)]">
              <Icon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-white/70">{label}</p>
              <p className="text-2xl font-bold text-white">{value}</p>
            </div>
          </div>
        </div>
      </TiltCard>
    </FadeIn>
  );
}

function BreakdownCard({ title, data, total, colors, dataKey }: { title: string, data: any[], total: number, colors: string[] | Record<string, string>, dataKey: string }) {
  return (
    <FadeIn>
      <TiltCard>
        <div className="glass-panel rounded-2xl border border-white/10 p-6 h-full">
          <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
          <div className="space-y-3">
            {data.map((item, i) => {
              const percentage = total > 0 ? (item.count / total) * 100 : 0;
              const color = Array.isArray(colors) ? colors[i % colors.length] : colors[item[dataKey]];
              return (
                <div key={item[dataKey]}>
                  <div className="flex justify-between items-center text-sm mb-1">
                    <span className="text-white/80 capitalize">{item[dataKey].replace(/_/g, ' ')}</span>
                    <span className="font-medium text-white/90">{item.count} ({percentage.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-black/30 rounded-full h-2 shadow-inner">
                    <motion.div
                      className={`h-2 rounded-full ${color}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </TiltCard>
    </FadeIn>
  );
}

function UtilizationCard({ data }: { data: MemberUtilization[] }) {
  return (
    <FadeIn>
      <TiltCard>
        <div className="glass-panel rounded-2xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Team Leave Utilization</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {data.map((member) => (
              <div key={member.id} className="p-3 rounded-lg bg-black/20 border border-white/10">
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className="font-medium text-white/90">{member.name}</span>
                  <span className={`font-bold ${getUtilizationTextColor(member.utilizationPct)}`}>{member.utilizationPct}%</span>
                </div>
                <div className="w-full bg-black/40 rounded-full h-2 shadow-inner">
                  <motion.div
                    className={`h-2 rounded-full ${getUtilizationBarColor(member.utilizationPct)}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${member.utilizationPct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
                <div className="flex justify-between text-xs text-white/60 mt-1">
                  <span>Used: {member.usedDays}</span>
                  <span>Total: {member.totalEntitlement}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </TiltCard>
    </FadeIn>
  );
}
