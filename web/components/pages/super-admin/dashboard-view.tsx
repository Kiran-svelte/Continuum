export const dynamic = 'force-dynamic';

import React from 'react';
import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import { Building2, Users, FileText, AlertTriangle, ShieldCheck, Activity, BarChart3, Clock, Database, Server } from 'lucide-react';
import prisma from "@/lib/prisma";
import { checkHealth } from '@/lib/enterprise/health';

import SuperAdminActionPanel from '@/app/super-admin/dashboard/action-panel';

function formatRelativeTime(value: Date): string {
  const diffMs = Date.now() - value.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

function getActionSeverity(action: string): 'error' | 'warn' | 'ok' {
  const upper = action.toUpperCase();
  if (upper.includes('FAILED') || upper.includes('REJECT') || upper.includes('DELETE')) return 'error';
  if (upper.includes('ESCALAT') || upper.includes('WARN') || upper.includes('PENDING')) return 'warn';
  return 'ok';
}

const loadDashboardStats = unstable_cache(
  async () => {
    const [companies, employees, documents, pendingLeaves, health, recentAuditLogs] = await Promise.all([
      prisma.company.count(),
      prisma.employee.count(),
      prisma.document.count(),
      prisma.leaveRequest.count({ where: { status: 'pending' } }),
      checkHealth(),
      prisma.auditLog.findMany({
        orderBy: { created_at: 'desc' },
        take: 6,
        select: {
          id: true,
          action: true,
          entity_type: true,
          entity_id: true,
          created_at: true,
          new_state: true,
        },
      }),
    ]);

    const maxLatency = Object.values(health.checks)
      .map((c) => c.latency ?? 0)
      .reduce((max, latency) => (latency > max ? latency : max), 0);

    const degradedCount = Object.values(health.checks).filter((c) => c.status !== 'healthy').length;

    const alerts = recentAuditLogs.map((entry) => {
      const severity = getActionSeverity(entry.action);
      const stateMessage =
        entry.new_state && typeof entry.new_state === 'object' && !Array.isArray(entry.new_state)
          ? (entry.new_state as Record<string, unknown>).reason || (entry.new_state as Record<string, unknown>).message
          : null;

      return {
        id: entry.id,
        severity,
        title: entry.action.replaceAll('_', ' '),
        details:
          typeof stateMessage === 'string' && stateMessage.trim().length > 0
            ? stateMessage
            : `${entry.entity_type} ${entry.entity_id}`,
        when: formatRelativeTime(entry.created_at),
      };
    });

    return {
      companies,
      employees,
      documents,
      pendingLeaves,
      healthStatus: health.status,
      maxLatency,
      degradedCount,
      alerts,
      isDbActive: true,
    };
  },
  ['super-admin-dashboard-stats'],
  { revalidate: 15 }
);

export default async function DashboardView() {
  
  // Real Database Diagnostics
  let stats = {
    companies: 0,
    employees: 0,
    documents: 0,
    pendingLeaves: 0,
    healthStatus: 'unhealthy',
    maxLatency: 0,
    degradedCount: 0,
    alerts: [] as Array<{ id: string; severity: 'error' | 'warn' | 'ok'; title: string; details: string; when: string }>,
    isDbActive: true
  };

  try {
    stats = await loadDashboardStats();
  } catch {
    // If DB is unavailable, keep conservative zeroed telemetry instead of fabricated counters.
    stats = {
      companies: 0,
      employees: 0,
      documents: 0,
      pendingLeaves: 0,
      healthStatus: 'unhealthy',
      maxLatency: 0,
      degradedCount: 0,
      alerts: [],
      isDbActive: false,
    };
  }

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto w-full p-4 md:p-8">
      
      {/* HEADER DIAGNOSTICS */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4 gap-4">
        <div>
          <h1 className="text-display flex items-center gap-3">
            Super Administrator
            {stats.isDbActive ? (
              <span className="text-[10px] bg-status-success/15 text-status-success border border-status-success/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold animate-pulse flex items-center gap-1">
                <Server className="w-3 h-3" /> Database Connected
              </span>
            ) : (
              <span className="text-[10px] bg-status-danger/15 text-status-danger border border-status-danger/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold animate-pulse flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Database Unavailable
              </span>
            )}
          </h1>
          <p className="text-body mt-2 max-w-xl">Global system telemetry, infrastructure health constraints, and cross-tenant overview.</p>
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
           <div className="text-right border-r border-border pr-4">
             <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Health State</p>
             <p className="text-sm font-medium flex items-center justify-end gap-1 text-status-success"><Activity className="w-4 h-4" /> {stats.healthStatus}</p>
           </div>
           <div className="text-right">
             <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Max Check Latency</p>
             <p className="text-sm font-medium flex items-center justify-end gap-1"><Clock className="w-4 h-4" /> {stats.maxLatency}ms</p>
           </div>
        </div>
      </header>

      {/* CORE TELEMETRY STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
        <div className="card p-5 hoverable">
          <div className="w-10 h-10 rounded-xl bg-status-info/15 text-status-info flex items-center justify-center mb-4">
            <Building2 className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Active Tenants</h3>
          <p className="text-3xl font-black mt-1 text-foreground">{stats.companies.toLocaleString()}</p>
        </div>
        
        <div className="card p-5 hoverable">
          <div className="w-10 h-10 rounded-xl bg-status-success/15 text-status-success flex items-center justify-center mb-4">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Global Personnel</h3>
          <p className="text-3xl font-black mt-1 text-foreground">{stats.employees.toLocaleString()}</p>
        </div>

        <div className="card p-5 hoverable">
          <div className="w-10 h-10 rounded-xl bg-accent/20 text-primary flex items-center justify-center mb-4">
            <Database className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Document Vault</h3>
          <p className="text-3xl font-black mt-1 text-foreground">{stats.documents.toLocaleString()}</p>
        </div>

        <div className="card p-5 hoverable border-status-warning/30">
          <div className="w-10 h-10 rounded-xl bg-status-warning/15 text-status-warning flex items-center justify-center mb-4">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-status-warning uppercase tracking-wider">Active Alerts</h3>
          <p className="text-3xl font-black mt-1 text-foreground">{stats.degradedCount.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* RECENT ALERTS */}
        <section className="card p-0 lg:col-span-2 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border bg-background flex items-center justify-between">
            <h3 className="font-bold text-sm tracking-wide flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-status-success" /> Security & Access Logs</h3>
            <Link href="/admin/audit-logs" className="text-xs text-primary font-semibold hover:underline">View All</Link>
          </div>
          <div className="divide-y divide-border">
            {stats.alerts.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No recent platform audit activity.</div>
            ) : (
              stats.alerts.slice(0, 3).map((item) => (
                <div key={item.id} className="p-4 flex items-start gap-4 hover:bg-accent/50 transition-colors cursor-pointer">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      item.severity === 'error'
                        ? 'bg-status-danger/15 text-status-danger'
                        : item.severity === 'warn'
                           ? 'bg-status-warning/15 text-status-warning'
                          : 'bg-status-success/15 text-status-success'
                    }`}
                  >
                    {item.severity === 'error' ? <AlertTriangle className="w-4 h-4" /> : item.severity === 'warn' ? <FileText className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.details}</p>
                  </div>
                  <div className="ml-auto text-[10px] text-muted-foreground whitespace-nowrap font-medium">{item.when}</div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* QUICK ACTIONS */}
        <section className="card p-0 overflow-hidden shadow-sm">
           <div className="p-4 border-b border-border bg-background">
            <h3 className="font-bold text-sm tracking-wide flex items-center gap-2"><BarChart3 className="w-4 h-4" /> System Actions</h3>
          </div>
          <SuperAdminActionPanel />
        </section>
      </div>

    </div>
  );
}
