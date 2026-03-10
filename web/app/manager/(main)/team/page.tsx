'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  CheckCircle,
  UserX,
  Search,
  ChevronDown,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  AlertCircle,
  ClipboardList,
} from 'lucide-react';

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
  phone: string | null;
  primary_role: string;
  department: string | null;
  designation: string | null;
  status: string;
  date_of_joining: string | null;
  manager_id: string | null;
  created_at: string;
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
}

interface EmployeeDetail {
  leave_balances: LeaveBalance[];
  leave_requests: LeaveRequest[];
  email: string;
  phone: string | null;
}

interface ApprovedLeave {
  id: string;
  emp_id: string;
  start_date: string;
  end_date: string;
  status: string;
  leave_type: string;
}

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
} as const;

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 260, damping: 20 },
  },
} as const;

const expandVariants = {
  collapsed: { height: 0, opacity: 0 },
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 30 },
  },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getInitials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function isOnLeaveToday(leave: ApprovedLeave, todayStr: string): boolean {
  const start = leave.start_date.slice(0, 10);
  const end = leave.end_date.slice(0, 10);
  return todayStr >= start && todayStr <= end;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  active: 'success',
  onboarding: 'info',
  probation: 'warning',
  on_leave: 'warning',
  on_notice: 'warning',
  suspended: 'danger',
  terminated: 'danger',
  resigned: 'danger',
  exited: 'danger',
};

const LEAVE_STATUS_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'danger',
  cancelled: 'default',
};

/* ------------------------------------------------------------------ */
/*  Attendance computation helper                                      */
/* ------------------------------------------------------------------ */

function computeMonthlyAttendance(leaveRequests: LeaveRequest[]) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Count weekdays from month start to today
  let workingDays = 0;
  const cursor = new Date(monthStart);
  while (cursor <= today) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) workingDays++;
    cursor.setDate(cursor.getDate() + 1);
  }

  // Count approved leave days overlapping with current month (weekdays only)
  let leaveDays = 0;
  for (const req of leaveRequests) {
    if (req.status !== 'approved') continue;
    const start = new Date(req.start_date);
    const end = new Date(req.end_date);
    const overlapStart = start < monthStart ? new Date(monthStart) : new Date(start);
    const overlapEnd = end > today ? new Date(today) : new Date(end);
    if (overlapStart <= overlapEnd) {
      const d = new Date(overlapStart);
      while (d <= overlapEnd) {
        if (d.getDay() !== 0 && d.getDay() !== 6) leaveDays++;
        d.setDate(d.getDate() + 1);
      }
    }
  }

  return {
    workingDays,
    leaveDays,
    presentDays: Math.max(0, workingDays - leaveDays),
  };
}

/* ------------------------------------------------------------------ */
/*  Skeleton loaders                                                   */
/* ------------------------------------------------------------------ */

function TeamSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Summary cards skeleton */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-4 space-y-3"
          >
            <Skeleton className="h-3 w-16" />
            <div className="flex items-center gap-3">
              <Skeleton variant="circular" className="w-10 h-10" />
              <Skeleton className="h-7 w-10" />
            </div>
          </div>
        ))}
      </div>

      {/* Search skeleton */}
      <Skeleton className="h-10 w-full" />

      {/* Member cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center gap-3">
              <Skeleton variant="circular" className="w-11 h-11" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton variant="badge" className="w-14" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Expandable detail section                                          */
/* ------------------------------------------------------------------ */

function MemberDetail({
  memberId,
  cache,
}: {
  memberId: string;
  cache: React.MutableRefObject<Map<string, EmployeeDetail>>;
}) {
  const cachedData = cache.current.get(memberId);
  const [detail, setDetail] = useState<EmployeeDetail | null>(cachedData ?? null);
  const [loading, setLoading] = useState(!cachedData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cache.current.has(memberId)) return; // Skip fetch if cached

    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/employees/${memberId}`, {
          credentials: 'include',
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error ?? 'Failed to load details');
        }
        const json = await res.json();
        if (!cancelled) {
          const emp = json.employee;
          const data: EmployeeDetail = {
            leave_balances: emp.leave_balances ?? [],
            leave_requests: emp.leave_requests ?? [],
            email: emp.email,
            phone: emp.phone,
          };
          cache.current.set(memberId, data);
          setDetail(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load details');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [memberId, cache]);

  if (loading) {
    return (
      <div className="pt-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg bg-muted/50 p-3 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-10" />
              <Skeleton className="h-1.5 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-4">
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      </div>
    );
  }

  if (!detail) return null;

  return (
    <div className="pt-4 space-y-4">
      {/* Contact info */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5" />
          {detail.email}
        </span>
        {detail.phone && (
          <span className="inline-flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5" />
            {detail.phone}
          </span>
        )}
      </div>

      {/* Leave balances */}
      {detail.leave_balances.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-foreground mb-2">Leave Balances</p>
          <div className="grid grid-cols-2 gap-2">
            {detail.leave_balances.map((bal) => {
              const total = bal.annual_entitlement + bal.carried_forward;
              const usedPct = total > 0 ? Math.round((bal.used_days / total) * 100) : 0;
              const variant = usedPct >= 80 ? 'danger' : usedPct >= 50 ? 'warning' : 'success';
              return (
                <div
                  key={bal.id}
                  className="rounded-lg bg-muted/50 dark:bg-muted/30 p-2.5"
                >
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                    {bal.leave_type.replace(/_/g, ' ')}
                  </p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-sm font-bold text-foreground">{bal.remaining}</span>
                    <span className="text-[10px] text-muted-foreground">/ {total}</span>
                  </div>
                  <ProgressBar
                    value={bal.used_days}
                    max={total || 1}
                    variant={variant}
                    size="sm"
                    className="mt-1.5"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {detail.leave_balances.length === 0 && (
        <p className="text-xs text-muted-foreground italic">No leave balances configured.</p>
      )}

      {/* Recent leave requests */}
      {detail.leave_requests.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-foreground mb-2">Recent Leave Requests</p>
          <div className="space-y-1.5">
            {detail.leave_requests.slice(0, 5).map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between rounded-lg bg-muted/30 dark:bg-muted/20 px-2.5 py-2 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-foreground font-medium capitalize truncate">
                    {req.leave_type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-muted-foreground shrink-0">
                    {formatDate(req.start_date)} - {formatDate(req.end_date)}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-muted-foreground">{req.total_days}d</span>
                  <Badge
                    variant={LEAVE_STATUS_BADGE[req.status] ?? 'default'}
                    size="sm"
                  >
                    {req.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attendance summary (this month) */}
      <div>
        <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
          <ClipboardList className="w-3.5 h-3.5" />
          Attendance This Month
        </p>
        {(() => {
          const stats = computeMonthlyAttendance(detail.leave_requests);
          return (
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-green-50 dark:bg-green-500/10 p-2.5 text-center">
                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                  {stats.presentDays}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Present</p>
              </div>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-500/10 p-2.5 text-center">
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {stats.leaveDays}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">On Leave</p>
              </div>
              <div className="rounded-lg bg-blue-50 dark:bg-blue-500/10 p-2.5 text-center">
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {stats.workingDays}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Working Days</p>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page component                                                */
/* ------------------------------------------------------------------ */

export default function ManagerTeamPage() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [team, setTeam] = useState<Employee[]>([]);
  const [onLeaveIds, setOnLeaveIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const detailCacheRef = useRef<Map<string, EmployeeDetail>>(new Map());

  /* ---- Fetch manager identity then direct reports ---- */
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        // Step 1: Get current manager identity
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) throw new Error('Failed to authenticate. Please sign in again.');
        const meData = await meRes.json();

        if (cancelled) return;
        setCurrentUser(meData);

        // Step 2: Fetch direct reports + approved leaves in parallel
        const [empRes, leaveRes] = await Promise.all([
          fetch(`/api/employees?manager_id=${meData.id}&limit=50`),
          fetch('/api/leaves/list?status=approved&limit=200'),
        ]);

        if (!empRes.ok) throw new Error('Failed to load team members.');

        const empData = await empRes.json();
        const employees: Employee[] = empData.employees ?? [];

        // Build on-leave set for today
        const leaveSet = new Set<string>();
        if (leaveRes.ok) {
          const leaveData = await leaveRes.json();
          const leaves: ApprovedLeave[] = leaveData.requests ?? [];
          const today = new Date().toISOString().slice(0, 10);
          const teamIdSet = new Set(employees.map((e) => e.id));
          for (const leave of leaves) {
            if (teamIdSet.has(leave.emp_id) && isOnLeaveToday(leave, today)) {
              leaveSet.add(leave.emp_id);
            }
          }
        }

        if (!cancelled) {
          setTeam(employees);
          setOnLeaveIds(leaveSet);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Something went wrong.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, []);

  /* ---- Filtered team ---- */
  const filteredTeam = useMemo(() => {
    if (!searchQuery.trim()) return team;
    const q = searchQuery.toLowerCase();
    return team.filter(
      (m) =>
        `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
        (m.designation?.toLowerCase().includes(q) ?? false) ||
        (m.department?.toLowerCase().includes(q) ?? false) ||
        m.email.toLowerCase().includes(q)
    );
  }, [team, searchQuery]);

  /* ---- Stats ---- */
  const presentCount = team.filter((m) => !onLeaveIds.has(m.id)).length;
  const onLeaveCount = team.filter((m) => onLeaveIds.has(m.id)).length;
  const totalCount = team.length;

  /* ---- Toggle expand ---- */
  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  /* ---- Loading state ---- */
  if (loading) {
    return <TeamSkeleton />;
  }

  /* ---- Error state ---- */
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Team</h1>
          <p className="text-muted-foreground mt-1">Manage your direct reports</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <p className="text-foreground font-medium mt-4">Unable to load team</p>
              <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Try again
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ---- Empty state ---- */
  if (team.length === 0) {
    return (
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring' as const, stiffness: 300, damping: 24 }}
        >
          <h1 className="text-2xl font-bold text-foreground">My Team</h1>
          <p className="text-muted-foreground mt-1">Manage your direct reports</p>
        </motion.div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <p className="text-foreground font-medium mt-4">No direct reports found</p>
              <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto">
                Team members assigned to you will appear here. Contact HR to update reporting structure.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ---- Summary cards data ---- */
  const summaryCards = [
    {
      label: 'Present',
      value: String(presentCount),
      icon: CheckCircle,
      iconColor: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-500/10',
    },
    {
      label: 'On Leave',
      value: String(onLeaveCount),
      icon: UserX,
      iconColor: 'text-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-500/10',
    },
    {
      label: 'Total',
      value: String(totalCount),
      icon: Users,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-500/10',
    },
  ];

  /* ---- Render ---- */
  return (
    <div className="space-y-6">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring' as const, stiffness: 300, damping: 24 }}
      >
        <h1 className="text-2xl font-bold text-foreground">My Team</h1>
        <p className="text-muted-foreground mt-1">
          {totalCount} team member{totalCount !== 1 ? 's' : ''} reporting to you
        </p>
      </motion.div>

      {/* Summary cards */}
      <motion.div
        className="grid grid-cols-3 gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {summaryCards.map((item) => {
          const Icon = item.icon;
          return (
            <motion.div key={item.label} variants={cardVariants}>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <div
                      className={`w-10 h-10 rounded-xl ${item.bgColor} flex items-center justify-center`}
                    >
                      <Icon className={`w-5 h-5 ${item.iconColor}`} />
                    </div>
                    <span className="text-2xl font-bold text-foreground">{item.value}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Search + Team list */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring' as const, stiffness: 260, damping: 22, delay: 0.15 }}
      >
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle>Team Members</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by name, role, department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* No search results */}
            {filteredTeam.length === 0 && searchQuery.trim() && (
              <div className="text-center py-10">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mx-auto">
                  <Search className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-foreground font-medium mt-3">No results found</p>
                <p className="text-muted-foreground text-sm mt-1">
                  No team members match &quot;{searchQuery}&quot;
                </p>
              </div>
            )}

            {/* Team member cards */}
            {filteredTeam.length > 0 && (
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {filteredTeam.map((member) => {
                  const isExpanded = expandedId === member.id;
                  const isOnLeave = onLeaveIds.has(member.id);
                  const attendance = isOnLeave ? 'On Leave' : 'Present';

                  return (
                    <motion.div
                      key={member.id}
                      variants={itemVariants}
                      layout
                      className="rounded-lg border border-border bg-card hover:border-primary/30 transition-colors overflow-hidden"
                    >
                      {/* Clickable header */}
                      <button
                        type="button"
                        onClick={() => toggleExpand(member.id)}
                        className="w-full text-left p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div
                            className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                              isOnLeave
                                ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                                : 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                            }`}
                          >
                            {getInitials(member.first_name, member.last_name)}
                          </div>

                          {/* Name + meta */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {member.first_name} {member.last_name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {member.designation && (
                                <span className="text-xs text-muted-foreground truncate">
                                  {member.designation}
                                </span>
                              )}
                              {member.designation && member.department && (
                                <span className="text-muted-foreground text-xs">·</span>
                              )}
                              {member.department && (
                                <span className="text-xs text-muted-foreground truncate">
                                  {member.department}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Status badge + expand chevron */}
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant={isOnLeave ? 'warning' : 'success'} size="sm">
                              {attendance}
                            </Badge>
                            <motion.div
                              animate={{ rotate: isExpanded ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            </motion.div>
                          </div>
                        </div>

                        {/* Employee status badge (if not 'active') */}
                        {member.status !== 'active' && (
                          <div className="mt-2 flex items-center gap-2">
                            <Briefcase className="w-3 h-3 text-muted-foreground" />
                            <Badge
                              variant={STATUS_BADGE[member.status] ?? 'default'}
                              size="sm"
                            >
                              {member.status.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                        )}
                      </button>

                      {/* Expandable detail section */}
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            key="detail"
                            initial="collapsed"
                            animate="expanded"
                            exit="collapsed"
                            variants={expandVariants}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 border-t border-border/50">
                              <MemberDetail memberId={member.id} cache={detailCacheRef} />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
