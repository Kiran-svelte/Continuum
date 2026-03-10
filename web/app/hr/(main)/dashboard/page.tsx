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
import {
  type LucideIcon,
  Users,
  Clock,
  Home,
  AlertTriangle,
  ClipboardList,
  BarChart3,
  Settings,
  Wallet,
  Inbox,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Activity,
  Building2,
  Shield,
  UserCheck,
} from 'lucide-react';

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

interface LeaveTrendMonth {
  label: string;
  approved: number;
  rejected: number;
  pending: number;
  total: number;
}

interface SLABreachRequest {
  id: string;
  employee_name: string;
  department: string | null;
  leave_type: string;
  created_at: string;
  hours_waiting: number;
}

interface DepartmentRow {
  name: string;
  headcount: number;
  onLeave: number;
  attendanceRate: string;
}

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  actorName: string;
  createdAt: string;
}

const STATUS_MAP: Record<string, 'warning' | 'success' | 'danger' | 'info' | 'default'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'default',
  escalated: 'info',
  draft: 'default',
};

const METRIC_CONFIG: {
  key: keyof Pick<DashboardMetrics, 'totalEmployees' | 'pendingApprovals' | 'todayAbsent' | 'slaBreaches'>;
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  textColor: string;
  iconColor: string;
}[] = [
  { key: 'totalEmployees', label: 'Total Employees', icon: Users, color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-500/10', textColor: 'text-blue-600 dark:text-blue-400', iconColor: 'text-blue-600 dark:text-blue-400' },
  { key: 'pendingApprovals', label: 'Pending Approvals', icon: Clock, color: 'from-amber-500 to-orange-500', bgColor: 'bg-amber-500/10', textColor: 'text-amber-600 dark:text-amber-400', iconColor: 'text-amber-600 dark:text-amber-400' },
  { key: 'todayAbsent', label: 'On Leave Today', icon: Home, color: 'from-purple-500 to-violet-600', bgColor: 'bg-purple-500/10', textColor: 'text-purple-600 dark:text-purple-400', iconColor: 'text-purple-600 dark:text-purple-400' },
  { key: 'slaBreaches', label: 'SLA Breaches', icon: AlertTriangle, color: 'from-red-500 to-rose-600', bgColor: 'bg-red-500/10', textColor: 'text-red-600 dark:text-red-400', iconColor: 'text-red-600 dark:text-red-400' },
];

const QUICK_ACTIONS: {
  href: string;
  icon: LucideIcon;
  label: string;
  sub: string | ((metrics: DashboardMetrics | null) => string);
  gradient: string;
  iconColor: string;
}[] = [
  { href: '/hr/employees', icon: Users, label: 'Manage Employees', sub: 'View & manage team', gradient: 'from-blue-500/10 to-cyan-500/10', iconColor: 'text-blue-600 dark:text-blue-400' },
  { href: '/hr/leave-requests', icon: ClipboardList, label: 'Review Requests', sub: (m) => `${m?.pendingApprovals ?? 0} pending`, gradient: 'from-amber-500/10 to-orange-500/10', iconColor: 'text-amber-600 dark:text-amber-400' },
  { href: '/hr/reports', icon: BarChart3, label: 'Generate Report', sub: 'Leave analytics', gradient: 'from-purple-500/10 to-violet-500/10', iconColor: 'text-purple-600 dark:text-purple-400' },
  { href: '/hr/policy-settings', icon: Settings, label: 'Policy Settings', sub: 'Configure leave rules', gradient: 'from-emerald-500/10 to-green-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
  { href: '/hr/attendance', icon: Clock, label: 'Attendance', sub: 'Track attendance', gradient: 'from-rose-500/10 to-pink-500/10', iconColor: 'text-rose-600 dark:text-rose-400' },
  { href: '/hr/payroll', icon: Wallet, label: 'Payroll', sub: 'Run payroll', gradient: 'from-indigo-500/10 to-blue-500/10', iconColor: 'text-indigo-600 dark:text-indigo-400' },
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

  // New widget states
  const [leaveTrend, setLeaveTrend] = useState<LeaveTrendMonth[]>([]);
  const [loadingTrend, setLoadingTrend] = useState(true);
  const [slaBreaches, setSlaBreaches] = useState<SLABreachRequest[]>([]);
  const [loadingSla, setLoadingSla] = useState(true);
  const [showSlaList, setShowSlaList] = useState(false);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [activityFeed, setActivityFeed] = useState<AuditEntry[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);

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
        absentPercent: '--',
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

  // Fetch leave trend for the last 6 months
  const fetchLeaveTrend = useCallback(async () => {
    setLoadingTrend(true);
    try {
      const now = new Date();
      const months: LeaveTrendMonth[] = [];
      const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      // Fetch all leave requests for the current year
      const res = await fetch(`/api/leaves/list?limit=100&year=${now.getFullYear()}`, { credentials: 'include' });
      if (!res.ok) { setLoadingTrend(false); return; }
      const data = await res.json();
      const requests: LeaveRequestRow[] = data.requests ?? [];

      // Build trend for last 6 months
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthIdx = d.getMonth();
        const yearNum = d.getFullYear();
        const label = monthLabels[monthIdx];

        const inMonth = requests.filter((r) => {
          const created = new Date(r.created_at);
          return created.getMonth() === monthIdx && created.getFullYear() === yearNum;
        });

        months.push({
          label,
          approved: inMonth.filter((r) => r.status === 'approved').length,
          rejected: inMonth.filter((r) => r.status === 'rejected').length,
          pending: inMonth.filter((r) => r.status === 'pending').length,
          total: inMonth.length,
        });
      }

      setLeaveTrend(months);
    } catch {
      setLeaveTrend([]);
    } finally {
      setLoadingTrend(false);
    }
  }, []);

  // Fetch SLA breach data (pending requests > 48 hours old)
  const fetchSlaBreaches = useCallback(async () => {
    setLoadingSla(true);
    try {
      const res = await fetch('/api/leaves/list?status=pending&limit=100', { credentials: 'include' });
      if (!res.ok) { setLoadingSla(false); return; }
      const data = await res.json();
      const pending: LeaveRequestRow[] = data.requests ?? [];
      const now = Date.now();
      const SLA_MS = 48 * 60 * 60 * 1000; // 48 hours

      const breaches: SLABreachRequest[] = pending
        .filter((r) => now - new Date(r.created_at).getTime() > SLA_MS)
        .map((r) => ({
          id: r.id,
          employee_name: `${r.employee.first_name} ${r.employee.last_name}`,
          department: r.employee.department,
          leave_type: r.leave_type,
          created_at: r.created_at,
          hours_waiting: Math.round((now - new Date(r.created_at).getTime()) / (60 * 60 * 1000)),
        }))
        .sort((a, b) => b.hours_waiting - a.hours_waiting);

      setSlaBreaches(breaches);
    } catch {
      setSlaBreaches([]);
    } finally {
      setLoadingSla(false);
    }
  }, []);

  // Fetch department summary
  const fetchDepartments = useCallback(async () => {
    setLoadingDepts(true);
    try {
      const [empRes, leaveRes] = await Promise.all([
        fetch('/api/employees?limit=100', { credentials: 'include' }),
        fetch('/api/leaves/list?status=approved&limit=100', { credentials: 'include' }),
      ]);

      if (!empRes.ok) { setLoadingDepts(false); return; }

      const empData = await empRes.json();
      const employees: { department: string | null; status: string }[] = empData.employees ?? [];

      const today = new Date().toISOString().split('T')[0];
      let onLeaveByDept: Record<string, number> = {};

      if (leaveRes.ok) {
        const leaveData = await leaveRes.json();
        const approved: LeaveRequestRow[] = leaveData.requests ?? [];
        // Count employees currently on leave per department
        for (const r of approved) {
          const start = r.start_date?.split('T')[0];
          const end = r.end_date?.split('T')[0];
          if (start <= today && end >= today) {
            const dept = r.employee.department || 'Unassigned';
            onLeaveByDept[dept] = (onLeaveByDept[dept] || 0) + 1;
          }
        }
      }

      // Group employees by department
      const deptMap: Record<string, number> = {};
      for (const emp of employees) {
        if (emp.status === 'active') {
          const dept = emp.department || 'Unassigned';
          deptMap[dept] = (deptMap[dept] || 0) + 1;
        }
      }

      const rows: DepartmentRow[] = Object.entries(deptMap)
        .map(([name, headcount]) => {
          const onLeave = onLeaveByDept[name] || 0;
          const present = headcount - onLeave;
          const rate = headcount > 0 ? ((present / headcount) * 100).toFixed(0) : '0';
          return { name, headcount, onLeave, attendanceRate: `${rate}%` };
        })
        .sort((a, b) => b.headcount - a.headcount);

      setDepartments(rows);
    } catch {
      setDepartments([]);
    } finally {
      setLoadingDepts(false);
    }
  }, []);

  // Fetch recent audit log activity
  const fetchActivity = useCallback(async () => {
    setLoadingActivity(true);
    try {
      const res = await fetch('/api/audit-logs?limit=10', { credentials: 'include' });
      if (!res.ok) { setLoadingActivity(false); return; }
      const data = await res.json();
      const logs: AuditEntry[] = (data.logs ?? []).map((log: any) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        actorName: log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : 'System',
        createdAt: log.createdAt,
      }));
      setActivityFeed(logs);
    } catch {
      setActivityFeed([]);
    } finally {
      setLoadingActivity(false);
    }
  }, []);

  useEffect(() => {
    if (authChecked) {
      fetchMetrics();
      fetchRecentRequests();
      fetchLeaveTrend();
      fetchSlaBreaches();
      fetchDepartments();
      fetchActivity();
    }
  }, [authChecked, fetchMetrics, fetchRecentRequests, fetchLeaveTrend, fetchSlaBreaches, fetchDepartments, fetchActivity]);

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

  // Helper: human-readable audit action label
  function formatAuditAction(action: string): string {
    return action
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // Helper: icon for audit action category
  function getAuditIcon(action: string): LucideIcon {
    if (action.startsWith('LEAVE')) return ClipboardList;
    if (action.startsWith('EMPLOYEE')) return Users;
    if (action.startsWith('ATTENDANCE')) return Clock;
    if (action.startsWith('PAYROLL')) return Wallet;
    if (action.startsWith('COMPANY') || action.startsWith('ORG_UNIT')) return Building2;
    if (action.startsWith('LOGIN') || action.startsWith('LOGOUT') || action.startsWith('OTP') || action.startsWith('PERMISSION') || action.startsWith('API_KEY')) return Shield;
    return Activity;
  }

  // Helper: relative time string
  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  // Helper: max value in trend for scaling
  const trendMax = Math.max(1, ...leaveTrend.map((m) => m.total));

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
                  Updated {lastUpdated}
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
            <ClipboardList className="w-4 h-4" />
            <span>Review Requests</span>
          </Link>
        </div>
      </motion.div>

      {/* Metrics Cards */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={containerVariants}
      >
        {METRIC_CONFIG.map((metric, index) => {
          const MetricIcon = metric.icon;
          return (
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
                        <div className={`w-10 h-10 rounded-xl ${metric.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <MetricIcon className={`w-5 h-5 ${metric.iconColor}`} />
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
          );
        })}
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
                  <div className="flex justify-center mb-3">
                    <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center">
                      <Inbox className="w-6 h-6 text-muted-foreground" />
                    </div>
                  </div>
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
              {QUICK_ACTIONS.map((item, index) => {
                const ActionIcon = item.icon;
                const subText = typeof item.sub === 'function' ? item.sub(metrics) : item.sub;
                return (
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
                      <div className="w-10 h-10 rounded-xl bg-background/60 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ActionIcon className={`w-5 h-5 ${item.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{subText}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </Link>
                  </motion.div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ================================================================ */}
      {/*  Leave Trend Chart (last 6 months, pure CSS bar chart)          */}
      {/* ================================================================ */}
      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden border-0 shadow-md">
          <CardHeader className="border-b border-border/50 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <CardTitle className="text-base">Leave Trend (Last 6 Months)</CardTitle>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  Approved
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                  Rejected
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                  Pending
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 pb-4">
            {loadingTrend ? (
              <div className="flex items-end gap-3 h-40 animate-pulse">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <div className="w-full bg-muted rounded-t" style={{ height: `${20 + i * 10}%` }} />
                    <div className="h-3 w-8 bg-muted rounded" />
                  </div>
                ))}
              </div>
            ) : leaveTrend.length === 0 || leaveTrend.every((m) => m.total === 0) ? (
              <div className="py-10 text-center">
                <TrendingUp className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">No trend data available yet</p>
              </div>
            ) : (
              <div className="flex items-end gap-3 h-44">
                {leaveTrend.map((month, i) => {
                  const barHeight = month.total > 0 ? Math.max(8, (month.total / trendMax) * 100) : 4;
                  const approvedPct = month.total > 0 ? (month.approved / month.total) * 100 : 0;
                  const rejectedPct = month.total > 0 ? (month.rejected / month.total) * 100 : 0;
                  const pendingPct = month.total > 0 ? (month.pending / month.total) * 100 : 0;
                  return (
                    <motion.div
                      key={month.label}
                      className="flex-1 flex flex-col items-center justify-end h-full gap-1 group"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + i * 0.06 }}
                    >
                      {month.total > 0 && (
                        <span className="text-[10px] font-medium text-muted-foreground tabular-nums opacity-0 group-hover:opacity-100 transition-opacity">
                          {month.total}
                        </span>
                      )}
                      <div
                        className="w-full max-w-[48px] rounded-t-md overflow-hidden flex flex-col-reverse transition-all group-hover:scale-x-105"
                        style={{ height: `${barHeight}%` }}
                        title={`${month.label}: ${month.approved} approved, ${month.rejected} rejected, ${month.pending} pending`}
                      >
                        {month.total > 0 ? (
                          <>
                            <div
                              className="w-full bg-emerald-500 dark:bg-emerald-400 transition-all"
                              style={{ height: `${approvedPct}%` }}
                            />
                            <div
                              className="w-full bg-red-500 dark:bg-red-400 transition-all"
                              style={{ height: `${rejectedPct}%` }}
                            />
                            <div
                              className="w-full bg-amber-500 dark:bg-amber-400 transition-all"
                              style={{ height: `${pendingPct}%` }}
                            />
                          </>
                        ) : (
                          <div className="w-full h-full bg-muted/60 rounded-t-md" />
                        )}
                      </div>
                      <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                        {month.label}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ================================================================ */}
      {/*  SLA Alert + Department Summary row                              */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SLA Alert Widget */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden border-0 shadow-md h-full">
            <CardHeader className="border-b border-border/50 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <CardTitle className="text-base">SLA Alerts</CardTitle>
                  {!loadingSla && slaBreaches.length > 0 && (
                    <Badge variant="danger" className="ml-1">
                      {slaBreaches.length}
                    </Badge>
                  )}
                </div>
                {slaBreaches.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowSlaList(!showSlaList)}
                    className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    {showSlaList ? 'Hide' : 'Show'} details
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4 pb-4">
              {loadingSla ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 w-48 bg-muted rounded" />
                  <div className="h-3 w-36 bg-muted rounded" />
                  <div className="h-3 w-40 bg-muted rounded" />
                </div>
              ) : slaBreaches.length === 0 ? (
                <div className="py-6 text-center">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto">
                    <UserCheck className="w-5 h-5 text-emerald-500" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">All requests within SLA</p>
                  <p className="text-xs text-muted-foreground mt-0.5">No pending requests older than 48 hours</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    <p className="text-sm text-red-700 dark:text-red-300">
                      <span className="font-semibold">{slaBreaches.length}</span> pending request{slaBreaches.length !== 1 ? 's' : ''} waiting over 48 hours
                    </p>
                  </div>

                  {showSlaList && (
                    <motion.div
                      className="space-y-2"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.2 }}
                    >
                      {slaBreaches.slice(0, 5).map((req) => (
                        <div
                          key={req.id}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{req.employee_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {req.leave_type}{req.department ? ` - ${req.department}` : ''}
                            </p>
                          </div>
                          <Badge variant="danger" className="shrink-0 ml-2">
                            {req.hours_waiting}h
                          </Badge>
                        </div>
                      ))}
                      {slaBreaches.length > 5 && (
                        <p className="text-xs text-muted-foreground text-center">
                          +{slaBreaches.length - 5} more
                        </p>
                      )}
                    </motion.div>
                  )}

                  <Link
                    href="/hr/leave-requests"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    Review pending requests
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Department Summary Widget */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden border-0 shadow-md h-full">
            <CardHeader className="border-b border-border/50 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  <CardTitle className="text-base">Department Summary</CardTitle>
                </div>
                <Link
                  href="/hr/employees"
                  className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  View all →
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-4 pb-4">
              {loadingDepts ? (
                <div className="space-y-3 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="h-4 w-24 bg-muted rounded" />
                      <div className="flex gap-4">
                        <div className="h-4 w-8 bg-muted rounded" />
                        <div className="h-4 w-8 bg-muted rounded" />
                        <div className="h-4 w-12 bg-muted rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : departments.length === 0 ? (
                <div className="py-6 text-center">
                  <Building2 className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                  <p className="text-sm text-muted-foreground mt-2">No department data available</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {/* Table header */}
                  <div className="grid grid-cols-4 gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <span>Department</span>
                    <span className="text-center">Headcount</span>
                    <span className="text-center">On Leave</span>
                    <span className="text-right">Att. Rate</span>
                  </div>
                  {departments.slice(0, 6).map((dept, i) => (
                    <motion.div
                      key={dept.name}
                      className="grid grid-cols-4 gap-2 px-2 py-2 rounded-lg hover:bg-muted/30 transition-colors items-center"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.04 }}
                    >
                      <span className="text-sm font-medium text-foreground truncate" title={dept.name}>
                        {dept.name}
                      </span>
                      <span className="text-sm text-foreground text-center tabular-nums">
                        {dept.headcount}
                      </span>
                      <span className="text-center">
                        {dept.onLeave > 0 ? (
                          <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                            {dept.onLeave}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">0</span>
                        )}
                      </span>
                      <span className={`text-sm font-medium text-right tabular-nums ${
                        parseInt(dept.attendanceRate) >= 90
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : parseInt(dept.attendanceRate) >= 70
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-red-600 dark:text-red-400'
                      }`}>
                        {dept.attendanceRate}
                      </span>
                    </motion.div>
                  ))}
                  {departments.length > 6 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">
                      +{departments.length - 6} more departments
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ================================================================ */}
      {/*  Recent Activity Feed                                            */}
      {/* ================================================================ */}
      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden border-0 shadow-md">
          <CardHeader className="border-b border-border/50 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                <CardTitle className="text-base">Recent Activity</CardTitle>
              </div>
              <Link
                href="/hr/audit-logs"
                className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
              >
                View all →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingActivity ? (
              <div className="divide-y divide-border/50">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="px-6 py-3 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-muted rounded-lg" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 w-44 bg-muted rounded" />
                        <div className="h-3 w-24 bg-muted rounded" />
                      </div>
                      <div className="h-3 w-12 bg-muted rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activityFeed.length === 0 ? (
              <div className="py-12 text-center">
                <Activity className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">No recent activity</p>
                <p className="text-xs text-muted-foreground mt-0.5">Audit log entries will appear here</p>
              </div>
            ) : (
              <motion.div
                className="divide-y divide-border/50"
                initial="hidden"
                animate="visible"
                variants={containerVariants}
              >
                {activityFeed.map((entry) => {
                  const Icon = getAuditIcon(entry.action);
                  return (
                    <motion.div
                      key={entry.id}
                      variants={itemVariants}
                      className="px-6 py-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {/* Action icon */}
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate">
                            <span className="font-medium">{entry.actorName}</span>
                            {' '}
                            <span className="text-muted-foreground">
                              {formatAuditAction(entry.action).toLowerCase()}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {entry.entityType}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                          {timeAgo(entry.createdAt)}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
