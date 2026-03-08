'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SkeletonDashboard } from '@/components/ui/skeleton';
import { PageLoader } from '@/components/ui/progress';
import { StartTutorialButton, hrTutorial } from '@/components/tutorial';
import { ensureMe } from '@/lib/client-auth';
import { getPusherClient, getCompanyChannelName, type PusherEventType } from '@/lib/pusher-client';

// ----- Types -----
interface DashboardMetrics {
  totalEmployees: number;
  pendingApprovals: number;
  todayAbsent: number;
  slaBreaches: number;
  employeeChange: string;
  pendingUrgent: number;
  absentPercent: string;
  slaCritical: number;
}

interface LeaveRequestRow {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: string;
  created_at: string;
  employee: {
    id: string;
    first_name: string;
    last_name: string;
    department: string | null;
    designation: string | null;
  };
}

const STATUS_MAP: Record<string, 'warning' | 'success' | 'danger' | 'info' | 'default'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'default',
  escalated: 'info',
  draft: 'default',
};

const METRIC_CONFIG = [
  { key: 'totalEmployees' as const, label: 'Total Employees', icon: '👥', color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-500/10', textColor: 'text-blue-600 dark:text-blue-400' },
  { key: 'pendingApprovals' as const, label: 'Pending Approvals', icon: '⏳', color: 'from-amber-500 to-orange-500', bgColor: 'bg-amber-500/10', textColor: 'text-amber-600 dark:text-amber-400' },
  { key: 'todayAbsent' as const, label: 'On Leave Today', icon: '🏠', color: 'from-purple-500 to-violet-600', bgColor: 'bg-purple-500/10', textColor: 'text-purple-600 dark:text-purple-400' },
  { key: 'slaBreaches' as const, label: 'SLA Breaches', icon: '🚨', color: 'from-red-500 to-rose-600', bgColor: 'bg-red-500/10', textColor: 'text-red-600 dark:text-red-400' },
];

// ----- Animation Variants -----
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

const cardHover = {
  y: -4,
  boxShadow: '0 20px 40px -12px rgba(0,0,0,0.15)',
  transition: { type: 'spring' as const, stiffness: 400, damping: 25 },
};

export default function HRDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentRequests, setRecentRequests] = useState<LeaveRequestRow[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [userName, setUserName] = useState('');
  const [companyName, setCompanyName] = useState('');
  
  // Real-time state management
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const channelRef = useRef<any>(null);

  // Auth check
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

      if (role !== 'admin' && role !== 'hr') {
        if (role === 'manager' || role === 'team_lead' || role === 'director') {
          router.replace('/manager/dashboard');
        } else {
          router.replace('/employee/dashboard');
        }
        return;
      }

      if (role === 'admin' && !me.company?.onboarding_completed) {
        router.replace('/onboarding');
        return;
      }

      setUserName(me.first_name || 'Admin');
      setCompanyName(me.company?.name || '');
      setCompanyId(me.company?.id || null);
      setAuthChecked(true);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [router]);

  // Real-time dashboard updates via Pusher
  useEffect(() => {
    if (!companyId) return;

    const pusher = getPusherClient();
    if (!pusher) {
      console.warn('Pusher not available. Real-time updates disabled.');
      return;
    }

    // Subscribe to company-wide events
    const companyChannelName = getCompanyChannelName(companyId);
    const channel = pusher.subscribe(companyChannelName);
    channelRef.current = channel;

    pusher.connection.bind('connected', () => {
      setIsLive(true);
      console.log('HR Dashboard: Real-time updates connected');
    });

    pusher.connection.bind('disconnected', () => {
      setIsLive(false);
      console.log('HR Dashboard: Real-time updates disconnected');
    });

    // Handle real-time metric updates
    const handleMetricsUpdate = (data: any) => {
      console.log('Received metrics update:', data);
      setLastUpdated(new Date().toLocaleTimeString());
      
      if (data.type === 'pendingApprovals') {
        setMetrics(prev => prev ? ({ ...prev, pendingApprovals: data.count }) : null);
      } else if (data.type === 'employeeCount') {
        setMetrics(prev => prev ? ({ ...prev, totalEmployees: data.count }) : null);
      } else if (data.type === 'todayAbsent') {
        setMetrics(prev => prev ? ({ ...prev, todayAbsent: data.count }) : null);
      }
    };

    // Handle new leave requests
    const handleNewLeaveRequest = (data: any) => {
      console.log('New leave request:', data);
      setLastUpdated(new Date().toLocaleTimeString());
      
      // Add to recent requests if it's not already there
      setRecentRequests(prev => {
        const exists = prev.find(r => r.id === data.id);
        if (exists) return prev;
        
        const newRequest: LeaveRequestRow = {
          id: data.id,
          leave_type: data.leave_type,
          start_date: data.start_date,
          end_date: data.end_date,
          total_days: data.total_days,
          status: data.status || 'pending',
          created_at: data.created_at || new Date().toISOString(),
          employee: data.employee || {
            id: '',
            first_name: 'Unknown',
            last_name: '',
            department: null,
            designation: null,
          }
        };
        
        return [newRequest, ...prev.slice(0, 4)];
      });

      // Update pending approvals count
      if (data.status === 'pending') {
        setMetrics(prev => prev ? ({ 
          ...prev, 
          pendingApprovals: prev.pendingApprovals + 1,
          pendingUrgent: Math.min(prev.pendingApprovals + 1, 5)
        }) : null);
      }
    };

    // Handle leave request status changes
    const handleLeaveStatusUpdate = (data: any) => {
      console.log('Leave status updated:', data);
      setLastUpdated(new Date().toLocaleTimeString());
      
      // Update in recent requests
      setRecentRequests(prev => 
        prev.map(req => 
          req.id === data.id 
            ? { ...req, status: data.status }
            : req
        )
      );

      // Update metrics if this affects pending count
      if (data.oldStatus === 'pending' && data.status !== 'pending') {
        setMetrics(prev => prev ? ({ 
          ...prev, 
          pendingApprovals: Math.max(0, prev.pendingApprovals - 1),
          pendingUrgent: Math.max(0, Math.min(prev.pendingApprovals - 1, 5))
        }) : null);
      }
    };

    // Bind to real-time events
    channel.bind('leave-request-submitted', handleNewLeaveRequest);
    channel.bind('leave-request-approved', handleLeaveStatusUpdate);
    channel.bind('leave-request-rejected', handleLeaveStatusUpdate);
    channel.bind('metrics-updated', handleMetricsUpdate);
    channel.bind('employee-joined', handleMetricsUpdate);
    channel.bind('employee-left', handleMetricsUpdate);

    return () => {
      if (channelRef.current) {
        channelRef.current.unbind('leave-request-submitted', handleNewLeaveRequest);
        channelRef.current.unbind('leave-request-approved', handleLeaveStatusUpdate);
        channelRef.current.unbind('leave-request-rejected', handleLeaveStatusUpdate);
        channelRef.current.unbind('metrics-updated', handleMetricsUpdate);
        channelRef.current.unbind('employee-joined', handleMetricsUpdate);
        channelRef.current.unbind('employee-left', handleMetricsUpdate);
        pusher.unsubscribe(companyChannelName);
      }
    };
  }, [companyId]);

  // Fetch real metrics
  const fetchMetrics = useCallback(async () => {
    setLoadingMetrics(true);
    try {
      // Fetch employees count and pending leave requests in parallel
      const [empRes, pendingRes, todayRes, slaRes] = await Promise.all([
        fetch('/api/employees?limit=1', { credentials: 'include' }),
        fetch('/api/leaves/list?status=pending&limit=1', { credentials: 'include' }),
        fetch('/api/leaves/list?status=approved&limit=100', { credentials: 'include' }),
        fetch(`/api/reports/leave-summary?year=${new Date().getFullYear()}`, { credentials: 'include' }),
      ]);

      let totalEmployees = 0;
      let pendingApprovals = 0;
      let todayAbsent = 0;
      let slaBreaches = 0;

      if (empRes.ok) {
        const empData = await empRes.json();
        totalEmployees = empData.pagination?.total ?? 0;
      }

      if (pendingRes.ok) {
        const pendingData = await pendingRes.json();
        pendingApprovals = pendingData.pagination?.total ?? 0;
      }

      if (todayRes.ok) {
        const todayData = await todayRes.json();
        const today = new Date().toISOString().split('T')[0];
        todayAbsent = (todayData.requests ?? []).filter((r: LeaveRequestRow) => {
          const start = r.start_date?.split('T')[0];
          const end = r.end_date?.split('T')[0];
          return start <= today && end >= today;
        }).length;
      }

      if (slaRes.ok) {
        const slaData = await slaRes.json();
        slaBreaches = slaData.sla_breaches ?? 0;
      }

      setMetrics({
        totalEmployees,
        pendingApprovals,
        todayAbsent,
        slaBreaches,
        employeeChange: totalEmployees > 0 ? `${totalEmployees} active` : 'No employees yet',
        pendingUrgent: Math.min(pendingApprovals, 5),
        absentPercent: totalEmployees > 0 ? `${((todayAbsent / totalEmployees) * 100).toFixed(1)}% of workforce` : '0%',
        slaCritical: slaBreaches,
      });
    } catch {
      setMetrics({
        totalEmployees: 0,
        pendingApprovals: 0,
        todayAbsent: 0,
        slaBreaches: 0,
        employeeChange: 'Unable to load',
        pendingUrgent: 0,
        absentPercent: '—',
        slaCritical: 0,
      });
    } finally {
      setLoadingMetrics(false);
    }
  }, []);

  // Fetch real recent requests
  const fetchRecentRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const res = await fetch('/api/leaves/list?limit=5', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setRecentRequests(data.requests ?? []);
      }
    } catch {
      setRecentRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    if (authChecked) {
      fetchMetrics();
      fetchRecentRequests();
    }
  }, [authChecked, fetchMetrics, fetchRecentRequests]);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    });
  }

  function getMetricSubtext(key: string): string {
    if (!metrics) return '';
    switch (key) {
      case 'totalEmployees': return metrics.employeeChange;
      case 'pendingApprovals': return metrics.pendingUrgent > 0 ? `${metrics.pendingUrgent} need attention` : 'All clear';
      case 'todayAbsent': return metrics.absentPercent;
      case 'slaBreaches': return metrics.slaCritical > 0 ? `${metrics.slaCritical} critical` : 'No breaches';
      default: return '';
    }
  }

  if (!authChecked || loading) {
    return (
      <>
        <PageLoader />
        <SkeletonDashboard />
      </>
    );
  }

  return (
    <motion.div
      className="space-y-8"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Enhanced Header with Live Status */}
      <motion.div
        className="flex items-center justify-between"
        variants={itemVariants}
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {userName}
          </h1>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-muted-foreground">
              {companyName ? `${companyName} — ` : ''}Overview of your organization&apos;s leave management
            </p>
            {/* Live status indicator */}
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span className="text-muted-foreground">
                {isLive ? 'Live' : 'Connecting...'}
              </span>
              {lastUpdated && isLive && (
                <span className="text-xs text-muted-foreground">
                  • Updated {lastUpdated}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StartTutorialButton tutorial={hrTutorial} variant="outline" className="text-xs px-3 py-1.5" />
          <Link
            href="/hr/leave-requests"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
          >
            <span>📋</span>
            <span>Review Requests</span>
          </Link>
        </div>
      </motion.div>

      {/* Metrics Cards */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={containerVariants}
      >
        {METRIC_CONFIG.map((metric, index) => (
          <motion.div
            key={metric.key}
            variants={itemVariants}
            whileHover={cardHover}
            className="group"
          >
            <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-xl transition-shadow">
              {/* Gradient accent line */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${metric.color}`} />
              <CardContent className="pt-6 pb-5">
                {loadingMetrics ? (
                  <div className="space-y-3 animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-24 bg-muted rounded" />
                      <div className="h-10 w-10 bg-muted rounded-xl" />
                    </div>
                    <div className="h-8 w-16 bg-muted rounded" />
                    <div className="h-3 w-32 bg-muted rounded" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
                      <div className={`h-10 w-10 rounded-xl ${metric.bgColor} flex items-center justify-center text-lg group-hover:scale-110 transition-transform`}>
                        {metric.icon}
                      </div>
                    </div>
                    <motion.p
                      className={`text-3xl font-bold ${metric.textColor}`}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', delay: index * 0.1 + 0.3 }}
                    >
                      {metrics?.[metric.key] ?? 0}
                    </motion.p>
                    <p className="text-xs text-muted-foreground">
                      {getMetricSubtext(metric.key)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Leave Requests - Real data */}
        <motion.div className="lg:col-span-2" variants={itemVariants}>
          <Card className="overflow-hidden border-0 shadow-md">
            <CardHeader className="border-b border-border/50 bg-muted/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent Leave Requests</CardTitle>
                <Link
                  href="/hr/leave-requests"
                  className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  View all →
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingRequests ? (
                <div className="divide-y divide-border/50">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="px-6 py-4 animate-pulse">
                      <div className="flex items-center gap-4">
                        <div className="h-9 w-9 bg-muted rounded-full" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-32 bg-muted rounded" />
                          <div className="h-3 w-48 bg-muted rounded" />
                        </div>
                        <div className="h-6 w-16 bg-muted rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentRequests.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-sm text-muted-foreground">No leave requests yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Requests will appear here once employees submit them</p>
                </div>
              ) : (
                <motion.div
                  className="divide-y divide-border/50"
                  initial="hidden"
                  animate="visible"
                  variants={containerVariants}
                >
                  {recentRequests.map((req) => (
                    <motion.div
                      key={req.id}
                      variants={itemVariants}
                      className="px-6 py-4 hover:bg-muted/30 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-xs font-semibold text-primary shrink-0 group-hover:scale-105 transition-transform">
                          {req.employee.first_name?.[0]}{req.employee.last_name?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground truncate">
                              {req.employee.first_name} {req.employee.last_name}
                            </p>
                            <span className="text-xs text-muted-foreground">
                              · {req.leave_type}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDate(req.start_date)}
                            {req.start_date !== req.end_date && ` – ${formatDate(req.end_date)}`}
                            {' · '}
                            {req.total_days} day{req.total_days !== 1 ? 's' : ''}
                            {req.employee.department && ` · ${req.employee.department}`}
                          </p>
                        </div>
                        <Badge variant={STATUS_MAP[req.status] ?? 'default'}>
                          {req.status}
                        </Badge>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden border-0 shadow-md">
            <CardHeader className="border-b border-border/50 bg-muted/30">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {[
                { href: '/hr/employees', icon: '👥', label: 'Manage Employees', sub: 'View & manage team', gradient: 'from-blue-500/10 to-cyan-500/10' },
                { href: '/hr/leave-requests', icon: '📋', label: 'Review Requests', sub: `${metrics?.pendingApprovals ?? 0} pending`, gradient: 'from-amber-500/10 to-orange-500/10' },
                { href: '/hr/reports', icon: '📊', label: 'Generate Report', sub: 'Leave analytics', gradient: 'from-purple-500/10 to-violet-500/10' },
                { href: '/hr/policy-settings', icon: '⚙️', label: 'Policy Settings', sub: 'Configure leave rules', gradient: 'from-emerald-500/10 to-green-500/10' },
                { href: '/hr/attendance', icon: '🕐', label: 'Attendance', sub: 'Track attendance', gradient: 'from-rose-500/10 to-pink-500/10' },
                { href: '/hr/payroll', icon: '💰', label: 'Payroll', sub: 'Run payroll', gradient: 'from-indigo-500/10 to-blue-500/10' },
              ].map((item, index) => (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.06 }}
                >
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r ${item.gradient} border border-border/30 hover:border-primary/30 hover:shadow-sm transition-all group`}
                  >
                    <span className="text-lg group-hover:scale-110 transition-transform">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.sub}</p>
                    </div>
                    <svg className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
