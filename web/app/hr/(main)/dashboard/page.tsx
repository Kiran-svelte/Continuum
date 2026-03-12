'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { TiltCard, FadeIn, StaggerContainer, AmbientBackground } from '@/components/motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StartTutorialButton, hrTutorial } from '@/components/tutorial';
import { ensureMe } from '@/lib/client-auth';
import { getPusherClient } from '@/lib/pusher-client';
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
  Loader,
  ServerCrash,
  Wifi,
  WifiOff,
} from 'lucide-react';

// --- Types ---
interface DashboardMetrics {
  totalEmployees: number;
  pendingApprovals: number;
  todayAbsent: number;
  slaBreaches: number;
}
interface LeaveRequestRow {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  status: string;
  employee: { first_name: string; last_name: string; };
}
interface LeaveTrendMonth {
  label: string;
  total: number;
}
interface SLABreachRequest {
  id: string;
  employee_name: string;
  hours_waiting: number;
}
interface DepartmentRow {
  name: string;
  headcount: number;
  attendanceRate: string;
}
interface AuditEntry {
  id: string;
  action: string;
  actorName: string;
  createdAt: string;
}

// --- Constants ---
const METRIC_CONFIG = [
  { key: 'totalEmployees', label: 'Total Employees', icon: Users, color: 'from-blue-400 to-blue-600' },
  { key: 'pendingApprovals', label: 'Pending Approvals', icon: Clock, color: 'from-amber-400 to-orange-500' },
  { key: 'todayAbsent', label: 'On Leave Today', icon: Home, color: 'from-purple-400 to-violet-500' },
  { key: 'slaBreaches', label: 'SLA Breaches', icon: AlertTriangle, color: 'from-red-400 to-rose-500' },
];
const QUICK_ACTIONS = [
  { href: '/hr/employees', icon: Users, label: 'Manage Employees', gradient: 'from-blue-500/10 to-cyan-500/10' },
  { href: '/hr/leave-requests', icon: ClipboardList, label: 'Review Requests', gradient: 'from-amber-500/10 to-orange-500/10' },
  { href: '/hr/reports', icon: BarChart3, label: 'Generate Report', gradient: 'from-purple-500/10 to-violet-500/10' },
  { href: '/hr/policy-settings', icon: Settings, label: 'Policy Settings', gradient: 'from-emerald-500/10 to-green-500/10' },
];

// --- Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 100, damping: 12 } },
};

// --- Skeleton & Error Components ---
function DashboardSkeleton() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div className="w-64 h-10 bg-gray-700/50 rounded-lg animate-pulse" />
        <div className="w-32 h-12 bg-gray-700/50 rounded-xl animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => <div key={i} className="h-36 bg-gray-800/60 rounded-2xl animate-pulse" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-96 bg-gray-800/60 rounded-2xl animate-pulse" />
        <div className="h-96 bg-gray-800/60 rounded-2xl animate-pulse" />
      </div>
    </div>
  );
}

function DashboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-200px)] text-center p-4">
      <FadeIn>
        <div className="glass-panel p-8 max-w-md w-full">
          <ServerCrash className="w-16 h-16 text-red-400 mx-auto" />
          <h2 className="mt-4 text-2xl font-bold text-red-300">Dashboard Unavailable</h2>
          <p className="mt-2 text-sm text-slate-400">Could not load dashboard data. Please try again.</p>
          <Button onClick={onRetry} variant="outline" className="mt-6 bg-red-500/20 hover:bg-red-500/40 border-red-400 text-red-300">
            <Loader className="mr-2 h-4 w-4 animate-spin" /> Retry
          </Button>
        </div>
      </FadeIn>
    </div>
  );
}

