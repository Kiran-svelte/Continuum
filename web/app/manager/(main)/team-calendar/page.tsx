'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FadeIn, StaggerContainer } from '@/components/motion';
import { GlassPanel } from '@/components/glass-panel';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Users,
  Sun,
  CalendarDays,
  List,
  Grid3X3,
  Loader,
  ServerCrash,
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

const LEAVE_TYPE_COLORS: Record<string, { gradient: string; text: string; dot: string }> = {
  CL: { gradient: 'from-blue-400 to-blue-600', text: 'text-blue-100', dot: 'bg-blue-300' },
  SL: { gradient: 'from-red-400 to-red-600', text: 'text-red-100', dot: 'bg-red-300' },
  EL: { gradient: 'from-emerald-400 to-emerald-600', text: 'text-emerald-100', dot: 'bg-emerald-300' },
  PL: { gradient: 'from-purple-400 to-purple-600', text: 'text-purple-100', dot: 'bg-purple-300' },
  ML: { gradient: 'from-pink-400 to-pink-600', text: 'text-pink-100', dot: 'bg-pink-300' },
  LWP: { gradient: 'from-gray-400 to-gray-600', text: 'text-gray-100', dot: 'bg-gray-300' },
  CO: { gradient: 'from-teal-400 to-teal-600', text: 'text-teal-100', dot: 'bg-teal-300' },
};
const DEFAULT_LEAVE_COLOR = { gradient: 'from-slate-400 to-slate-600', text: 'text-slate-100', dot: 'bg-slate-300' };
const MEMBER_COLORS = [
  '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#14b8a6',
  '#ec4899', '#6366f1', '#f97316', '#06b6d4', '#84cc16', '#e11d48'
];

/* ------------------------------------------------------------------ */
/*  Animation Variants                                                 */
/* ------------------------------------------------------------------ */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 100, damping: 12 } },
};

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
/*  Skeleton Loader                                                    */
/* ------------------------------------------------------------------ */

function CalendarSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 bg-white/5 rounded-md w-48 animate-pulse" />
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 bg-white/5 rounded-lg animate-pulse" />
          <div className="h-6 w-36 bg-white/5 rounded-md animate-pulse" />
          <div className="h-9 w-9 bg-white/5 rounded-lg animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <GlassPanel className="p-4">
            <div className="grid grid-cols-7 gap-2 mb-2">
              {Array.from({ length: 7 }).map((_, i) => <div key={i} className="h-8 bg-white/5 rounded animate-pulse" />)}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }).map((_, i) => <div key={i} className="h-[100px] bg-white/5 rounded-lg animate-pulse" />)}
            </div>
          </GlassPanel>
        </div>
        <div className="lg:col-span-1 space-y-4">
          <GlassPanel className="h-48 p-4 animate-pulse"><div /></GlassPanel>
          <GlassPanel className="h-64 p-4 animate-pulse"><div /></GlassPanel>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Error Component                                                    */
/* ------------------------------------------------------------------ */

