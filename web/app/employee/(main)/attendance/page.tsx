'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageLoader } from '@/components/ui/progress';

interface AttendanceRecord {
  id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  is_wfh: boolean;
  total_hours: number | null;
}

interface AttendanceSummary {
  presentDays: number;
  wfhDays: number;
  absentDays: number;
  onLeaveDays: number;
  totalHours: string;
  attendancePercent: string;
  workingDays: number;
}

interface LeaveBalance {
  leave_type: string;
  annual_entitlement: number;
  carried_forward: number;
  used_days: number;
  pending_days: number;
  remaining: number;
}

interface LeaveData {
  year: number;
  balances: LeaveBalance[];
}

const STATUS_BADGE: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'default'> = {
  present: 'success',
  late: 'warning',
  half_day: 'info',
  absent: 'danger',
  on_leave: 'warning',
  holiday: 'info',
  weekend: 'default',
};

const STATUS_LABEL: Record<string, string> = {
  present: 'Present',
  late: 'Late',
  half_day: 'Half Day',
  absent: 'Absent',
  on_leave: 'On Leave',
  holiday: 'Holiday',
  weekend: 'Weekend',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
};

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [leaveData, setLeaveData] = useState<LeaveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingLeaves, setLoadingLeaves] = useState(true);
  const [clockingIn, setClockingIn] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);
  const [clockMessage, setClockMessage] = useState('');
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance?month=${currentMonth}&year=${currentYear}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records ?? []);
        setSummary(data.summary ?? null);

        // Check if there's a record for today
        const today = new Date().toISOString().split('T')[0];
        const todayRec = (data.records ?? []).find((r: AttendanceRecord) => r.date?.split('T')[0] === today);
        setTodayRecord(todayRec ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [currentMonth, currentYear]);

  const loadLeaveBalances = useCallback(async () => {
    setLoadingLeaves(true);
    try {
      const res = await fetch('/api/leaves/balances', { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        setLeaveData(json);
      }
    } finally {
      setLoadingLeaves(false);
    }
  }, []);

  useEffect(() => {
    loadAttendance();
    loadLeaveBalances();
  }, [loadAttendance, loadLeaveBalances]);

  async function handleClock(action: 'check_in' | 'check_out', isWfh = false) {
    const setter = action === 'check_in' ? setClockingIn : setClockingOut;
    setter(true);
    setClockMessage('');
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, is_wfh: isWfh }),
      });
      const data = await res.json();
      if (res.ok) {
        setClockMessage(action === 'check_in' ? 'Checked in successfully!' : 'Checked out successfully!');
        loadAttendance();
      } else {
        setClockMessage(data.error || 'Failed');
      }
    } catch {
      setClockMessage('Network error');
    } finally {
      setter(false);
    }
  }

  function formatTime(dateStr: string | null) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', weekday: 'short',
    });
  }

  function formatHours(hours: number | null) {
    if (!hours) return '—';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function prevMonth() {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  }

  function nextMonth() {
    const now = new Date();
    const nextM = currentMonth === 12 ? 1 : currentMonth + 1;
    const nextY = currentMonth === 12 ? currentYear + 1 : currentYear;
    if (nextY > now.getFullYear() || (nextY === now.getFullYear() && nextM > now.getMonth() + 1)) return;
    setCurrentMonth(nextM);
    setCurrentYear(nextY);
  }

  const canCheckIn = !todayRecord?.check_in;
  const canCheckOut = !!todayRecord?.check_in && !todayRecord?.check_out;

  return (
    <motion.div
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <PageLoader className={loading ? '' : 'opacity-0 pointer-events-none'} />

      {/* Header */}
      <motion.div className="flex items-center justify-between" variants={itemVariants}>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Attendance</h1>
          <p className="text-muted-foreground mt-1">Your attendance log and leave balances</p>
        </div>

        {/* Clock In/Out buttons */}
        <div className="flex items-center gap-2">
          {canCheckIn && (
            <>
              <Button
                onClick={() => handleClock('check_in', false)}
                disabled={clockingIn}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
              >
                {clockingIn ? 'Clocking in...' : '🏢 Clock In'}
              </Button>
              <Button
                onClick={() => handleClock('check_in', true)}
                disabled={clockingIn}
                variant="outline"
                className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400"
              >
                {clockingIn ? '...' : '🏠 WFH'}
              </Button>
            </>
          )}
          {canCheckOut && (
            <Button
              onClick={() => handleClock('check_out')}
              disabled={clockingOut}
              className="bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20"
            >
              {clockingOut ? 'Clocking out...' : '🚪 Clock Out'}
            </Button>
          )}
          {!canCheckIn && !canCheckOut && todayRecord && (
            <Badge variant="success">Day complete</Badge>
          )}
        </div>
      </motion.div>

      {clockMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl px-4 py-3 text-sm font-medium ${
            clockMessage.includes('success')
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
              : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
          }`}
        >
          {clockMessage}
        </motion.div>
      )}

      {/* Summary Cards */}
      <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-4" variants={containerVariants}>
        {[
          { label: 'Present Days', value: summary?.presentDays ?? 0, icon: '✅', color: 'from-emerald-500 to-green-600', bgColor: 'bg-emerald-500/10', textColor: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'WFH Days', value: summary?.wfhDays ?? 0, icon: '🏠', color: 'from-blue-500 to-cyan-600', bgColor: 'bg-blue-500/10', textColor: 'text-blue-600 dark:text-blue-400' },
          { label: 'Total Hours', value: summary?.totalHours ?? '0', icon: '⏱️', color: 'from-purple-500 to-violet-600', bgColor: 'bg-purple-500/10', textColor: 'text-purple-600 dark:text-purple-400' },
          { label: 'Attendance %', value: summary ? `${summary.attendancePercent}%` : '—', icon: '📊', color: 'from-amber-500 to-orange-600', bgColor: 'bg-amber-500/10', textColor: 'text-amber-600 dark:text-amber-400' },
        ].map((item, index) => (
          <motion.div key={item.label} variants={itemVariants}>
            <Card className="relative overflow-hidden border-0 shadow-md">
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${item.color}`} />
              <CardContent className="pt-5 pb-4">
                {loading ? (
                  <div className="space-y-2 animate-pulse">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-7 w-12" />
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className={`h-8 w-8 rounded-lg ${item.bgColor} flex items-center justify-center text-sm`}>
                        {item.icon}
                      </div>
                      <motion.span
                        className={`text-2xl font-bold ${item.textColor}`}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', delay: index * 0.1 + 0.2 }}
                      >
                        {item.value}
                      </motion.span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Records */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-md overflow-hidden">
            <CardHeader className="border-b border-border/50 bg-muted/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Attendance Log</CardTitle>
                <div className="flex items-center gap-2">
                  <button onClick={prevMonth} className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <span className="text-sm font-medium text-foreground min-w-[140px] text-center">
                    {monthNames[currentMonth - 1]} {currentYear}
                  </span>
                  <button onClick={nextMonth} className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="divide-y divide-border/50">
                  {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <div key={i} className="px-6 py-3.5 animate-pulse">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-3 w-40" />
                        </div>
                        <Skeleton className="h-6 w-16 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : records.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="text-4xl mb-3">📅</div>
                  <p className="text-sm text-muted-foreground">No attendance records for this month</p>
                  <p className="text-xs text-muted-foreground mt-1">Use the Clock In button to start tracking</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50 max-h-[480px] overflow-y-auto">
                  {records.map((record, index) => (
                    <motion.div
                      key={record.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="px-6 py-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">{formatDate(record.date)}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {record.check_in ? `In: ${formatTime(record.check_in)}` : ''}
                            {record.check_out ? ` · Out: ${formatTime(record.check_out)}` : ''}
                            {record.total_hours ? ` · ${formatHours(record.total_hours)}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {record.is_wfh && (
                            <span className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">WFH</span>
                          )}
                          <Badge variant={STATUS_BADGE[record.status] ?? 'default'}>
                            {STATUS_LABEL[record.status] ?? record.status}
                          </Badge>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Leave Balances */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-md overflow-hidden">
            <CardHeader className="border-b border-border/50 bg-muted/30">
              <CardTitle className="text-base">
                Leave Balances {leaveData ? `(${leaveData.year})` : ''}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingLeaves ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="space-y-2 animate-pulse">
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-12" />
                      </div>
                      <Skeleton className="h-2 w-full rounded-full" />
                    </div>
                  ))}
                </div>
              ) : leaveData ? (
                <div className="p-6 space-y-4">
                  {leaveData.balances.map((b, index) => {
                    const percentage = b.annual_entitlement > 0
                      ? Math.min(100, (b.remaining / b.annual_entitlement) * 100)
                      : 0;

                    return (
                      <motion.div
                        key={b.leave_type}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.06 }}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-foreground">{b.leave_type}</span>
                          <span className="text-sm text-foreground">
                            <span className="font-semibold">{b.remaining}</span>
                            <span className="text-muted-foreground"> / {b.annual_entitlement}</span>
                          </span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                          <motion.div
                            className="bg-primary h-2 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.6, delay: index * 0.06 + 0.2 }}
                          />
                        </div>
                        {(b.used_days > 0 || b.pending_days > 0) && (
                          <div className="flex gap-3 mt-1">
                            {b.used_days > 0 && (
                              <span className="text-xs text-muted-foreground">Used: {b.used_days}</span>
                            )}
                            {b.pending_days > 0 && (
                              <span className="text-xs text-amber-600 dark:text-amber-400">Pending: {b.pending_days}</span>
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <p className="text-sm text-muted-foreground">Could not load balances.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
