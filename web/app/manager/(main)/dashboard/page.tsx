'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { TiltCard, FadeIn, StaggerContainer, AmbientBackground } from '@/components/motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Clock,
  BarChart3,
  Home,
  CheckSquare,
  CheckCircle,
  Check,
  X,
  Loader,
  ServerCrash,
  type LucideIcon,
} from 'lucide-react';
import { ensureMe } from '@/lib/client-auth';
import { StartTutorialButton, managerTutorial } from '@/components/tutorial';

// Types
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
  };
}

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  designation: string | null;
  status: string;
}

// Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 100, damping: 12 } },
};

// Skeleton Loader
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

// Error Component
function DashboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-200px)] text-center p-4">
      <FadeIn>
        <div className="glass-panel p-8 max-w-md w-full">
          <ServerCrash className="w-16 h-16 text-red-400 mx-auto" />
          <h2 className="mt-4 text-2xl font-bold text-red-300">Dashboard Unavailable</h2>
          <p className="mt-2 text-sm text-slate-400">Could not load dashboard data. Please check your connection and try again.</p>
          <Button onClick={onRetry} variant="outline" className="mt-6 bg-red-500/20 hover:bg-red-500/40 border-red-400 text-red-300">
            <Loader className="mr-2 h-4 w-4 animate-spin" />
            Retry
          </Button>
        </div>
      </FadeIn>
    </div>
  );
}

export default function ManagerDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [pendingRequests, setPendingRequests] = useState<LeaveRequestRow[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamSize, setTeamSize] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [todayOnLeave, setTodayOnLeave] = useState(0);
  const [managerId, setManagerId] = useState<string | null>(null);

  const fetchData = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const [requestsRes, teamRes, onLeaveRes] = await Promise.all([
        fetch('/api/leaves/list?status=pending&limit=10', { credentials: 'include' }),
        fetch(`/api/employees?manager_id=${id}&limit=20`, { credentials: 'include' }),
        fetch('/api/leaves/list?status=approved&limit=100', { credentials: 'include' }),
      ]);

      if (!requestsRes.ok || !teamRes.ok) throw new Error('Failed to fetch critical data.');

      const requestsData = await requestsRes.json();
      setPendingRequests(requestsData.requests ?? []);
      setPendingCount(requestsData.pagination?.total ?? 0);

      const teamData = await teamRes.json();
      setTeamMembers(teamData.employees ?? []);
      setTeamSize(teamData.pagination?.total ?? 0);

      if (onLeaveRes.ok) {
        const onLeaveData = await onLeaveRes.json();
        const today = new Date().toISOString().split('T')[0];
        const count = (onLeaveData.requests ?? []).filter((r: LeaveRequestRow) => {
          const start = r.start_date?.split('T')[0];
          const end = r.end_date?.split('T')[0];
          return start <= today && end >= today;
        }).length;
        setTodayOnLeave(count);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    ensureMe().then(me => {
      if (!me) {
        router.replace('/sign-in');
        return;
      }
      const allowedRoles = ['admin', 'hr', 'director', 'manager', 'team_lead'];
      if (!allowedRoles.includes(me.primary_role ?? 'employee')) {
        router.replace('/employee/dashboard');
        return;
      }
      setUserName(me.first_name || 'Manager');
      setManagerId(me.id);
      fetchData(me.id);
    });
  }, [router, fetchData]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError onRetry={() => managerId && fetchData(managerId)} />;

  const metrics = [
    { label: 'Team Size', value: teamSize, icon: Users, color: 'from-blue-400 to-blue-600' },
    { label: 'Pending Approvals', value: pendingCount, icon: Clock, color: 'from-amber-400 to-orange-500' },
    { label: 'Team Available', value: teamSize - todayOnLeave, icon: BarChart3, color: 'from-emerald-400 to-green-500' },
    { label: 'On Leave Today', value: todayOnLeave, icon: Home, color: 'from-purple-400 to-violet-500' },
  ];

  return (
    <>
      <AmbientBackground />
      <div className="p-4 md:p-6 lg:p-8 text-white relative z-10">
        <StaggerContainer>
          {/* Header */}
          <FadeIn>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-4xl font-bold tracking-tighter text-shadow-lg">Welcome, {userName}</h1>
                <p className="text-slate-300 mt-1 text-shadow">Team overview and pending actions.</p>
              </div>
              <div className="flex items-center gap-3">
                <StartTutorialButton tutorial={managerTutorial} />
                <Link href="/manager/approvals">
                  <Button className="bg-sky-500/20 hover:bg-sky-500/40 border border-sky-400 text-sky-300 rounded-xl text-sm font-bold shadow-[0_0_20px_rgba(7,159,217,0.4)] hover:-translate-y-0.5 transition-transform duration-300">
                    <CheckSquare className="w-5 h-5 mr-2" />
                    Review All Approvals
                  </Button>
                </Link>
              </div>
            </div>
          </FadeIn>

          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {metrics.map((metric, i) => <MetricCard key={metric.label} {...metric} delay={i * 0.1} />)}
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <div className="lg:col-span-2">
              <PendingApprovalsCard requests={pendingRequests} total={pendingCount} onUpdate={fetchData} managerId={managerId} />
            </div>
            <div className="lg:col-span-1">
              <TeamMembersCard members={teamMembers} />
            </div>
          </div>
        </StaggerContainer>
      </div>
    </>
  );
}

