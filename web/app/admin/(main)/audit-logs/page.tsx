'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton, SkeletonTable } from '@/components/ui/skeleton';
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 20 } },
} as const;

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
  // Check for exact match
  if (ACTION_BADGE_MAP[action]) return ACTION_BADGE_MAP[action];
  // Check for partial match
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

  // Collect unique actions and entity types from loaded logs for filter dropdowns
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
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Shield className="w-7 h-7 text-indigo-500" />
            Audit Logs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {pagination.total > 0
              ? `${pagination.total} total entries across ${pagination.pages} page${pagination.pages !== 1 ? 's' : ''}`
              : 'Track all system activity and changes'}
          </p>
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

      {/* Error Banner */}
      {error && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search actions, entities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-card dark:bg-[#0c1021] text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="pl-9 pr-8 py-2 rounded-lg border border-border bg-card dark:bg-[#0c1021] text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all appearance-none cursor-pointer"
          >
            <option value="">All Actions</option>
            {uniqueActions.map((action) => (
              <option key={action} value={action}>{formatAction(action)}</option>
            ))}
          </select>
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="pl-9 pr-8 py-2 rounded-lg border border-border bg-card dark:bg-[#0c1021] text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all appearance-none cursor-pointer"
          >
            <option value="">All Entities</option>
            {uniqueEntities.map((entity) => (
              <option key={entity} value={entity}>{entity}</option>
            ))}
          </select>
        </div>
        <Button variant="primary" size="sm" onClick={handleSearch} className="sm:w-auto">
          <Search className="w-4 h-4 mr-1.5" />
          Search
        </Button>
      </motion.div>

      {/* Audit Log Table */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity Log</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {logs.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No audit log entries found</p>
                {(searchQuery || actionFilter || entityFilter) && (
                  <Button
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
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-left">
                      <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">Date</th>
                      <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">Actor</th>
                      <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">Action</th>
                      <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">Entity</th>
                      <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">IP Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-border/30 last:border-0 hover:bg-muted/30 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-6 py-3 text-muted-foreground whitespace-nowrap">
                          {formatDate(log.createdAt)}
                        </td>
                        <td className="px-6 py-3">
                          {log.actor ? (
                            <div>
                              <p className="font-medium text-foreground">
                                {log.actor.firstName} {log.actor.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">{log.actor.email}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">System</span>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          <Badge variant={getActionBadgeVariant(log.action)}>
                            {formatAction(log.action)}
                          </Badge>
                        </td>
                        <td className="px-6 py-3 text-muted-foreground">
                          <div>
                            <span className="font-medium text-foreground">{log.entityType}</span>
                            {log.entityId && (
                              <p className="text-xs text-muted-foreground font-mono">
                                {log.entityId.length > 12 ? `${log.entityId.slice(0, 12)}...` : log.entityId}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3 text-muted-foreground font-mono text-xs whitespace-nowrap">
                          {log.ipAddress || '-'}
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

      {/* Pagination */}
      {pagination.pages > 1 && (
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.pages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => handlePageChange(pagination.page - 1)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.pages}
              onClick={() => handlePageChange(pagination.page + 1)}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
