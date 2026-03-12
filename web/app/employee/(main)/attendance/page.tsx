'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageLoader } from '@/components/ui/progress';
import { TiltCard, FadeIn, StaggerContainer } from '@/components/motion';
import { PageHeader } from '@/components/page-header';
import { GlassPanel } from '@/components/glass-panel';
import {
  Building2,
  Home,
  LogOut,
  CheckCircle2,
  Clock,
  BarChart3,
  CalendarDays,
  FileEdit,
  X,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  TimerOff,
  AlarmClock,
} from 'lucide-react';

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
  halfDayDays: number;
  wfhDays: number;
  absentDays: number;
  onLeaveDays: number;
  lateDays: number;
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

interface RegularizationRequest {
  id: string;
  date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
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

const REG_STATUS_BADGE: Record<string, 'warning' | 'success' | 'danger'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
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

  // Regularization state
  const [showRegModal, setShowRegModal] = useState(false);
  const [regDate, setRegDate] = useState('');
  const [regReason, setRegReason] = useState('');
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  const [regularizations, setRegularizations] = useState<RegularizationRequest[]>([]);
  const [loadingRegs, setLoadingRegs] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance?month=${currentMonth}&year=${currentYear}`, { credentials: 'include' });
      if (!res.ok) {
        setError('Failed to load attendance records.');
        return;
      }
      const data = await res.json();
      setRecords(data.records ?? []);
      setSummary(data.summary ?? null);
      setError(null);

      // Check if there's a record for today
      const today = new Date().toISOString().split('T')[0];
      const todayRec = (data.records ?? []).find((r: AttendanceRecord) => r.date?.split('T')[0] === today);
      setTodayRecord(todayRec ?? null);
    } catch {
      setError('Network error while loading attendance. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentMonth, currentYear]);

  const loadLeaveBalances = useCallback(async () => {
    setLoadingLeaves(true);
    try {
      const res = await fetch('/api/leaves/balances', { credentials: 'include' });
      if (!res.ok) {
        setError('Failed to load leave balances.');
        return;
      }
      const json = await res.json();
      setLeaveData(json);
      setError(null);
    } catch {
      setError('Network error while loading leave balances.');
    } finally {
      setLoadingLeaves(false);
    }
  }, []);

  const loadRegularizations = useCallback(async () => {
    setLoadingRegs(true);
    try {
      const res = await fetch('/api/attendance/regularize?limit=50', { credentials: 'include' });
      if (!res.ok) {
        setError('Failed to load regularization requests.');
        return;
      }
      const data = await res.json();
      setRegularizations(data.regularizations ?? []);
      setError(null);
    } catch {
      setError('Network error while loading regularization requests.');
    } finally {
      setLoadingRegs(false);
    }
  }, []);

  useEffect(() => {
    loadAttendance();
    loadLeaveBalances();
    loadRegularizations();
  }, [loadAttendance, loadLeaveBalances, loadRegularizations]);

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

  async function handleRegSubmit() {
    setRegError('');
    setRegSuccess('');
    if (!regDate) {
      setRegError('Please select a date.');
      return;
    }
    if (!regReason.trim()) {
      setRegError('Please provide a reason.');
      return;
    }

    setRegSubmitting(true);
    try {
      const res = await fetch('/api/attendance/regularize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ date: regDate, reason: regReason.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setRegSuccess('Regularization request submitted successfully.');
        setRegDate('');
        setRegReason('');
        loadRegularizations();
        setTimeout(() => {
          setShowRegModal(false);
          setRegSuccess('');
        }, 1500);
      } else {
        setRegError(data.error || 'Failed to submit request.');
      }
    } catch {
      setRegError('Network error. Please try again.');
    } finally {
      setRegSubmitting(false);
    }
  }

  function formatTime(dateStr: string | null) {
    if (!dateStr) return '\u2014';
    return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', weekday: 'short',
    });
  }

  function formatHours(hours: number | null) {
    if (!hours) return '\u2014';
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

  // Max date for regularization (today in YYYY-MM-DD)
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <StaggerContainer className="space-y-6">
      <PageLoader className={loading ? '' : 'opacity-0 pointer-events-none'} />

      {/* Header */}
      <PageHeader
        title="My Attendance"
        description="Track your check-in/check-out and attendance history"
        icon={<Clock className="w-6 h-6 text-primary" />}
        action={
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              onClick={() => { setShowRegModal(true); setRegError(''); setRegSuccess(''); }}
              variant="outline"
              className="gap-2 border-purple-500/30 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300 font-bold h-11 px-4 rounded-xl shadow-inner transition-all hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] bg-black/20"
            >
              <FileEdit className="w-4 h-4" /> Request Regularization
            </Button>
            {canCheckIn && (
              <>
                <Button
                  onClick={() => handleClock('check_in', false)}
                  disabled={clockingIn}
                  className="bg-primary hover:bg-white text-white hover:text-primary font-bold h-11 px-6 rounded-xl shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.6)] gap-2 group relative overflow-hidden transition-all"
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                  <span className="relative z-10 flex items-center gap-2">
                    {clockingIn ? 'Clocking in...' : <><Building2 className="w-4 h-4" /> Clock In</>}
                  </span>
                </Button>
                <Button
                  onClick={() => handleClock('check_in', true)}
                  disabled={clockingIn}
                  variant="outline"
                  className="gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 font-bold h-11 px-4 rounded-xl shadow-inner transition-all hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] bg-black/20"
                >
                  {clockingIn ? '...' : <><Home className="w-4 h-4" /> WFH</>}
                </Button>
              </>
            )}
            {canCheckOut && (
              <Button
                onClick={() => handleClock('check_out')}
                disabled={clockingOut}
                className="bg-rose-500 hover:bg-white text-white hover:text-rose-600 font-bold h-11 px-6 rounded-xl shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.6)] gap-2 group relative overflow-hidden transition-all"
              >
                <div className="absolute inset-0 bg-rose-500/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <span className="relative z-10 flex items-center gap-2">
                  {clockingOut ? 'Clocking out...' : <><LogOut className="w-4 h-4" /> Clock Out</>}
                </span>
              </Button>
            )}
            {!canCheckIn && !canCheckOut && todayRecord && (
              <Badge variant="success" className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold px-3 py-1.5 shadow-[0_0_10px_rgba(16,185,129,0.2)]">Day complete</Badge>
            )}
          </div>
        }
      />

      {clockMessage && (
        <FadeIn>
          <div
            className={`rounded-xl px-5 py-4 text-sm font-bold shadow-lg backdrop-blur-sm ${
              clockMessage.includes('success')
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
            }`}
          >
            {clockMessage}
          </div>
        </FadeIn>
      )}

      {error && (
        <FadeIn>
          <div className="rounded-xl px-5 py-4 text-sm font-bold bg-red-500/10 text-red-400 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.15)] flex items-center gap-3 backdrop-blur-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={() => { setError(null); loadAttendance(); loadLeaveBalances(); loadRegularizations(); }}
              className="ml-2 text-sm text-red-300 underline hover:no-underline shrink-0"
            >
              Retry
            </button>
          </div>
        </FadeIn>
      )}

      {/* Summary Cards */}
      <FadeIn>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Present Days', value: summary?.presentDays ?? 0, icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />, color: 'from-emerald-500 to-green-400', bgColor: 'bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]', textColor: 'text-emerald-400' },
            { label: 'Half Days', value: summary?.halfDayDays ?? 0, icon: <TimerOff className="w-4 h-4 text-orange-400" />, color: 'from-orange-500 to-red-400', bgColor: 'bg-orange-500/10 border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.15)]', textColor: 'text-orange-400' },
            { label: 'Late Arrivals', value: summary?.lateDays ?? 0, icon: <AlarmClock className="w-4 h-4 text-rose-400" />, color: 'from-rose-500 to-pink-400', bgColor: 'bg-rose-500/10 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.15)]', textColor: 'text-rose-400' },
            { label: 'WFH Days', value: summary?.wfhDays ?? 0, icon: <Home className="w-4 h-4 text-blue-400" />, color: 'from-blue-500 to-cyan-400', bgColor: 'bg-blue-500/10 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]', textColor: 'text-blue-400' },
            { label: 'Total Hours', value: summary?.totalHours ?? '0', icon: <Clock className="w-4 h-4 text-purple-400" />, color: 'from-purple-500 to-violet-400', bgColor: 'bg-purple-500/10 border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)]', textColor: 'text-purple-400' },
            { label: 'Attendance %', value: summary ? `${summary.attendancePercent}%` : '\u2014', icon: <BarChart3 className="w-4 h-4 text-amber-400" />, color: 'from-amber-500 to-yellow-400', bgColor: 'bg-amber-500/10 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]', textColor: 'text-amber-400' },
          ].map((item, index) => (
            <TiltCard key={item.label}>
              <GlassPanel className={`p-5 ${item.bgColor}`}>
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${item.color}`} />
                {loading ? (
                  <div className="space-y-2 animate-pulse">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-7 w-12" />
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-medium text-white/60">{item.label}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className={`h-8 w-8 rounded-lg ${item.bgColor} flex items-center justify-center`}>
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
              </GlassPanel>
            </TiltCard>
          ))}
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
        {/* Attendance Records */}
        <FadeIn>
          <TiltCard>
            <GlassPanel>
              <div className="border-b border-white/10 bg-white/5 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base text-white font-bold drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">Attendance Log</h3>
                  <div className="flex items-center gap-2">
                    <button onClick={prevMonth} className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white">
                      <ChevronLeft className="w-5 h-5 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" />
                    </button>
                    <span className="text-sm font-bold text-white min-w-[140px] text-center tracking-wider drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                      {monthNames[currentMonth - 1]} {currentYear}
                    </span>
                    <button onClick={nextMonth} className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white">
                      <ChevronRight className="w-5 h-5 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="backdrop-blur-md bg-black/20">
              {loading ? (
                <div className="divide-y divide-white/10">
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
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-3">
                    <CalendarDays className="w-6 h-6 text-white/60" />
                  </div>
                  <p className="text-sm text-white/60">No attendance records for this month</p>
                  <p className="text-xs text-white/60 mt-1">Use the Clock In button to start tracking</p>
                </div>
              ) : (
                <div className="divide-y divide-white/10 max-h-[480px] overflow-y-auto">
                  {records.map((record, index) => (
                    <motion.div
                      key={record.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="px-6 py-3 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-white">{formatDate(record.date)}</p>
                          <p className="text-xs text-white/60 mt-0.5">
                            {record.check_in ? `In: ${formatTime(record.check_in)}` : ''}
                            {record.check_out ? ` \u00b7 Out: ${formatTime(record.check_out)}` : ''}
                            {record.total_hours ? ` \u00b7 ${formatHours(record.total_hours)}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {record.is_wfh && (
                            <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">WFH</span>
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
            </div>
            </GlassPanel>
          </TiltCard>
        </FadeIn>

        {/* Leave Balances */}
        <FadeIn>
          <TiltCard>
            <GlassPanel>
              <div className="border-b border-white/10 bg-white/5 px-6 py-4">
                <h3 className="text-base text-white font-bold drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                  Leave Balances {leaveData ? `(${leaveData.year})` : ''}
                </h3>
              </div>
              <div className="backdrop-blur-md bg-black/20">
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
                          <span className="text-sm font-medium text-white">{b.leave_type}</span>
                          <span className="text-sm text-white">
                            <span className="font-semibold">{b.remaining}</span>
                            <span className="text-white/60"> / {b.annual_entitlement}</span>
                          </span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
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
                              <span className="text-xs text-white/60">Used: {b.used_days}</span>
                            )}
                            {b.pending_days > 0 && (
                              <span className="text-xs text-amber-400">Pending: {b.pending_days}</span>
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <p className="text-sm text-white/60">Could not load balances.</p>
                </div>
              )}
            </div>
            </GlassPanel>
          </TiltCard>
        </FadeIn>
      </div>

      {/* My Regularization Requests */}
      <FadeIn>
        <TiltCard>
          <GlassPanel>
            <div className="border-b border-white/10 bg-white/5 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base text-white font-bold drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">My Regularization Requests</h3>
                <Badge variant="default" className="bg-[rgba(var(--primary-rgb),0.2)] text-[rgb(var(--primary-rgb))] border-[rgba(var(--primary-rgb),0.5)] shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]">{regularizations.length}</Badge>
              </div>
            </div>
            <div className="backdrop-blur-md bg-black/20">
            {loadingRegs ? (
              <div className="divide-y divide-white/10">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="px-6 py-3.5 animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-60" />
                      </div>
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : regularizations.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-3">
                  <FileEdit className="w-6 h-6 text-white/60" />
                </div>
                <p className="text-sm text-white/60">No regularization requests yet</p>
                <p className="text-xs text-white/60 mt-1">Use the button above to request attendance regularization</p>
              </div>
            ) : (
              <div className="divide-y divide-white/10 max-h-[400px] overflow-y-auto">
                {regularizations.map((reg, index) => (
                  <motion.div
                    key={reg.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="px-6 py-3 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1 mr-3">
                        <p className="text-sm font-medium text-white">
                          {formatDate(reg.date)}
                        </p>
                        <p className="text-xs text-white/60 mt-0.5 truncate">
                          {reg.reason}
                        </p>
                        <p className="text-xs text-white/60 mt-0.5">
                          Submitted {new Date(reg.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <Badge variant={REG_STATUS_BADGE[reg.status] ?? 'default'} className="bg-[rgba(var(--primary-rgb),0.2)] text-[rgb(var(--primary-rgb))] border-[rgba(var(--primary-rgb),0.5)] shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]">
                        {reg.status.charAt(0).toUpperCase() + reg.status.slice(1)}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
          </GlassPanel>
        </TiltCard>
      </FadeIn>

      {/* Regularization Request Modal */}
      <AnimatePresence>
        {showRegModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => !regSubmitting && setShowRegModal(false)}
            />

            {/* Modal */}
            <motion.div
              className="relative w-full max-w-md bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring' as const, stiffness: 300, damping: 24 }}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
                <h2 className="text-lg font-semibold text-white">Request Regularization</h2>
                <button
                  onClick={() => !regSubmitting && setShowRegModal(false)}
                  className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-white/60 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {regError && (
                  <div className="rounded-lg px-4 py-3 text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                    {regError}
                  </div>
                )}
                {regSuccess && (
                  <div className="rounded-lg px-4 py-3 text-sm font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {regSuccess}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-white mb-1.5">Date</label>
                  <input
                    type="date"
                    value={regDate}
                    max={todayStr}
                    onChange={(e) => setRegDate(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                    disabled={regSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1.5">Reason</label>
                  <textarea
                    value={regReason}
                    onChange={(e) => setRegReason(e.target.value)}
                    placeholder="Explain why you need attendance regularization for this date..."
                    rows={4}
                    maxLength={1000}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors resize-none"
                    disabled={regSubmitting}
                  />
                  <p className="text-xs text-white/60 mt-1">{regReason.length}/1000 characters</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 bg-white/5">
                <Button
                  variant="outline"
                  onClick={() => !regSubmitting && setShowRegModal(false)}
                  disabled={regSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRegSubmit}
                  disabled={regSubmitting || !regDate || !regReason.trim()}
                  className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/20"
                >
                  {regSubmitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </StaggerContainer>
  );
}
