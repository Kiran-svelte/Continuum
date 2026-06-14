'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
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
import { Input, Select } from '@/components/ui/input';

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
  if (pct >= 80) return 'bg-[var(--status-danger)]';
  if (pct >= 60) return 'bg-[var(--status-warning)]';
  if (pct >= 40) return 'bg-[var(--status-success)]';
  return 'bg-[var(--status-info)]';
}

function getUtilizationTextColor(pct: number): string {
  if (pct >= 80) return 'text-[var(--status-danger)]';
  if (pct >= 60) return 'text-[var(--status-warning)]';
  if (pct >= 40) return 'text-[var(--status-success)]';
  return 'text-[var(--status-info)]';
}

const TREND_HEIGHT_CLASS_BY_BUCKET: Record<number, string> = {
  3: 'h-[3%]',
  5: 'h-[5%]',
  10: 'h-[10%]',
  15: 'h-[15%]',
  20: 'h-[20%]',
  25: 'h-1/4',
  30: 'h-[30%]',
  35: 'h-[35%]',
  40: 'h-[40%]',
  45: 'h-[45%]',
  50: 'h-1/2',
  55: 'h-[55%]',
  60: 'h-[60%]',
  65: 'h-[65%]',
  70: 'h-[70%]',
  75: 'h-3/4',
  80: 'h-[80%]',
  85: 'h-[85%]',
  90: 'h-[90%]',
  95: 'h-[95%]',
  100: 'h-full',
};

function getTrendHeightClass(percent: number): string {
  const normalized = Number.isFinite(percent) ? percent : 0;
  if (normalized <= 3) return TREND_HEIGHT_CLASS_BY_BUCKET[3];
  if (normalized >= 100) return TREND_HEIGHT_CLASS_BY_BUCKET[100];
  const rounded = Math.max(5, Math.round(normalized / 5) * 5);
  return TREND_HEIGHT_CLASS_BY_BUCKET[rounded] ?? TREND_HEIGHT_CLASS_BY_BUCKET[3];
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
  approved: 'bg-[var(--status-success)]',
  pending: 'bg-[var(--status-warning)]',
  rejected: 'bg-[var(--status-danger)]',
  cancelled: 'bg-[var(--primary)]',
  escalated: 'bg-[var(--status-info)]',
};

const LEAVE_TYPE_COLORS = [
  'bg-[var(--status-info)]',
  'bg-[var(--status-info)]/70',
  'bg-[var(--status-success)]',
  'bg-[var(--status-success)]/70',
  'bg-[var(--status-warning)]',
  'bg-[var(--status-danger)]',
  'bg-[var(--primary)]',
  'bg-[var(--primary)]/70',
];

const CHART_BAR_GRADIENT = 'bg-gradient-to-t from-[var(--primary)] to-[var(--status-info)]';

/**
 * Maps the nested enterprise API response from /api/reports/leave-summary
 * into the flat LeaveSummary shape consumed by this manager component.
 *
 * @param raw - Raw JSON from the reports API
 * @param targetYear - Report year
 * @returns LeaveSummary in the expected flat shape
 */
