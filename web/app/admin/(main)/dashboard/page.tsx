'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { StaggerContainer, FadeIn, TiltCard } from '@/components/motion';
import { PageHeader } from '@/components/page-header';
import { GlassPanel } from '@/components/glass-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SkeletonDashboard } from '@/components/ui/skeleton';
import { ensureMe } from '@/lib/client-auth';
import {
  Users,
  Clock,
  ClipboardList,
  Activity,
  ShieldCheck,
  Shield,
  Settings,
  ChevronRight,
  Wallet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Database,
  Server,
  RefreshCw,
} from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  actor_name?: string;
  actor_email?: string;
  created_at: string;
  details?: string;
}

interface PayrollRun {
  id: string;
  month: string;
  year: number;
  status: string;
  total_amount?: number;
  employee_count?: number;
  created_at: string;
}

interface HealthData {
  status: string;
  database?: string;
  uptime?: number;
  memory?: { rss?: number; heapUsed?: number; heapTotal?: number };
  version?: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [todayPresent, setTodayPresent] = useState(0);
  const [pendingLeaves, setPendingLeaves] = useState(0);
  const [healthStatus, setHealthStatus] = useState<string>('unknown');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      const me = await ensureMe();
      if (!me) {
        router.replace('/sign-in');
        return;
      }

      const [empRes, attendRes, leaveRes, healthRes, auditRes, payrollRes] = await Promise.allSettled([
        fetch('/api/employees?limit=1'),
        fetch('/api/hr/attendance'),
        fetch('/api/leaves/list?status=pending'),
        fetch('/api/health'),
        fetch('/api/audit-logs?limit=10'),
        fetch('/api/payroll/history?limit=5'),
      ]);

      // Employee count
      if (empRes.status === 'fulfilled' && empRes.value.ok) {
        const data = await empRes.value.json();
        setTotalEmployees(data.total ?? data.employees?.length ?? 0);
      }

      // Attendance
      if (attendRes.status === 'fulfilled' && attendRes.value.ok) {
        const data = await attendRes.value.json();
        const records = data.records ?? data.attendance ?? [];
        const presentCount = Array.isArray(records)
          ? records.filter((r: any) => r.status === 'present' || r.check_in).length
          : 0;
        setTodayPresent(presentCount);
      }

      // Pending leaves
      if (leaveRes.status === 'fulfilled' && leaveRes.value.ok) {
        const data = await leaveRes.value.json();
        setPendingLeaves(data.total ?? data.leaves?.length ?? 0);
      }

      // Health
      if (healthRes.status === 'fulfilled' && healthRes.value.ok) {
        const data = await healthRes.value.json();
        setHealthStatus(data.status ?? 'healthy');
        setHealthData(data);
      } else {
        setHealthStatus('degraded');
      }

      // Audit logs
      if (auditRes.status === 'fulfilled' && auditRes.value.ok) {
        const data = await auditRes.value.json();
        setAuditLogs(data.logs ?? data.audit_logs ?? []);
      }

      // Payroll runs
      if (payrollRes.status === 'fulfilled' && payrollRes.value.ok) {
        const data = await payrollRes.value.json();
        setPayrollRuns(data.runs ?? data.payroll_runs ?? data.history ?? []);
      }
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  function getHealthBadge(status: string) {
    if (status === 'healthy' || status === 'ok') return <Badge variant="success">Healthy</Badge>;
    if (status === 'degraded') return <Badge variant="warning">Degraded</Badge>;
    return <Badge variant="danger">Down</Badge>;
  }

