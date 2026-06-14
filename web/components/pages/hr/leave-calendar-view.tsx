'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FadeIn, StaggerContainer } from '@/components/motion';
import { GlassPanel } from '@/components/glass-panel';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/input';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Users,
  Sun,
  List,
  Grid3X3,
  Loader2,
  ServerCrash,
  type LucideIcon,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

/** Days of week header, starting Monday. */
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/** Month names for display. */
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

/** Color palette per leave-type abbreviation. */
const LEAVE_TYPE_COLORS: Record<string, { gradient: string; text: string; dot: string }> = {
  CL:  { gradient: 'from-blue-400 to-blue-600',     text: 'text-blue-100',    dot: 'bg-blue-400' },
  SL:  { gradient: 'from-red-400 to-red-600',       text: 'text-red-100',     dot: 'bg-red-400' },
  EL:  { gradient: 'from-emerald-400 to-emerald-600', text: 'text-emerald-100', dot: 'bg-emerald-400' },
  PL:  { gradient: 'from-purple-400 to-purple-600', text: 'text-purple-100',  dot: 'bg-purple-400' },
  ML:  { gradient: 'from-pink-400 to-pink-600',     text: 'text-pink-100',    dot: 'bg-pink-400' },
  LWP: { gradient: 'from-indigo-400 to-indigo-600', text: 'text-indigo-100',  dot: 'bg-indigo-400' },
  CO:  { gradient: 'from-teal-400 to-teal-600',     text: 'text-teal-100',    dot: 'bg-teal-400' },
};
const DEFAULT_LEAVE_COLOR = { gradient: 'from-violet-400 to-fuchsia-500', text: 'text-violet-50', dot: 'bg-violet-400' };

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface LeaveEntry {
  id: string;
  emp_id: string;
  employee_name: string;
  department: string | null;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: string;
}

interface HolidayEntry {
  id: string;
  name: string;
  date: string;
}

