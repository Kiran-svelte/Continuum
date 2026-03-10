'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SkeletonDashboard } from '@/components/ui/skeleton';
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

  const summaryCards = [
    {
      label: 'Present',
      value: String(stats.presentCount),
      icon: CheckCircle,
      iconColor: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-500/10',
    },
    {
      label: 'On Leave',
      value: String(stats.onLeaveCount),
      icon: CalendarDays,
      iconColor: 'text-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-500/10',
    },
    {
      label: 'Not Checked In',
      value: String(stats.notCheckedInCount),
      icon: UserX,
      iconColor: 'text-red-500',
      bgColor: 'bg-red-50 dark:bg-red-500/10',
    },
    {
      label: 'Availability',
      value: `${stats.availabilityPct}%`,
      icon: BarChart3,
      iconColor: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-500/10',
    },
  ];

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
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
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
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team Attendance</h1>
          <p className="text-muted-foreground mt-1">Loading attendance data&hellip;</p>
        </div>
        <SkeletonDashboard />
      </div>
    );
  }

  /* ---- Error state ---- */
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team Attendance</h1>
          <p className="text-muted-foreground mt-1">
            Real-time team availability overview
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-foreground font-medium mt-3">
                Unable to load attendance
              </p>
              <p className="text-muted-foreground text-sm mt-1">{error}</p>
              <button
                type="button"
                onClick={() => fetchData(selectedDate)}
                className="mt-4 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                Try again
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ---- Page header ---- */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring' as const, stiffness: 300, damping: 24 }}
      >
        <h1 className="text-2xl font-bold text-foreground">Team Attendance</h1>
        <p className="text-muted-foreground mt-1">
          Real-time team availability overview
        </p>
      </motion.div>

      {/* ---- Date navigation ---- */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring' as const, stiffness: 300, damping: 24, delay: 0.04 }}
      >
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={goToPreviousDay}
                className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                aria-label="Previous day"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">
                  {formatDisplayDate(selectedDate)}
                </span>
                {isTodaySelected && (
                  <Badge variant="info" size="sm">
                    Today
                  </Badge>
                )}
                {!isTodaySelected && (
                  <button
                    type="button"
                    onClick={goToToday}
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Go to today
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
                  aria-label="Refresh"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
                  />
                </button>
              </div>

              <button
                type="button"
                onClick={goToNextDay}
                disabled={!canGoForward}
                className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Next day"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ---- Tab navigation ---- */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring' as const, stiffness: 300, damping: 24, delay: 0.06 }}
        className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg w-fit"
      >
        <button
          type="button"
          onClick={() => setActiveTab('team')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'team'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Team Status
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('regularizations')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
            activeTab === 'regularizations'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileEdit className="w-4 h-4" />
          Regularization Requests
          {regularizations.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
              {regularizations.length}
            </span>
          )}
        </button>
      </motion.div>

      {/* ---- Empty state (no direct reports) ---- */}
      {activeTab === 'team' && team.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring' as const, stiffness: 260, damping: 22 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center mx-auto">
                  <UserSearch className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-foreground font-medium mt-3">
                  No direct reports found
                </p>
                <p className="text-muted-foreground text-sm mt-1">
                  Team members will appear here once employees are assigned to you.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ---- Team tab content ---- */}
      {activeTab === 'team' && team.length > 0 && (
        <>
          {/* ---- Summary cards ---- */}
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            key={`summary-${toDateString(selectedDate)}`}
          >
            {summaryCards.map((item) => {
              const Icon = item.icon;
              return (
                <motion.div key={item.label} variants={cardVariants}>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <div
                          className={`w-10 h-10 rounded-xl ${item.bgColor} flex items-center justify-center`}
                        >
                          <Icon className={`w-5 h-5 ${item.iconColor}`} />
                        </div>
                        <span className="text-2xl font-bold text-foreground">
                          {item.value}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>

          {/* ---- Team list ---- */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              type: 'spring' as const,
              stiffness: 260,
              damping: 22,
              delay: 0.15,
            }}
            key={`list-${toDateString(selectedDate)}`}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    Team Status{' '}
                    <span className="text-muted-foreground font-normal text-sm">
                      &mdash; {stats.totalCount} direct{' '}
                      {stats.totalCount === 1 ? 'report' : 'reports'}
                    </span>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <AnimatePresence mode="wait">
                  <motion.div
                    className="space-y-2"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    key={`members-${toDateString(selectedDate)}`}
                  >
                    {team.map((member) => (
                      <motion.div
                        key={member.id}
                        variants={itemVariants}
                        className="flex items-center justify-between py-2.5 px-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                              member.attendanceStatus === 'checked_in'
                                ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400'
                                : member.attendanceStatus === 'on_leave'
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
                                  : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {member.initials}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {member.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {[member.designation, member.department]
                                .filter(Boolean)
                                .join(' \u00b7 ') || 'No department'}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 ml-3">
                          {renderStatusBadge(member)}
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}

      {/* ---- Regularization Requests tab content ---- */}
      {activeTab === 'regularizations' && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring' as const, stiffness: 260, damping: 22 }}
        >
          {/* Action message */}
          {regActionMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium ${
                regActionMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                  : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
              }`}
            >
              {regActionMsg.text}
            </motion.div>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  Pending Regularization Requests
                  <span className="text-muted-foreground font-normal text-sm ml-2">
                    {regularizations.length} pending
                  </span>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {loadingRegs ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : regularizations.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mx-auto">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  </div>
                  <p className="text-foreground font-medium mt-3">All caught up</p>
                  <p className="text-muted-foreground text-sm mt-1">
                    No pending regularization requests from your team.
                  </p>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    className="space-y-3"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {regularizations.map((reg) => {
                      const empName = `${reg.employee.first_name} ${reg.employee.last_name}`;
                      const empInitials = getInitials(reg.employee.first_name, reg.employee.last_name);
                      const isProcessing = processingRegId === reg.id;

                      return (
                        <motion.div
                          key={reg.id}
                          variants={itemVariants}
                          className="flex flex-col sm:flex-row sm:items-center justify-between py-3 px-4 rounded-lg border border-border hover:bg-muted/30 transition-colors gap-3"
                        >
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400 flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">
                              {empInitials}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground">
                                {empName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {[reg.employee.designation, reg.employee.department]
                                  .filter(Boolean)
                                  .join(' \u00b7 ') || 'No department'}
                              </p>
                              <p className="text-xs text-foreground mt-1">
                                <span className="font-medium">Date:</span>{' '}
                                {new Date(reg.date).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  weekday: 'short',
                                })}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                <span className="font-medium text-foreground">Reason:</span>{' '}
                                {reg.reason}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Submitted{' '}
                                {new Date(reg.created_at).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 sm:ml-3">
                            <Badge variant="warning">Pending</Badge>
                            <Button
                              size="sm"
                              onClick={() => handleRegAction(reg.id, 'approve')}
                              disabled={isProcessing}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 h-8 px-3 text-xs"
                            >
                              {isProcessing ? '...' : <><Check className="w-3 h-3" /> Approve</>}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRegAction(reg.id, 'reject')}
                              disabled={isProcessing}
                              className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-500/10 gap-1 h-8 px-3 text-xs"
                            >
                              {isProcessing ? '...' : <><X className="w-3 h-3" /> Reject</>}
                            </Button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
