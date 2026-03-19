'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageLoader } from '@/components/ui/progress';
import { WelcomeModal, FloatingTutorialButton, StartTutorialButton, employeeTutorial } from '@/components/tutorial';
import { ensureMe } from '@/lib/client-auth';
import { getPusherClient, getUserChannelName } from '@/lib/pusher-client';
import { cn } from '@/lib/utils';
import {
  Plus,
  FilePlus,
  CalendarDays,
  Clock,
  FolderOpen,
  ClipboardList,
  CalendarCheck,
  ChevronRight,
  TrendingUp,
  Wifi,
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

const LEAVE_CONFIG: Record<string, { bg: string; text: string; icon: typeof TrendingUp }> = {
  CL: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', icon: TrendingUp },
  SL: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', icon: TrendingUp },
  PL: { bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-600 dark:text-violet-400', icon: TrendingUp },
  EL: { bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-600 dark:text-violet-400', icon: TrendingUp },
  WFH: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', icon: TrendingUp },
  LWP: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', icon: TrendingUp },
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
  const [userId, setUserId] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      const me = await ensureMe();
      if (!me) { router.replace('/sign-in'); return; }
      const role = me.primary_role ?? 'employee';
      if (role === 'admin' || role === 'hr') {
        router.replace('/hr/dashboard');
        return;
      }
      setUserName(me.first_name || 'User');
      setUserId(me.id);
      setPageReady(true);
    })();
  }, [router]);

  useEffect(() => {
    if (!userId) return;
    const pusher = getPusherClient();
    if (!pusher) return;
    const userChannelName = getUserChannelName(userId);
    const channel = pusher.subscribe(userChannelName);
    channelRef.current = channel;

    pusher.connection.bind('connected', () => setIsLive(true));
    pusher.connection.bind('disconnected', () => setIsLive(false));

    return () => {
      if (channelRef.current) {
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
    } finally { setLoadingBalances(false); }
  }, []);

  const loadHolidays = useCallback(async () => {
    setLoadingHolidays(true);
    try {
      const res = await fetch('/api/company/holidays', { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        setHolidays((json.holidays ?? []).slice(0, 6));
      }
    } finally { setLoadingHolidays(false); }
  }, []);

  const loadRecentRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const res = await fetch('/api/leaves/list?limit=3', { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        setRecentRequests(json.requests ?? []);
      }
    } finally { setLoadingRequests(false); }
  }, []);

  useEffect(() => {
    if (pageReady) {
      loadBalances(); loadHolidays(); loadRecentRequests();
    }
  }, [pageReady, loadBalances, loadHolidays, loadRecentRequests]);

  if (!pageReady) return <PageLoader />;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Welcome back, {userName}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <p className="text-muted-foreground">Your leave and attendance overview</p>
            <div className={cn(
              'flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
              isLive 
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                : 'bg-muted text-muted-foreground'
            )}>
              <Wifi className={cn('w-3 h-3', isLive && 'animate-pulse')} />
              {isLive ? 'Live' : 'Connecting'}
            </div>
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <StartTutorialButton tutorial={employeeTutorial} variant="outline" className="hidden md:flex" />
          <button
            onClick={() => router.push('/employee/request-leave')}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Apply Leave
          </button>
        </div>
      </div>

      {/* Leave Balance Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {loadingBalances ? (
          [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)
        ) : (
          balances.map((balance) => {
            const config = LEAVE_CONFIG[balance.leave_type] || { bg: 'bg-muted', text: 'text-muted-foreground', icon: TrendingUp };
            const percentage = Math.round((balance.remaining / balance.annual_entitlement) * 100);
            return (
              <div
                key={balance.leave_type}
                className="card p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={cn('text-xs font-semibold uppercase tracking-wide', config.text)}>
                    {balance.leave_type}
                  </span>
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', config.bg)}>
                    <config.icon className={cn('w-4 h-4', config.text)} />
                  </div>
                </div>
                <div className="text-2xl font-bold text-foreground tabular-nums">
                  {balance.remaining}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  of {balance.annual_entitlement} days
                </p>
                <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', config.bg.replace('bg-', 'bg-').replace('/20', ''))}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="card p-5">
          <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {[
              { href: '/employee/request-leave', icon: FilePlus, label: 'New Leave Request', desc: 'Apply for time off' },
              { href: '/employee/leave-history', icon: CalendarDays, label: 'Leave History', desc: 'View past requests' },
              { href: '/employee/attendance', icon: Clock, label: 'Attendance', desc: 'Check your records' },
              { href: '/employee/documents', icon: FolderOpen, label: 'Documents', desc: 'Access your files' },
            ].map((item) => (
              <Link key={item.label} href={item.href}>
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Requests */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              Recent Requests
            </h3>
            <Link href="/employee/leave-history" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          <div>
            {loadingRequests ? (
              <div className="p-5 space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : recentRequests.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                No leave requests yet
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentRequests.map((req) => (
                  <div key={req.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-10 rounded-full bg-primary/30" />
                      <div>
                        <p className="font-medium text-foreground">{req.leave_type}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(req.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} • {req.total_days} day{req.total_days !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <Badge variant={req.status === 'approved' ? 'success' : req.status === 'pending' ? 'warning' : 'danger'}>
                      {req.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Holidays */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-emerald-500" />
            Upcoming Holidays
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 divide-x divide-y divide-border">
          {holidays.map((h) => (
            <div key={h.id} className="p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="text-center min-w-[40px]">
                  <p className="text-xl font-bold text-foreground leading-none">{new Date(h.date).getDate()}</p>
                  <p className="text-xs text-muted-foreground uppercase mt-0.5">{new Date(h.date).toLocaleString('default', { month: 'short' })}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{h.name}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <WelcomeModal tutorial={employeeTutorial} roleName="Employee" />
      <FloatingTutorialButton tutorial={employeeTutorial} />
    </div>
  );
}
