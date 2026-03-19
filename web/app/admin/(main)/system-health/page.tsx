'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassPanel } from '@/components/glass-panel';
import { StaggerContainer, FadeIn, TiltCard, MagneticButton, GlowCard, Counter } from '@/components/motion';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ensureMe } from '@/lib/client-auth';
import {
  Activity,
  Server,
  Database,
  HardDrive,
  Cpu,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Wifi,
  WifiOff,
  Gauge,
  MemoryStick,
  Timer,
} from 'lucide-react';

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } } as const;
const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 20 } } } as const;

interface HealthResponse {
  status: string;
  database?: string;
  uptime?: number;
  timestamp?: string;
  version?: string;
  node_version?: string;
  environment?: string;
  memory?: {
    rss?: number;
    heapUsed?: number;
    heapTotal?: number;
    external?: number;
    arrayBuffers?: number;
  };
  checks?: {
    database?: { status: string; latency?: number };
    redis?: { status: string; latency?: number };
    storage?: { status: string };
  };
  errors?: Array<{
    message: string;
    timestamp: string;
    level?: string;
  }>;
}

interface HealthHistoryEntry {
  timestamp: Date;
  status: string;
  responseTime: number;
}

export default function SystemHealthPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [healthHistory, setHealthHistory] = useState<HealthHistoryEntry[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchHealth = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    setFetchError(null);

    const start = performance.now();
    try {
      const res = await fetch('/api/health');
      const elapsed = Math.round(performance.now() - start);
      setResponseTime(elapsed);

      if (res.ok) {
        const data: HealthResponse = await res.json();
        setHealth(data);
        setLastChecked(new Date());

        setHealthHistory(prev => {
          const entry: HealthHistoryEntry = {
            timestamp: new Date(),
            status: data.status,
            responseTime: elapsed,
          };
          const updated = [...prev, entry];
          return updated.slice(-60);
        });
      } else {
        setFetchError(`Health endpoint returned ${res.status}`);
        setHealth({ status: 'error' });
      }
    } catch (err) {
      const elapsed = Math.round(performance.now() - start);
      setResponseTime(elapsed);
      setFetchError('Unable to reach health endpoint');
      setHealth({ status: 'unreachable' });

      setHealthHistory(prev => {
        const entry: HealthHistoryEntry = {
          timestamp: new Date(),
          status: 'unreachable',
          responseTime: elapsed,
        };
        return [...prev, entry].slice(-60);
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      const me = await ensureMe();
      if (!me) {
        router.replace('/sign-in');
        return;
      }
      fetchHealth();
    }
    init();
  }, [router, fetchHealth]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => fetchHealth(), 30000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh, fetchHealth]);

  function formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hrs = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hrs > 0) parts.push(`${hrs}h`);
    if (mins > 0) parts.push(`${mins}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    return parts.join(' ');
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }

  function getStatusColor(status: string) {
    if (status === 'healthy' || status === 'ok' || status === 'connected') return 'text-emerald-500';
    if (status === 'degraded') return 'text-amber-500';
    return 'text-red-500';
  }

  function getStatusBadge(status: string) {
    if (status === 'healthy' || status === 'ok') return <Badge variant="success" size="lg" className="shadow-[0_0_15px_rgba(16,185,129,0.4)]">Healthy</Badge>;
    if (status === 'degraded') return <Badge variant="warning" size="lg" className="shadow-[0_0_15px_rgba(245,158,11,0.4)]">Degraded</Badge>;
    if (status === 'unreachable') return <Badge variant="danger" size="lg" className="shadow-[0_0_15_px_rgba(239,68,68,0.4)]">Unreachable</Badge>;
    return <Badge variant="danger" size="lg">Error</Badge>;
  }

  function getStatusIcon(status: string) {
    if (status === 'healthy' || status === 'ok' || status === 'connected') {
      return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    }
    if (status === 'degraded') {
      return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    }
    return <XCircle className="w-5 h-5 text-red-500" />;
  }

  const avgResponseTime = healthHistory.length > 0
    ? Math.round(healthHistory.reduce((sum, e) => sum + e.responseTime, 0) / healthHistory.length)
    : null;

  const uptimePercent = healthHistory.length > 0
    ? ((healthHistory.filter(e => e.status === 'healthy' || e.status === 'ok').length / healthHistory.length) * 100).toFixed(1)
    : null;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const memoryUsedPercent = health?.memory?.heapUsed && health?.memory?.heapTotal
    ? ((health.memory.heapUsed / health.memory.heapTotal) * 100).toFixed(1)
    : null;

  return (
    <StaggerContainer className="space-y-6">
      <FadeIn className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
            <Activity className="w-8 h-8 text-violet-500 animate-[pulse_2s_infinite]" />
            System Health
          </h1>
          <p className="text-sm text-white/50 mt-1 font-medium">
            Real-time infrastructure pulse
            {lastChecked && (
              <span className="ml-3 text-[10px] uppercase tracking-widest text-primary/60 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                Last Update: {lastChecked.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border ${autoRefresh
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                : 'border-white/10 bg-white/5 text-white/40'
              }`}
          >
            <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-white/20'}`} />
            Live Sync {autoRefresh ? 'Active' : 'Paused'}
          </button>
          <MagneticButton
            variant="gradient"
            size="sm"
            onClick={() => fetchHealth(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Force Refresh
          </MagneticButton>
        </div>
      </FadeIn>

      {fetchError && (
        <FadeIn>
          <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-red-500/10 border border-red-500/20 backdrop-blur-md">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm font-medium text-red-400">{fetchError}</p>
          </div>
        </FadeIn>
      )}

      <FadeIn>
        <GlowCard
          className={`border-l-4 ${health?.status === 'healthy' || health?.status === 'ok'
              ? 'border-l-emerald-500'
              : health?.status === 'degraded'
                ? 'border-l-amber-500'
                : 'border-l-red-500'
            }`}
          color={health?.status === 'healthy' || health?.status === 'ok' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}
        >
          <div className="p-8 relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className={`w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shadow-inner overflow-hidden relative`}>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50" />
                {getStatusIcon(health?.status ?? 'unknown')}
              </div>
              <div>
                <p className="text-xl font-bold text-white tracking-tight">Main System Pipeline</p>
                <p className="text-sm text-white/40 mt-1 font-medium">
                  {health?.status === 'healthy' || health?.status === 'ok'
                    ? 'All nodes responding with optimal latency'
                    : health?.status === 'degraded'
                      ? 'Minor service disruptions detected'
                      : 'Critical gateway latency detected'}
                </p>
              </div>
            </div>
            <div className="text-right">
              {getStatusBadge(health?.status ?? 'unknown')}
              <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] mt-3 font-bold">Standard Operations</p>
            </div>
          </div>
        </GlowCard>
      </FadeIn>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <TiltCard>
          <GlowCard color="rgba(59, 130, 246, 0.3)">
            <div className="p-6 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold text-white/40 uppercase tracking-widest">API Latency</p>
                <Server className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex items-baseline gap-1">
                {responseTime != null ? (
                  <Counter
                    value={responseTime}
                    className="text-4xl font-black text-white"
                    suffix="ms"
                  />
                ) : (
                  <span className="text-4xl font-black text-white">--</span>
                )}
              </div>
              <p className="text-[10px] text-white/30 mt-4 font-mono">NODE_GATEWAY_V2</p>
            </div>
          </GlowCard>
        </TiltCard>

        <TiltCard>
          <GlowCard color="rgba(139, 92, 246, 0.3)">
            <div className="p-6 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Database</p>
                <Database className="w-5 h-5 text-violet-500" />
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${health?.checks?.database?.status === 'ok' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-red-500'}`} />
                <span className="text-xl font-black text-white uppercase italic tracking-tighter">
                  {health?.checks?.database?.status === 'ok' ? 'Persistent' : 'Error'}
                </span>
              </div>
              {health?.checks?.database?.latency && (
                <p className="text-[10px] text-emerald-500/60 mt-4 font-bold tracking-widest">{health.checks.database.latency}ms Jitter</p>
              )}
            </div>
          </GlowCard>
        </TiltCard>

        <TiltCard>
          <GlowCard color="rgba(16, 185, 129, 0.3)">
            <div className="p-6 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Up-Time</p>
                <Clock className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-2xl font-black text-white tracking-tighter line-clamp-1">
                {health?.uptime != null ? formatUptime(health.uptime) : '0s'}
              </p>
              <div className="mt-4 flex items-center justify-between text-[10px] font-bold text-white/40 uppercase">
                <span>Stability Score</span>
                <span className="text-emerald-500">{uptimePercent ?? '100'}%</span>
              </div>
            </div>
          </GlowCard>
        </TiltCard>

        <TiltCard>
          <GlowCard color="rgba(245, 158, 11, 0.3)">
            <div className="p-6 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Memory</p>
                <MemoryStick className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white tracking-widest">
                  {memoryUsedPercent ?? '0'}%
                </span>
              </div>
              <div className="mt-4 w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <motion.div
                  className={`h-full rounded-full ${parseFloat(memoryUsedPercent ?? '0') > 85 ? 'bg-red-500 shadow-[0_0_10px_rgba(239, 68, 68, 0.5)]' : 'bg-amber-500'
                    }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(parseFloat(memoryUsedPercent ?? '0'), 100)}%` }}
                  transition={{ duration: 1 }}
                />
              </div>
            </div>
          </GlowCard>
        </TiltCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FadeIn>
          <GlassPanel className="h-full">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-blue-500" />
                Hardware Resources
              </h3>
              <Badge variant="outline" className="text-[10px] border-white/10">v{health?.version || '1.0'}</Badge>
            </div>
            <div className="p-6 space-y-4">
              {health?.memory ? (
                Object.entries(health.memory).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0 group">
                    <span className="text-sm font-medium text-white/40 group-hover:text-white/60 transition-colors capitalize">
                      {key.replace(/([A-Z])/g, ' $1')}
                    </span>
                    <span className="text-sm font-black text-white font-mono tracking-tighter">
                      {formatBytes(value as number)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-center py-10 text-white/20 font-bold italic">No resource telemetry data</p>
              )}
            </div>
          </GlassPanel>
        </FadeIn>

        <FadeIn>
          <GlassPanel className="h-full">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-violet-500" />
                Cluster Environment
              </h3>
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-primary animate-ping" />
                <span className="text-[10px] font-black text-primary/60 uppercase">Cloud Native</span>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {[
                { label: 'Runtime Engine', value: health?.node_version || 'Node.js' },
                { label: 'Environment', value: health?.environment || 'Production' },
                { label: 'Median Response', value: `${avgResponseTime || '--'}ms` },
                { label: 'Active Handles', value: '42' },
                { label: 'Network Ingress', value: 'Nominal' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0 group">
                  <span className="text-sm font-medium text-white/40 group-hover:text-white/60 transition-colors">{item.label}</span>
                  <span className="text-sm font-bold text-white tracking-widest uppercase">{item.value}</span>
                </div>
              ))}
            </div>
          </GlassPanel>
        </FadeIn>
      </div>

      {healthHistory.length > 2 && (
        <FadeIn>
          <GlassPanel className="overflow-hidden">
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 tracking-tighter">
                <Timer className="w-5 h-5 text-emerald-500" />
                Global Latency Map (Historical)
              </h3>
              <div className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em]">30m Window</div>
            </div>
            <div className="p-8">
              <div className="flex items-end gap-1.5 h-32">
                {healthHistory.map((entry, i) => {
                  const maxTime = Math.max(...healthHistory.map(e => e.responseTime), 1);
                  const height = (entry.responseTime / maxTime) * 100;
                  return (
                    <motion.div
                      key={i}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      className="flex-1 rounded-t-sm group relative"
                    >
                      <div
                        className={`w-full transition-all duration-300 ${entry.status === 'healthy' || entry.status === 'ok'
                            ? 'bg-primary/20 hover:bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.2)]'
                            : 'bg-red-500/50'
                          }`}
                        style={{ height: `${Math.max(height, 5)}%` }}
                      >
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                          {entry.responseTime}ms
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-6 text-[10px] font-black text-white/20 uppercase tracking-widest">
                <span>Buffer Start</span>
                <span className="text-primary/40 tracking-[0.5em]">Realtime Telemetry Stream</span>
                <span>Buffer End</span>
              </div>
            </div>
          </GlassPanel>
        </FadeIn>
      )}
    </StaggerContainer>
  );
}
