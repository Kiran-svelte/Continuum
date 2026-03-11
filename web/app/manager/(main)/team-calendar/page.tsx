'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Users,
  Sun,
  CalendarDays,
  AlertTriangle,
  List,
  Grid3X3,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface LeaveEmployee {
  first_name: string;
  last_name: string;
}

interface LeaveRequest {
  id: string;
  employee: LeaveEmployee;
  start_date: string;
  end_date: string;
  leave_type: string;
  status: string;
  total_days: number;
}

interface Holiday {
  id: string;
  name: string;
  date: string;
  country_code: string;
  is_custom: boolean;
}

interface DayData {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  leaves: LeaveRequest[];
  holidays: Holiday[];
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const LEAVE_TYPE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  CL: { bg: 'bg-blue-100 dark:bg-blue-500/20', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
  SL: { bg: 'bg-red-100 dark:bg-red-500/20', text: 'text-red-700 dark:text-red-300', dot: 'bg-red-500' },
  EL: { bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  PL: { bg: 'bg-purple-100 dark:bg-purple-500/20', text: 'text-purple-700 dark:text-purple-300', dot: 'bg-purple-500' },
  ML: { bg: 'bg-pink-100 dark:bg-pink-500/20', text: 'text-pink-700 dark:text-pink-300', dot: 'bg-pink-500' },
  LWP: { bg: 'bg-gray-100 dark:bg-gray-500/20', text: 'text-gray-700 dark:text-gray-300', dot: 'bg-gray-500' },
  CO: { bg: 'bg-teal-100 dark:bg-teal-500/20', text: 'text-teal-700 dark:text-teal-300', dot: 'bg-teal-500' },
};

const DEFAULT_LEAVE_COLOR = { bg: 'bg-slate-100 dark:bg-slate-500/20', text: 'text-slate-700 dark:text-slate-300', dot: 'bg-slate-500' };

// Stable color palette for team members (up to 12 unique colors)
const MEMBER_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-purple-500',
  'bg-amber-500',
  'bg-red-500',
  'bg-teal-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-orange-500',
  'bg-cyan-500',
  'bg-lime-500',
  'bg-rose-500',
];

/* ------------------------------------------------------------------ */
/*  Animation Variants                                                 */
/* ------------------------------------------------------------------ */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.1 },
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

