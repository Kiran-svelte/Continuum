'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } } as const;
const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 20 } } } as const;

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
    { label: 'Audit Logs', href: '/hr/audit-logs', icon: Shield, color: 'text-amber-500' },
    { label: 'Employees', href: '/hr/employees', icon: Users, color: 'text-blue-500' },
    { label: 'Payroll', href: '/hr/payroll', icon: Wallet, color: 'text-emerald-500' },
    { label: 'Settings', href: '/hr/settings', icon: Settings, color: 'text-slate-500' },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">System overview and administrative controls</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Employees</p>
                <p className="text-3xl font-bold text-foreground mt-1">{totalEmployees}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
              <span>Active workforce</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today Present</p>
                <p className="text-3xl font-bold text-foreground mt-1">{todayPresent}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
              <span>Checked in today</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Leaves</p>
                <p className="text-3xl font-bold text-foreground mt-1">{pendingLeaves}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-amber-500" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
              <span>Awaiting approval</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">System Health</p>
                <div className="mt-1">{getHealthBadge(healthStatus)}</div>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                healthStatus === 'healthy' || healthStatus === 'ok'
                  ? 'bg-emerald-500/10 dark:bg-emerald-500/20'
                  : healthStatus === 'degraded'
                    ? 'bg-amber-500/10 dark:bg-amber-500/20'
                    : 'bg-red-500/10 dark:bg-red-500/20'
              }`}>
                <Activity className={`w-6 h-6 ${
                  healthStatus === 'healthy' || healthStatus === 'ok'
                    ? 'text-emerald-500'
                    : healthStatus === 'degraded'
                      ? 'text-amber-500'
                      : 'text-red-500'
                }`} />
              </div>
            </div>
            <div className="mt-3">
              <Link href="/admin/system-health" className="text-xs text-primary hover:underline">
                View details
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {quickActions.map((action) => (
                <Link key={action.href} href={action.href}>
                  <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-muted/50 dark:hover:bg-slate-800/50 transition-all cursor-pointer group">
                    <action.icon className={`w-5 h-5 ${action.color} group-hover:scale-110 transition-transform`} />
                    <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center">{action.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Two Column Layout: Audit Logs + Payroll & System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Audit Logs */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent Audit Logs</CardTitle>
              <Link href="/hr/audit-logs">
                <Button variant="ghost" size="sm">
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {auditLogs.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <Shield className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No recent audit activity</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 text-left">
                        <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</th>
                        <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Entity</th>
                        <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actor</th>
                        <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="border-b border-border/30 last:border-0 hover:bg-muted/30 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-3">
                            <span className="font-medium text-foreground">{log.action}</span>
                          </td>
                          <td className="px-6 py-3 text-muted-foreground">
                            {log.entity_type ? `${log.entity_type}${log.entity_id ? ` #${log.entity_id.slice(0, 8)}` : ''}` : '-'}
                          </td>
                          <td className="px-6 py-3 text-muted-foreground">
                            {log.actor_name || log.actor_email || '-'}
                          </td>
                          <td className="px-6 py-3 text-muted-foreground whitespace-nowrap">
                            {timeAgo(log.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Right Column: Payroll + System Overview */}
        <motion.div variants={itemVariants} className="space-y-6">
          {/* Recent Payroll Runs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Payroll Runs</CardTitle>
            </CardHeader>
            <CardContent>
              {payrollRuns.length === 0 ? (
                <div className="text-center py-6">
                  <Wallet className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No payroll runs found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payrollRuns.map((run) => (
                    <div key={run.id} className="flex items-center justify-between p-3 rounded-lg border border-border/40 hover:bg-muted/30 dark:hover:bg-slate-800/30 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {run.month} {run.year}
                        </p>
                        {run.employee_count != null && (
                          <p className="text-xs text-muted-foreground">{run.employee_count} employees</p>
                        )}
                      </div>
                      {getPayrollStatusBadge(run.status)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">System Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">API Status</span>
                  </div>
                  {healthStatus === 'healthy' || healthStatus === 'ok' ? (
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Online</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">Issues</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Database</span>
                  </div>
                  {healthData?.database === 'connected' || healthData?.database === 'ok' || (healthStatus === 'healthy' || healthStatus === 'ok') ? (
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Connected</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-red-600 dark:text-red-400 font-medium">Error</span>
                    </div>
                  )}
                </div>

                {healthData?.uptime != null && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Uptime</span>
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {Math.floor(healthData.uptime / 3600)}h {Math.floor((healthData.uptime % 3600) / 60)}m
                    </span>
                  </div>
                )}

                {healthData?.memory?.heapUsed != null && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Memory</span>
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {(healthData.memory.heapUsed / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t border-border/40">
                  <Link href="/admin/system-health">
                    <Button variant="ghost" size="sm" className="w-full justify-center">
                      View Full Health Report <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