// Sub-components
function MetricCard({ label, value, icon: Icon, color, delay }: { label: string, value: number, icon: LucideIcon, color: string, delay: number }) {
  return (
    <FadeIn delay={delay}>
      <TiltCard className="h-full">
        <div className="glass-panel p-5 rounded-2xl h-full flex flex-col justify-between border-l-4 border-t-2 border-slate-700/50">
          <div className="flex justify-between items-start">
            <p className="text-base font-semibold text-slate-300">{label}</p>
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
              <Icon className="w-6 h-6 text-white/90" />
            </div>
          </div>
          <motion.p
            className="text-5xl font-bold text-white text-shadow-md mt-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', delay: delay + 0.2 }}
          >
            {value}
          </motion.p>
        </div>
      </TiltCard>
    </FadeIn>
  );
}

function PendingApprovalsCard({ requests, total, onUpdate, managerId }: { requests: LeaveRequestRow[], total: number, onUpdate: (id: string) => void, managerId: string | null }) {
  const [actionState, setActionState] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const handleAction = async (action: 'approve' | 'reject', requestId: string) => {
    if (!managerId) return;
    setActioningId(requestId);
    setActionState(null);
    try {
      const res = await fetch(`/api/leaves/${action}/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ comments: '' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to ${action} request.`);
      }
      setActionState({ type: 'success', message: `Request ${action}d successfully.` });
      onUpdate(managerId);
    } catch (e) {
      setActionState({ type: 'error', message: e instanceof Error ? e.message : 'An unknown error occurred.' });
    } finally {
      setActioningId(null);
      setTimeout(() => setActionState(null), 4000);
    }
  };

  return (
    <FadeIn delay={0.2}>
      <TiltCard className="h-full">
        <div className="glass-panel rounded-2xl h-full flex flex-col border-l-4 border-t-2 border-slate-700/50">
          <div className="p-5 flex justify-between items-center border-b border-slate-700/50">
            <h3 className="text-xl font-bold text-shadow">Pending Approvals</h3>
            {total > 0 && <Badge className="bg-amber-500/20 text-amber-300 border-amber-500">{total} pending</Badge>}
          </div>
          <AnimatePresence>
            {actionState && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`p-3 mx-5 mt-4 rounded-lg text-sm flex items-center gap-2 ${actionState.type === 'success' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}
              >
                {actionState.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
                {actionState.message}
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
            {requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6">
                <CheckCircle className="w-12 h-12 text-emerald-400 mb-3" />
                <p className="font-semibold">All caught up!</p>
                <p className="text-sm">No pending approvals.</p>
              </div>
            ) : (
              <motion.div variants={containerVariants} initial="hidden" animate="visible">
                {requests.map(req => (
                  <motion.div key={req.id} variants={itemVariants} className="px-5 py-4 border-b border-slate-800/80 hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white">{req.employee.first_name} {req.employee.last_name}</p>
                        <p className="text-sm text-slate-400 mt-0.5">
                          {req.leave_type} ({req.total_days}d) &middot; {new Date(req.start_date).toLocaleDateString('en-GB')} - {new Date(req.end_date).toLocaleDateString('en-GB')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleAction('approve', req.id)} disabled={!!actioningId} className="bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-400 text-emerald-300">
                          {actioningId === req.id ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </Button>
                        <Button size="sm" onClick={() => handleAction('reject', req.id)} disabled={!!actioningId} className="bg-red-500/20 hover:bg-red-500/40 border border-red-400 text-red-300">
                          {actioningId === req.id ? <Loader className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </TiltCard>
    </FadeIn>
  );
}

function TeamMembersCard({ members }: { members: TeamMember[] }) {
  return (
    <FadeIn delay={0.3}>
      <TiltCard className="h-full">
        <div className="glass-panel rounded-2xl h-full flex flex-col border-l-4 border-t-2 border-slate-700/50">
          <div className="p-5 flex justify-between items-center border-b border-slate-700/50">
            <h3 className="text-xl font-bold text-shadow">Team Members</h3>
            <Link href="/manager/team" className="text-sm text-sky-300 hover:text-sky-400 transition-colors">View all &rarr;</Link>
          </div>
          <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
            {members.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6">
                <Users className="w-12 h-12 text-blue-400 mb-3" />
                <p className="font-semibold">No team members found.</p>
              </div>
            ) : (
              <motion.div variants={containerVariants} initial="hidden" animate="visible">
                {members.slice(0, 10).map(member => (
                  <motion.div key={member.id} variants={itemVariants} className="px-5 py-3 border-b border-slate-800/80 hover:bg-slate-800/40 transition-colors">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-white">{member.first_name} {member.last_name}</p>
                        <p className="text-xs text-slate-400">{member.designation || 'N/A'}</p>
                      </div>
                      <Badge className={`${member.status === 'active' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500' : 'bg-slate-500/20 text-slate-300 border-slate-500'}`}>
                        {member.status}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </TiltCard>
    </FadeIn>
  );
}
