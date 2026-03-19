'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Skeleton, SkeletonTable } from '@/components/ui/skeleton';
import { GlassPanel } from '@/components/glass-panel';
import { PageHeader } from '@/components/page-header';
import { StaggerContainer, FadeIn, MagneticButton, GlowCard, ScrollReveal } from '@/components/motion';
import { ensureMe } from '@/lib/client-auth';
import {
  Shield,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Filter,
} from 'lucide-react';

interface AuditLogActor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actor: AuditLogActor | null;
  ipAddress: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const ACTION_BADGE_MAP: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'default'> = {
  LOGIN: 'info',
  LOGOUT: 'default',
  CREATE: 'success',
  UPDATE: 'warning',
  DELETE: 'danger',
  APPROVE: 'success',
  REJECT: 'danger',
  SUBMIT: 'info',
  PASSWORD_CHANGE: 'warning',
  FAILED_LOGIN: 'danger',
  ROLE_CHANGE: 'warning',
  SIGN_OUT: 'default',
  COMPANY_SETTINGS_UPDATE: 'warning',
};

function getActionBadgeVariant(action: string): 'success' | 'info' | 'warning' | 'danger' | 'default' {
  if (ACTION_BADGE_MAP[action]) return ACTION_BADGE_MAP[action];
  const upper = action.toUpperCase();
  if (upper.includes('CREATE') || upper.includes('APPROVE')) return 'success';
  if (upper.includes('DELETE') || upper.includes('REJECT') || upper.includes('FAIL')) return 'danger';
  if (upper.includes('UPDATE') || upper.includes('CHANGE')) return 'warning';
  if (upper.includes('LOGIN') || upper.includes('SUBMIT')) return 'info';
  return 'default';
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatAction(action: string): string {
  return action
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function AuditLogsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, pages: 0 });
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  const fetchLogs = useCallback(async (page = 1) => {
    try {
      const me = await ensureMe();
      if (!me) {
        router.replace('/sign-in');
        return;
      }

      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '50');
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (actionFilter) params.set('action', actionFilter);
      if (entityFilter) params.set('entityType', entityFilter);

      const res = await fetch(`/api/audit-logs?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load audit logs');
      }

      const data = await res.json();
      setLogs(data.logs ?? []);
      setPagination(data.pagination ?? { page: 1, limit: 50, total: 0, pages: 0 });
      setError(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load audit logs';
      console.error('Failed to load audit logs:', err);
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router, searchQuery, actionFilter, entityFilter]);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLogs(pagination.page);
  };

  const handleSearch = () => {
    setLoading(true);
    fetchLogs(1);
  };

  const handlePageChange = (newPage: number) => {
    setLoading(true);
    fetchLogs(newPage);
  };

  const uniqueActions = Array.from(new Set(logs.map((l) => l.action))).sort();
  const uniqueEntities = Array.from(new Set(logs.map((l) => l.entityType))).sort();

  if (loading && logs.length === 0) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
        <SkeletonTable rows={10} columns={5} />
      </div>
    );
  }

  return (
    <StaggerContainer className="space-y-6">
      <FadeIn>
        <PageHeader
          title="Audit Logs"
          description={
            pagination.total > 0
              ? `${pagination.total} total entries across ${pagination.pages} page${pagination.pages !== 1 ? 's' : ''}`
              : 'Track all system activity and changes'
          }
          icon={<Shield className="w-6 h-6 text-primary" />}
          action={
            <MagneticButton
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </MagneticButton>
          }
        />
      </FadeIn>

      {error && (
        <FadeIn>
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        </FadeIn>
      )}

      {/* Enhanced Filters with GlowCard */}
      <FadeIn>
        <GlowCard className="p-4" color="rgba(129, 140, 248, 0.4)">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
              <input
                type="text"
                placeholder="Search actions, entities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
                className="w-full pl-9 pr-4 py-2 rounded-lg border bg-white/5 border-white/10 text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              />
            </div>
            <div className="flex gap-4">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="pl-9 pr-8 py-2 rounded-lg border bg-white/5 border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all appearance-none cursor-pointer"
                >
                  <option value="">All Actions</option>
                  {uniqueActions.map((action) => (
                    <option key={action} value={action}>{formatAction(action)}</option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
                <select
                  value={entityFilter}
                  onChange={(e) => setEntityFilter(e.target.value)}
                  className="pl-9 pr-8 py-2 rounded-lg border bg-white/5 border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all appearance-none cursor-pointer"
                >
                  <option value="">All Entities</option>
                  {uniqueEntities.map((entity) => (
                    <option key={entity} value={entity}>{entity}</option>
                  ))}
                </select>
              </div>
              <MagneticButton variant="gradient" size="sm" onClick={handleSearch} className="shrink-0">
                <Search className="w-4 h-4 mr-1.5" />
                Search Now
              </MagneticButton>
            </div>
          </div>
        </GlowCard>
      </FadeIn>

      <FadeIn>
        <GlassPanel>
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Activity Log</h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Live Monitoring</span>
            </div>
          </div>
          <div className="p-0 relative z-10">
            {logs.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Shield className="w-10 h-10 text-white/60 mx-auto mb-3" />
                <p className="text-sm text-white/60">No audit log entries found</p>
                {(searchQuery || actionFilter || entityFilter) && (
                  <MagneticButton
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      setSearchQuery('');
                      setActionFilter('');
                      setEntityFilter('');
                    }}
                  >
                    Clear Filters
                  </MagneticButton>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left">
                      <th className="px-6 py-4 text-xs font-semibold text-white/40 uppercase tracking-widest whitespace-nowrap">Date & Time</th>
                      <th className="px-6 py-4 text-xs font-semibold text-white/40 uppercase tracking-widest whitespace-nowrap">Actioned By</th>
                      <th className="px-6 py-4 text-xs font-semibold text-white/40 uppercase tracking-widest whitespace-nowrap">Event Type</th>
                      <th className="px-6 py-4 text-xs font-semibold text-white/40 uppercase tracking-widest whitespace-nowrap">Target Entity</th>
                      <th className="px-6 py-4 text-xs font-semibold text-white/40 uppercase tracking-widest whitespace-nowrap text-right">Identifier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, index) => (
                      <ScrollReveal
                        key={log.id}
                        as="tr"
                        direction="up"
                        distance={10}
                        delay={index * 0.02}
                        className="border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors group cursor-default"
                      >
                        <td className="px-6 py-4 text-white/60 whitespace-nowrap font-mono text-[11px]">
                          <div className="flex flex-col">
                            <span className="text-white font-medium">{formatDate(log.createdAt).split(',')[0]}</span>
                            <span className="text-white/40">{formatDate(log.createdAt).split(',')[1]}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {log.actor ? (
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-[10px] font-bold text-indigo-300 border border-indigo-500/20">
                                {log.actor.firstName[0]}{log.actor.lastName[0]}
                              </div>
                              <div>
                                <p className="font-medium text-white group-hover:text-primary transition-colors">
                                  {log.actor.firstName} {log.actor.lastName}
                                </p>
                                <p className="text-[10px] text-white/30 font-mono tracking-tighter">{log.actor.email}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-white/40 italic">
                              <Shield className="w-3 h-3" />
                              <span className="text-xs">System Process</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant={getActionBadgeVariant(log.action)}
                            className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-opacity-10 border border-current shadow-[0_0_10px_rgba(current,0.1)]"
                          >
                            {formatAction(log.action)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white/80 uppercase tracking-tighter group-hover:text-white transition-colors">
                              {log.entityType}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="px-2 py-1 rounded bg-white/5 font-mono text-[10px] text-white/40 border border-white/10 group-hover:border-white/20 group-hover:text-white/60 transition-all">
                            {log.entityId.length > 12 ? `${log.entityId.slice(0, 12)}...` : log.entityId}
                          </span>
                        </td>
                      </ScrollReveal>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </GlassPanel>
      </FadeIn>

      {pagination.pages > 1 && (
        <FadeIn className="flex items-center justify-between">
          <p className="text-sm text-white/60">
            Page <span className="text-white font-bold">{pagination.page}</span> of <span className="text-white/40">{pagination.pages}</span>
          </p>
          <div className="flex items-center gap-3">
            <MagneticButton
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => handlePageChange(pagination.page - 1)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Prev
            </MagneticButton>
            <MagneticButton
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.pages}
              onClick={() => handlePageChange(pagination.page + 1)}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </MagneticButton>
          </div>
        </FadeIn>
      )}
    </StaggerContainer>
  );
}
