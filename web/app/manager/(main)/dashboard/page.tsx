'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { TiltCard, FadeIn, StaggerContainer, AmbientBackground, GlowCard, MagneticButton, Counter, ScrollReveal } from '@/components/motion';
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
  Zap,
  TrendingUp,
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

// Skeleton Loader
function DashboardSkeleton() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div className="w-64 h-10 bg-white/5 rounded-lg animate-pulse" />
        <div className="w-32 h-12 bg-white/5 rounded-xl animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => <div key={i} className="h-36 bg-white/5 rounded-2xl animate-pulse" />)}
      </div>
    </div>
  );
}

// Error Component
function DashboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-200px)] text-center p-4">
      <FadeIn>
        <GlowCard color="#EF4444" className="p-8 max-w-md w-full">
          <ServerCrash className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Command Sync Failed</h2>
          <p className="mt-2 text-sm text-white/40 font-medium">Unable to connect to the fleet intelligence engine.</p>
          <MagneticButton onClick={onRetry} variant="danger" className="mt-8 w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry Connection
          </MagneticButton>
        </GlowCard>
      </FadeIn>
    </div>
  );
}

import { RefreshCw } from 'lucide-react';

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
    { label: 'WORKFORCE SIZE', value: teamSize, icon: Users, color: '#3B82F6' },
    { label: 'PENDING OPS', value: pendingCount, icon: Clock, color: '#F59E0B' },
    { label: 'ACTIVE DEPLOYMENT', value: teamSize - todayOnLeave, icon: Zap, color: '#10B981' },
    { label: 'UNIT DOWN-TIME', value: todayOnLeave, icon: Home, color: '#8B5CF6' },
  ];

  return (
    <>
      <div className="p-6 md:p-8 lg:p-10 text-white relative z-10 space-y-10">
        <StaggerContainer>
          {/* Header */}
          <FadeIn>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">Tactical Leadership Center</span>
                </div>
                <h1 className="text-5xl font-black tracking-tightest text-white shadow-lg">Welcome, {userName}</h1>
                <p className="text-white/40 font-bold tracking-tight mt-1">Real-time brigade oversight and action queue.</p>
              </div>
              <div className="flex items-center gap-4">
                <StartTutorialButton tutorial={managerTutorial} />
                <MagneticButton
                  variant="gradient"
                  onClick={() => router.push('/manager/approvals')}
                  className="shadow-[0_20px_40px_rgba(var(--primary-rgb),0.3)] !px-8"
                >
                  <CheckSquare className="w-5 h-5 mr-2" />
                  Review Approvals
                </MagneticButton>
              </div>
            </div>
          </FadeIn>

          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {metrics.map((metric, i) => (
              <FadeIn key={metric.label} delay={i * 0.05}>
                <TiltCard>
                  <GlowCard className="p-8 h-full flex flex-col justify-between" color={metric.color}>
                    <div className="flex justify-between items-start mb-6">
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">{metric.label}</p>
                      <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                        <metric.icon className="w-6 h-6 text-white" style={{ color: metric.color }} />
                      </div>
                    </div>
                    <div className="text-5xl font-black text-white tracking-widest tabular-nums">
                      <Counter value={metric.value} />
                    </div>
                  </GlowCard>
                </TiltCard>
              </FadeIn>
            ))}
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-10">
            <ScrollReveal className="lg:col-span-2">
              <PendingApprovalsCard requests={pendingRequests} total={pendingCount} onUpdate={fetchData} managerId={managerId} />
            </ScrollReveal>
            <ScrollReveal direction="left" delay={0.2}>
              <TeamMembersCard members={teamMembers} />
            </ScrollReveal>
          </div>
        </StaggerContainer>
      </div>
    </>
  );
}

// Sub-components
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
    <GlowCard className="overflow-hidden h-full" color="rgba(245, 158, 11, 0.2)">
      <div className="p-8 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
        <h3 className="text-xl font-black text-white tracking-tighter flex items-center gap-3">
          <Clock className="w-6 h-6 text-amber-500" />
          Tactical Approvals
        </h3>
        {total > 0 && <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30 px-3 font-black uppercase text-[10px] tracking-widest">{total} WAITING</Badge>}
      </div>
      <AnimatePresence>
        {actionState && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`m-6 p-4 rounded-2xl text-xs font-bold flex items-center gap-3 ${actionState.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}
          >
            {actionState.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <X className="w-5 h-5" />}
            {actionState.message.toUpperCase()}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="p-0">
        {requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/20">
            <CheckCircle className="w-16 h-16 mb-4 opacity-10" />
            <p className="font-black uppercase tracking-[0.4em]">Brigade Cleared</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {requests.map(req => (
              <div key={req.id} className="p-6 transition-all hover:bg-white/[0.03] group relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-6 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-lg font-black text-white/40 group-hover:bg-primary/20 group-hover:text-primary transition-all">
                    {req.employee.first_name[0]}{req.employee.last_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-white group-hover:translate-x-1 transition-transform">{req.employee.first_name} {req.employee.last_name}</p>
                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mt-1 italic">
                      {req.leave_type} &middot; {req.total_days} Days Pipeline &middot; {new Date(req.start_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <MagneticButton
                      size="sm"
                      onClick={() => handleAction('approve', req.id)}
                      disabled={!!actioningId}
                      className="bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                    >
                      {actioningId === req.id ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    </MagneticButton>
                    <MagneticButton
                      size="sm"
                      onClick={() => handleAction('reject', req.id)}
                      disabled={!!actioningId}
                      variant="danger"
                      className="bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-400"
                    >
                      {actioningId === req.id ? <Loader className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                    </MagneticButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </GlowCard>
  );
}

function TeamMembersCard({ members }: { members: TeamMember[] }) {
  return (
    <GlowCard className="h-full" color="rgba(59, 130, 246, 0.4)">
      <div className="p-8 pb-4 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
        <h3 className="text-xl font-black text-white tracking-tighter flex items-center gap-3">
          <Users className="w-6 h-6 text-blue-500" />
          Corps Personnel
        </h3>
        <Link href="/manager/team" className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest transition-colors">View All &rarr;</Link>
      </div>
      <div className="p-0">
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/20">
            <Users className="w-16 h-16 mb-4 opacity-10" />
            <p className="font-black uppercase tracking-[0.4em]">Zero Personnel</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {members.slice(0, 8).map(member => (
              <div key={member.id} className="p-6 hover:bg-white/[0.03] transition-all group">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-black text-white group-hover:translate-x-1 transition-transform">{member.first_name} {member.last_name}</p>
                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-1">{member.designation || 'OPERATIVE'}</p>
                  </div>
                  <Badge className={`${member.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-white/5 text-white/30 border-white/10'} font-black uppercase text-[9px] px-2 py-0.5`}>
                    {member.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </GlowCard>
  );
}
