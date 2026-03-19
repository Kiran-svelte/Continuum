'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { TiltCard, FadeIn, StaggerContainer, GlowCard, Counter, MagneticButton, ScrollReveal } from '@/components/motion';
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
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Activity,
  Wifi,
  WifiOff,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface DashboardMetrics {
  totalEmployees: number;
  pendingApprovals: number;
  todayAbsent: number;
  slaBreaches: number;
}

const METRIC_CONFIG = [
  { key: 'totalEmployees', label: 'WORKFORCE TOTAL', icon: Users, color: '#3B82F6', gradient: 'from-blue-400 to-blue-600' },
  { key: 'pendingApprovals', label: 'ACTION QUEUE', icon: Clock, color: '#F59E0B', gradient: 'from-amber-400 to-orange-500' },
  { key: 'todayAbsent', label: 'ACTIVE DEPLOYMENT', icon: Home, color: '#8B5CF6', gradient: 'from-purple-400 to-violet-500' },
  { key: 'slaBreaches', label: 'CRITICAL BREACHES', icon: AlertTriangle, color: '#EF4444', gradient: 'from-red-400 to-rose-500' },
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

  if (loading) return <div className="p-10 flex flex-col items-center justify-center space-y-4"><Zap className="w-10 h-10 text-primary animate-bounce" /><p className="text-white/20 font-black tracking-widest uppercase">Initializing Command Center</p></div>;

  return (
    <StaggerContainer className="p-6 md:p-8 lg:p-10 text-white relative z-10 space-y-10">
      <FadeIn className="flex flex-col sm:flex-row sm:items-center justify-between gap-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="px-2 py-0.5 rounded bg-primary/20 border border-primary/30 text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3" />
              Secure Terminal
            </div>
          </div>
          <h1 className="text-5xl font-black tracking-tightest text-white shadow-lg">HR Command Center</h1>
          <div className="flex items-center gap-4 mt-3">
            <p className="text-white/30 font-bold tracking-tight">System Operator: <span className="text-white">{userName}</span></p>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${isLive ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-white/30'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500 animate-ping' : 'bg-white/20'}`} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">{isLive ? 'Live Uplink' : 'Establishing...'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <StartTutorialButton tutorial={hrTutorial} />
          <MagneticButton
            variant="gradient"
            onClick={() => router.push('/hr/leave-requests')}
            className="shadow-[0_20px_40px_rgba(var(--primary-rgb),0.3)] !px-8"
          >
            <Zap className="w-5 h-5 mr-2" />
            Process Requests
          </MagneticButton>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {METRIC_CONFIG.map((config, i) => (
          <FadeIn key={config.key} delay={i * 0.05}>
            <TiltCard>
              <GlowCard className="p-8 h-full flex flex-col justify-between" color={config.color}>
                <div className="flex justify-between items-start mb-6">
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">{config.label}</p>
                  <div className={`p-3 rounded-2xl bg-white/5 border border-white/10 group-hover:scale-110 transition-transform`}>
                    <config.icon className="w-6 h-6 text-white" style={{ color: config.color }} />
                  </div>
                </div>
                <div className="text-5xl font-black text-white tracking-widest tabular-nums">
                  <Counter value={(metrics as any)?.[config.key] ?? 0} />
                </div>
              </GlowCard>
            </TiltCard>
          </FadeIn>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <ScrollReveal className="lg:col-span-2">
          <GlowCard className="overflow-hidden h-full" color="rgba(59, 130, 246, 0.2)">
            <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <h3 className="text-xl font-black text-white tracking-tighter flex items-center gap-3">
                <ClipboardList className="w-6 h-6 text-blue-500" />
                Live Request Stream
              </h3>
              <Link href="/hr/leave-requests" className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest transition-colors">
                Open Full Queue &rarr;
              </Link>
            </div>
            <div className="p-0">
              {recentRequests.length === 0 ? (
                <div className="py-20 text-center text-white/20 font-black tracking-widest uppercase italic">Silence in the ranks</div>
              ) : (
                <div className="divide-y divide-white/5">
                  {recentRequests.map(req => (
                    <div key={req.id} className="p-6 flex items-center gap-6 group hover:bg-white/[0.03] transition-all">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-lg font-black text-white/60 group-hover:bg-primary/20 group-hover:text-primary transition-all">
                        {req.employee.first_name[0]}{req.employee.last_name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <p className="font-black text-white group-hover:translate-x-1 transition-transform">{req.employee.first_name} {req.employee.last_name}</p>
                          <Badge variant="outline" className="text-[9px] font-black uppercase border-white/10 text-white/40">{req.leave_type}</Badge>
                        </div>
                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-1">
                          {new Date(req.start_date).toLocaleDateString()} &middot; {req.status} status
                        </p>
                      </div>
                      <MagneticButton variant="ghost" size="sm" className="hidden sm:flex border border-white/10 bg-white/5 opacity-0 group-hover:opacity-100 transition-all">
                        Details
                      </MagneticButton>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </GlowCard>
        </ScrollReveal>

        <ScrollReveal direction="left" delay={0.2}>
          <GlowCard color="rgba(168, 85, 247, 0.4)" className="h-full">
            <h3 className="p-8 pb-4 text-xl font-black text-white flex items-center gap-3 tracking-tighter">
              <Zap className="w-6 h-6 text-purple-400" />
              Quick Actions
            </h3>
            <div className="p-8 pt-4 grid gap-3">
              {[
                { href: '/hr/employees', icon: Users, label: 'Personnel', gradient: 'from-blue-500/20 to-cyan-500/20', color: 'text-blue-400' },
                { href: '/hr/leave-requests', icon: ClipboardList, label: 'Review Hub', gradient: 'from-amber-500/20 to-orange-500/20', color: 'text-amber-400' },
                { href: '/hr/reports', icon: BarChart3, label: 'Inteligence', gradient: 'from-purple-500/20 to-violet-500/20', color: 'text-purple-400' },
                { href: '/hr/policy-settings', icon: Settings, label: 'Protocol', gradient: 'from-emerald-500/20 to-green-500/20', color: 'text-emerald-400' },
              ].map((item) => (
                <Link key={item.href} href={item.href}>
                  <div className="flex items-center gap-5 p-5 rounded-3xl bg-white/5 border border-white/10 hover:border-primary/50 group transition-all relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-12 h-12 rounded-2xl bg-black/40 flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform">
                      <item.icon className={`w-6 h-6 ${item.color}`} />
                    </div>
                    <span className="font-extrabold text-sm text-white/60 group-hover:text-white uppercase tracking-widest">{item.label}</span>
                    <ChevronRight className="w-4 h-4 text-white/20 ml-auto group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              ))}
            </div>
          </GlowCard>
        </ScrollReveal>
      </div>

      <ScrollReveal direction="up" delay={0.3}>
        <GlowCard className="overflow-hidden" color="rgba(139, 92, 246, 0.2)">
          <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <h3 className="text-xl font-black text-white tracking-tighter flex items-center gap-3">
              <Activity className="w-6 h-6 text-violet-500" />
              Security Audit Stream
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 p-0 divide-x divide-y divide-white/5">
            {activityFeed.slice(0, 8).map((a, i) => (
              <div key={a.id} className="p-8 group hover:bg-white/[0.04] transition-all overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ShieldCheck className="w-4 h-4 text-primary/40" />
                </div>
                <p className="text-[10px] font-black uppercase text-primary/60 tracking-[0.2em] mb-2">{a.action.replace(/_/g, ' ')}</p>
                <p className="text-sm font-black text-white tracking-widest mb-1 truncate">{a.actorName}</p>
                <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-1">
                  {new Date(a.createdAt).toLocaleDateString()} at {new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
        </GlowCard>
      </ScrollReveal>
    </StaggerContainer>
  );
}