function CalendarError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center p-4">
      <FadeIn>
        <GlassPanel className="p-8 max-w-md w-full">
          <ServerCrash className="w-16 h-16 text-red-400 mx-auto" />
          <h2 className="mt-4 text-2xl font-bold text-red-300">Failed to Load Calendar</h2>
          <p className="mt-2 text-sm text-white/60">{error}</p>
          <Button onClick={onRetry} variant="danger" size="sm" className="mt-6">
            <Loader className="mr-2 h-4 w-4 animate-spin" />
            Try Again
          </Button>
        </GlassPanel>
      </FadeIn>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function TeamCalendarPage() {
  const today = useMemo(() => new Date(), []);
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const changeMonth = (offset: number) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };
  const goToToday = () => setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [leavesRes, holidaysRes] = await Promise.all([
        fetch('/api/leaves/list?status=approved,pending&limit=200', { credentials: 'include' }),
        fetch('/api/company/holidays', { credentials: 'include' }),
      ]);
      if (!leavesRes.ok) throw new Error(`Failed to load team leave data (${leavesRes.status})`);
      const leavesData = await leavesRes.json();
      const holidaysData = holidaysRes.ok ? await holidaysRes.json() : { holidays: [] };
      setLeaves(leavesData.requests ?? []);
      setHolidays(holidaysData.holidays ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { leavesByDate, holidaysByDate } = useMemo(() => {
    const lbd = new Map<string, LeaveRequest[]>();
    leaves.forEach(leave => {
      let current = parseDate(leave.start_date);
      const end = parseDate(leave.end_date);
      while (current <= end) {
        const key = formatDateKey(current);
        if (!lbd.has(key)) lbd.set(key, []);
        lbd.get(key)!.push(leave);
        current.setDate(current.getDate() + 1);
      }
    });
    const hbd = new Map<string, Holiday[]>();
    holidays.forEach(holiday => {
      const key = holiday.date.split('T')[0];
      if (!hbd.has(key)) hbd.set(key, []);
      hbd.get(key)!.push(holiday);
    });
    return { leavesByDate: lbd, holidaysByDate: hbd };
  }, [leaves, holidays]);

  const calendarDays = useMemo((): DayData[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = (new Date(year, month, 1).getDay() + 6) % 7; // 0=Mon
    const days: DayData[] = [];

    // Prev month days
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const date = new Date(year, month - 1, day);
      days.push({ date, day, isCurrentMonth: false, isToday: false, isWeekend: false, leaves: [], holidays: [] });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const key = formatDateKey(date);
      const dayOfWeek = (date.getDay() + 6) % 7;
      days.push({
        date,
        day,
        isCurrentMonth: true,
        isToday: formatDateKey(date) === formatDateKey(today),
        isWeekend: dayOfWeek >= 5,
        leaves: leavesByDate.get(key) ?? [],
        holidays: holidaysByDate.get(key) ?? [],
      });
    }

    // Next month days
    const remaining = 42 - days.length; // 6 weeks grid
    for (let day = 1; day <= remaining; day++) {
      const date = new Date(year, month + 1, day);
      days.push({ date, day, isCurrentMonth: false, isToday: false, isWeekend: false, leaves: [], holidays: [] });
    }
    return days;
  }, [currentDate, today, leavesByDate, holidaysByDate]);

  const { teamMembersThisMonth, totalLeavesThisMonth, pendingLeavesThisMonth, holidaysThisMonth } = useMemo(() => {
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const memberMap = new Map<string, { firstName: string; lastName: string; leaveCount: number }>();
    let total = 0;
    let pending = 0;

    leaves.forEach(leave => {
      const start = parseDate(leave.start_date);
      const end = parseDate(leave.end_date);
      if (start <= monthEnd && end >= monthStart) {
        total++;
        if (leave.status === 'pending') pending++;
        const key = `${leave.employee.first_name}-${leave.employee.last_name}`;
        if (!memberMap.has(key)) {
          memberMap.set(key, { firstName: leave.employee.first_name, lastName: leave.employee.last_name, leaveCount: 0 });
        }
        memberMap.get(key)!.leaveCount++;
      }
    });

    const htm = holidays.filter(h => {
      const date = parseDate(h.date);
      return date.getFullYear() === currentDate.getFullYear() && date.getMonth() === currentDate.getMonth();
    });

    return {
      teamMembersThisMonth: Array.from(memberMap.values()),
      totalLeavesThisMonth: total,
      pendingLeavesThisMonth: pending,
      holidaysThisMonth: htm,
    };
  }, [leaves, holidays, currentDate]);

  if (loading) return <CalendarSkeleton />;
  if (error) return <CalendarError error={error} onRetry={fetchData} />;

  const isCurrentMonthView = currentDate.getFullYear() === today.getFullYear() && currentDate.getMonth() === today.getMonth();

  return (
    <div className="p-4 md:p-6 lg:p-8 text-white relative z-10">
      <StaggerContainer>
        {/* Header */}
        <PageHeader
          title="Team Calendar"
          description="Visual overview of team leave schedule."
          icon={<CalendarDays className="w-6 h-6 text-primary" />}
          action={
            <div className="flex items-center gap-2">
              <GlassPanel className="p-1 flex items-center rounded-xl">
                <Button variant="ghost" size="sm" onClick={() => setViewMode('grid')} className={viewMode === 'grid' ? 'bg-sky-500/30 text-sky-300' : ''}><Grid3X3 className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'bg-sky-500/30 text-sky-300' : ''}><List className="w-4 h-4" /></Button>
              </GlassPanel>
              <GlassPanel className="flex items-center gap-1 p-1 rounded-xl">
                <Button variant="ghost" size="sm" onClick={() => changeMonth(-1)} className="h-8 w-8"><ChevronLeft className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={goToToday} className="px-3 py-1.5 text-sm font-semibold h-auto min-w-[160px] text-center">
                  {getMonthName(currentDate.getMonth())} {currentDate.getFullYear()}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => changeMonth(1)} className="h-8 w-8"><ChevronRight className="w-4 h-4" /></Button>
              </GlassPanel>
              {!isCurrentMonthView && <Button variant="outline" size="sm" onClick={goToToday}>Today</Button>}
            </div>
          }
        />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendar Grid/List */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              <motion.div key={viewMode} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                {viewMode === 'grid' ? (
                  <CalendarGrid days={calendarDays} />
                ) : (
                  <CalendarList days={calendarDays} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <SummaryCard title="Monthly Summary" icon={CalendarDays}>
              <StatItem label="Total leave requests" value={totalLeavesThisMonth} />
              <StatItem label="Approved" value={totalLeavesThisMonth - pendingLeavesThisMonth} className="text-emerald-300" />
              <StatItem label="Pending" value={pendingLeavesThisMonth} className="text-amber-300" />
              <StatItem label="Team members on leave" value={teamMembersThisMonth.length} />
              <div className="border-t border-white/10 my-3" />
              <StatItem label="Holidays this month" value={holidaysThisMonth.length} />
            </SummaryCard>

            <SummaryCard title="Team on Leave" icon={Users}>
              {teamMembersThisMonth.length > 0 ? (
                teamMembersThisMonth.map((member, index) => (
                  <div key={member.firstName + member.lastName} className="flex items-center gap-3 py-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: MEMBER_COLORS[index % MEMBER_COLORS.length] }} />
                    <span className="text-sm text-white/70 truncate">{getShortName(member.firstName, member.lastName)}</span>
                    <span className="ml-auto text-xs text-white/50">{member.leaveCount}d</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-white/50 text-center py-4">No team leaves this month.</p>
              )}
            </SummaryCard>
          </div>
        </div>
      </StaggerContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function CalendarGrid({ days }: { days: DayData[] }) {
  return (
    <GlassPanel interactive className="p-2 sm:p-4">
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map(day => <div key={day} className="text-center text-xs font-bold text-white/50 py-2 uppercase">{day}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((dayData, index) => <CalendarDay key={index} dayData={dayData} />)}
      </div>
    </GlassPanel>
  );
}

function CalendarDay({ dayData }: { dayData: DayData }) {
  const { date, day, isCurrentMonth, isToday, isWeekend, leaves, holidays } = dayData;
  const hasEvents = leaves.length > 0 || holidays.length > 0;

  return (
    <div className={`
      h-[110px] rounded-lg border transition-colors duration-200 p-1.5 flex flex-col
      ${isCurrentMonth ? 'border-white/10' : 'border-transparent'}
      ${isToday ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-black/50' : ''}
      ${isCurrentMonth && hasEvents ? 'bg-white/5' : 'bg-white/[0.02]'}
      ${!isCurrentMonth ? 'opacity-40' : ''}
    `}>
      <span className={`
        text-sm font-semibold
        ${isToday ? 'text-sky-300' : isCurrentMonth ? (isWeekend ? 'text-white/40' : 'text-white/80') : 'text-white/30'}
      `}>{day}</span>
      <div className="mt-1 space-y-0.5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
        {holidays.map(h => <HolidayPill key={h.id} holiday={h} />)}
        {leaves.slice(0, 3).map(l => <LeavePill key={l.id} leave={l} />)}
        {leaves.length > 3 && <div className="text-xs text-white/50 text-center mt-1">+{leaves.length - 3} more</div>}
      </div>
    </div>
  );
}

function LeavePill({ leave }: { leave: LeaveRequest }) {
  const color = LEAVE_TYPE_COLORS[leave.leave_type] ?? DEFAULT_LEAVE_COLOR;
  const isPending = leave.status === 'pending';
  return (
    <div
      className={`w-full px-1.5 py-0.5 rounded text-[10px] font-medium truncate bg-gradient-to-br ${color.gradient} ${color.text} ${isPending ? 'opacity-60 border border-dashed border-white/50' : ''}`}
      title={`${leave.employee.first_name} ${leave.employee.last_name} - ${leave.leave_type}${isPending ? ' (Pending)' : ''}`}
    >
      {getShortName(leave.employee.first_name, leave.employee.last_name)}
    </div>
  );
}

function HolidayPill({ holiday }: { holiday: Holiday }) {
  return (
    <div className="w-full px-1.5 py-0.5 rounded text-[10px] font-medium truncate bg-gradient-to-br from-amber-400 to-amber-600 text-amber-100" title={holiday.name}>
      <Sun className="w-2.5 h-2.5 inline mr-1" />
      {holiday.name}
    </div>
  );
}

function CalendarList({ days }: { days: DayData[] }) {
  const eventDays = days.filter(d => d.isCurrentMonth && (d.leaves.length > 0 || d.holidays.length > 0));
  return (
    <GlassPanel interactive>
      <div className="p-6 border-b border-white/10">
        <h3 className="text-lg font-semibold text-white">Leave & Holiday List</h3>
      </div>
      {eventDays.length === 0 ? (
        <div className="text-center py-12 text-white/50">
          <Calendar className="mx-auto w-10 h-10 mb-2" />
          No scheduled events this month.
        </div>
      ) : (
        <div className="max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
          {eventDays.map(dayData => (
            <div key={formatDateKey(dayData.date)} className={`px-4 py-3 border-b border-white/5 ${dayData.isToday ? 'bg-sky-500/10' : ''}`}>
              <div className="flex items-center gap-3 mb-2">
                <span className={`font-bold ${dayData.isToday ? 'text-sky-300' : 'text-white'}`}>
                  {dayData.date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
                </span>
                {dayData.isToday && <Badge variant="info">Today</Badge>}
              </div>
              {dayData.holidays.map(h => <HolidayPill key={h.id} holiday={h} />)}
              {dayData.leaves.map(l => {
                const color = LEAVE_TYPE_COLORS[l.leave_type] ?? DEFAULT_LEAVE_COLOR;
                return (
                  <div key={l.id} className={`flex items-center gap-3 p-2 rounded-md mt-1 bg-white/5 ${l.status === 'pending' ? 'opacity-70' : ''}`}>
                    <div className={`w-2 h-2 rounded-full ${color.dot}`} />
                    <span className="text-sm font-medium text-white/70">{l.employee.first_name} {l.employee.last_name}</span>
                    <Badge className={`ml-auto bg-gradient-to-br ${color.gradient} ${color.text} border-0`}>{l.leave_type}</Badge>
                    {l.status === 'pending' && <Badge variant="warning">Pending</Badge>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </GlassPanel>
  );
}

function SummaryCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <FadeIn>
      <GlassPanel interactive>
        <div className="flex items-center gap-3 p-6 border-b border-white/10">
          <Icon className="w-5 h-5 text-sky-300" />
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        <div className="p-6">{children}</div>
      </GlassPanel>
    </FadeIn>
  );
}

function StatItem({ label, value, className = 'text-white' }: { label: string; value: string | number; className?: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-white/60">{label}</span>
      <span className={`text-sm font-bold ${className}`}>{value}</span>
    </div>
  );
}
