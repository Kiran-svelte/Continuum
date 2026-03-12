'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { GlassPanel } from '@/components/glass-panel';
import { StaggerContainer, FadeIn, TiltCard } from '@/components/motion';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
          // Keep last 60 entries (30 min at 30s interval)
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

  // Auto-refresh every 30 seconds
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
    if (status === 'healthy' || status === 'ok') return <Badge variant="success" size="lg">Healthy</Badge>;
    if (status === 'degraded') return <Badge variant="warning" size="lg">Degraded</Badge>;
    if (status === 'unreachable') return <Badge variant="danger" size="lg">Unreachable</Badge>;
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

  // Compute average response time from history
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-40 w-full" />
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const memoryUsedPercent = health?.memory?.heapUsed && health?.memory?.heapTotal
    ? ((health.memory.heapUsed / health.memory.heapTotal) * 100).toFixed(1)
    : null;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Activity className="w-7 h-7 text-violet-500" />
            System Health
          </h1>
          <p className="text-sm text-white/60 mt-1">
            Real-time monitoring of platform infrastructure
            {lastChecked && (
              <span className="ml-2 text-xs">
                Last checked: {lastChecked.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              autoRefresh
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-white/10 bg-white/5 text-white/60'
            }`}
          >
            {autoRefresh ? (
              <Wifi className="w-3.5 h-3.5" />
            ) : (
              <WifiOff className="w-3.5 h-3.5" />
            )}
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchHealth(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* Error Banner */}
      {fetchError && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-400">{fetchError}</p>
          </div>
        </motion.div>
      )}

      {/* Overall Status Banner */}
      <motion.div variants={itemVariants}>
        <GlassPanel className={`border-l-4 ${
          health?.status === 'healthy' || health?.status === 'ok'
            ? 'border-l-emerald-500'
            : health?.status === 'degraded'
              ? 'border-l-amber-500'
              : 'border-l-red-500'
        }`}>
          <div className="p-6 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {getStatusIcon(health?.status ?? 'unknown')}
                <div>
                  <p className="text-sm font-medium text-white">Overall System Status</p>
                  <p className="text-xs text-white/60 mt-0.5">
                    {health?.status === 'healthy' || health?.status === 'ok'
                      ? 'All systems are operating normally'
                      : health?.status === 'degraded'
                        ? 'Some services are experiencing issues'
                        : 'System is currently unreachable or encountering errors'}
                  </p>
                </div>
              </div>
              {getStatusBadge(health?.status ?? 'unknown')}
            </div>
          </div>
        </GlassPanel>
      </motion.div>

      {/* Metric Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* API Status */}
        <GlassPanel>
          <div className="p-6 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">API Status</p>
                <div className="mt-2 flex items-center gap-2">
                  {getStatusIcon(health?.status ?? 'unknown')}
                  <span className={`text-lg font-bold ${getStatusColor(health?.status ?? 'unknown')}`}>
                    {health?.status === 'healthy' || health?.status === 'ok' ? 'Online' : health?.status === 'degraded' ? 'Degraded' : 'Offline'}
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Server className="w-6 h-6 text-blue-500" />
              </div>
            </div>
            {responseTime != null && (
              <p className="text-xs text-white/60 mt-3">Response: {responseTime}ms</p>
            )}
          </div>
        </GlassPanel>

        {/* Database */}
        <GlassPanel>
          <div className="p-6 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Database</p>
                <div className="mt-2 flex items-center gap-2">
                  {getStatusIcon(health?.database ?? health?.checks?.database?.status ?? (health?.status === 'healthy' || health?.status === 'ok' ? 'connected' : 'unknown'))}
                  <span className={`text-lg font-bold ${getStatusColor(
                    health?.database ?? health?.checks?.database?.status ?? (health?.status === 'healthy' || health?.status === 'ok' ? 'connected' : 'unknown')
                  )}`}>
                    {health?.database === 'connected' || health?.checks?.database?.status === 'ok' || health?.status === 'healthy' || health?.status === 'ok'
                      ? 'Connected'
                      : 'Error'}
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
                <Database className="w-6 h-6 text-violet-500" />
              </div>
            </div>
            {health?.checks?.database?.latency != null && (
              <p className="text-xs text-white/60 mt-3">Latency: {health.checks.database.latency}ms</p>
            )}
          </div>
        </GlassPanel>

        {/* Uptime */}
        <GlassPanel>
          <div className="p-6 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Uptime</p>
                <p className="text-lg font-bold text-white mt-2">
                  {health?.uptime != null ? formatUptime(health.uptime) : 'N/A'}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
            {uptimePercent != null && (
              <p className="text-xs text-white/60 mt-3">Availability: {uptimePercent}%</p>
            )}
          </div>
        </GlassPanel>

        {/* Memory */}
        <GlassPanel>
          <div className="p-6 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Memory Usage</p>
                <p className="text-lg font-bold text-white mt-2">
                  {health?.memory?.heapUsed != null ? formatBytes(health.memory.heapUsed) : 'N/A'}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <MemoryStick className="w-6 h-6 text-amber-500" />
              </div>
            </div>
            {memoryUsedPercent != null && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-white/60 mb-1">
                  <span>Heap usage</span>
                  <span>{memoryUsedPercent}%</span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      parseFloat(memoryUsedPercent) > 90
                        ? 'bg-red-500'
                        : parseFloat(memoryUsedPercent) > 70
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(parseFloat(memoryUsedPercent), 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </GlassPanel>
      </motion.div>

      {/* Detailed Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Memory Details */}
        <motion.div variants={itemVariants}>
          <GlassPanel>
            <div className="p-6 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-white/60" />
                Memory Details
              </h3>
            </div>
            <div className="p-6 relative z-10">
              {health?.memory ? (
                <div className="space-y-4">
                  {[
                    { label: 'RSS (Resident Set Size)', value: health.memory.rss, icon: Cpu },
                    { label: 'Heap Used', value: health.memory.heapUsed, icon: MemoryStick },
                    { label: 'Heap Total', value: health.memory.heapTotal, icon: HardDrive },
                    { label: 'External', value: health.memory.external, icon: Server },
                    { label: 'Array Buffers', value: health.memory.arrayBuffers, icon: Database },
                  ].map(({ label, value, icon: Icon }) => (
                    value != null && (
                      <div key={label} className="flex items-center justify-between py-2 border-b border-white/10 last:border-0">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-white/60" />
                          <span className="text-sm text-white/60">{label}</span>
                        </div>
                        <span className="text-sm font-medium text-white font-mono">{formatBytes(value)}</span>
                      </div>
                    )
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MemoryStick className="w-8 h-8 text-white/60 mx-auto mb-2" />
                  <p className="text-sm text-white/60">Memory data not available</p>
                </div>
              )}
            </div>
          </GlassPanel>
        </motion.div>

        {/* Environment Info */}
        <motion.div variants={itemVariants}>
          <GlassPanel>
            <div className="p-6 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-white/60" />
                Environment Info
              </h3>
            </div>
            <div className="p-6 relative z-10">
              <div className="space-y-4">
                {[
                  { label: 'Node Version', value: health?.node_version ?? health?.version ?? 'N/A' },
                  { label: 'Environment', value: health?.environment ?? process.env.NODE_ENV ?? 'N/A' },
                  { label: 'Timestamp', value: health?.timestamp ? new Date(health.timestamp).toLocaleString() : 'N/A' },
                  { label: 'Avg Response Time', value: avgResponseTime != null ? `${avgResponseTime}ms` : 'N/A' },
                  { label: 'Health Checks', value: `${healthHistory.length} recorded` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-white/10 last:border-0">
                    <span className="text-sm text-white/60">{label}</span>
                    <span className="text-sm font-medium text-white font-mono">{value}</span>
                  </div>
                ))}

                {/* Service Checks */}
                {health?.checks && (
                  <div className="pt-2 space-y-3">
                    <p className="text-xs font-medium text-white/60 uppercase tracking-wider">Service Checks</p>
                    {Object.entries(health.checks).map(([service, check]) => (
                      <div key={service} className="flex items-center justify-between">
                        <span className="text-sm text-white/60 capitalize">{service}</span>
                        <div className="flex items-center gap-2">
                          {'latency' in check && check.latency != null && (
                            <span className="text-xs text-white/60">{check.latency}ms</span>
                          )}
                          {getStatusIcon(check.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </GlassPanel>
        </motion.div>
      </div>

      {/* Response Time History */}
      {healthHistory.length > 1 && (
        <motion.div variants={itemVariants}>
          <GlassPanel>
            <div className="p-6 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Timer className="w-5 h-5 text-white/60" />
                Response Time History
              </h3>
            </div>
            <div className="p-6 relative z-10">
              <div className="flex items-end gap-1 h-24">
                {healthHistory.map((entry, i) => {
                  const maxTime = Math.max(...healthHistory.map(e => e.responseTime), 1);
                  const heightPercent = (entry.responseTime / maxTime) * 100;
                  const isHealthy = entry.status === 'healthy' || entry.status === 'ok';
                  return (
                    <div
                      key={i}
                      className="flex-1 min-w-[3px] max-w-[12px] group relative"
                      title={`${entry.responseTime}ms - ${entry.timestamp.toLocaleTimeString()}`}
                    >
                      <div
                        className={`w-full rounded-t transition-all duration-300 ${
                          isHealthy
                            ? 'bg-indigo-400/50 group-hover:bg-indigo-500'
                            : 'bg-red-400/50 group-hover:bg-red-500'
                        }`}
                        style={{ height: `${Math.max(heightPercent, 4)}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-3 text-xs text-white/60">
                <span>{healthHistory[0]?.timestamp.toLocaleTimeString()}</span>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Gauge className="w-3 h-3" />
                    Avg: {avgResponseTime}ms
                  </span>
                  <span className="flex items-center gap-1">
                    Min: {Math.min(...healthHistory.map(e => e.responseTime))}ms
                  </span>
                  <span className="flex items-center gap-1">
                    Max: {Math.max(...healthHistory.map(e => e.responseTime))}ms
                  </span>
                </div>
                <span>{healthHistory[healthHistory.length - 1]?.timestamp.toLocaleTimeString()}</span>
              </div>
            </div>
          </GlassPanel>
        </motion.div>
      )}

      {/* Recent Error Logs */}
      {health?.errors && health.errors.length > 0 && (
        <motion.div variants={itemVariants}>
          <GlassPanel>
            <div className="p-6 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Recent Error Logs
              </h3>
            </div>
            <div className="p-0 relative z-10">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Level</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Message</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {health.errors.map((error, i) => (
                      <tr key={i} className="border-b border-white/10 last:border-0 hover:bg-white/5">
                        <td className="px-6 py-3">
                          <Badge variant={error.level === 'error' ? 'danger' : error.level === 'warn' ? 'warning' : 'default'}>
                            {error.level || 'error'}
                          </Badge>
                        </td>
                        <td className="px-6 py-3 font-mono text-xs text-white max-w-md truncate">
                          {error.message}
                        </td>
                        <td className="px-6 py-3 text-white/60 whitespace-nowrap">
                          {new Date(error.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </GlassPanel>
        </motion.div>
      )}

      {/* Auto-refresh indicator */}
      {autoRefresh && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-center gap-2 text-xs text-white/60">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Auto-refreshing every 30 seconds</span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