interface DayData {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  leaves: LeaveEntry[];
  holidays: HolidayEntry[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Returns a YYYY-MM-DD string for a Date object.
 * Uses local year/month/day to avoid UTC shifting.
 */
function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parses an ISO date string (YYYY-MM-DD or YYYY-MM-DDT...) into a local Date.
 * Avoids off-by-one from UTC midnight parsing.
 */
function parseLocalDate(iso: string): Date {
  const parts = iso.split('T')[0].split('-');
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                      */
/* ------------------------------------------------------------------ */

function LeavePill({ leave }: { leave: LeaveEntry }) {
  const color = LEAVE_TYPE_COLORS[leave.leave_type] ?? DEFAULT_LEAVE_COLOR;
  const isPending = leave.status === 'pending';
  return (
    <div
      className={`w-full px-1.5 py-0.5 rounded text-[10px] font-medium truncate bg-gradient-to-br ${color.gradient} ${color.text} ${isPending ? 'opacity-60 border border-dashed border-white/30' : ''}`}
      title={`${leave.employee_name} — ${leave.leave_type}${leave.department ? ` (${leave.department})` : ''}${isPending ? ' · Pending' : ''}`}
    >
      {leave.employee_name}
    </div>
  );
}

function HolidayPill({ holiday }: { holiday: HolidayEntry }) {
  return (
    <div
      className="w-full px-1.5 py-0.5 rounded text-[10px] font-medium truncate bg-gradient-to-br from-amber-400 to-amber-600 text-amber-100"
      title={holiday.name}
    >
      <Sun className="w-2.5 h-2.5 inline mr-1" />
      {holiday.name}
    </div>
  );
}

function CalendarDay({ dayData }: { dayData: DayData }) {
  const { day, isCurrentMonth, isToday, isWeekend, leaves, holidays } = dayData;
  const hasEvents = leaves.length > 0 || holidays.length > 0;
  return (
    <div
      className={`
        min-h-[110px] rounded-lg border transition-colors duration-200 p-1.5 flex flex-col
        ${isCurrentMonth ? 'border-[var(--border)]' : 'border-transparent'}
        ${isToday ? 'ring-2 ring-primary/40 ring-offset-1 ring-offset-[var(--bg-surface-hover)]' : ''}
        ${isCurrentMonth && hasEvents ? 'bg-[var(--bg-surface-hover)]' : 'bg-[var(--accent)]'}
        ${!isCurrentMonth ? 'opacity-35' : ''}
      `}
    >
      <span className={`text-sm font-semibold mb-1 ${isToday ? 'text-primary' : isCurrentMonth ? (isWeekend ? 'text-muted-foreground' : 'text-foreground/80') : 'text-muted-foreground'}`}>
        {day}
      </span>
      <div className="space-y-0.5 overflow-y-auto flex-1">
        {holidays.map((h) => <HolidayPill key={h.id} holiday={h} />)}
        {leaves.slice(0, 3).map((l) => <LeavePill key={l.id} leave={l} />)}
        {leaves.length > 3 && (
          <div className="text-[10px] text-muted-foreground text-center pt-0.5">
            +{leaves.length - 3} more
          </div>
        )}
      </div>
    </div>
  );
}

function CalendarGrid({ days }: { days: DayData[] }) {
  return (
    <GlassPanel interactive className="p-2 sm:p-4">
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-xs font-bold text-muted-foreground py-2 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => <CalendarDay key={i} dayData={day} />)}
      </div>
    </GlassPanel>
  );
}

function CalendarListView({ days }: { days: DayData[] }) {
  const eventDays = days.filter((d) => d.isCurrentMonth && (d.leaves.length > 0 || d.holidays.length > 0));
  return (
    <GlassPanel interactive>
      <div className="p-5 border-b border-[var(--border)]">
        <h3 className="text-lg font-semibold text-foreground">Leave &amp; Holiday Schedule</h3>
      </div>
      {eventDays.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CalendarDays className="mx-auto w-10 h-10 mb-3" />
          <p className="text-sm">No scheduled leaves or holidays this month.</p>
        </div>
      ) : (
        <div className="max-h-[600px] overflow-y-auto divide-y divide-[var(--border)]">
          {eventDays.map((d) => {
            const key = formatDateKey(d.date);
            return (
              <div key={key} className={`px-5 py-4 ${d.isToday ? 'bg-primary/5' : ''}`}>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`font-bold text-sm ${d.isToday ? 'text-primary' : 'text-foreground'}`}>
                    {d.date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                  {d.isToday && <Badge variant="info">Today</Badge>}
                </div>
                <div className="space-y-1.5">
                  {d.holidays.map((h) => <HolidayPill key={h.id} holiday={h} />)}
                  {d.leaves.map((l) => {
                    const color = LEAVE_TYPE_COLORS[l.leave_type] ?? DEFAULT_LEAVE_COLOR;
                    return (
                      <div key={l.id} className={`flex items-center gap-3 p-2 rounded-md bg-[var(--accent)] ${l.status === 'pending' ? 'opacity-70' : ''}`}>
                        <div className={`w-2 h-2 rounded-full shrink-0 ${color.dot}`} />
                        <span className="text-sm text-foreground font-medium">{l.employee_name}</span>
                        {l.department && <span className="text-xs text-muted-foreground">{l.department}</span>}
                        <Badge className={`ml-auto bg-gradient-to-br ${color.gradient} ${color.text} border-0 shrink-0`}>{l.leave_type}</Badge>
                        {l.status === 'pending' && <Badge variant="warning">Pending</Badge>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </GlassPanel>
  );
}

function SidebarCard({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <FadeIn>
      <GlassPanel interactive>
        <div className="flex items-center gap-3 p-5 border-b border-[var(--border)]">
          <Icon className="w-5 h-5 text-primary" />
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
        </div>
        <div className="p-5">{children}</div>
      </GlassPanel>
    </FadeIn>
  );
}

function SidebarStat({ label, value, valueClass = 'text-foreground' }: { label: string; value: number | string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-bold ${valueClass}`}>{value}</span>
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 bg-[var(--accent)] rounded w-48 animate-pulse" />
        <div className="flex gap-2">
          <div className="h-9 w-9 bg-[var(--accent)] rounded animate-pulse" />
          <div className="h-9 w-40 bg-[var(--accent)] rounded animate-pulse" />
          <div className="h-9 w-9 bg-[var(--accent)] rounded animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <GlassPanel className="p-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {Array.from({ length: 7 }).map((_, i) => <div key={i} className="h-8 bg-[var(--accent)] rounded animate-pulse" />)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => <div key={i} className="h-28 bg-[var(--accent)] rounded-lg animate-pulse" />)}
            </div>
          </GlassPanel>
        </div>
        <div className="lg:col-span-1 space-y-4">
          <GlassPanel className="h-48 animate-pulse">{null}</GlassPanel>
          <GlassPanel className="h-64 animate-pulse">{null}</GlassPanel>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                           */
/* ------------------------------------------------------------------ */

/**
 * HR Leave Calendar page.
 *
 * Displays a full month-view calendar of all employee leave requests
 * and company holidays. HR admins can navigate months, switch between
 * grid and list views, and filter by department.
 */
export default function LeaveCalendarView() {
  const today = useMemo(() => new Date(), []);

  const [currentDate, setCurrentDate] = useState<Date>(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [leaves, setLeaves] = useState<LeaveEntry[]>([]);
  const [holidays, setHolidays] = useState<HolidayEntry[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  const fetchCalendarData = useCallback(async (month: number, year: number) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/hr/leave-calendar?month=${month}&year=${year}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(body.error?.message ?? `Request failed (${res.status})`);
      }
      const data = await res.json() as { leaves: LeaveEntry[]; holidays: HolidayEntry[] };
      setLeaves(data.leaves ?? []);
      setHolidays(data.holidays ?? []);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendarData(currentDate.getMonth() + 1, currentDate.getFullYear());
  }, [fetchCalendarData, currentDate]);

  const changeMonth = (offset: number) => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const goToToday = () => setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));

  /** All unique departments from loaded leaves for the filter dropdown. */
  const departments = useMemo(() => {
    const depts = new Set<string>();
    leaves.forEach((l) => { if (l.department) depts.add(l.department); });
    return Array.from(depts).sort();
  }, [leaves]);

  /** Leaves after department filter is applied. */
  const filteredLeaves = useMemo(() => {
    if (departmentFilter === 'all') return leaves;
    return leaves.filter((l) => l.department === departmentFilter);
  }, [leaves, departmentFilter]);

  /** Map from date-key → LeaveEntry[] for calendar cells. */
  const leavesByDate = useMemo(() => {
    const map = new Map<string, LeaveEntry[]>();
    filteredLeaves.forEach((leave) => {
      const cursor = parseLocalDate(leave.start_date);
      const end = parseLocalDate(leave.end_date);
      while (cursor <= end) {
        const key = formatDateKey(cursor);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(leave);
        cursor.setDate(cursor.getDate() + 1);
      }
    });
    return map;
  }, [filteredLeaves]);

  /** Map from date-key → HolidayEntry[] for calendar cells. */
  const holidaysByDate = useMemo(() => {
    const map = new Map<string, HolidayEntry[]>();
    holidays.forEach((h) => {
      const key = h.date.split('T')[0];
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(h);
    });
    return map;
  }, [holidays]);

  /** 42-cell calendar grid (6 weeks × 7 days). */
  const calendarDays = useMemo((): DayData[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7; // 0 = Monday
    const days: DayData[] = [];

    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      days.push({ date: new Date(year, month - 1, day), day, isCurrentMonth: false, isToday: false, isWeekend: false, leaves: [], holidays: [] });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const key = formatDateKey(date);
      const dow = (date.getDay() + 6) % 7;
      days.push({
        date,
        day,
        isCurrentMonth: true,
        isToday: key === formatDateKey(today),
        isWeekend: dow >= 5,
        leaves: leavesByDate.get(key) ?? [],
        holidays: holidaysByDate.get(key) ?? [],
      });
    }

    const remaining = 42 - days.length;
    for (let day = 1; day <= remaining; day++) {
      days.push({ date: new Date(year, month + 1, day), day, isCurrentMonth: false, isToday: false, isWeekend: false, leaves: [], holidays: [] });
    }
    return days;
  }, [currentDate, today, leavesByDate, holidaysByDate]);

  /** Sidebar stats computed from filtered leaves for the current month. */
  const monthStats = useMemo(() => {
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const employeesOnLeave = new Set<string>();
    let approved = 0;
    let pending = 0;

    filteredLeaves.forEach((l) => {
      const start = parseLocalDate(l.start_date);
      const end = parseLocalDate(l.end_date);
      if (start <= monthEnd && end >= monthStart) {
        employeesOnLeave.add(l.emp_id);
        if (l.status === 'approved') approved++;
        if (l.status === 'pending') pending++;
      }
    });

    return { approved, pending, uniqueEmployees: employeesOnLeave.size, totalHolidays: holidays.length };
  }, [filteredLeaves, holidays, currentDate]);

  const isCurrentMonthView =
    currentDate.getFullYear() === today.getFullYear() &&
    currentDate.getMonth() === today.getMonth();

  if (loading) return <CalendarSkeleton />;

  if (errorMessage) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <GlassPanel className="p-8 max-w-md text-center">
          <ServerCrash className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Failed to Load Calendar</h2>
          <p className="text-sm text-muted-foreground mb-5">{errorMessage}</p>
          <Button variant="danger" size="sm" onClick={() => fetchCalendarData(currentDate.getMonth() + 1, currentDate.getFullYear())}>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Retry
          </Button>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 text-foreground relative z-10">
      <StaggerContainer>
        {/* Header */}
        <PageHeader
          title="Leave Calendar"
          description="Full company leave schedule with holiday overlay."
          icon={<CalendarDays className="w-6 h-6 text-primary" />}
          action={
            <div className="flex items-center gap-2 flex-wrap">
              {/* Department filter */}
              {departments.length > 0 && (
                <Select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="form-input text-sm h-9"
                  aria-label="Filter by department"
                  title="Filter by department"
                >
                  <option value="all">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </Select>
              )}

              {/* View mode toggle */}
              <GlassPanel className="p-1 flex items-center rounded-xl">
                <Button variant="ghost" size="sm" onClick={() => setViewMode('grid')} className={viewMode === 'grid' ? 'bg-primary/15 text-primary' : ''} aria-label="Grid view">
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'bg-primary/15 text-primary' : ''} aria-label="List view">
                  <List className="w-4 h-4" />
                </Button>
              </GlassPanel>

              {/* Month navigation */}
              <GlassPanel className="flex items-center gap-1 p-1 rounded-xl">
                <Button variant="ghost" size="sm" onClick={() => changeMonth(-1)} className="h-8 w-8" aria-label="Previous month">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={goToToday} className="px-3 text-sm font-semibold h-auto min-w-[160px] text-center">
                  {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => changeMonth(1)} className="h-8 w-8" aria-label="Next month">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </GlassPanel>

              {!isCurrentMonthView && (
                <Button variant="outline" size="sm" onClick={goToToday}>Today</Button>
              )}
            </div>
          }
        />

        {/* Body */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={viewMode + formatDateKey(currentDate)}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.2 }}
              >
                {viewMode === 'grid' ? (
                  <CalendarGrid days={calendarDays} />
                ) : (
                  <CalendarListView days={calendarDays} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-5">
            <SidebarCard title="Monthly Overview" icon={CalendarDays}>
              <SidebarStat label="Approved leaves" value={monthStats.approved} valueClass="text-emerald-400" />
              <SidebarStat label="Pending review" value={monthStats.pending} valueClass="text-amber-400" />
              <SidebarStat label="Employees on leave" value={monthStats.uniqueEmployees} />
              <div className="border-t border-[var(--border)] my-3" />
              <SidebarStat label="Public holidays" value={monthStats.totalHolidays} />
            </SidebarCard>

            <SidebarCard title="Leave Types" icon={Users}>
              {Object.entries(LEAVE_TYPE_COLORS).map(([type, color]) => (
                <div key={type} className="flex items-center gap-2 py-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${color.dot}`} />
                  <span className="text-sm text-muted-foreground">{type}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 py-1.5">
                <div className="w-2.5 h-2.5 rounded-full shrink-0 bg-violet-400" />
                <span className="text-sm text-muted-foreground">Other</span>
              </div>
              <div className="flex items-center gap-2 py-1.5 border-t border-[var(--border)] mt-1">
                <Sun className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                <span className="text-sm text-muted-foreground">Holiday</span>
              </div>
            </SidebarCard>
          </div>
        </div>
      </StaggerContainer>
    </div>
  );
}
