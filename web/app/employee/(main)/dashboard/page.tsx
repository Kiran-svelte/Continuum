'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { GlassPanel } from '@/components/glass-panel';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageLoader } from '@/components/ui/progress';
import { WelcomeModal, FloatingTutorialButton, StartTutorialButton, employeeTutorial } from '@/components/tutorial';
import { ensureMe } from '@/lib/client-auth';
import { getPusherClient, getUserChannelName, type PusherEventType } from '@/lib/pusher-client';
import { TiltCard } from '@/components/motion/tilt-card';
import { FadeIn, StaggerContainer } from '@/components/motion/fade-in';
import {
  Plus,
  FilePlus,
  CalendarDays,
  Clock,
  FolderOpen,
  ClipboardList,
  CalendarCheck,
  Inbox,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

interface LeaveBalance {
  leave_type: string;
  annual_entitlement: number;
  remaining: number;
}

interface Holiday {
  id: string;
  name: string;
  date: string;
  is_custom: boolean;
}

interface LeaveRequestBrief {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: string;
  created_at: string;
}

// Auto-assign gradient colors for any leave type code. Known types get stable
// colors; custom/unknown types are assigned from a rotating palette.
const KNOWN_LEAVE_COLORS: Record<string, string> = {
  CL: 'from-blue-500 to-blue-600',
  SL: 'from-emerald-500 to-green-600',
  PL: 'from-purple-500 to-violet-600',
  EL: 'from-purple-500 to-violet-600',
  WFH: 'from-orange-500 to-amber-600',
  LWP: 'from-red-500 to-rose-600',
  ML: 'from-pink-500 to-rose-500',
  PTL: 'from-cyan-500 to-teal-600',
  BL: 'from-gray-500 to-slate-600',
};

const KNOWN_LEAVE_BG_COLORS: Record<string, string> = {
  CL: 'bg-blue-500/10',
  SL: 'bg-emerald-500/10',
  PL: 'bg-purple-500/10',
  EL: 'bg-purple-500/10',
  WFH: 'bg-orange-500/10',
  LWP: 'bg-red-500/10',
  ML: 'bg-pink-500/10',
  PTL: 'bg-cyan-500/10',
  BL: 'bg-gray-500/10',
};

const KNOWN_LEAVE_ICON_COLORS: Record<string, string> = {
  CL: 'text-blue-500',
  SL: 'text-emerald-500',
  PL: 'text-purple-500',
  EL: 'text-purple-500',
  WFH: 'text-orange-500',
  LWP: 'text-red-500',
  ML: 'text-pink-500',
  PTL: 'text-cyan-500',
  BL: 'text-gray-500',
};

// Palette for dynamically assigned leave types not in the known map
const DYNAMIC_GRADIENTS = [
  'from-indigo-500 to-blue-600',
  'from-teal-500 to-emerald-600',
  'from-amber-500 to-yellow-600',
  'from-fuchsia-500 to-pink-600',
  'from-lime-500 to-green-600',
  'from-sky-500 to-cyan-600',
  'from-rose-500 to-red-600',
  'from-violet-500 to-purple-600',
];

const DYNAMIC_BG_COLORS = [
  'bg-indigo-500/10',
  'bg-teal-500/10',
  'bg-amber-500/10',
  'bg-fuchsia-500/10',
  'bg-lime-500/10',
  'bg-sky-500/10',
  'bg-rose-500/10',
  'bg-violet-500/10',
];

const DYNAMIC_ICON_COLORS = [
  'text-indigo-500',
  'text-teal-500',
  'text-amber-500',
  'text-fuchsia-500',
  'text-lime-500',
  'text-sky-500',
  'text-rose-500',
  'text-violet-500',
];

// Deterministic hash for a leave type code -> index
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getLeaveColor(code: string): string {
  return KNOWN_LEAVE_COLORS[code] ?? DYNAMIC_GRADIENTS[hashCode(code) % DYNAMIC_GRADIENTS.length];
}

function getLeaveBgColor(code: string): string {
  return KNOWN_LEAVE_BG_COLORS[code] ?? DYNAMIC_BG_COLORS[hashCode(code) % DYNAMIC_BG_COLORS.length];
}

function getLeaveIconColor(code: string): string {
  return KNOWN_LEAVE_ICON_COLORS[code] ?? DYNAMIC_ICON_COLORS[hashCode(code) % DYNAMIC_ICON_COLORS.length];
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
};

const STATUS_MAP: Record<string, 'warning' | 'success' | 'danger' | 'default' | 'info'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'default',
  escalated: 'info',
};

