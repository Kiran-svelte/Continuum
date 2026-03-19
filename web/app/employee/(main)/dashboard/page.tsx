'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassPanel } from '@/components/glass-panel';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageLoader } from '@/components/ui/progress';
import { WelcomeModal, FloatingTutorialButton, StartTutorialButton, employeeTutorial } from '@/components/tutorial';
import { ensureMe } from '@/lib/client-auth';
import { getPusherClient, getUserChannelName } from '@/lib/pusher-client';
import { TiltCard, FadeIn, StaggerContainer, GlowCard, Counter, MagneticButton, ScrollReveal } from '@/components/motion';
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
  Sparkles,
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

const LEAVE_CONFIG: Record<string, { gradient: string; color: string; icon: any }> = {
  CL: { gradient: 'from-blue-500 to-blue-600', color: '#3B82F6', icon: TrendingUp },
  SL: { gradient: 'from-emerald-500 to-green-600', color: '#10B981', icon: TrendingUp },
  PL: { gradient: 'from-purple-500 to-violet-600', color: '#8B5CF6', icon: TrendingUp },
  EL: { gradient: 'from-purple-500 to-violet-600', color: '#8B5CF6', icon: TrendingUp },
  WFH: { gradient: 'from-orange-500 to-amber-600', color: '#F59E0B', icon: TrendingUp },
  LWP: { gradient: 'from-red-500 to-rose-600', color: '#EF4444', icon: TrendingUp },
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
    <StaggerContainer className="space-y-8 relative z-10 p-6">
      <FadeIn className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">Premium Portal v4.0</span>
          </div>
          <h1 className="text-5xl font-black text-white tracking-tighter shadow-primary/20 text-shadow-lg">
            G&apos;day, {userName}
          </h1>
          <div className="flex items-center gap-4 mt-3">
            <p className="text-white/40 font-semibold tracking-tight">Your organization pulse is nominal.</p>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${isLive ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-white/30'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500 animate-ping' : 'bg-white/20'}`} />
              <span className="text-[10px] font-bold uppercase tracking-wider">{isLive ? 'Sync Active' : 'Connecting'}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <StartTutorialButton tutorial={employeeTutorial} variant="outline" className="hidden md:flex glass-panel !px-6" />
          <MagneticButton
            variant="gradient"
            size="lg"
            onClick={() => router.push('/employee/request-leave')}
            className="shadow-[0_20px_40px_rgba(var(--primary-rgb),0.3)] !px-8"
          >
            <Plus className="w-5 h-5 mr-2" />
            Apply Leave
          </MagneticButton>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loadingBalances ? (
          [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40 rounded-3xl bg-white/5" />)
        ) : (
          balances.map((balance, index) => {
            const config = LEAVE_CONFIG[balance.leave_type] || { gradient: 'from-slate-500 to-slate-600', color: '#64748B', icon: TrendingUp };
            return (
              <FadeIn key={balance.leave_type} delay={index * 0.05}>
                <TiltCard>
                  <GlowCard className="h-full group" color={config.color}>
                    <div className="p-7 relative z-10 flex flex-col h-full">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-white/30 group-hover:text-white/60 transition-colors">
                          {balance.leave_type} Pipeline
                        </span>
                        <config.icon className="w-5 h-5 opacity-20 group-hover:opacity-100 transition-opacity" style={{ color: config.color }} />
                      </div>
                      <div className="mt-auto">
                        <div className="text-5xl font-black text-white tabular-nums tracking-tighter">
                          <Counter value={balance.remaining} />
                        </div>
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-2">
                          Available / {balance.annual_entitlement} CAP
                        </p>
                        <div className="mt-6 w-full h-1 bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
                          <motion.div
                            className={`absolute h-full bg-gradient-to-r ${config.gradient}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${(balance.remaining / balance.annual_entitlement) * 100}%` }}
                            transition={{ duration: 1.5, ease: 'circOut' }}
                          />
                        </div>
                      </div>
                    </div>
                  </GlowCard>
                </TiltCard>
              </FadeIn>
            );
          })
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <ScrollReveal direction="right" className="space-y-6">
          <GlowCard className="p-6" color="rgba(6, 182, 212, 0.4)">
            <h3 className="text-lg font-black text-white flex items-center gap-2 mb-6 tracking-tighter">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              Quick Actions
            </h3>
            <div className="grid gap-3">
              {[
                { href: '/employee/request-leave', icon: FilePlus, label: 'New Request', color: 'text-blue-400' },
                { href: '/employee/leave-history', icon: CalendarDays, label: 'Activity Logs', color: 'text-purple-400' },
                { href: '/employee/attendance', icon: Clock, label: 'Daily Pulse', color: 'text-emerald-400' },
                { href: '/employee/documents', icon: FolderOpen, label: 'Safe Deposit', color: 'text-amber-400' },
              ].map((item) => (
                <Link key={item.label} href={item.href}>
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-white/[0.08] transition-all group overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform">
                      <item.icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                    <span className="font-bold text-sm text-white/60 group-hover:text-white transition-colors">{item.label}</span>
                    <ChevronRight className="w-4 h-4 text-white/20 ml-auto group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              ))}
            </div>
          </GlowCard>
        </ScrollReveal>

        <div className="lg:col-span-2 space-y-8">
          <ScrollReveal direction="up" delay={0.2}>
            <GlassPanel className="overflow-hidden">
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <h3 className="text-xl font-bold text-white tracking-tighter flex items-center gap-3">
                  <ClipboardList className="w-6 h-6 text-primary" />
                  Recent Activity Stream
                </h3>
                <Link href="/employee/leave-history" className="text-[10px] font-black uppercase tracking-widest text-primary/60 hover:text-primary transition-colors">
                  Full Archive
                </Link>
              </div>
              <div className="p-0">
                {loadingRequests ? (
                  <div className="p-6 space-y-4"><Skeleton className="h-12 w-full rouned-xl" /><Skeleton className="h-12 w-full rouned-xl" /></div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {recentRequests.map((req, i) => (
                      <div key={req.id} className="p-6 flex items-center justify-between group hover:bg-white/[0.02] transition-colors relative overflow-hidden">
                        <div className="flex gap-4 items-center">
                          <div className={`w-1 h-10 rounded-full bg-primary/20 group-hover:bg-primary transition-colors`} />
                          <div>
                            <p className="font-black text-white group-hover:translate-x-1 transition-transform">{req.leave_type}</p>
                            <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mt-1 italic">
                              {new Date(req.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} &middot; {req.total_days} Days Pipeline
                            </p>
                          </div>
                        </div>
                        <Badge variant={req.status === 'approved' ? 'success' : req.status === 'pending' ? 'warning' : 'danger'} className="font-black tracking-widest uppercase text-[10px] px-3 py-1 shadow-lg">
                          {req.status}
                        </Badge>
                      </div>
                    ))}
                    {recentRequests.length === 0 && (
                      <div className="py-20 text-center text-white/20 font-black uppercase tracking-[0.5em]">No Data Stream</div>
                    )}
                  </div>
                )}
              </div>
            </GlassPanel>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.3}>
            <GlassPanel className="overflow-hidden">
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <h3 className="text-xl font-bold text-white tracking-tighter flex items-center gap-3">
                  <CalendarCheck className="w-6 h-6 text-emerald-500" />
                  Holiday Roster
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 p-0 divide-x divide-y divide-white/5">
                {holidays.map((h, i) => (
                  <div key={h.id} className="p-6 flex items-center gap-4 hover:bg-white/[0.04] transition-all">
                    <div className="flex-col text-center border-r border-white/10 pr-4">
                      <p className="text-2xl font-black text-white leading-none">{new Date(h.date).getDate()}</p>
                      <p className="text-[10px] font-bold text-white/30 uppercase mt-1">{new Date(h.date).toLocaleString('default', { month: 'short' })}</p>
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm tracking-tight">{h.name}</p>
                      <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-1">Industrial Rest</p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassPanel>
          </ScrollReveal>
        </div>
      </div>

      <WelcomeModal tutorial={employeeTutorial} roleName="Employee" />
      <FloatingTutorialButton tutorial={employeeTutorial} />
    </StaggerContainer>
  );
}
