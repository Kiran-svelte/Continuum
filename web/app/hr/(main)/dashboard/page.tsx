'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StartTutorialButton, hrTutorial } from '@/components/tutorial';
import { ensureMe } from '@/lib/client-auth';
import { getPusherClient } from '@/lib/pusher-client';
import { cn } from '@/lib/utils';
import {
  type LucideIcon,
  Users,
  Clock,
  Home,
  AlertTriangle,
  ClipboardList,
  BarChart3,
  Settings,
  ChevronRight,
  TrendingUp,
  Activity,
  Wifi,
  Loader2,
  Zap,
} from 'lucide-react';

interface DashboardMetrics {
  totalEmployees: number;
  pendingApprovals: number;
  todayAbsent: number;
  slaBreaches: number;
}

const METRIC_CONFIG = [
  { key: 'totalEmployees', label: 'Total Employees', icon: Users, bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' },
  { key: 'pendingApprovals', label: 'Pending Approvals', icon: Clock, bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400' },
  { key: 'todayAbsent', label: 'Absent Today', icon: Home, bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-600 dark:text-violet-400' },
  { key: 'slaBreaches', label: 'SLA Breaches', icon: AlertTriangle, bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400' },
];

export default function HRDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [activityFeed, setActivityFeed] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [metricsRes, requestsRes, activityRes] = await Promise.all([
        fetch('/api/hr/dashboard/metrics'),
        fetch('/api/leaves/list?limit=5'),
        fetch('/api/audit-logs?limit=10'),
      ]);
      if (metricsRes.ok) setMetrics(await metricsRes.json());
      if (requestsRes.ok) setRecentRequests((await requestsRes.json()).requests ?? []);
      if (activityRes.ok) setActivityFeed((await activityRes.json()).logs ?? []);
    } catch (e) {
      setError('Teleportation of data failed.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    ensureMe().then(me => {
      if (!me) { router.replace('/sign-in'); return; }
      setUserName(me.first_name || 'Admin');
      setCompanyId(me.company?.id || null);
      fetchData();
    });
  }, [router, fetchData]);

  useEffect(() => {
    if (!companyId) return;
    const pusher = getPusherClient();
    if (!pusher) return;
    const channel = pusher.subscribe(`private-company-${companyId}`);
    pusher.connection.bind('connected', () => setIsLive(true));
    pusher.connection.bind('disconnected', () => setIsLive(false));
    channel.bind('dashboard-update', fetchData);
    return () => { channel.unbind_all(); pusher.unsubscribe(`private-company-${companyId}`); };
  }, [companyId, fetchData]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
      <p className="text-muted-foreground">Loading dashboard...</p>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">HR Dashboard</h1>
          <div className="flex items-center gap-3 mt-2">
            <p className="text-muted-foreground">Welcome back, {userName}</p>
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
        <div className="flex items-center gap-3">
          <StartTutorialButton tutorial={hrTutorial} />
          <button
            onClick={() => router.push('/hr/leave-requests')}
            className="btn-primary flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Review Requests
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {METRIC_CONFIG.map((config) => (
          <div key={config.key} className="card p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">{config.label}</p>
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', config.bg)}>
                <config.icon className={cn('w-5 h-5', config.text)} />
              </div>
            </div>
            <div className="text-3xl font-bold text-foreground tabular-nums">
              {metrics?.[config.key as keyof DashboardMetrics] ?? 0}
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Requests */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              Recent Leave Requests
            </h3>
            <Link href="/hr/leave-requests" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          <div>
            {recentRequests.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                No pending requests
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentRequests.map(req => (
                  <div key={req.id} className="p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                      {req.employee?.first_name?.[0]}{req.employee?.last_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{req.employee?.first_name} {req.employee?.last_name}</p>
                        <Badge variant="outline" className="text-xs">{req.leave_type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(req.start_date).toLocaleDateString()} • {req.total_days} day{req.total_days !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="hidden sm:flex">
                      Review
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card p-5">
          <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {[
              { href: '/hr/employees', icon: Users, label: 'Employees', desc: 'Manage workforce' },
              { href: '/hr/leave-requests', icon: ClipboardList, label: 'Leave Requests', desc: 'Review pending' },
              { href: '/hr/reports', icon: BarChart3, label: 'Reports', desc: 'View analytics' },
              { href: '/hr/policy-settings', icon: Settings, label: 'Policies', desc: 'Configure rules' },
            ].map((item) => (
              <Link key={item.href} href={item.href}>
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <item.icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
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
      </div>

      {/* Activity Feed */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-violet-500" />
            Recent Activity
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-x divide-y divide-border">
          {activityFeed.slice(0, 8).map((a) => (
            <div key={a.id} className="p-4 hover:bg-muted/30 transition-colors">
              <p className="text-xs font-medium text-primary uppercase tracking-wide mb-1">{a.action?.replace(/_/g, ' ')}</p>
              <p className="text-sm font-semibold text-foreground truncate">{a.actorName}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(a.createdAt).toLocaleDateString()} at {new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