export default function EmployeeDashboardPage() {
  const router = useRouter();
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [recentRequests, setRecentRequests] = useState<LeaveRequestBrief[]>([]);
  const [loadingBalances, setLoadingBalances] = useState(true);
  const [loadingHolidays, setLoadingHolidays] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [exitItems, setExitItems] = useState<{ id: string; task: string; status: string; due_date: string | null }[]>([]);
  const [loadingExitItems, setLoadingExitItems] = useState(true);
  const [pageReady, setPageReady] = useState(false);
  const [userName, setUserName] = useState('');

  // Real-time state management
  const [userId, setUserId] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const channelRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const me = await ensureMe();
      if (cancelled) return;
      if (!me) {
        router.replace('/sign-in');
        return;
      }

      const role = me.primary_role ?? 'employee';

      if (role === 'admin' || role === 'hr') {
        if (!me.company?.onboarding_completed) {
          router.replace('/onboarding');
        } else {
          router.replace('/hr/dashboard');
        }
        return;
      }

      setUserName(me.first_name || 'there');
      setUserId(me.id);
      setPageReady(true);
    })();

    return () => { cancelled = true; };
  }, [router]);

  // Real-time dashboard updates for employees
  useEffect(() => {
    if (!userId) return;

    const pusher = getPusherClient();
    if (!pusher) {
      console.warn('Pusher not available. Real-time updates disabled.');
      return;
    }

    // Subscribe to user-specific events
    const userChannelName = getUserChannelName(userId);
    const channel = pusher.subscribe(userChannelName);
    channelRef.current = channel;

    pusher.connection.bind('connected', () => {
      setIsLive(true);
      console.log('Employee Dashboard: Real-time updates connected');
    });

    pusher.connection.bind('disconnected', () => {
      setIsLive(false);
      console.log('Employee Dashboard: Real-time updates disconnected');
    });

    // Handle leave balance updates
    const handleBalanceUpdate = (data: any) => {
      console.log('Balance updated:', data);
      setLastUpdated(new Date().toLocaleTimeString());

      setBalances(prev =>
        prev.map(balance =>
          balance.leave_type === data.leave_type
            ? { ...balance, remaining: data.new_remaining }
            : balance
        )
      );
    };

    // Handle leave request status changes
    const handleLeaveStatusUpdate = (data: any) => {
      console.log('Leave request status updated:', data);
      setLastUpdated(new Date().toLocaleTimeString());

      setRecentRequests(prev =>
        prev.map(req =>
          req.id === data.id
            ? { ...req, status: data.status }
            : req
        )
      );
    };

    // Handle new leave request confirmation
    const handleLeaveRequestConfirmed = (data: any) => {
      console.log('Leave request confirmed:', data);
      setLastUpdated(new Date().toLocaleTimeString());

      // Add to recent requests if not already there
      setRecentRequests(prev => {
        const exists = prev.find(r => r.id === data.id);
        if (exists) return prev;

        const newRequest: LeaveRequestBrief = {
          id: data.id,
          leave_type: data.leave_type,
          start_date: data.start_date,
          end_date: data.end_date,
          total_days: data.total_days,
          status: data.status || 'pending',
          created_at: data.created_at || new Date().toISOString(),
        };

        return [newRequest, ...prev.slice(0, 2)];
      });
    };

    // Bind to real-time events
    channel.bind('leave-balance-updated', handleBalanceUpdate);
    channel.bind('leave-request-approved', handleLeaveStatusUpdate);
    channel.bind('leave-request-rejected', handleLeaveStatusUpdate);
    channel.bind('leave-request-confirmed', handleLeaveRequestConfirmed);

    return () => {
      if (channelRef.current) {
        channelRef.current.unbind('leave-balance-updated', handleBalanceUpdate);
        channelRef.current.unbind('leave-request-approved', handleLeaveStatusUpdate);
        channelRef.current.unbind('leave-request-rejected', handleLeaveStatusUpdate);
        channelRef.current.unbind('leave-request-confirmed', handleLeaveRequestConfirmed);
        pusher.unsubscribe(userChannelName);
      }
    };
  }, [userId]);

  const loadBalances = useCallback(async () => {
    setLoadingBalances(true);
    try {
      const res = await fetch('/api/leaves/balances', { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        setBalances((json.balances ?? []).slice(0, 6));
      }
    } finally {
      setLoadingBalances(false);
    }
  }, []);

  const loadHolidays = useCallback(async () => {
    setLoadingHolidays(true);
    try {
      const res = await fetch('/api/company/holidays', { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        setHolidays((json.holidays ?? []).slice(0, 6));
      }
    } finally {
      setLoadingHolidays(false);
    }
  }, []);

  const loadRecentRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const res = await fetch('/api/leaves/list?limit=3', { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        setRecentRequests(json.requests ?? []);
      }
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  const loadExitChecklist = useCallback(async () => {
    setLoadingExitItems(true);
    try {
      const res = await fetch('/api/exit-checklist', { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        const items = json.items ?? [];
        setExitItems(items);
      }
    } catch {
      // ignore - widget is optional
    } finally {
      setLoadingExitItems(false);
    }
  }, []);

  useEffect(() => {
    if (pageReady) {
      loadBalances();
      loadHolidays();
      loadRecentRequests();
      loadExitChecklist();
    }
  }, [pageReady, loadBalances, loadHolidays, loadRecentRequests, loadExitChecklist]);

  function formatHolidayDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function formatHolidayDay(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'long' });
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  }

  if (!pageReady) {
    return (
      <>
        <PageLoader />
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
                <Skeleton className="h-8 w-12" />
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <StaggerContainer className="space-y-8 relative z-10">
      {/* Header with Live Status */}
      <FadeIn direction="up">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              Welcome back, {userName}
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <p className="text-white/60 font-medium">Here&apos;s your leave overview for this year</p>
              {/* Live status indicator */}
              <div className="flex items-center gap-2 text-sm bg-black/50 border border-white/10 px-3 py-1 rounded-full backdrop-blur-md">
                <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)] animate-pulse' : 'bg-yellow-500'}`} />
                <span className="text-white/60 font-medium">
                  {isLive ? 'Live' : 'Connecting...'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-3 items-center" data-tutorial="apply-leave-btn">
            <StartTutorialButton tutorial={employeeTutorial} variant="outline" className="text-xs px-3 py-1.5 glass-panel" />
            <Link
              href="/employee/request-leave"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(0,255,255,0.3)] hover:shadow-[0_0_30px_rgba(0,255,255,0.5)] transform hover:-translate-y-0.5"
            >
              <Plus className="w-5 h-5" />
              Apply Leave
            </Link>
          </div>
        </div>
      </FadeIn>

      {/* Leave Balance Cards */}
      <div data-tutorial="leave-balances">
        {loadingBalances ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <GlassPanel key={i} className="border-0 shadow-md overflow-hidden h-32"><span /></GlassPanel>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {balances.map((balance, index) => {
              const gradient = getLeaveColor(balance.leave_type);
              const bgColor = getLeaveBgColor(balance.leave_type);
              const iconColor = getLeaveIconColor(balance.leave_type);
              const percentage = balance.annual_entitlement > 0
                ? Math.min(100, (balance.remaining / balance.annual_entitlement) * 100)
                : 0;

              return (
                <FadeIn key={balance.leave_type} direction="up" delay={0.1 * index}>
                  <TiltCard>
                    <GlassPanel className="relative overflow-hidden border border-white/10 shadow-lg group-hover:border-primary/30 transition-all h-full">
                      <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${gradient} opacity-80`} />
                      <div className="px-6 pt-6 pb-5">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-sm font-bold text-white/60 uppercase tracking-wider">{balance.leave_type}</p>
                        <div className={`w-10 h-10 rounded-xl ${bgColor} flex items-center justify-center`}>
                          <TrendingUp className={`w-5 h-5 ${iconColor}`} />
                        </div>
                      </div>
                      <motion.p
                        className="text-3xl font-bold text-white"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', delay: index * 0.08 + 0.3 }}
                      >
                        {balance.remaining}
                      </motion.p>
                      <p className="text-xs text-white/60 mt-1">
                        of {balance.annual_entitlement} days remaining
                      </p>
                      <div className="mt-3 w-full bg-secondary rounded-full h-2 overflow-hidden">
                        <motion.div
                          className={`bg-gradient-to-r ${gradient} h-2 rounded-full`}
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.8, delay: index * 0.08 + 0.4, ease: 'easeOut' }}
                        />
                      </div>
                    </div> {/* /CardContent */}
                  </GlassPanel>
                </TiltCard>
              </FadeIn>
              );
            })}
            {balances.length === 0 && (
              <div className="col-span-full text-center py-8">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-3">
                  <ClipboardList className="w-6 h-6 text-white/60" />
                </div>
                <p className="text-sm text-white/60">No leave balances found. Contact your HR team.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <FadeIn direction="right" delay={0.2}>
          <TiltCard>
            <div data-tutorial="quick-actions">
            <GlassPanel className="overflow-hidden h-full border border-white/10 shadow-md">
              <div className="p-6 border-b border-white/10 bg-white/5">
              <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
            </div> {/* /CardHeader */}
            <div className="p-4 space-y-2">
              {[
                { href: '/employee/request-leave', icon: FilePlus, label: 'Apply for Leave', sub: 'Submit a new request', gradient: 'from-blue-500/10 to-cyan-500/10', iconColor: 'text-blue-500' },
                { href: '/employee/leave-history', icon: CalendarDays, label: 'Leave History', sub: 'Check past requests', gradient: 'from-purple-500/10 to-violet-500/10', iconColor: 'text-purple-500' },
                { href: '/employee/attendance', icon: Clock, label: 'My Attendance', sub: 'View attendance log', gradient: 'from-emerald-500/10 to-green-500/10', iconColor: 'text-emerald-500' },
                { href: '/employee/documents', icon: FolderOpen, label: 'Documents', sub: 'Payslips & letters', gradient: 'from-amber-500/10 to-orange-500/10', iconColor: 'text-amber-500' },
              ].map((item, index) => (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.06 }}
                >
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r ${item.gradient} border border-white/10 hover:border-primary/30 hover:shadow-sm transition-all group`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/60 dark:bg-slate-800/60 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <item.icon className={`w-5 h-5 ${item.iconColor}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{item.label}</p>
                      <p className="text-xs text-white/60">{item.sub}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </Link>
                </motion.div>
              ))}
            </div> {/* /CardContent */}
          </GlassPanel>
          </div>
        </TiltCard>
        </FadeIn>

        {/* Recent Requests + Upcoming Holidays */}
        <div className="lg:col-span-2 space-y-6">
          {/* Exit Checklist Widget - only shown if employee has exit items */}
          {!loadingExitItems && exitItems.length > 0 && (
            <FadeIn direction="left" delay={0.4}>
              <TiltCard>
                <GlassPanel className="overflow-hidden border-l-4 border-l-amber-500 shadow-md border-white/10">
                  <div className="p-6 border-b border-white/10 bg-amber-500/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-amber-600" />
                      <h3 className="text-lg font-semibold text-white">Exit Checklist</h3>
                      <Badge variant="warning" className="text-xs">
                        {exitItems.filter(i => i.status !== 'completed').length} pending
                      </Badge>
                    </div>
                    <Link href="/employee/exit-checklist" className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">
                      View all
                    </Link>
                  </div>
                </div> {/* /CardHeader */}
                <div className="p-0">
                  <div className="divide-y divide-border/50">
                    {exitItems.slice(0, 4).map((item) => {
                      const isOverdue = item.due_date && new Date(item.due_date) < new Date() && item.status !== 'completed';
                      return (
                        <div key={item.id} className="px-6 py-3 flex items-center justify-between hover:bg-white/5 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${item.status === 'completed' ? 'bg-green-500' : isOverdue ? 'bg-red-500' : 'bg-amber-500'}`} />
                            <span className={`text-sm ${item.status === 'completed' ? 'text-white/60 line-through' : 'text-white'}`}>
                              {item.task}
                            </span>
                          </div>
                          <Badge variant={item.status === 'completed' ? 'success' : isOverdue ? 'danger' : 'warning'} className="text-xs">
                            {item.status === 'completed' ? 'Done' : isOverdue ? 'Overdue' : 'Pending'}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                  {exitItems.length > 4 && (
                    <div className="px-6 py-2 text-center border-t border-white/10">
                      <Link href="/employee/exit-checklist" className="text-xs text-primary hover:underline">
                        +{exitItems.length - 4} more items
                      </Link>
                    </div>
                  )}
                </div> {/* /CardContent */}
              </GlassPanel>
            </TiltCard>
            </FadeIn>
          )}

          {/* Recent Leave Requests */}
          <FadeIn direction="up" delay={0.5}>
            <TiltCard>
            <GlassPanel className="overflow-hidden border border-white/10 shadow-md">
              <div className="p-6 border-b border-white/10 bg-white/5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Recent Requests</h3>
                  <Link href="/employee/leave-history" className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">
                    View all
                  </Link>
                </div>
              </div> {/* /CardHeader */}
              <div className="p-0">
                {loadingRequests ? (
                  <div className="divide-y divide-border/50">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="px-6 py-4 animate-pulse">
                        <div className="flex items-center justify-between">
                          <div className="space-y-2">
                            <div className="h-4 w-24 bg-white/5 rounded" />
                            <div className="h-3 w-40 bg-white/5 rounded" />
                          </div>
                          <div className="h-6 w-16 bg-white/5 rounded-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentRequests.length === 0 ? (
                  <div className="py-10 text-center">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-3">
                      <Inbox className="w-6 h-6 text-white/60" />
                    </div>
                    <p className="text-sm text-white/60">No leave requests yet</p>
                    <Link href="/employee/request-leave" className="text-xs text-primary font-medium mt-1 inline-block hover:underline">
                      Submit your first request
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {recentRequests.map((req) => (
                      <div key={req.id} className="px-6 py-3.5 hover:bg-white/5 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white">{req.leave_type}</span>
                              <span className="text-xs text-white/60">
                                {req.total_days} day{req.total_days !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <p className="text-xs text-white/60 mt-0.5">
                              {formatDate(req.start_date)}
                              {req.start_date !== req.end_date && ` \u2013 ${formatDate(req.end_date)}`}
                            </p>
                          </div>
                          <Badge variant={STATUS_MAP[req.status] ?? 'default'}>{req.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div> {/* /CardContent */}
            </GlassPanel>
            </TiltCard>
          </FadeIn>

          {/* Upcoming Holidays - Real data from API */}
          <FadeIn direction="up" delay={0.6}>
            <TiltCard>
            <GlassPanel className="overflow-hidden border border-white/10 shadow-md">
              <div className="p-6 border-b border-white/10 bg-white/5">
                <h3 className="text-lg font-semibold text-white">Upcoming Holidays</h3>
              </div> {/* /CardHeader */}
              <div className="p-0">
                {loadingHolidays ? (
                  <div className="divide-y divide-border/50">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="px-6 py-3.5 animate-pulse">
                        <div className="flex items-center justify-between">
                          <div className="space-y-2">
                            <div className="h-4 w-28 bg-white/5 rounded" />
                            <div className="h-3 w-20 bg-white/5 rounded" />
                          </div>
                          <div className="h-6 w-16 bg-white/5 rounded-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : holidays.length === 0 ? (
                  <div className="py-10 text-center">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-3">
                      <CalendarCheck className="w-6 h-6 text-white/60" />
                    </div>
                    <p className="text-sm text-white/60">No upcoming holidays configured</p>
                    <p className="text-xs text-white/60 mt-1">Your HR team will add holidays during setup</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {holidays.map((holiday, index) => (
                      <motion.div
                        key={holiday.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + index * 0.05 }}
                        className="flex items-center justify-between px-6 py-3.5 hover:bg-white/5 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium text-white">{holiday.name}</p>
                          <p className="text-xs text-white/60">{formatHolidayDate(holiday.date)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {holiday.is_custom && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Custom</span>
                          )}
                          <Badge variant="default">{formatHolidayDay(holiday.date)}</Badge>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div> {/* /CardContent */}
            </GlassPanel>
            </TiltCard>
          </FadeIn>
        </div>
      </div>

      <WelcomeModal tutorial={employeeTutorial} roleName="Employee" />
      <FloatingTutorialButton tutorial={employeeTutorial} />
    </StaggerContainer>
  );
}