export default function HRDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentRequests, setRecentRequests] = useState<LeaveRequestRow[]>([]);
  const [leaveTrend, setLeaveTrend] = useState<LeaveTrendMonth[]>([]);
  const [slaBreaches, setSlaBreaches] = useState<SLABreachRequest[]>([]);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [activityFeed, setActivityFeed] = useState<AuditEntry[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [metricsRes, requestsRes, trendRes, slaRes, deptsRes, activityRes] = await Promise.all([
        fetch('/api/hr/dashboard/metrics'),
        fetch('/api/leaves/list?limit=5'),
        fetch('/api/hr/dashboard/leave-trend'),
        fetch('/api/hr/dashboard/sla-breaches'),
        fetch('/api/hr/dashboard/departments'),
        fetch('/api/audit-logs?limit=10'),
      ]);
      if (!metricsRes.ok) throw new Error('Failed to fetch dashboard data.');

      setMetrics(await metricsRes.json());
      setRecentRequests((await requestsRes.json()).requests ?? []);
      setLeaveTrend(await trendRes.json());
      setSlaBreaches(await slaRes.json());
      setDepartments(await deptsRes.json());
      setActivityFeed((await activityRes.json()).logs ?? []);

    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    ensureMe().then(me => {
      if (!me) { router.replace('/sign-in'); return; }
      const allowedRoles = ['admin', 'hr'];
      if (!allowedRoles.includes(me.primary_role ?? '')) { router.replace('/employee/dashboard'); return; }
      setUserName(me.first_name || 'Admin');
      setCompanyId(me.company?.id || null);
      fetchData();
    });
  }, [router, fetchData]);

  useEffect(() => {
    if (!companyId) return;
    const pusher = getPusherClient();
    if (!pusher) return;
    const channelName = `private-company-${companyId}`;
    const channel = pusher.subscribe(channelName);
    const connectHandler = () => setIsLive(true);
    const disconnectHandler = () => setIsLive(false);
    const updateHandler = () => fetchData();

    pusher.connection.bind('connected', connectHandler);
    pusher.connection.bind('disconnected', disconnectHandler);
    channel.bind('dashboard-update', updateHandler);

    return () => {
      pusher.connection.unbind('connected', connectHandler);
      pusher.connection.unbind('disconnected', disconnectHandler);
      channel.unbind('dashboard-update', updateHandler);
      pusher.unsubscribe(channelName);
    };
  }, [companyId, fetchData]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError onRetry={fetchData} />;

  return (
    <>
      <AmbientBackground />
      <div className="p-4 md:p-6 lg:p-8 text-white relative z-10">
        <StaggerContainer>
          <FadeIn>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-4xl font-bold tracking-tighter text-shadow-lg">HR Dashboard</h1>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-slate-300 text-shadow">Welcome, {userName}.</p>
                  <div className={`flex items-center gap-2 text-xs px-2 py-1 rounded-full ${isLive ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                    {isLive ? <Wifi size={14} /> : <WifiOff size={14} />}
                    <span>{isLive ? 'Live' : 'Connecting...'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StartTutorialButton tutorial={hrTutorial} />
                <Link href="/hr/leave-requests">
                  <Button className="bg-sky-500/20 hover:bg-sky-500/40 border border-sky-400 text-sky-300 rounded-xl font-bold shadow-[0_0_20px_rgba(7,159,217,0.4)] hover:-translate-y-0.5 transition-transform duration-300">
                    <ClipboardList className="w-5 h-5 mr-2" /> Review Requests
                  </Button>
                </Link>
              </div>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {METRIC_CONFIG.map(({ key: metricKey, ...rest }, i) => (
              <MetricCard key={metricKey} {...rest} value={(metrics as any)?.[metricKey] ?? 0} delay={i * 0.1} />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <div className="lg:col-span-2"><RecentRequestsCard requests={recentRequests} /></div>
            <div><QuickActionsCard /></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <div className="lg:col-span-2"><LeaveTrendChart trend={leaveTrend} /></div>
            <div><SlaAlertsCard breaches={slaBreaches} /></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <div><DepartmentsCard departments={departments} /></div>
            <div className="lg:col-span-2"><ActivityFeedCard feed={activityFeed} /></div>
          </div>
        </StaggerContainer>
      </div>
    </>
  );
}

// --- Sub-components ---
function Card({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return <TiltCard className={`h-full ${className}`}><div className="glass-panel rounded-2xl h-full flex flex-col border-l-4 border-t-2 border-slate-700/50">{children}</div></TiltCard>;
}

function CardHeader({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return <div className={`p-5 flex justify-between items-center border-b border-slate-700/50 ${className}`}>{children}</div>;
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xl font-bold text-shadow">{children}</h3>;
}

function CardContent({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return <div className={`flex-grow p-5 ${className}`}>{children}</div>;
}

function MetricCard({ label, value, icon: Icon, color, delay }: { label: string, value: number, icon: LucideIcon, color: string, delay: number }) {
  return (
    <FadeIn delay={delay}>
      <Card className="!p-5">
        <div className="flex justify-between items-start">
          <p className="text-base font-semibold text-slate-300">{label}</p>
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}><Icon className="w-6 h-6 text-white/90" /></div>
        </div>
        <motion.p className="text-5xl font-bold text-white text-shadow-md mt-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: delay + 0.2 }}>{value}</motion.p>
      </Card>
    </FadeIn>
  );
}

function RecentRequestsCard({ requests }: { requests: LeaveRequestRow[] }) {
  return (
    <FadeIn delay={0.2}>
      <Card>
        <CardHeader>
          <CardTitle>Recent Leave Requests</CardTitle>
          <Link href="/hr/leave-requests" className="text-sm text-sky-300 hover:text-sky-400 transition-colors">View all &rarr;</Link>
        </CardHeader>
        <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
          {requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6"><Inbox className="w-12 h-12 mb-3" /><p>No recent requests.</p></div>
          ) : (
            <motion.div variants={containerVariants} initial="hidden" animate="visible">
              {requests.map(req => (
                <motion.div key={req.id} variants={itemVariants} className="px-5 py-3 border-b border-slate-800/80 hover:bg-slate-800/40 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white">{req.employee.first_name} {req.employee.last_name}</p>
                      <p className="text-sm text-slate-400 mt-0.5">{req.leave_type} &middot; {new Date(req.start_date).toLocaleDateString('en-GB')} - {new Date(req.end_date).toLocaleDateString('en-GB')}</p>
                    </div>
                    <Badge className={`${req.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300' : req.status === 'pending' ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300'}`}>{req.status}</Badge>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </Card>
    </FadeIn>
  );
}

function QuickActionsCard() {
  return (
    <FadeIn delay={0.3}>
      <Card>
        <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
        <CardContent className="!p-3 space-y-2">
          {QUICK_ACTIONS.map((item, i) => (
            <motion.div key={item.href} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.06 }}>
              <Link href={item.href} className={`flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r ${item.gradient} border border-slate-700/50 hover:border-sky-400/70 transition-all group`}>
                <div className="w-10 h-10 rounded-xl bg-slate-900/50 flex items-center justify-center"><item.icon className="w-5 h-5 text-sky-300" /></div>
                <p className="text-sm font-medium text-white">{item.label}</p>
                <ChevronRight className="w-5 h-5 text-slate-500 ml-auto group-hover:text-sky-300 transition-colors" />
              </Link>
            </motion.div>
          ))}
        </CardContent>
      </Card>
    </FadeIn>
  );
}

function LeaveTrendChart({ trend }: { trend: LeaveTrendMonth[] }) {
  const max = Math.max(1, ...trend.map(m => m.total));
  return (
    <FadeIn delay={0.4}>
      <Card>
        <CardHeader><CardTitle>Leave Trend (Last 6 Months)</CardTitle></CardHeader>
        <CardContent>
          {trend.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-400"><TrendingUp className="w-12 h-12 mb-3" /><p>No trend data.</p></div>
          ) : (
            <div className="flex items-end gap-3 h-44">
              {trend.map((month, i) => (
                <motion.div key={month.label} className="flex-1 flex flex-col items-center justify-end h-full gap-1 group" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.06 }}>
                  <AnimatePresence>{month.total > 0 && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs font-medium text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">{month.total}</motion.span>}</AnimatePresence>
                  <div className="w-full max-w-[48px] rounded-t-md bg-gradient-to-b from-sky-500/50 to-blue-600/50 group-hover:from-sky-400/80 group-hover:to-blue-500/80 transition-all" style={{ height: `${Math.max(4, (month.total / max) * 100)}%` }} />
                  <span className="text-xs text-slate-500 font-medium">{month.label}</span>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </FadeIn>
  );
}

function SlaAlertsCard({ breaches }: { breaches: SLABreachRequest[] }) {
  return (
    <FadeIn delay={0.5}>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><AlertCircle className="w-5 h-5 text-red-400" /><CardTitle>SLA Alerts</CardTitle></div>
          {breaches.length > 0 && <Badge className="bg-red-500/20 text-red-300">{breaches.length}</Badge>}
        </CardHeader>
        <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
          {breaches.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6"><Shield className="w-12 h-12 text-emerald-400 mb-3" /><p>No SLA breaches.</p></div>
          ) : (
            <motion.div variants={containerVariants} initial="hidden" animate="visible">
              {breaches.map(b => (
                <motion.div key={b.id} variants={itemVariants} className="px-5 py-3 border-b border-slate-800/80">
                  <p className="font-semibold text-white">{b.employee_name}</p>
                  <p className="text-sm text-red-400">{b.hours_waiting} hours waiting</p>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </Card>
    </FadeIn>
  );
}

function DepartmentsCard({ departments }: { departments: DepartmentRow[] }) {
  return (
    <FadeIn delay={0.6}>
      <Card>
        <CardHeader><CardTitle>Departments</CardTitle></CardHeader>
        <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
          {departments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6"><Building2 className="w-12 h-12 mb-3" /><p>No departments found.</p></div>
          ) : (
            <motion.div variants={containerVariants} initial="hidden" animate="visible">
              {departments.map(d => (
                <motion.div key={d.name} variants={itemVariants} className="px-5 py-3 border-b border-slate-800/80">
                  <div className="flex justify-between items-center">
                    <p className="font-semibold text-white">{d.name}</p>
                    <span className="text-sm text-slate-300">{d.headcount} members</span>
                  </div>
                  <div className="w-full bg-slate-700/50 rounded-full h-1.5 mt-2"><div className="bg-emerald-400 h-1.5 rounded-full" style={{ width: d.attendanceRate }} /></div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </Card>
    </FadeIn>
  );
}

function ActivityFeedCard({ feed }: { feed: AuditEntry[] }) {
  return (
    <FadeIn delay={0.7}>
      <Card>
        <CardHeader><CardTitle>Activity Feed</CardTitle></CardHeader>
        <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
          {feed.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6"><Activity className="w-12 h-12 mb-3" /><p>No recent activity.</p></div>
          ) : (
            <motion.div variants={containerVariants} initial="hidden" animate="visible">
              {feed.map(a => (
                <motion.div key={a.id} variants={itemVariants} className="px-5 py-3 border-b border-slate-800/80">
                  <p className="text-sm text-white">{a.action.replace(/_/g, ' ').toLowerCase()}</p>
                  <p className="text-xs text-slate-400">by {a.actorName} &middot; {new Date(a.createdAt).toLocaleDateString()}</p>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </Card>
    </FadeIn>
  );
}
