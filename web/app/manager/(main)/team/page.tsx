'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TiltCard, FadeIn, StaggerContainer } from '@/components/motion';
import { GlassPanel } from '@/components/glass-panel';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Loader2,
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
/*  Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */

function TeamSkeleton() {
  return (
    <div className="p-4 sm:p-6 pb-32">
      <div className="space-y-8">
        {/* Header skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 bg-white/10" />
          <Skeleton className="h-4 w-64 bg-white/10" />
        </div>

        {/* Metric cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <GlassPanel key={i} className="p-6 space-y-3">
              <Skeleton className="h-5 w-24 bg-white/10" />
              <Skeleton className="h-8 w-16 bg-white/10" />
            </GlassPanel>
          ))}
        </div>

        {/* Search and list skeleton */}
        <GlassPanel className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-40 bg-white/10" />
            <Skeleton className="h-10 w-64 bg-white/10 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-white/5 rounded-lg">
                <Skeleton className="h-12 w-12 rounded-full bg-white/10" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-3/4 bg-white/10" />
                  <Skeleton className="h-3 w-1/2 bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
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
      <div className="pt-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-lg bg-white/5 p-3 space-y-2">
              <Skeleton className="h-3 w-16 bg-white/10" />
              <Skeleton className="h-5 w-10 bg-white/10" />
              <Skeleton className="h-1.5 w-full bg-white/10" />
            </div>
          ))}
        </div>
        <Skeleton className="h-20 w-full bg-white/5 rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-4">
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      </div>
    );
  }

  if (!detail) return null;

  return (
    <div className="pt-4 space-y-6">
      {/* Contact info */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/70">
        <span className="inline-flex items-center gap-2">
          <Mail className="w-4 h-4" />
          {detail.email}
        </span>
        {detail.phone && (
          <span className="inline-flex items-center gap-2">
            <Phone className="w-4 h-4" />
            {detail.phone}
          </span>
        )}
      </div>

      {/* Leave balances */}
      {detail.leave_balances.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-white/90 mb-2">Leave Balances</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {detail.leave_balances.map((bal) => {
              const total = bal.annual_entitlement + bal.carried_forward;
              const usedPct = total > 0 ? Math.round((bal.used_days / total) * 100) : 0;
              return (
                <div key={bal.id} className="rounded-lg bg-white/5 p-3 border border-white/10">
                  <p className="text-xs font-medium text-white/60 capitalize">
                    {bal.leave_type.replace(/_/g, ' ')}
                  </p>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-xl font-bold text-white">{bal.remaining}</span>
                    <span className="text-xs text-white/50">/ {total}</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1.5 mt-2 shadow-inner">
                    <motion.div
                      className={`h-1.5 rounded-full ${getUtilizationBarColor(usedPct)}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${usedPct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Attendance summary */}
      <div>
        <h4 className="text-sm font-semibold text-white/90 mb-2 flex items-center gap-2">
          <ClipboardList className="w-4 h-4" />
          Attendance This Month
        </h4>
        {(() => {
          const stats = computeMonthlyAttendance(detail.leave_requests);
          return (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-green-500/10 p-3 text-center border border-green-500/20">
                <p className="text-2xl font-bold text-green-400">{stats.presentDays}</p>
                <p className="text-xs text-white/60 uppercase tracking-wide">Present</p>
              </div>
              <div className="rounded-lg bg-amber-500/10 p-3 text-center border border-amber-500/20">
                <p className="text-2xl font-bold text-amber-400">{stats.leaveDays}</p>
                <p className="text-xs text-white/60 uppercase tracking-wide">On Leave</p>
              </div>
              <div className="rounded-lg bg-blue-500/10 p-3 text-center border border-blue-500/20">
                <p className="text-2xl font-bold text-blue-400">{stats.workingDays}</p>
                <p className="text-xs text-white/60 uppercase tracking-wide">Working Days</p>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Recent leave requests */}
      {detail.leave_requests.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-white/90 mb-2">Recent Leave Requests</h4>
          <div className="space-y-2">
            {detail.leave_requests.slice(0, 3).map((req) => (
              <div key={req.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm border border-white/10">
                <div className="flex items-center gap-3 min-w-0">
                  <Calendar className="w-4 h-4 text-white/50 shrink-0" />
                  <div className="truncate">
                    <p className="text-white font-medium capitalize truncate">{req.leave_type.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-white/60">{formatDate(req.start_date)} - {formatDate(req.end_date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-2">
                  <span className="text-white/70 font-medium">{req.total_days}d</span>
                  <Badge variant={LEAVE_STATUS_BADGE[req.status] ?? 'default'} size="sm" className="capitalize">{req.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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
      <div className="p-4 sm:p-6">
        <PageHeader
          title="My Team"
          description="Manage your direct reports"
          icon={<Users className="w-6 h-6 text-primary" />}
        />
        <FadeIn>
          <TiltCard>
            <GlassPanel className="border-red-500/30 p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto ring-4 ring-red-500/20">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <p className="text-white font-semibold mt-6 text-xl">Unable to load team</p>
              <p className="text-white/60 text-sm mt-2 max-w-sm mx-auto">{error}</p>
              <Button
                variant="outline"
                className="mt-6"
                onClick={() => window.location.reload()}
              >
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Try Again
              </Button>
            </GlassPanel>
          </TiltCard>
        </FadeIn>
      </div>
    );
  }

  /* ---- Empty state ---- */
  if (team.length === 0) {
    return (
      <div className="p-4 sm:p-6">
        <PageHeader
          title="My Team"
          description="Manage your direct reports"
          icon={<Users className="w-6 h-6 text-primary" />}
        />
        <FadeIn>
          <TiltCard>
            <GlassPanel className="p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto border-2 border-white/10">
                <Users className="w-10 h-10 text-white/30" />
              </div>
              <p className="text-white font-semibold mt-5 text-lg">No direct reports found</p>
              <p className="text-white/60 text-sm mt-2 max-w-sm mx-auto">
                Team members assigned to you will appear here. Contact HR to update reporting structure.
              </p>
            </GlassPanel>
          </TiltCard>
        </FadeIn>
      </div>
    );
  }

  /* ---- Summary cards data ---- */
  const summaryCards = [
    { label: 'Present', value: String(presentCount), icon: CheckCircle, color: 'green' },
    { label: 'On Leave', value: String(onLeaveCount), icon: UserX, color: 'amber' },
    { label: 'Total', value: String(totalCount), icon: Users, color: 'blue' },
  ];

  /* ---- Render ---- */
  return (
    <div className="p-4 sm:p-6 pb-32">
      <StaggerContainer>
        {/* Page header */}
        <PageHeader
          title="My Team"
          description={`${totalCount} team member${totalCount !== 1 ? 's' : ''} reporting to you`}
          icon={<Users className="w-6 h-6 text-primary" />}
        />

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8">
          {summaryCards.map((item) => (
            <MetricCard key={item.label} icon={item.icon} label={item.label} value={item.value} color={item.color} />
          ))}
        </div>

        {/* Search + Team list */}
        <FadeIn>
          <GlassPanel className="mt-8 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h3 className="text-xl font-bold text-white">Team Members</h3>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by name, role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-12 pl-12 pr-4 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:ring-2 focus:ring-primary/50 focus:outline-none"
                />
              </div>
            </div>

            {/* No search results */}
            {filteredTeam.length === 0 && searchQuery.trim() && (
              <div className="py-16 text-center">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto border-2 border-white/10">
                  <Search className="w-10 h-10 text-white/30" />
                </div>
                <p className="text-white font-semibold mt-5 text-lg">No results found</p>
                <p className="text-white/60 text-sm mt-1">No team members match &quot;{searchQuery}&quot;</p>
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
                {filteredTeam.map((member) => (
                  <TeamMemberCard
                    key={member.id}
                    member={member}
                    isExpanded={expandedId === member.id}
                    isOnLeave={onLeaveIds.has(member.id)}
                    onToggleExpand={toggleExpand}
                    detailCacheRef={detailCacheRef}
                  />
                ))}
              </motion.div>
            )}
          </GlassPanel>
        </FadeIn>
      </StaggerContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function MetricCard({ icon: Icon, label, value, color }: { icon: React.ElementType, label: string, value: string, color: string }) {
  const colorClasses: Record<string, string> = {
    green: 'text-green-400 bg-green-500/10 shadow-green-500/10',
    amber: 'text-amber-400 bg-amber-500/10 shadow-amber-500/10',
    blue: 'text-blue-400 bg-blue-500/10 shadow-blue-500/10',
  };

  return (
    <FadeIn>
      <TiltCard>
        <GlassPanel className="p-5 h-full">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg shadow-lg ${colorClasses[color]}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-white/70">{label}</p>
              <p className="text-3xl font-bold text-white">{value}</p>
            </div>
          </div>
        </GlassPanel>
      </TiltCard>
    </FadeIn>
  );
}

function TeamMemberCard({ member, isExpanded, isOnLeave, onToggleExpand, detailCacheRef }: {
  member: Employee;
  isExpanded: boolean;
  isOnLeave: boolean;
  onToggleExpand: (id: string) => void;
  detailCacheRef: React.MutableRefObject<Map<string, EmployeeDetail>>;
}) {
  const attendance = isOnLeave ? 'On Leave' : 'Present';

  return (
    <motion.div
      variants={itemVariants}
      layout
      className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden transition-all duration-300 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/10"
    >
      <button
        type="button"
        onClick={() => onToggleExpand(member.id)}
        className="w-full text-left p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-lg"
      >
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className={`relative w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shrink-0 shadow-lg ${
            isOnLeave
              ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-amber-500/20'
              : 'bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow-blue-500/20'
          }`}>
            {getInitials(member.first_name, member.last_name)}
            <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white/10 ${isOnLeave ? 'bg-amber-400' : 'bg-green-400'}`} />
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-white truncate">{member.first_name} {member.last_name}</p>
            <p className="text-sm text-white/60 truncate">{member.designation || 'N/A'}</p>
            {member.status !== 'active' && (
              <Badge variant={STATUS_BADGE[member.status] ?? 'default'} size="sm" className="mt-1 capitalize">{member.status.replace(/_/g, ' ')}</Badge>
            )}
          </div>

          {/* Expand chevron */}
          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-5 h-5 text-white/50" />
          </motion.div>
        </div>
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
            <div className="px-4 pb-4 border-t-2 border-white/10">
              <MemberDetail memberId={member.id} cache={detailCacheRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Helper to get bar color for utilization
function getUtilizationBarColor(percentage: number): string {
  if (percentage > 80) return 'bg-red-500';
  if (percentage > 50) return 'bg-amber-500';
  return 'bg-green-500';
}