/* ------------------------------------------------------------------ */
/*  Calendar Utility Functions                                         */
/* ------------------------------------------------------------------ */

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  // Returns 0=Mon, 1=Tue, ... 6=Sun (ISO weekday)
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDate(dateStr: string): Date {
  // Handle both "2025-03-15" and "2025-03-15T00:00:00.000Z"
  const parts = dateStr.split('T')[0].split('-');
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

function getShortName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName.charAt(0)}.`;
}

function getMonthName(month: number): string {
  return new Date(2000, month, 1).toLocaleString('en-US', { month: 'long' });
}

/* ------------------------------------------------------------------ */
/*  Skeleton Calendar Component                                        */
/* ------------------------------------------------------------------ */

function SkeletonCalendar() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </div>

      {/* Calendar grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="pt-4">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full rounded" />
                ))}
              </div>
              {/* Calendar cells */}
              {Array.from({ length: 5 }).map((_, row) => (
                <div key={row} className="grid grid-cols-7 gap-1 mb-1">
                  {Array.from({ length: 7 }).map((_, col) => (
                    <Skeleton key={col} className="h-[100px] w-full rounded-lg" />
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-4 space-y-4">
              <Skeleton className="h-5 w-32" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
              <Skeleton className="h-px w-full" />
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-20" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function TeamCalendarPage() {
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* ---- Navigation ---- */
  const goToPreviousMonth = useCallback(() => {
    setCurrentMonth((prev) => {
      if (prev === 0) {
        setCurrentYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth((prev) => {
      if (prev === 11) {
        setCurrentYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  }, []);

  const goToToday = useCallback(() => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  }, [today]);

  /* ---- Data fetching ---- */
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const [leavesRes, holidaysRes] = await Promise.all([
          fetch('/api/leaves/list?status=approved,pending&limit=200', {
            credentials: 'include',
          }),
          fetch('/api/company/holidays', {
            credentials: 'include',
          }),
        ]);

        if (cancelled) return;

        if (!leavesRes.ok) {
          throw new Error('Failed to load team leave data');
        }

        const leavesData = await leavesRes.json();
        const leavesArr: LeaveRequest[] = leavesData.requests ?? [];

        let holidaysArr: Holiday[] = [];
        if (holidaysRes.ok) {
          const holidaysData = await holidaysRes.json();
          holidaysArr = holidaysData.holidays ?? [];
        }

        if (!cancelled) {
          setLeaves(leavesArr);
          setHolidays(holidaysArr);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Something went wrong');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [currentYear, retryCount]);

  /* ---- Build leave lookup by date ---- */
  const leavesByDate = useMemo(() => {
    const map = new Map<string, LeaveRequest[]>();

    for (const leave of leaves) {
      const start = parseDate(leave.start_date);
      const end = parseDate(leave.end_date);

      // Iterate through each day in the leave range
      const current = new Date(start);
      while (current <= end) {
        const key = formatDateKey(current);
        const existing = map.get(key) ?? [];
        existing.push(leave);
        map.set(key, existing);
        current.setDate(current.getDate() + 1);
      }
    }

    return map;
  }, [leaves]);

  /* ---- Build holiday lookup by date ---- */
  const holidaysByDate = useMemo(() => {
    const map = new Map<string, Holiday[]>();

    for (const holiday of holidays) {
      const key = holiday.date.split('T')[0];
      const existing = map.get(key) ?? [];
      existing.push(holiday);
      map.set(key, existing);
    }

    return map;
  }, [holidays]);

  /* ---- Build calendar grid ---- */
  const calendarDays = useMemo((): DayData[] => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const todayKey = formatDateKey(today);
    const days: DayData[] = [];

    // Previous month padding days
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const prevMonthDays = getDaysInMonth(prevYear, prevMonth);

    for (let i = firstDay - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const date = new Date(prevYear, prevMonth, day);
      const key = formatDateKey(date);
      const dayOfWeek = date.getDay();
      days.push({
        date,
        day,
        isCurrentMonth: false,
        isToday: key === todayKey,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        leaves: leavesByDate.get(key) ?? [],
        holidays: holidaysByDate.get(key) ?? [],
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const key = formatDateKey(date);
      const dayOfWeek = date.getDay();
      days.push({
        date,
        day,
        isCurrentMonth: true,
        isToday: key === todayKey,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        leaves: leavesByDate.get(key) ?? [],
        holidays: holidaysByDate.get(key) ?? [],
      });
    }

    // Next month padding days (fill to complete the last row)
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      for (let day = 1; day <= remaining; day++) {
        const date = new Date(nextYear, nextMonth, day);
        const key = formatDateKey(date);
        const dayOfWeek = date.getDay();
        days.push({
          date,
          day,
          isCurrentMonth: false,
          isToday: key === todayKey,
          isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
          leaves: leavesByDate.get(key) ?? [],
          holidays: holidaysByDate.get(key) ?? [],
        });
      }
    }

    return days;
  }, [currentYear, currentMonth, today, leavesByDate, holidaysByDate]);

  /* ---- Unique team members for this month's leaves ---- */
  const teamMembersThisMonth = useMemo(() => {
    const memberMap = new Map<string, { firstName: string; lastName: string; leaveCount: number }>();

    for (const leave of leaves) {
      const start = parseDate(leave.start_date);
      const end = parseDate(leave.end_date);

      // Check if leave overlaps with current month
      const monthStart = new Date(currentYear, currentMonth, 1);
      const monthEnd = new Date(currentYear, currentMonth + 1, 0);

      if (start <= monthEnd && end >= monthStart) {
        const key = `${leave.employee.first_name}-${leave.employee.last_name}`;
        const existing = memberMap.get(key);
        if (existing) {
          existing.leaveCount += 1;
        } else {
          memberMap.set(key, {
            firstName: leave.employee.first_name,
            lastName: leave.employee.last_name,
            leaveCount: 1,
          });
        }
      }
    }

    return Array.from(memberMap.entries()).map(([key, data], index) => ({
      key,
      ...data,
      colorIndex: index % MEMBER_COLORS.length,
    }));
  }, [leaves, currentYear, currentMonth]);

  /* ---- Holidays this month ---- */
  const holidaysThisMonth = useMemo(() => {
    return holidays.filter((h) => {
      const date = parseDate(h.date);
      return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
    });
  }, [holidays, currentYear, currentMonth]);

  /* ---- Total leaves this month ---- */
  const totalLeavesThisMonth = useMemo(() => {
    let count = 0;
    for (const leave of leaves) {
      const start = parseDate(leave.start_date);
      const end = parseDate(leave.end_date);
      const monthStart = new Date(currentYear, currentMonth, 1);
      const monthEnd = new Date(currentYear, currentMonth + 1, 0);

      if (start <= monthEnd && end >= monthStart) {
        count += 1;
      }
    }
    return count;
  }, [leaves, currentYear, currentMonth]);

  /* ---- Pending leaves this month ---- */
  const pendingLeavesThisMonth = useMemo(() => {
    let count = 0;
    for (const leave of leaves) {
      if (leave.status !== 'pending') continue;
      const start = parseDate(leave.start_date);
      const end = parseDate(leave.end_date);
      const monthStart = new Date(currentYear, currentMonth, 1);
      const monthEnd = new Date(currentYear, currentMonth + 1, 0);

      if (start <= monthEnd && end >= monthStart) {
        count += 1;
      }
    }
    return count;
  }, [leaves, currentYear, currentMonth]);

  /* ---- Get leave type color ---- */
  function getLeaveColor(leaveType: string) {
    return LEAVE_TYPE_COLORS[leaveType] ?? DEFAULT_LEAVE_COLOR;
  }

  /* ---- Render helpers ---- */
  function renderLeavePill(leave: LeaveRequest, compact: boolean = false) {
    const color = getLeaveColor(leave.leave_type);
    const name = getShortName(leave.employee.first_name, leave.employee.last_name);
    const isPending = leave.status === 'pending';

    const pendingStyles = isPending
      ? 'border border-dashed border-current opacity-70'
      : '';

    if (compact) {
      return (
        <div
          key={`${leave.id}-pill`}
          className={`w-full px-1.5 py-0.5 rounded text-[10px] font-medium truncate ${color.bg} ${color.text} ${pendingStyles}`}
          title={`${leave.employee.first_name} ${leave.employee.last_name} - ${leave.leave_type}${isPending ? ' (Pending)' : ''}`}
        >
          {name}{isPending ? ' *' : ''}
        </div>
      );
    }

    return (
      <div
        key={`${leave.id}-pill`}
        className={`w-full px-2 py-0.5 rounded-md text-[11px] font-medium truncate ${color.bg} ${color.text} ${pendingStyles}`}
        title={`${leave.employee.first_name} ${leave.employee.last_name} - ${leave.leave_type}${isPending ? ' (Pending)' : ''}`}
      >
        {name}{isPending ? ' *' : ''}
      </div>
    );
  }

  /* ---- Loading ---- */
  if (loading) {
    return <SkeletonCalendar />;
  }

  /* ---- Error ---- */
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team Calendar</h1>
          <p className="text-muted-foreground mt-1">Visual overview of team leave schedule</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-foreground font-medium mt-3">Failed to load calendar data</p>
              <p className="text-muted-foreground text-sm mt-1">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setRetryCount((c) => c + 1)}
              >
                Try again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isCurrentMonthView = currentYear === today.getFullYear() && currentMonth === today.getMonth();

  return (
    <motion.div
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        variants={itemVariants}
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team Calendar</h1>
          <p className="text-muted-foreground mt-1">Visual overview of team leave schedule</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle - visible on mobile */}
          <div className="flex items-center border border-border rounded-lg overflow-hidden sm:hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 transition-colors ${
                viewMode === 'grid'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
              aria-label="Grid view"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 transition-colors ${
                viewMode === 'list'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
              aria-label="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Month navigation */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPreviousMonth}
              aria-label="Previous month"
              className="h-9 w-9 p-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-muted rounded-lg transition-colors min-w-[160px] text-center"
              title="Go to current month"
            >
              {getMonthName(currentMonth)} {currentYear}
            </button>

            <Button
              variant="ghost"
              size="sm"
              onClick={goToNextMonth}
              aria-label="Next month"
              className="h-9 w-9 p-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {!isCurrentMonthView && (
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
          )}
        </div>
      </motion.div>

      {/* Main content area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar Grid */}
        <motion.div className="lg:col-span-3" variants={itemVariants}>
          {/* Desktop/Tablet: Grid view */}
          <div className={`${viewMode === 'list' ? 'hidden sm:block' : 'block'}`}>
            <Card className="border-0 shadow-md overflow-hidden">
              <CardContent className="p-2 sm:p-4">
                {/* Weekday headers */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {WEEKDAYS.map((day) => (
                    <div
                      key={day}
                      className="text-center text-xs font-semibold text-muted-foreground py-2 uppercase tracking-wider"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar cells */}
                <motion.div
                  className="grid grid-cols-7 gap-1"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {calendarDays.map((dayData, index) => {
                    const hasMultipleLeaves = dayData.leaves.length >= 2;
                    const hasLeaves = dayData.leaves.length > 0;
                    const hasHolidays = dayData.holidays.length > 0;

                    return (
                      <motion.div
                        key={`${dayData.date.getTime()}-${index}`}
                        variants={itemVariants}
                        className={`
                          min-h-[60px] sm:min-h-[100px] rounded-lg border transition-all duration-150 p-1 sm:p-1.5
                          ${dayData.isCurrentMonth
                            ? 'bg-card dark:bg-card'
                            : 'bg-muted/30 dark:bg-muted/10 opacity-50'
                          }
                          ${dayData.isToday
                            ? 'ring-2 ring-primary ring-offset-1 ring-offset-background border-primary/50'
                            : 'border-border/40 dark:border-slate-800/40'
                          }
                          ${dayData.isWeekend && dayData.isCurrentMonth
                            ? 'bg-muted/40 dark:bg-muted/15'
                            : ''
                          }
                          ${hasMultipleLeaves && dayData.isCurrentMonth
                            ? 'bg-amber-50/50 dark:bg-amber-500/5'
                            : ''
                          }
                        `}
                      >
                        {/* Day number */}
                        <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                          <span
                            className={`
                              text-xs sm:text-sm font-medium leading-none
                              ${dayData.isToday
                                ? 'text-primary font-bold'
                                : dayData.isCurrentMonth
                                  ? dayData.isWeekend
                                    ? 'text-muted-foreground'
                                    : 'text-foreground'
                                  : 'text-muted-foreground/60'
                              }
                            `}
                          >
                            {dayData.day}
                          </span>
                          {hasMultipleLeaves && dayData.isCurrentMonth && (
                            <span className="hidden sm:flex items-center gap-0.5 text-[9px] text-amber-600 dark:text-amber-400">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              {dayData.leaves.length}
                            </span>
                          )}
                        </div>

                        {/* Holidays */}
                        {hasHolidays && dayData.isCurrentMonth && (
                          <div className="mb-0.5 sm:mb-1">
                            {dayData.holidays.map((holiday) => (
                              <div
                                key={holiday.id}
                                className="w-full px-1 sm:px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-medium truncate bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300"
                                title={holiday.name}
                              >
                                <span className="hidden sm:inline">{holiday.name}</span>
                                <span className="sm:hidden">
                                  <Sun className="w-2.5 h-2.5 inline" />
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Leave pills */}
                        {hasLeaves && dayData.isCurrentMonth && (
                          <div className="space-y-0.5 overflow-hidden">
                            {dayData.leaves.slice(0, 3).map((leave) =>
                              renderLeavePill(leave, true)
                            )}
                            {dayData.leaves.length > 3 && (
                              <div className="text-[9px] text-muted-foreground text-center">
                                +{dayData.leaves.length - 3} more
                              </div>
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </motion.div>
              </CardContent>
            </Card>
          </div>

          {/* Mobile: List view */}
          <div className={`${viewMode === 'grid' ? 'hidden' : 'block'} sm:hidden`}>
            <Card className="border-0 shadow-md overflow-hidden">
              <CardHeader className="border-b border-border/50 bg-muted/30 py-3">
                <CardTitle className="text-base">
                  {getMonthName(currentMonth)} {currentYear} - Leave Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {totalLeavesThisMonth === 0 ? (
                  <div className="py-12 text-center">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center mx-auto">
                      <Calendar className="w-5 h-5 text-blue-500" />
                    </div>
                    <p className="text-foreground font-medium mt-3">No team leaves scheduled this month</p>
                    <p className="text-muted-foreground text-sm mt-1">
                      Your team is fully available.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {calendarDays
                      .filter((d) => d.isCurrentMonth && (d.leaves.length > 0 || d.holidays.length > 0))
                      .map((dayData) => (
                        <div
                          key={formatDateKey(dayData.date)}
                          className={`px-4 py-3 ${dayData.isToday ? 'bg-primary/5' : ''}`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={`text-sm font-semibold ${
                                dayData.isToday ? 'text-primary' : 'text-foreground'
                              }`}
                            >
                              {dayData.date.toLocaleDateString('en-US', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                            {dayData.isToday && (
                              <Badge variant="info" size="sm">Today</Badge>
                            )}
                            {dayData.leaves.length >= 2 && (
                              <Badge variant="warning" size="sm">
                                {dayData.leaves.length} on leave
                              </Badge>
                            )}
                          </div>
                          {dayData.holidays.map((holiday) => (
                            <div
                              key={holiday.id}
                              className="flex items-center gap-2 mb-1.5 px-2 py-1 rounded bg-amber-50 dark:bg-amber-500/10"
                            >
                              <Sun className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                              <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                                {holiday.name}
                              </span>
                            </div>
                          ))}
                          {dayData.leaves.map((leave) => {
                            const color = getLeaveColor(leave.leave_type);
                            const isPending = leave.status === 'pending';
                            return (
                              <div
                                key={leave.id}
                                className={`flex items-center gap-2 mb-1 px-2 py-1 rounded ${color.bg} ${isPending ? 'border border-dashed border-current opacity-70' : ''}`}
                              >
                                <div className={`w-2 h-2 rounded-full shrink-0 ${color.dot} ${isPending ? 'opacity-50' : ''}`} />
                                <span className={`text-xs font-medium ${color.text}`}>
                                  {leave.employee.first_name} {leave.employee.last_name}
                                </span>
                                <Badge variant="default" size="sm" className="ml-auto">
                                  {leave.leave_type}
                                </Badge>
                                {isPending && (
                                  <Badge variant="warning" size="sm">
                                    Pending
                                  </Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Sidebar - Legend & Summary */}
        <motion.div className="lg:col-span-1" variants={itemVariants}>
          {/* Mobile toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden w-full flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-card mb-2 text-sm font-medium text-foreground"
          >
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              Team Summary
            </span>
            <ChevronRight
              className={`w-4 h-4 text-muted-foreground transition-transform ${
                sidebarOpen ? 'rotate-90' : ''
              }`}
            />
          </button>

          <AnimatePresence>
            {/* Always show on desktop, toggle on mobile */}
            <motion.div
              className={`${sidebarOpen ? 'block' : 'hidden'} lg:block`}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="space-y-4">
                {/* Team Members Legend */}
                <Card className="border-0 shadow-md overflow-hidden">
                  <CardHeader className="border-b border-border/50 bg-muted/30 py-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <CardTitle className="text-sm">Team on Leave</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="py-3">
                    {teamMembersThisMonth.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">
                        No team leaves scheduled this month
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {teamMembersThisMonth.map((member) => (
                          <div key={member.key} className="flex items-center gap-2">
                            <div
                              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                MEMBER_COLORS[member.colorIndex]
                              }`}
                            />
                            <span className="text-xs text-foreground truncate flex-1">
                              {member.firstName} {member.lastName}
                            </span>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {member.leaveCount} leave{member.leaveCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Summary Stats */}
                <Card className="border-0 shadow-md overflow-hidden">
                  <CardHeader className="border-b border-border/50 bg-muted/30 py-3">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-muted-foreground" />
                      <CardTitle className="text-sm">Monthly Summary</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="py-3">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Total leave requests</span>
                        <span className="text-sm font-semibold text-foreground">
                          {totalLeavesThisMonth}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pl-3">
                        <span className="text-xs text-muted-foreground">Approved</span>
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                          {totalLeavesThisMonth - pendingLeavesThisMonth}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pl-3">
                        <span className="text-xs text-muted-foreground">Pending</span>
                        <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                          {pendingLeavesThisMonth}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Team members on leave</span>
                        <span className="text-sm font-semibold text-foreground">
                          {teamMembersThisMonth.length}
                        </span>
                      </div>
                      <div className="h-px bg-border/50 dark:bg-slate-800/40" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Holidays this month</span>
                        <span className="text-sm font-semibold text-foreground">
                          {holidaysThisMonth.length}
                        </span>
                      </div>
                      {holidaysThisMonth.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          {holidaysThisMonth.map((holiday) => (
                            <div key={holiday.id} className="flex items-center gap-2">
                              <Sun className="w-3 h-3 text-amber-500 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-medium text-foreground truncate">
                                  {holiday.name}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {parseDate(holiday.date).toLocaleDateString('en-US', {
                                    day: 'numeric',
                                    month: 'short',
                                  })}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Leave Status Legend */}
                <Card className="border-0 shadow-md overflow-hidden">
                  <CardHeader className="border-b border-border/50 bg-muted/30 py-3">
                    <CardTitle className="text-sm">Leave Status</CardTitle>
                  </CardHeader>
                  <CardContent className="py-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-4 rounded-sm bg-blue-100 dark:bg-blue-500/20" />
                        <span className="text-[11px] text-muted-foreground">Approved</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-4 rounded-sm bg-blue-100/60 dark:bg-blue-500/10 border border-dashed border-blue-400 dark:border-blue-500" />
                        <span className="text-[11px] text-muted-foreground">Pending *</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Leave Type Legend */}
                <Card className="border-0 shadow-md overflow-hidden">
                  <CardHeader className="border-b border-border/50 bg-muted/30 py-3">
                    <CardTitle className="text-sm">Leave Types</CardTitle>
                  </CardHeader>
                  <CardContent className="py-3">
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(LEAVE_TYPE_COLORS).map(([type, color]) => (
                        <div key={type} className="flex items-center gap-1.5">
                          <div className={`w-2.5 h-2.5 rounded-sm shrink-0 ${color.dot}`} />
                          <span className="text-[11px] text-muted-foreground">{type}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
}
