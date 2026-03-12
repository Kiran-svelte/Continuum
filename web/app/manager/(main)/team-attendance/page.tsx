'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TiltCard, FadeIn, StaggerContainer } from '@/components/motion';
import { GlassPanel } from '@/components/glass-panel';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton, SkeletonDashboard } from '@/components/ui/skeleton';
import {
  CheckCircle,
  UserX,
  BarChart3,
  UserSearch,
  ChevronLeft,
  ChevronRight,
  Clock,
  CalendarDays,
  Laptop,
  AlertCircle,
  RefreshCw,
  FileEdit,
  Check,
  X,
  Loader2,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface MeResponse {
  id: string;
  first_name: string;
  last_name: string;
  primary_role: string;
  org_id: string;
}

interface EmployeeRecord {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  department: string | null;
  designation: string | null;
  status: string;
}

interface AttendanceRecord {
  employee_id: string;
  employee_name: string;
  initials: string;
  department: string;
  email: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string; // 'present' | 'late' | 'absent' | 'on_leave' | 'half_day'
  is_wfh: boolean;
  total_hours: number | null;
}

interface LeaveRequest {
  id: string;
  emp_id: string;
  start_date: string;
  end_date: string;
  status: string;
  leave_type: string;
  employee: {
    id: string;
    first_name: string;
    last_name: string;
    department: string | null;
    designation: string | null;
  };
}

interface RegularizationRequest {
  id: string;
  emp_id: string;
  date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  employee: {
    id: string;
    first_name: string;
    last_name: string;
    department: string | null;
    designation: string | null;
  };
}

type AttendanceStatus = 'checked_in' | 'on_leave' | 'not_checked_in';

interface TeamMember {
  id: string;
  name: string;
  initials: string;
  department: string | null;
  designation: string | null;
  attendanceStatus: AttendanceStatus;
  checkIn: string | null;
  checkOut: string | null;
  isWfh: boolean;
  totalHours: number | null;
  leaveType: string | null;
  rawStatus: string | null; // 'present' | 'late' | 'half_day' etc from attendance API
}

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                  */
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

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getInitials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTime(isoOrTimestamp: string | null): string | null {
  if (!isoOrTimestamp) return null;
  try {
    const d = new Date(isoOrTimestamp);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return null;
  }
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isOnLeaveOnDate(leave: LeaveRequest, dateStr: string): boolean {
  const start = leave.start_date.slice(0, 10);
  const end = leave.end_date.slice(0, 10);
  return dateStr >= start && dateStr <= end;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function isSameDay(a: Date, b: Date): boolean {
  return toDateString(a) === toDateString(b);
}

function formatHours(hours: number | null): string | null {
  if (hours === null || hours === undefined) return null;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */

function AttendanceSkeleton() {
  return (
    <div className="p-4 sm:p-6 pb-32">
      <div className="space-y-8">
        {/* Header skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 bg-white/10" />
          <Skeleton className="h-4 w-80 bg-white/10" />
        </div>

        {/* Date navigation skeleton */}
        <GlassPanel className="p-4 flex justify-between items-center">
          <Skeleton className="h-8 w-8 bg-white/10 rounded-lg" />
          <Skeleton className="h-6 w-48 bg-white/10" />
          <Skeleton className="h-8 w-8 bg-white/10 rounded-lg" />
        </GlassPanel>

        {/* Tabs skeleton */}
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32 bg-white/10 rounded-lg" />
          <Skeleton className="h-10 w-48 bg-white/10 rounded-lg" />
        </div>

        {/* Metric cards skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <GlassPanel key={i} className="p-6 space-y-3">
              <Skeleton className="h-5 w-24 bg-white/10" />
              <Skeleton className="h-8 w-16 bg-white/10" />
            </GlassPanel>
          ))}
        </div>

        {/* List skeleton */}
        <GlassPanel className="p-6 space-y-4">
          <Skeleton className="h-6 w-40 bg-white/10" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-black/10 rounded-lg">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full bg-white/10" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32 bg-white/10" />
                    <Skeleton className="h-3 w-24 bg-white/10" />
                  </div>
                </div>
                <Skeleton className="h-8 w-32 bg-white/10 rounded-lg" />
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}


/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function TeamAttendancePage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [refreshing, setRefreshing] = useState(false);

  // Regularization state
  const [regularizations, setRegularizations] = useState<RegularizationRequest[]>([]);
  const [loadingRegs, setLoadingRegs] = useState(true);
  const [activeTab, setActiveTab] = useState<'team' | 'regularizations'>('team');
  const [processingRegId, setProcessingRegId] = useState<string | null>(null);
  const [regActionMsg, setRegActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = useCallback(async (date: Date, isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      /* Step 1 -- Identify current manager */
      const meRes = await fetch('/api/auth/me', { credentials: 'include' });
      if (!meRes.ok) throw new Error('Failed to authenticate. Please sign in again.');
      const me: MeResponse = await meRes.json();

      const dateStr = toDateString(date);
      const year = date.getFullYear();

      /* Step 2, 3, 4 -- Fetch direct reports, attendance, and approved leaves in parallel */
      const [empRes, attRes, leaveRes] = await Promise.all([
        fetch(`/api/employees?manager_id=${me.id}&limit=50`, { credentials: 'include' }),
        fetch(`/api/hr/attendance?date=${dateStr}`, { credentials: 'include' }),
        fetch(`/api/leaves/list?status=approved&limit=100&year=${year}`, { credentials: 'include' }),
      ]);

      if (!empRes.ok) throw new Error('Failed to load team members.');
      const empData = await empRes.json();
      const employees: EmployeeRecord[] = empData.employees ?? [];

      if (employees.length === 0) {
        setTeam([]);
        return;
      }

      /* Attendance records (may fail for role reasons -- handle gracefully) */
      let attendanceRecords: AttendanceRecord[] = [];
      if (attRes.ok) {
        const attData = await attRes.json();
        attendanceRecords = attData.records ?? [];
      }

      /* Approved leave data */
      let leaves: LeaveRequest[] = [];
      if (leaveRes.ok) {
        const leaveData = await leaveRes.json();
        leaves = leaveData.requests ?? [];
      }

      /* Build lookup maps keyed by employee ID */
      const attendanceMap = new Map<string, AttendanceRecord>();
      for (const rec of attendanceRecords) {
        attendanceMap.set(rec.employee_id, rec);
      }

      const leaveMap = new Map<string, LeaveRequest>();
      for (const leave of leaves) {
        if (leave.status === 'approved' && isOnLeaveOnDate(leave, dateStr)) {
          leaveMap.set(leave.emp_id, leave);
        }
      }

      /* Step 5 -- Cross-reference to determine each team member's real status */
      const members: TeamMember[] = employees.map((emp) => {
        const att = attendanceMap.get(emp.id);
        const leave = leaveMap.get(emp.id);

        let attendanceStatus: AttendanceStatus = 'not_checked_in';
        let leaveType: string | null = null;

        const hasCheckedIn =
          att &&
          att.check_in !== null &&
          att.status !== 'absent' &&
          att.status !== 'on_leave';

        if (hasCheckedIn) {
          attendanceStatus = 'checked_in';
        } else if (leave || att?.status === 'on_leave') {
          attendanceStatus = 'on_leave';
          leaveType = leave?.leave_type ?? 'Leave';
        }
        // else: remains 'not_checked_in'

        return {
          id: emp.id,
          name: `${emp.first_name} ${emp.last_name}`,
          initials: getInitials(emp.first_name, emp.last_name),
          department: emp.department,
          designation: emp.designation,
          attendanceStatus,
          checkIn: att?.check_in ?? null,
          checkOut: att?.check_out ?? null,
          isWfh: att?.is_wfh ?? false,
          totalHours: att?.total_hours ?? null,
          leaveType,
          rawStatus: att?.status ?? null,
        };
      });

      /* Sort: checked-in first, then on-leave, then not-checked-in */
      const statusOrder: Record<AttendanceStatus, number> = {
        checked_in: 0,
        on_leave: 1,
        not_checked_in: 2,
      };
      members.sort(
        (a, b) =>
          statusOrder[a.attendanceStatus] - statusOrder[b.attendanceStatus] ||
          a.name.localeCompare(b.name),
      );

      setTeam(members);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchRegularizations = useCallback(async () => {
    setLoadingRegs(true);
    try {
      const res = await fetch('/api/attendance/regularize?status=pending&limit=50', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setRegularizations(data.regularizations ?? []);
      }
    } finally {
      setLoadingRegs(false);
    }
  }, []);

  useEffect(() => {
    fetchData(selectedDate);
    fetchRegularizations();
  }, [selectedDate, fetchData, fetchRegularizations]);

  /* ---- Regularization actions ---- */
  async function handleRegAction(regId: string, action: 'approve' | 'reject') {
    setProcessingRegId(regId);
    setRegActionMsg(null);
    try {
      const res = await fetch(`/api/attendance/regularize/${regId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        setRegActionMsg({
          type: 'success',
          text: `Request ${action === 'approve' ? 'approved' : 'rejected'} successfully.`,
        });
        fetchRegularizations();
        // Refresh attendance data since an approval may change attendance status
        if (action === 'approve') {
          fetchData(selectedDate, true);
        }
      } else {
        setRegActionMsg({ type: 'error', text: data.error || 'Action failed.' });
      }
    } catch {
      setRegActionMsg({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setProcessingRegId(null);
    }
  }

  /* ---- Date navigation ---- */
  const goToPreviousDay = useCallback(() => {
    setSelectedDate((prev) => addDays(prev, -1));
  }, []);

  const goToNextDay = useCallback(() => {
    setSelectedDate((prev) => {
      const next = addDays(prev, 1);
      const today = new Date();
      if (toDateString(next) > toDateString(today)) return prev;
      return next;
    });
  }, []);

  const goToToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  const handleRefresh = useCallback(() => {
    fetchData(selectedDate, true);
    fetchRegularizations();
  }, [selectedDate, fetchData, fetchRegularizations]);

  const isTodaySelected = isSameDay(selectedDate, new Date());

  const canGoForward = useMemo(() => {
    return toDateString(selectedDate) < toDateString(new Date());
  }, [selectedDate]);

  /* ---- Computed stats ---- */
  const stats = useMemo(() => {
    const presentCount = team.filter((m) => m.attendanceStatus === 'checked_in').length;
    const onLeaveCount = team.filter((m) => m.attendanceStatus === 'on_leave').length;
    const notCheckedInCount = team.filter(
      (m) => m.attendanceStatus === 'not_checked_in',
    ).length;
    const totalCount = team.length;
    const availabilityPct =
      totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

    return { presentCount, onLeaveCount, notCheckedInCount, totalCount, availabilityPct };
  }, [team]);


  /* ---- Status badge renderer ---- */
  function renderStatusBadge(member: TeamMember) {
    switch (member.attendanceStatus) {
      case 'checked_in': {
        const timeIn = formatTime(member.checkIn);
        const timeOut = formatTime(member.checkOut);
        const hours = formatHours(member.totalHours);
        return (
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {member.isWfh && (
              <Badge variant="info" size="sm">
                <Laptop className="w-3 h-3 mr-1" />
                WFH
              </Badge>
            )}
            {member.rawStatus === 'late' && (
              <Badge variant="warning" size="sm">
                Late
              </Badge>
            )}
            {member.rawStatus === 'half_day' && (
              <Badge variant="warning" size="sm">
                Half Day
              </Badge>
            )}
            <Badge variant="success" size="sm">
              <Clock className="w-3 h-3 mr-1" />
              {timeIn ?? 'In'}
              {timeOut ? ` \u2013 ${timeOut}` : ''}
            </Badge>
            {hours && (
              <span className="text-[11px] text-white/60 hidden sm:inline">
                {hours}
              </span>
            )}
          </div>
        );
      }

      case 'on_leave':
        return (
          <Badge variant="warning">
            <CalendarDays className="w-3 h-3 mr-1" />
            On Leave{member.leaveType ? ` \u00b7 ${member.leaveType}` : ''}
          </Badge>
        );

      case 'not_checked_in':
        return (
          <Badge variant="default">
            <AlertCircle className="w-3 h-3 mr-1" />
            Not Checked In
          </Badge>
        );
    }
  }

  /* ---- Loading state ---- */
  if (loading) {
    return <AttendanceSkeleton />;
  }

  /* ---- Error state ---- */
  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <FadeIn>
          <PageHeader title="Team Attendance" description="Real-time team availability overview" />
          <TiltCard>
            <GlassPanel className="mt-8 p-12 text-center border-red-500/30">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto ring-4 ring-red-500/20">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <p className="text-white font-semibold mt-6 text-xl">Unable to load attendance</p>
              <p className="text-white/60 text-sm mt-2 max-w-sm mx-auto">{error}</p>
              <Button
                variant="outline"
                className="mt-6 bg-white/5 border-white/20 text-white/80 hover:bg-white/10 hover:text-white"
                onClick={() => fetchData(selectedDate)}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </GlassPanel>
          </TiltCard>
        </FadeIn>
      </div>
    );
  }

  const summaryCards = [
    { label: 'Present', value: String(stats.presentCount), icon: CheckCircle, color: 'green' },
    { label: 'On Leave', value: String(stats.onLeaveCount), icon: CalendarDays, color: 'amber' },
    { label: 'Not Checked In', value: String(stats.notCheckedInCount), icon: UserX, color: 'red' },
    { label: 'Availability', value: `${stats.availabilityPct}%`, icon: BarChart3, color: 'purple' },
  ];

  return (
    <div className="p-4 sm:p-6 pb-32">
      <StaggerContainer>
        {/* ---- Page header ---- */}
        <PageHeader title="Team Attendance" description="Real-time team availability overview" />

        {/* ---- Date navigation ---- */}
        <FadeIn>
          <GlassPanel className="mt-8 p-3 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={goToPreviousDay} aria-label="Previous day">
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-bold text-white text-center">{formatDisplayDate(selectedDate)}</h3>
              {!isTodaySelected && (
                <Button variant="secondary" size="sm" onClick={goToToday}>Go to Today</Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing} aria-label="Refresh">
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={goToNextDay} disabled={!canGoForward} aria-label="Next day">
              <ChevronRight className="w-6 h-6" />
            </Button>
          </GlassPanel>
        </FadeIn>

        {/* ---- Tab navigation ---- */}
        <FadeIn>
          <div className="mt-6 flex gap-2 p-1.5 rounded-xl bg-black/20 w-fit border border-white/10">
            <TabButton id="team" activeTab={activeTab} setActiveTab={setActiveTab as any}>
              Team Status
            </TabButton>
            <TabButton id="regularizations" activeTab={activeTab} setActiveTab={setActiveTab as any}>
              <FileEdit className="w-5 h-5" />
              Regularizations
              {regularizations.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs font-bold rounded-full bg-amber-400 text-black">
                  {regularizations.length}
                </span>
              )}
            </TabButton>
          </div>
        </FadeIn>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="mt-6"
          >
            {/* ---- Team tab content ---- */}
            {activeTab === 'team' && (
              <div className="space-y-6">
                {team.length === 0 ? (
                  <FadeIn>
                    <TiltCard>
                      <GlassPanel className="p-12 text-center">
                        <UserSearch className="w-12 h-12 mx-auto text-white/30 mb-4" />
                        <h3 className="text-xl font-semibold text-white">No Direct Reports</h3>
                        <p className="text-white/60 mt-2">Team members will appear here once assigned.</p>
                      </GlassPanel>
                    </TiltCard>
                  </FadeIn>
                ) : (
                  <>
                    {/* ---- Summary cards ---- */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      {summaryCards.map((item) => (
                        <MetricCard key={item.label} {...item} />
                      ))}
                    </div>

                    {/* ---- Team list ---- */}
                    <FadeIn>
                      <GlassPanel className="p-4 sm:p-6">
                        <h3 className="text-xl font-bold text-white mb-4">
                          Team Status &mdash; {stats.totalCount} members
                        </h3>
                        <div className="space-y-3">
                          {team.map((member) => (
                            <TeamMemberRow key={member.id} member={member} />
                          ))}
                        </div>
                      </GlassPanel>
                    </FadeIn>
                  </>
                )}
              </div>
            )}

            {/* ---- Regularization Requests tab content ---- */}
            {activeTab === 'regularizations' && (
              <RegularizationPanel
                requests={regularizations}
                loading={loadingRegs}
                onAction={handleRegAction}
                processingId={processingRegId}
                actionMsg={regActionMsg}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </StaggerContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function TabButton({ id, activeTab, setActiveTab, children }: { id: string, activeTab: string, setActiveTab: (id: string) => void, children: React.ReactNode }) {
  const isActive = activeTab === id;
  return (
    <button
      onClick={() => setActiveTab(id)}
      className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
        isActive ? 'text-white' : 'text-white/60 hover:text-white'
      }`}
    >
      {isActive && (
        <motion.div
          layoutId="attendance-tab-indicator"
          className="absolute inset-0 bg-primary/30 rounded-lg shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]"
        />
      )}
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
  );
}

function MetricCard({ icon: Icon, label, value, color }: { icon: React.ElementType, label: string, value: string, color: string }) {
  const colorClasses: Record<string, string> = {
    green: 'text-green-400 bg-green-500/10 shadow-green-500/10',
    amber: 'text-amber-400 bg-amber-500/10 shadow-amber-500/10',
    red: 'text-red-400 bg-red-500/10 shadow-red-500/10',
    purple: 'text-purple-400 bg-purple-500/10 shadow-purple-500/10',
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

function TeamMemberRow({ member }: { member: TeamMember }) {
  const statusConfig = {
    checked_in: {
      gradient: 'from-green-500 to-cyan-500',
      textColor: 'text-green-300',
      icon: CheckCircle,
      badge: (
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {member.isWfh && <Badge variant="info" size="sm"><Laptop className="w-3 h-3 mr-1" />WFH</Badge>}
          {member.rawStatus === 'late' && <Badge variant="warning" size="sm">Late</Badge>}
          <Badge variant="success" size="sm">
            <Clock className="w-3 h-3 mr-1" />
            {formatTime(member.checkIn)} {member.checkOut ? ` - ${formatTime(member.checkOut)}` : ''}
          </Badge>
          {formatHours(member.totalHours) && <span className="text-xs text-white/60">{formatHours(member.totalHours)}</span>}
        </div>
      ),
    },
    on_leave: {
      gradient: 'from-amber-500 to-orange-500',
      textColor: 'text-amber-300',
      icon: CalendarDays,
      badge: <Badge variant="warning" size="sm" className="capitalize">{member.leaveType?.replace(/_/g, ' ') || 'On Leave'}</Badge>,
    },
    not_checked_in: {
      gradient: 'from-slate-600 to-gray-700',
      textColor: 'text-slate-400',
      icon: UserX,
      badge: <Badge variant="danger" size="sm">Not Checked In</Badge>,
    },
  };

  const config = statusConfig[member.attendanceStatus];

  return (
    <motion.div
      variants={itemVariants}
      className="bg-black/20 border border-white/10 rounded-2xl p-3 flex items-center justify-between gap-4"
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0 shadow-lg bg-gradient-to-br ${config.gradient}`}>
          {member.initials}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-white truncate">{member.name}</p>
          <p className="text-xs text-white/60 truncate">{member.designation || 'N/A'}</p>
        </div>
      </div>
      <div className="shrink-0 ml-3 text-right">
        {config.badge}
      </div>
    </motion.div>
  );
}

function RegularizationPanel({ requests, loading, onAction, processingId, actionMsg }: {
  requests: RegularizationRequest[];
  loading: boolean;
  onAction: (id: string, action: 'approve' | 'reject') => void;
  processingId: string | null;
  actionMsg: { type: 'success' | 'error'; text: string } | null;
}) {
  return (
    <FadeIn>
      <GlassPanel className="p-4 sm:p-6">
        <h3 className="text-xl font-bold text-white mb-4">Pending Regularization Requests</h3>

        {actionMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium ${
              actionMsg.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                : 'bg-red-500/10 text-red-300 border border-red-500/20'
            }`}
          >
            {actionMsg.text}
          </motion.div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full bg-black/20 rounded-lg" />)}
          </div>
        ) : requests.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-black/20 flex items-center justify-center mx-auto border-2 border-white/10">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <p className="text-white font-semibold mt-5 text-lg">All Caught Up</p>
            <p className="text-white/60 text-sm mt-2">No pending regularization requests from your team.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <RegularizationRequestCard key={req.id} request={req} onAction={onAction} processingId={processingId} />
            ))}
          </div>
        )}
      </GlassPanel>
    </FadeIn>
  );
}

function RegularizationRequestCard({ request, onAction, processingId }: {
  request: RegularizationRequest;
  onAction: (id: string, action: 'approve' | 'reject') => void;
  processingId: string | null;
}) {
  const isProcessing = processingId === request.id;
  return (
    <motion.div
      variants={itemVariants}
      className="bg-black/20 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-start gap-4"
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-lg font-bold text-white shrink-0 shadow-lg shadow-purple-500/20">
          {getInitials(request.employee.first_name, request.employee.last_name)}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-white truncate">{request.employee.first_name} {request.employee.last_name}</p>
          <p className="text-xs text-white/60 truncate">{request.employee.designation || 'N/A'}</p>
          <p className="text-sm text-white/80 mt-2">
            <span className="font-medium">Date:</span> {formatDisplayDate(new Date(request.date))}
          </p>
        </div>
      </div>
      <div className="flex-1 w-full sm:w-auto">
        <p className="text-xs text-white/60">Reason:</p>
        <p className="text-sm text-white/90 line-clamp-2">{request.reason}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0 self-center sm:self-end w-full sm:w-auto mt-3 sm:mt-0">
        <Button size="sm" variant="success" onClick={() => onAction(request.id, 'approve')} disabled={isProcessing} className="flex-1">
          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          <span className="ml-2">Approve</span>
        </Button>
        <Button size="sm" variant="danger" onClick={() => onAction(request.id, 'reject')} disabled={isProcessing} className="flex-1">
          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
          <span className="ml-2">Reject</span>
        </Button>
      </div>
    </motion.div>
  );
}