function mapToManagerLeaveSummary(
  raw: Record<string, unknown>,
  targetYear: number
): LeaveSummary {
  const summary = (raw.summary ?? raw) as Record<string, unknown>;
  const overall = (summary.overall ?? {}) as Record<string, number>;

  const rawByStatus = (summary.by_status ?? raw.by_status ?? []) as Array<Record<string, unknown>>;
  const byStatus: ByStatus[] = rawByStatus.map((s) => {
    const countObj = s._count as Record<string, number> | undefined;
    return {
      status: String(s.status ?? ''),
      count: Number(s.count ?? countObj?.id ?? 0),
    };
  });

  const rawByLeaveType = summary.by_leave_type ?? raw.by_leave_type;
  let byLeaveType: ByLeaveType[] = [];
  if (Array.isArray(rawByLeaveType)) {
    byLeaveType = rawByLeaveType.map((lt: Record<string, unknown>) => {
      const countObj = lt._count as Record<string, number> | undefined;
      const sumObj = lt._sum as Record<string, number> | undefined;
      return {
        leave_type: String(lt.leave_type ?? ''),
        count: Number(lt.count ?? lt.total_requests ?? countObj?.id ?? 0),
        total_days: Number(lt.total_days ?? sumObj?.total_days ?? 0),
      };
    });
  } else if (rawByLeaveType && typeof rawByLeaveType === 'object') {
    byLeaveType = Object.entries(rawByLeaveType as Record<string, Record<string, unknown>>).map(
      ([leaveType, stats]) => ({
        leave_type: leaveType,
        count: Number(stats.total_requests ?? 0),
        total_days: Number(stats.total_days ?? 0),
      })
    );
  }

  const rawMonthly = (summary.monthly ?? raw.monthly_trend ?? raw.monthly ?? []) as Array<Record<string, unknown>>;
  const monthlyTrend: MonthlyTrend[] = rawMonthly.map((m) => ({
    month: Number(m.month ?? 0),
    count: Number(m.count ?? m.requests ?? 0),
  }));

  const rawTopTakers = (summary.top_leave_takers ?? summary.top_takers ?? raw.top_takers ?? []) as Array<Record<string, unknown>>;
  const topTakers: TopTaker[] = rawTopTakers.map((t) => ({
    employee_name: String(t.employee_name ?? t.name ?? ''),
    total_days: Number(t.total_days ?? t.days_used ?? 0),
  }));

  return {
    year: targetYear,
    total_employees: Number(overall.total_employees ?? raw.total_employees ?? 0),
    by_status: byStatus,
    by_leave_type: byLeaveType,
    monthly_trend: monthlyTrend,
    top_takers: topTakers,
  };
}

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
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ReportsView() {
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
        if (!cancelled) setData(mapToManagerLeaveSummary(json, year));
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
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--border)] pb-6">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-7 h-7 text-[var(--primary)]" />
              <div>
                <h1 className="text-3xl font-bold text-foreground">Team Reports</h1>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">Leave analytics and insights for your team</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Year Selector */}
              <div className="relative">
                <Select
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value, 10))}
                  aria-label="Select report year"
                  className="appearance-none rounded-lg border border-[var(--border)] bg-[var(--background)] text-foreground pl-3 pr-9 py-2 text-sm font-medium"
                >
                  {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </Select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] pointer-events-none" />
              </div>

              {/* Export Buttons */}
              <Button variant="outline" size="sm" onClick={exportCSV} disabled={isLoading || (team.length === 0 && !data)}>
                <Download className="w-4 h-4" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportPDFReport} disabled={isLoading || (team.length === 0 && !data)}>
                <FileText className="w-4 h-4" />
                PDF
              </Button>
            </div>
          </div>

          {/* Date Range Selector */}
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-[var(--border)] bg-[var(--muted)]/40">
            <Calendar className="w-4 h-4 text-[var(--muted-foreground)] shrink-0" />
            <span className="text-xs font-medium text-[var(--muted-foreground)]">Date Range:</span>
            <div className="flex items-center gap-2">
              <label htmlFor="reports-date-from" className="text-xs text-[var(--muted-foreground)]">From</label>
              <Input
                id="reports-date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                aria-label="Report date from"
                className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border)] bg-[var(--background)] text-foreground"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="reports-date-to" className="text-xs text-[var(--muted-foreground)]">To</label>
              <Input
                id="reports-date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                aria-label="Report date to"
                className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border)] bg-[var(--background)] text-foreground"
              />
            </div>
          </div>

          {/* Tab Bar */}
          <div className="flex gap-1 border-b border-[var(--border)]">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setActiveReportTab('leave')}
              className={`flex items-center gap-2 rounded-none px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeReportTab === 'leave'
                  ? 'border-[var(--primary)] text-[var(--primary)]'
                  : 'border-transparent text-[var(--muted-foreground)] hover:text-foreground'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              Leave Reports
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setActiveReportTab('attendance')}
              className={`flex items-center gap-2 rounded-none px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeReportTab === 'attendance'
                  ? 'border-[var(--primary)] text-[var(--primary)]'
                  : 'border-transparent text-[var(--muted-foreground)] hover:text-foreground'
              }`}
            >
              <Clock className="w-4 h-4" />
              Attendance
            </Button>
          </div>

          {/* ================================================================ */}
          {/* ATTENDANCE TAB                                                    */}
          {/* ================================================================ */}
          {activeReportTab === 'attendance' && (
            <div className="space-y-6">
              {/* Attendance Controls */}
              <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--muted)]/40">
                <Calendar className="w-4 h-4 text-[var(--muted-foreground)] shrink-0" />
                <span className="text-xs font-medium text-[var(--muted-foreground)]">Date Range:</span>
                <div className="flex items-center gap-2">
                  <label htmlFor="attendance-date-from" className="text-xs text-[var(--muted-foreground)]">From</label>
                  <Input
                    id="attendance-date-from"
                    type="date"
                    value={attendanceDateFrom}
                    onChange={(e) => setAttendanceDateFrom(e.target.value)}
                    aria-label="Attendance date from"
                    className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border)] bg-[var(--background)] text-foreground"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="attendance-date-to" className="text-xs text-[var(--muted-foreground)]">To</label>
                  <Input
                    id="attendance-date-to"
                    type="date"
                    value={attendanceDateTo}
                    onChange={(e) => setAttendanceDateTo(e.target.value)}
                    aria-label="Attendance date to"
                    className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border)] bg-[var(--background)] text-foreground"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={exportAttendanceCSV} disabled={attendanceRecords.length === 0}>
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>
              </div>

              {attendanceLoading ? (
                <div className="py-16 text-center">
                  <Loader2 className="w-8 h-8 text-[var(--primary)] mx-auto animate-spin" />
                  <p className="text-sm text-[var(--muted-foreground)] mt-3">Loading attendance data...</p>
                </div>
              ) : team.length === 0 ? (
                <div className="py-16 text-center border border-[var(--border)] rounded-lg bg-[var(--card)]">
                  <Users className="w-12 h-12 mx-auto text-[var(--muted-foreground)] mb-4" />
                  <p className="text-lg font-medium text-foreground">No team members found</p>
                  <p className="text-sm text-[var(--muted-foreground)] mt-1">Attendance data requires direct reports.</p>
                </div>
              ) : (
                <>
                  {/* Per-Employee Attendance Summary */}
                  <div className="border border-[var(--border)] bg-[var(--card)] rounded-lg overflow-hidden">
                    <div className="p-4 sm:p-6 border-b border-[var(--border)]">
                      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Per-Employee Summary
                        <span className="text-sm font-normal text-[var(--muted-foreground)]">
                          ({attendanceDateFrom} to {attendanceDateTo})
                        </span>
                      </h3>
                    </div>
                    <div className="p-4 sm:p-6 overflow-x-auto">
                      {attendancePerEmployee.length === 0 ? (
                        <p className="text-sm text-[var(--muted-foreground)] text-center py-8">No attendance records found for this period.</p>
                      ) : (
                        <table className="w-full text-sm">
                          <thead className="bg-[var(--muted)]/40">
                            <tr className="border-b border-[var(--border)]">
                              <th className="text-left py-3 px-3 font-medium text-[var(--muted-foreground)]">Employee</th>
                              <th className="text-center py-3 px-3 font-medium text-[var(--muted-foreground)]">Present</th>
                              <th className="text-center py-3 px-3 font-medium text-[var(--muted-foreground)]">Half Days</th>
                              <th className="text-center py-3 px-3 font-medium text-[var(--muted-foreground)]">Late</th>
                              <th className="text-center py-3 px-3 font-medium text-[var(--muted-foreground)]">Absent</th>
                              <th className="text-center py-3 px-3 font-medium text-[var(--muted-foreground)]">WFH</th>
                              <th className="text-right py-3 px-3 font-medium text-[var(--muted-foreground)]">Total Hours</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border)]">
                            {attendancePerEmployee.map((emp) => (
                              <tr key={emp.id} className="hover:bg-[var(--muted)]/20 transition-colors">
                                <td className="py-3 px-3">
                                  <p className="font-medium text-sm text-foreground">{emp.name}</p>
                                  <p className="text-xs text-[var(--muted-foreground)]">{emp.dept}</p>
                                </td>
                                <td className="text-center py-3 px-3 text-sm font-medium text-[var(--status-success)]">{emp.present}</td>
                                <td className="text-center py-3 px-3 text-sm font-medium text-[var(--status-warning)]">{emp.halfDay}</td>
                                <td className="text-center py-3 px-3 text-sm font-medium text-[var(--status-warning)]">{emp.late}</td>
                                <td className="text-center py-3 px-3 text-sm font-medium text-[var(--status-danger)]">{emp.absent}</td>
                                <td className="text-center py-3 px-3 text-sm text-foreground">{emp.wfh}</td>
                                <td className="text-right py-3 px-3 text-sm font-mono text-foreground">{emp.totalHours.toFixed(1)}h</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                  {/* Detailed Records Table */}
                  <div className="border border-[var(--border)] bg-[var(--card)] rounded-lg overflow-hidden">
                    <div className="p-4 sm:p-6 border-b border-[var(--border)]">
                      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <ClipboardList className="w-5 h-5" />
                        Detailed Records
                        <span className="text-sm font-normal text-[var(--muted-foreground)]">
                          ({attendanceRecords.length} records)
                        </span>
                      </h3>
                    </div>
                    <div className="p-4 sm:p-6 overflow-x-auto max-h-[500px] overflow-y-auto">
                      {attendanceRecords.length === 0 ? (
                        <p className="text-sm text-[var(--muted-foreground)] text-center py-8">No records for this period.</p>
                      ) : (
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-[var(--card)] border-b border-[var(--border)]">
                            <tr className="bg-[var(--muted)]/40">
                              <th className="text-left py-3 px-3 font-medium text-[var(--muted-foreground)]">Employee</th>
                              <th className="text-left py-3 px-3 font-medium text-[var(--muted-foreground)]">Date</th>
                              <th className="text-left py-3 px-3 font-medium text-[var(--muted-foreground)]">Check In</th>
                              <th className="text-left py-3 px-3 font-medium text-[var(--muted-foreground)]">Check Out</th>
                              <th className="text-right py-3 px-3 font-medium text-[var(--muted-foreground)]">Hours</th>
                              <th className="text-left py-3 px-3 font-medium text-[var(--muted-foreground)]">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border)]">
                            {attendanceRecords.map((rec, idx) => (
                              <tr key={`${rec.employee_id}-${rec.date}-${idx}`} className="hover:bg-[var(--muted)]/20 transition-colors">
                                <td className="py-2.5 px-3 text-sm text-foreground">{rec.employee_name}</td>
                                <td className="py-2.5 px-3 text-sm text-foreground">{new Date(rec.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                                <td className="py-2.5 px-3 text-sm font-mono text-foreground">{rec.check_in ? new Date(rec.check_in).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '--'}</td>
                                <td className="py-2.5 px-3 text-sm font-mono text-foreground">{rec.check_out ? new Date(rec.check_out).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '--'}</td>
                                <td className="py-2.5 px-3 text-sm font-mono text-right text-foreground">{rec.total_hours !== null ? `${rec.total_hours.toFixed(1)}h` : '--'}</td>
                                <td className="py-2.5 px-3">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
                                    rec.status === 'present' ? 'bg-[var(--status-success-soft)] text-[var(--status-success)] border-[var(--status-success)]/20' :
                                    rec.status === 'late' ? 'bg-[var(--status-warning-soft)] text-[var(--status-warning)] border-[var(--status-warning)]/20' :
                                    rec.status === 'absent' ? 'bg-[var(--status-danger-soft)] text-[var(--status-danger)] border-[var(--status-danger)]/20' :
                                    rec.status === 'half_day' ? 'bg-[var(--status-info-soft)] text-[var(--status-info)] border-[var(--status-info)]/20' :
                                    'bg-[var(--muted)]/40 text-[var(--muted-foreground)] border-[var(--border)]'
                                  }`}>
                                    {rec.status.replace('_', ' ')}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* LEAVE TAB                                                        */}
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
            <p className="text-sm text-muted-foreground mt-3">Loading report data...</p>
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
                  color: 'info',
              },
              {
                label: 'Present (est.)',
                value: attendanceSummary.present,
                icon: CheckCircle2,
                iconColor: 'text-emerald-400',
                bgColor: 'bg-emerald-500/10',
                  color: 'success',
              },
              {
                label: 'On Leave',
                value: attendanceSummary.onLeave,
                icon: CalendarDays,
                iconColor: 'text-amber-400',
                bgColor: 'bg-amber-500/10',
                  color: 'warning',
              },
              {
                label: 'Pending Requests',
                value: attendanceSummary.pendingRequests,
                icon: Clock,
                iconColor: 'text-purple-400',
                bgColor: 'bg-purple-500/10',
                  color: 'primary',
              },
            ].map((item) => {
              const Icon = item.icon;
                            const colorClasses = {
                              info: 'bg-[var(--status-info)]/20 text-[var(--status-info)]',
                              success: 'bg-[var(--status-success)]/20 text-[var(--status-success)]',
                              warning: 'bg-[var(--status-warning)]/20 text-[var(--status-warning)]',
                              primary: 'bg-[var(--primary)]/20 text-[var(--primary)]',
                            };
              return (
                <div key={item.label} className="border border-[var(--border)] bg-[var(--card)] rounded-lg p-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${colorClasses[item.color as keyof typeof colorClasses]}`}>
                      <Icon className="w-6 h-6" />
                      </div>
                    <div className="min-w-0">
                      <p className="text-xs text-[var(--muted-foreground)] font-medium">{item.label}</p>
                      <p className="text-2xl font-bold text-foreground leading-tight">{item.value}</p>
                      </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Leave Days Summary */}
          <div className="border border-[var(--border)] bg-[var(--card)] rounded-lg p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-[var(--primary)]/20 text-[var(--primary)]">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-[var(--muted-foreground)] font-medium">Approved Leave Days</p>
                  <p className="text-xl font-bold text-foreground">{attendanceSummary.totalLeaveDays}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-[var(--muted-foreground)] font-medium">Requests in Period</p>
                <p className="text-xl font-bold text-foreground">{teamTotalRequests}</p>
              </div>
            </div>
          </div>

          {/* ===== Team Leave Utilization Chart ===== */}
          <div className="border border-[var(--border)] bg-[var(--card)] rounded-lg overflow-hidden">
            <div className="p-6 border-b border-[var(--border)]">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[var(--primary)]" />
                  <h3 className="text-lg font-semibold text-foreground">Team Leave Utilization</h3>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--status-success)] inline-block" />
                    &lt; 50%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--status-warning)] inline-block" />
                    50-80%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--status-danger)] inline-block" />
                    &gt; 80%
                  </span>
                </div>
              </div>
            </div>
            <div className="p-6">
              {utilizationData.length === 0 ? (
                <div className="py-8 text-center">
                  <FileSpreadsheet className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                  <p className="text-sm text-muted-foreground mt-2">
                    No utilization data available.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {utilizationData.map((member, i) => (
                    <div key={member.id} className="flex items-center gap-3">
                      {/* Name column */}
                      <div className="w-36 shrink-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {member.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {member.department ?? 'No department'}
                        </p>
                      </div>

                      {/* Bar */}
                      <div className="flex-1 min-w-0">
                        <div className="w-full bg-[var(--accent)]/60 rounded-full h-3 overflow-hidden">
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
                        <p className="text-[10px] text-muted-foreground tabular-nums">
                          {member.usedDays}/{member.totalEntitlement}d
                          </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ===== Team Requests by Status + Leave Types (date-range filtered) ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-full">
              <div className="p-6 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">Team Requests by Status</h3>
                </div>
              </div>
              <div className="p-6">
                {teamStatusCounts.length === 0 ? (
                  <div className="py-8 text-center">
                    <FileSpreadsheet className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                    <p className="text-sm text-muted-foreground mt-2">
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
                              <span className="text-xs text-muted-foreground">
                                {pct.toFixed(0)}%
                              </span>
                              <span className="text-sm font-semibold text-foreground w-8 text-right tabular-nums">
                                {s.count}
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-[var(--accent)]/60 rounded-full h-2.5 overflow-hidden">
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
            </div>

            <div className="h-full">
              <div className="p-6 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">Top Leave Types</h3>
                </div>
              </div>
              <div className="p-6">
                {teamLeaveTypeBreakdown.length === 0 ? (
                  <div className="py-8 text-center">
                    <FileSpreadsheet className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                    <p className="text-sm text-muted-foreground mt-2">
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
                            <span className="text-sm font-medium text-foreground capitalize">
                              {lt.leave_type.replace(/_/g, ' ')}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground tabular-nums">
                                {lt.count} req
                              </span>
                              <span className="text-sm font-semibold text-foreground tabular-nums">
                                {lt.totalDays} days
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-[var(--accent)]/60 rounded-full h-2 overflow-hidden">
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
            </div>
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
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Company-wide Analytics ({year})
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>
          </motion.div>

          {/* ===== Company Summary Cards ===== */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border border-[var(--border)] bg-[var(--card)] rounded-lg">
              <div className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <ClipboardList className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground font-medium">Total Requests</p>
                    <p className="text-2xl font-bold text-foreground leading-tight">{totalRequests}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-[var(--border)] bg-[var(--card)] rounded-lg">
              <div className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground font-medium">Approval Rate</p>
                    <p className="text-2xl font-bold text-emerald-600 leading-tight">
                      {totalRequests > 0 ? `${approvalRate}%` : '--'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-[var(--border)] bg-[var(--card)] rounded-lg">
              <div className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-violet-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground font-medium">All Employees</p>
                    <p className="text-2xl font-bold text-foreground leading-tight">{data.total_employees}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-[var(--border)] bg-[var(--card)] rounded-lg">
              <div className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                    <CalendarDays className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground font-medium">Avg Leave Days</p>
                    <p className="text-2xl font-bold text-foreground leading-tight">{avgLeaveDays}</p>
                    <p className="text-[10px] text-muted-foreground">per employee</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ===== Company Requests by Status + Leave Types ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div variants={itemVariants}>
              <div className="h-full rounded-lg border border-[var(--border)] bg-[var(--card)]">
                <div className="p-6 border-b border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">All Requests by Status</h3>
                  </div>
                </div>
                <div className="p-6">
                  {data.by_status.length === 0 ? (
                    <div className="py-8 text-center">
                      <FileSpreadsheet className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                      <p className="text-sm text-muted-foreground mt-2">No requests this year.</p>
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
                                <span className="text-xs text-muted-foreground">
                                  {pct.toFixed(0)}%
                                </span>
                                <span className="text-sm font-semibold text-foreground w-8 text-right tabular-nums">
                                  {s.count}
                                </span>
                              </div>
                            </div>
                            <div className="w-full bg-[var(--accent)]/60 rounded-full h-2.5 overflow-hidden">
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
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <div className="h-full rounded-lg border border-[var(--border)] bg-[var(--card)]">
                <div className="p-6 border-b border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">Leave Types Breakdown</h3>
                  </div>
                </div>
                <div className="p-6">
                  {data.by_leave_type.length === 0 ? (
                    <div className="py-8 text-center">
                      <FileSpreadsheet className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                      <p className="text-sm text-muted-foreground mt-2">No leave data yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {data.by_leave_type.slice(0, 8).map((lt, idx) => {
                        const pct = maxLeaveTypeDays > 0 ? (lt.total_days / maxLeaveTypeDays) * 100 : 0;
                        const barColor = LEAVE_TYPE_COLORS[idx % LEAVE_TYPE_COLORS.length];
                        return (
                          <div key={lt.leave_type} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-foreground">{lt.leave_type}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-muted-foreground tabular-nums">
                                  {lt.count} req
                                </span>
                                <span className="text-sm font-semibold text-foreground tabular-nums">
                                  {lt.total_days} days
                                </span>
                              </div>
                            </div>
                            <div className="w-full bg-[var(--accent)]/60 rounded-full h-2 overflow-hidden">
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
              </div>
            </motion.div>
          </div>

          {/* ===== Monthly Trend ===== */}
          <motion.div variants={itemVariants}>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card)]">
              <div className="p-6 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">Monthly Leave Trend ({year})</h3>
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
                        <span className="text-[10px] sm:text-xs font-medium text-muted-foreground tabular-nums">
                          {hasData ? m.count : ''}
                        </span>
                        <div className={`w-full flex justify-center ${getTrendHeightClass(heightPct)}`}>
                          <motion.div
                            className={`w-full max-w-[40px] rounded-t-md origin-bottom h-full ${
                              hasData
                                ? CHART_BAR_GRADIENT
                                : 'bg-[var(--accent)]/60'
                            }`}
                            variants={chartBarVariants}
                            custom={i}
                            initial="hidden"
                            animate="visible"
                            whileHover={hasData ? { scale: 1.05, transition: { duration: 0.15 } } : undefined}
                            title={`${MONTHS[m.month - 1]}: ${m.count} request${m.count !== 1 ? 's' : ''}`}
                          />
                        </div>
                        <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                          {MONTHS[m.month - 1]}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {monthlyTrend.every((m) => m.count === 0) && (
                  <p className="text-xs text-muted-foreground text-center mt-4">
                    No monthly data available for {year}.
                  </p>
                )}
              </div>
            </div>
          </motion.div>

          {/* ===== Top Leave Takers ===== */}
          {topTakers.length > 0 && (
            <motion.div variants={itemVariants}>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--card)]">
                <div className="p-6 border-b border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    <h3 className="text-lg font-semibold text-foreground">Top Leave Takers</h3>
                  </div>
                </div>
                <div className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border)]/40">
                          <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3 w-12">
                            #
                          </th>
                          <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                            Employee
                          </th>
                          <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                            Total Days
                          </th>
                          <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3 w-32 hidden sm:table-cell">
                            Share
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
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
                              className="hover:bg-[var(--accent)]/30 transition-colors"
                            >
                              <td className="px-6 py-3">
                                <span
                                  className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                    i === 0
                                      ? 'bg-amber-100 text-amber-700'
                                      : i === 1
                                        ? 'bg-[var(--accent)] text-[var(--primary)]'
                                        : i === 2
                                          ? 'bg-orange-100 text-orange-700'
                                          : 'bg-[var(--accent)] text-muted-foreground'
                                  }`}
                                >
                                  {i + 1}
                                </span>
                              </td>
                              <td className="px-6 py-3 font-medium text-foreground">{t.employee_name}</td>
                              <td className="px-6 py-3 text-right font-semibold text-foreground tabular-nums">
                                {t.total_days}
                              </td>
                              <td className="px-6 py-3 text-right text-muted-foreground tabular-nums hidden sm:table-cell">
                                {share}%
                              </td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Empty State */}
      {!isLoading && !error && !data && team.length === 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="py-16 text-center rounded-lg border border-[var(--border)] bg-[var(--card)]">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto">
              <BarChart3 className="w-6 h-6 text-purple-500" />
            </div>
            <p className="text-muted-foreground mt-4 text-sm font-medium">
              No report data available.
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Reports will appear once team members and leave requests are set up.
            </p>
          </div>
        </motion.div>
      )}

      </>)}
        </div>
      </div>
    </div>
  );
}