  function getPayrollStatusBadge(status: string) {
    switch (status) {
      case 'completed':
      case 'processed':
        return <Badge variant="success">Completed</Badge>;
      case 'processing':
      case 'in_progress':
        return <Badge variant="info">Processing</Badge>;
      case 'failed':
        return <Badge variant="danger">Failed</Badge>;
      case 'draft':
        return <Badge variant="default">Draft</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  }

  if (loading) {
    return <SkeletonDashboard />;
  }

  const quickActions = [
    { label: 'RBAC Settings', href: '/admin/rbac', icon: ShieldCheck, color: 'text-indigo-500' },
    { label: 'System Health', href: '/admin/system-health', icon: Activity, color: 'text-violet-500' },
    { label: 'Audit Logs', href: '/admin/audit-logs', icon: Shield, color: 'text-amber-500' },
    { label: 'Employees', href: '/hr/employees', icon: Users, color: 'text-blue-500' },
    { label: 'Payroll', href: '/hr/payroll', icon: Wallet, color: 'text-emerald-500' },
    { label: 'Settings', href: '/hr/settings', icon: Settings, color: 'text-slate-400' },
  ];

  return (
    <StaggerContainer className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Admin Dashboard"
        description="System overview and administrative controls"
        icon={<ShieldCheck className="w-6 h-6 text-primary" />}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="border-white/10 text-white/70 hover:bg-white/5 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      {/* Summary Cards */}
      <FadeIn>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <TiltCard>
            <GlassPanel className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/60">Total Employees</p>
                  <p className="text-3xl font-bold text-white mt-1">{totalEmployees}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs text-white/60">
                <span>Active workforce</span>
              </div>
            </GlassPanel>
          </TiltCard>

          <TiltCard>
            <GlassPanel className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/60">Today Present</p>
                  <p className="text-3xl font-bold text-white mt-1">{todayPresent}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  <Clock className="w-6 h-6 text-emerald-400" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs text-white/60">
                <span>Checked in today</span>
              </div>
            </GlassPanel>
          </TiltCard>

          <TiltCard>
            <GlassPanel className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/60">Pending Leaves</p>
                  <p className="text-3xl font-bold text-white mt-1">{pendingLeaves}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                  <ClipboardList className="w-6 h-6 text-amber-400" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs text-white/60">
                <span>Awaiting approval</span>
              </div>
            </GlassPanel>
          </TiltCard>

          <TiltCard>
            <GlassPanel className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/60">System Health</p>
                  <div className="mt-1">{getHealthBadge(healthStatus)}</div>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  healthStatus === 'healthy' || healthStatus === 'ok'
                    ? 'bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                    : healthStatus === 'degraded'
                      ? 'bg-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                      : 'bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                }`}>
                  <Activity className={`w-6 h-6 ${
                    healthStatus === 'healthy' || healthStatus === 'ok'
                      ? 'text-emerald-400'
                      : healthStatus === 'degraded'
                        ? 'text-amber-400'
                        : 'text-red-400'
                  }`} />
                </div>
              </div>
              <div className="mt-3">
                <Link href="/admin/system-health" className="text-xs text-primary hover:underline">
                  View details
                </Link>
              </div>
            </GlassPanel>
          </TiltCard>
        </div>
      </FadeIn>

      {/* Quick Actions */}
      <FadeIn>
        <GlassPanel>
          <div className="p-6 pb-4">
            <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
          </div>
          <div className="px-6 pb-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {quickActions.map((action) => (
                <Link key={action.href} href={action.href}>
                  <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-white/10 hover:border-primary/30 hover:bg-white/5 transition-all cursor-pointer group">
                    <action.icon className={`w-5 h-5 ${action.color} group-hover:scale-110 transition-transform`} />
                    <span className="text-xs font-medium text-white/60 group-hover:text-white transition-colors text-center">{action.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </GlassPanel>
      </FadeIn>

      {/* Two Column Layout: Audit Logs + Payroll & System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Audit Logs */}
        <FadeIn className="lg:col-span-2">
          <GlassPanel>
            <div className="p-6 pb-4 flex flex-row items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Recent Audit Logs</h2>
              <Link href="/admin/audit-logs">
                <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/5">
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="px-6 pb-6">
              {auditLogs.length === 0 ? (
                <div className="py-8 text-center">
                  <Shield className="w-8 h-8 text-white/30 mx-auto mb-2" />
                  <p className="text-sm text-white/60">No recent audit activity</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-left">
                        <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Action</th>
                        <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Entity</th>
                        <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Actor</th>
                        <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-medium text-white">{log.action}</span>
                          </td>
                          <td className="px-4 py-3 text-white/60">
                            {log.entity_type ? `${log.entity_type}${log.entity_id ? ` #${log.entity_id.slice(0, 8)}` : ''}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-white/60">
                            {log.actor_name || log.actor_email || '-'}
                          </td>
                          <td className="px-4 py-3 text-white/60 whitespace-nowrap">
                            {timeAgo(log.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </GlassPanel>
        </FadeIn>

        {/* Right Column: Payroll + System Overview */}
        <FadeIn className="space-y-6">
          {/* Recent Payroll Runs */}
          <GlassPanel>
            <div className="p-6 pb-4">
              <h2 className="text-lg font-semibold text-white">Recent Payroll Runs</h2>
            </div>
            <div className="px-6 pb-6">
              {payrollRuns.length === 0 ? (
                <div className="text-center py-6">
                  <Wallet className="w-8 h-8 text-white/30 mx-auto mb-2" />
                  <p className="text-sm text-white/60">No payroll runs found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payrollRuns.map((run) => (
                    <div key={run.id} className="flex items-center justify-between p-3 rounded-lg border border-white/10 hover:bg-white/5 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {run.month} {run.year}
                        </p>
                        {run.employee_count != null && (
                          <p className="text-xs text-white/60">{run.employee_count} employees</p>
                        )}
                      </div>
                      {getPayrollStatusBadge(run.status)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </GlassPanel>

          {/* System Overview */}
          <GlassPanel>
            <div className="p-6 pb-4">
              <h2 className="text-lg font-semibold text-white">System Overview</h2>
            </div>
            <div className="px-6 pb-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-white/60" />
                    <span className="text-sm text-white/60">API Status</span>
                  </div>
                  {healthStatus === 'healthy' || healthStatus === 'ok' ? (
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm text-emerald-400 font-medium">Online</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      <span className="text-sm text-amber-400 font-medium">Issues</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-white/60" />
                    <span className="text-sm text-white/60">Database</span>
                  </div>
                  {healthData?.database === 'connected' || healthData?.database === 'ok' || (healthStatus === 'healthy' || healthStatus === 'ok') ? (
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm text-emerald-400 font-medium">Connected</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-red-400 font-medium">Error</span>
                    </div>
                  )}
                </div>

                {healthData?.uptime != null && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-white/60" />
                      <span className="text-sm text-white/60">Uptime</span>
                    </div>
                    <span className="text-sm font-medium text-white">
                      {Math.floor(healthData.uptime / 3600)}h {Math.floor((healthData.uptime % 3600) / 60)}m
                    </span>
                  </div>
                )}

                {healthData?.memory?.heapUsed != null && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-white/60" />
                      <span className="text-sm text-white/60">Memory</span>
                    </div>
                    <span className="text-sm font-medium text-white">
                      {(healthData.memory.heapUsed / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t border-white/10">
                  <Link href="/admin/system-health">
                    <Button variant="ghost" size="sm" className="w-full justify-center text-white/60 hover:text-white hover:bg-white/5">
                      View Full Health Report <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </GlassPanel>
        </FadeIn>
      </div>
    </StaggerContainer>
  );
}
