'use client';

import { Fragment, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Search,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  X,
  Inbox,
  CheckCircle,
  Clock,
  AlertTriangle,
  Download,
  FileText,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react';
import { useDebounce } from '@/lib/use-debounce';
import { StaggerContainer, FadeIn, TiltCard } from '@/components/motion';
import { PageHeader } from '@/components/page-header';
import { GlassPanel } from '@/components/glass-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { downloadCSVLegacy, downloadPDF } from '@/lib/report-export';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuditActor {
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
  actor: AuditActor | null;
  previousState: Record<string, unknown> | null;
  newState: Record<string, unknown> | null;
  integrityHash: string;
  prevHash: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface ChainStatus {
  valid: boolean;
  totalLogs: number;
  verifiedLogs: number;
  details?: string;
  brokenAt?: number | string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'LEAVE_SUBMIT', label: 'Leave Submit' },
  { value: 'LEAVE_APPROVE', label: 'Leave Approve' },
  { value: 'LEAVE_REJECT', label: 'Leave Reject' },
  { value: 'LEAVE_CANCEL', label: 'Leave Cancel' },
  { value: 'LEAVE_ESCALATE', label: 'Leave Escalate' },
  { value: 'LEAVE_BALANCE_ADJUST', label: 'Leave Balance Adjust' },
  { value: 'LEAVE_ENCASH', label: 'Leave Encash' },
  { value: 'LEAVE_SLA_BREACH', label: 'Leave SLA Breach' },
  { value: 'EMPLOYEE_CREATE', label: 'Employee Create' },
  { value: 'EMPLOYEE_UPDATE', label: 'Employee Update' },
  { value: 'EMPLOYEE_DELETE', label: 'Employee Delete' },
  { value: 'EMPLOYEE_STATUS_CHANGE', label: 'Employee Status Change' },
  { value: 'EMPLOYEE_ROLE_CHANGE', label: 'Employee Role Change' },
  { value: 'EMPLOYEE_MOVEMENT', label: 'Employee Movement' },
  { value: 'ATTENDANCE_CHECK_IN', label: 'Attendance Check In' },
  { value: 'ATTENDANCE_CHECK_OUT', label: 'Attendance Check Out' },
  { value: 'ATTENDANCE_REGULARIZE', label: 'Attendance Regularize' },
  { value: 'ATTENDANCE_OVERRIDE', label: 'Attendance Override' },
  { value: 'PAYROLL_GENERATE', label: 'Payroll Generate' },
  { value: 'PAYROLL_APPROVE', label: 'Payroll Approve' },
  { value: 'PAYROLL_PROCESS', label: 'Payroll Process' },
  { value: 'COMPANY_SETTINGS_UPDATE', label: 'Company Settings Update' },
  { value: 'COMPANY_POLICY_CREATE', label: 'Company Policy Create' },
  { value: 'COMPANY_POLICY_UPDATE', label: 'Company Policy Update' },
  { value: 'LOGIN', label: 'Login' },
  { value: 'LOGOUT', label: 'Logout' },
  { value: 'PERMISSION_CHANGE', label: 'Permission Change' },
  { value: 'DATA_EXPORT', label: 'Data Export' },
];

const ENTITY_TYPE_OPTIONS = [
  { value: '', label: 'All Entity Types' },
  { value: 'LeaveRequest', label: 'Leave Request' },
  { value: 'Employee', label: 'Employee' },
  { value: 'LeaveBalance', label: 'Leave Balance' },
  { value: 'LeaveType', label: 'Leave Type' },
  { value: 'PublicHoliday', label: 'Public Holiday' },
  { value: 'Company', label: 'Company' },
  { value: 'Attendance', label: 'Attendance' },
  { value: 'Payroll', label: 'Payroll' },
  { value: 'Permission', label: 'Permission' },
  { value: 'ApiKey', label: 'API Key' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getActionBadgeVariant(action: string): 'success' | 'danger' | 'info' | 'warning' | 'default' {
  if (action.includes('APPROVE') || action.includes('CHECK_IN')) return 'success';
  if (action.includes('REJECT') || action.includes('DELETE') || action.includes('REVOKE')) return 'danger';
  if (action.includes('CREATE') || action.includes('SUBMIT') || action.includes('JOIN') || action.includes('REGISTER')) return 'info';
  if (action.includes('UPDATE') || action.includes('CHANGE') || action.includes('ADJUST') || action.includes('ESCALATE') || action.includes('BREACH') || action.includes('OVERRIDE')) return 'warning';
  return 'default';
}

function formatActionLabel(action: string): string {
  return action
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

function truncateId(id: string): string {
  if (id.length <= 12) return id;
  return id.slice(0, 8) + '...';
}

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }) + ' ' + date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function renderJsonDiff(
  previous: Record<string, unknown> | null,
  current: Record<string, unknown> | null
) {
  if (!previous && !current) {
    return <p className="text-xs text-white/40 italic">No state data recorded</p>;
  }

  const allKeys = new Set<string>();
  if (previous) Object.keys(previous).forEach((k) => allKeys.add(k));
  if (current) Object.keys(current).forEach((k) => allKeys.add(k));

  const sortedKeys = Array.from(allKeys).sort();

  return (
    <div className="space-y-1">
      {sortedKeys.map((key) => {
        const prev = previous?.[key];
        const curr = current?.[key];
        const prevStr = prev !== undefined ? JSON.stringify(prev) : undefined;
        const currStr = curr !== undefined ? JSON.stringify(curr) : undefined;
        const changed = prevStr !== currStr;

        return (
          <div key={key} className="font-mono text-xs">
            <span className="text-white/60">{key}: </span>
            {changed ? (
              <>
                {prevStr !== undefined && (
                  <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-1 rounded line-through">
                    {prevStr}
                  </span>
                )}
                {prevStr !== undefined && currStr !== undefined && (
                  <span className="text-white/60 mx-1">&rarr;</span>
                )}
                {currStr !== undefined && (
                  <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-1 rounded">
                    {currStr}
                  </span>
                )}
              </>
            ) : (
              <span className="text-white/70">{currStr ?? prevStr}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Skeleton Loader ─────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-white/10">
      {[...Array(6)].map((_, i) => (
        <td key={i} className="py-3 px-3">
          <div className="h-4 bg-white/5 rounded animate-pulse" style={{ width: `${50 + Math.random() * 40}%` }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, pages: 0 });
  const [chainStatus, setChainStatus] = useState<ChainStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);

  // Expanded rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Chain verification
  const [verifying, setVerifying] = useState(false);

  const hasActiveFilters = actionFilter || entityTypeFilter || dateFrom || dateTo || searchQuery;

  const fetchLogs = useCallback(async (currentPage: number) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', '50');
      if (actionFilter) params.set('action', actionFilter);
      if (entityTypeFilter) params.set('entityType', entityTypeFilter);
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/audit-logs?${params}`, { credentials: 'include' });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'Failed to load audit logs');
        return;
      }

      setLogs(json.logs);
      setPagination(json.pagination);
      if (json.chainStatus) {
        setChainStatus(json.chainStatus);
      }
    } catch {
      setError('Network error while loading audit logs');
    } finally {
      setLoading(false);
    }
  }, [actionFilter, entityTypeFilter, dateFrom, dateTo, searchQuery]);

  useEffect(() => {
    fetchLogs(page);
    setExpandedRows(new Set());
  }, [page, fetchLogs]);

  async function handleVerifyChain() {
    setVerifying(true);
    try {
      const params = new URLSearchParams({ page: '1', limit: '1', verifyChain: 'true' });
      const res = await fetch(`/api/audit-logs?${params}`, { credentials: 'include' });
      const json = await res.json();
      if (json.chainStatus) {
        setChainStatus(json.chainStatus);
      }
    } catch {
      // silently fail
    } finally {
      setVerifying(false);
    }
  }

  function clearFilters() {
    setActionFilter('');
    setEntityTypeFilter('');
    setDateFrom('');
    setDateTo('');
    setSearchQuery('');
    setSearchInput('');
    setPage(1);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearchQuery(searchInput);
    setPage(1);
  }

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleFilterChange(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
      setter(e.target.value);
      setPage(1);
    };
  }

  function handleExportCSV() {
    if (logs.length === 0) return;
    const headers = ['Timestamp', 'Action', 'Actor', 'Entity Type', 'Entity ID', 'IP Address'];
    const rows = logs.map((log) => [
      formatTimestamp(log.createdAt),
      formatActionLabel(log.action),
      log.actor ? `${log.actor.firstName} ${log.actor.lastName} (${log.actor.email})` : 'System',
      log.entityType,
      log.entityId,
      'N/A',
    ]);
    downloadCSVLegacy(headers, rows, `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  function handleExportPDF() {
    if (logs.length === 0) return;
    const columns = ['Timestamp', 'Action', 'Actor', 'Entity Type', 'Entity ID', 'IP Address'];
    const rows = logs.map((log) => [
      formatTimestamp(log.createdAt),
      formatActionLabel(log.action),
      log.actor ? `${log.actor.firstName} ${log.actor.lastName} (${log.actor.email})` : 'System',
      log.entityType,
      log.entityId,
      'N/A',
    ]);
    downloadPDF(
      'Audit Logs Report',
      [{ title: 'Audit Logs', columns, rows }],
      `audit-logs-${new Date().toISOString().slice(0, 10)}`,
      [`Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`],
    );
  }

  return (
    <StaggerContainer className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Audit Logs"
        description="Tamper-proof activity trail with hash chain verification"
        icon={<Shield className="w-6 h-6 text-primary" />}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={loading || logs.length === 0}
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={loading || logs.length === 0}
            >
              <FileText className="w-3.5 h-3.5" />
              PDF
            </Button>
            {chainStatus ? (
              <Badge
                variant={chainStatus.valid ? 'success' : 'danger'}
                size="sm"
                className="flex items-center gap-1.5"
              >
                {chainStatus.valid ? (
                  <CheckCircle className="w-3 h-3" />
                ) : (
                  <AlertTriangle className="w-3 h-3" />
                )}
                {chainStatus.valid
                  ? `Chain Valid (${chainStatus.verifiedLogs} logs)`
                  : `Chain Broken at #${chainStatus.brokenAt ?? '?'}`}
              </Badge>
            ) : (
              <Badge variant="outline" size="sm" className="flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                Verification Pending
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleVerifyChain}
              loading={verifying}
              disabled={verifying}
            >
              <Shield className="w-3.5 h-3.5" />
              Verify
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <FadeIn>
        <GlassPanel>
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Action Type Filter */}
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">
                  Action
                </label>
                <select
                  value={actionFilter}
                  onChange={handleFilterChange(setActionFilter)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                >
                  {ACTION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Entity Type Filter */}
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">
                  Entity Type
                </label>
                <select
                  value={entityTypeFilter}
                  onChange={handleFilterChange(setEntityTypeFilter)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                >
                  {ENTITY_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date From */}
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">
                  From Date
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={handleFilterChange(setDateFrom)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">
                  To Date
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={handleFilterChange(setDateTo)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                />
              </div>

              {/* Search */}
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">
                  Search
                </label>
                <form onSubmit={handleSearchSubmit} className="flex gap-1.5">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                    <input
                      type="text"
                      placeholder="Action, entity..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                    />
                  </div>
                  <Button type="submit" variant="outline" size="sm" className="shrink-0 py-2">
                    Go
                  </Button>
                </form>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-white/60">
                  {pagination.total} result{pagination.total !== 1 ? 's' : ''} found
                </p>
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  <X className="w-3 h-3" />
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </GlassPanel>
      </FadeIn>

      {/* Error State */}
      {error && !loading && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
          <span className="flex-1">{error}</span>
          <button onClick={() => fetchLogs(page)} className="ml-2 text-sm underline hover:no-underline shrink-0">Retry</button>
        </div>
      )}

      {/* Log Table */}
      <FadeIn>
        <GlassPanel>
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Activity Log</h2>
              {!loading && pagination.total > 0 && (
                <Badge variant="outline" size="sm">
                  {pagination.total} total entries
                </Badge>
              )}
            </div>
          </div>
          <div>
            {/* Loading Skeleton */}
            {loading && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-white/60 font-medium w-8" />
                      <th className="text-left py-3 px-3 text-white/60 font-medium">Timestamp</th>
                      <th className="text-left py-3 px-3 text-white/60 font-medium">Action</th>
                      <th className="text-left py-3 px-3 text-white/60 font-medium">Entity</th>
                      <th className="text-left py-3 px-3 text-white/60 font-medium">Entity ID</th>
                      <th className="text-left py-3 px-3 text-white/60 font-medium">Actor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...Array(8)].map((_, i) => (
                      <SkeletonRow key={i} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && logs.length === 0 && (
              <div className="py-16 text-center">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mx-auto">
                  <Inbox className="w-6 h-6 text-white/40" />
                </div>
                <p className="text-white/60 mt-4 text-sm font-medium">
                  {hasActiveFilters ? 'No audit logs match your filters' : 'No audit logs recorded yet'}
                </p>
                <p className="text-white/40 mt-1 text-xs">
                  {hasActiveFilters ? 'Try adjusting your filter criteria' : 'Activity will appear here as actions are performed'}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-3 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}

            {/* Data Table */}
            {!loading && !error && logs.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-white/60 font-medium w-8" />
                      <th className="text-left py-3 px-3 text-white/60 font-medium whitespace-nowrap">Timestamp</th>
                      <th className="text-left py-3 px-3 text-white/60 font-medium">Action</th>
                      <th className="text-left py-3 px-3 text-white/60 font-medium">Entity Type</th>
                      <th className="text-left py-3 px-3 text-white/60 font-medium">Entity ID</th>
                      <th className="text-left py-3 px-3 text-white/60 font-medium">Actor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => {
                      const isExpanded = expandedRows.has(log.id);
                      const hasChanges = log.previousState || log.newState;

                      return (
                        <Fragment key={log.id}>
                          <tr
                            onClick={() => hasChanges && toggleRow(log.id)}
                            className={`border-b border-white/10 transition-colors ${
                              hasChanges ? 'cursor-pointer' : ''
                            } ${
                              isExpanded
                                ? 'bg-primary/5'
                                : 'hover:bg-white/5'
                            }`}
                          >
                            {/* Expand indicator */}
                            <td className="py-3 px-4">
                              {hasChanges && (
                                <span className="text-white/60">
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </span>
                              )}
                            </td>

                            {/* Timestamp */}
                            <td className="py-3 px-3 whitespace-nowrap text-white/60 text-xs font-mono">
                              {formatTimestamp(log.createdAt)}
                            </td>

                            {/* Action Badge */}
                            <td className="py-3 px-3">
                              <Badge variant={getActionBadgeVariant(log.action)} size="sm">
                                {formatActionLabel(log.action)}
                              </Badge>
                            </td>

                            {/* Entity Type */}
                            <td className="py-3 px-3 text-white font-medium">
                              {log.entityType}
                            </td>

                            {/* Entity ID */}
                            <td className="py-3 px-3">
                              <span
                                className="font-mono text-xs text-white/60 bg-white/5 px-1.5 py-0.5 rounded"
                                title={log.entityId}
                              >
                                {truncateId(log.entityId)}
                              </span>
                            </td>

                            {/* Actor */}
                            <td className="py-3 px-3">
                              {log.actor ? (
                                <div>
                                  <p className="text-white text-xs font-medium">
                                    {log.actor.firstName} {log.actor.lastName}
                                  </p>
                                  <p className="text-white/40 text-[11px]">{log.actor.email}</p>
                                </div>
                              ) : (
                                <span className="text-white/40 text-xs italic">System</span>
                              )}
                            </td>
                          </tr>

                          {/* Expanded Detail Row */}
                          {isExpanded && (
                            <tr className="bg-white/[0.02]">
                              <td colSpan={6} className="px-6 py-4">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                  {/* Previous State */}
                                  <div>
                                    <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-red-400" />
                                      Previous State
                                    </h4>
                                    {log.previousState ? (
                                      <div className="bg-black/20 rounded-lg border border-white/10 p-3 overflow-auto max-h-60">
                                        <pre className="text-xs font-mono text-white/80 whitespace-pre-wrap break-all">
                                          {JSON.stringify(log.previousState, null, 2)}
                                        </pre>
                                      </div>
                                    ) : (
                                      <p className="text-xs text-white/40 italic">No previous state</p>
                                    )}
                                  </div>

                                  {/* New State */}
                                  <div>
                                    <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                      New State
                                    </h4>
                                    {log.newState ? (
                                      <div className="bg-black/20 rounded-lg border border-white/10 p-3 overflow-auto max-h-60">
                                        <pre className="text-xs font-mono text-white/80 whitespace-pre-wrap break-all">
                                          {JSON.stringify(log.newState, null, 2)}
                                        </pre>
                                      </div>
                                    ) : (
                                      <p className="text-xs text-white/40 italic">No new state</p>
                                    )}
                                  </div>

                                  {/* Diff View */}
                                  {log.previousState && log.newState && (
                                    <div className="lg:col-span-2">
                                      <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wide mb-2">
                                        Changes
                                      </h4>
                                      <div className="bg-black/20 rounded-lg border border-white/10 p-3">
                                        {renderJsonDiff(log.previousState, log.newState)}
                                      </div>
                                    </div>
                                  )}

                                  {/* Integrity Info */}
                                  <div className="lg:col-span-2 flex items-center gap-4 pt-2 border-t border-white/10">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] text-white/60 font-medium uppercase tracking-wider">Hash:</span>
                                      <code className="text-[10px] font-mono text-white/60 bg-white/5 px-1.5 py-0.5 rounded">
                                        {log.integrityHash.slice(0, 16)}...
                                      </code>
                                    </div>
                                    {log.prevHash && (
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] text-white/60 font-medium uppercase tracking-wider">Prev:</span>
                                        <code className="text-[10px] font-mono text-white/60 bg-white/5 px-1.5 py-0.5 rounded">
                                          {log.prevHash.slice(0, 16)}...
                                        </code>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {!loading && pagination.pages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
                <p className="text-xs text-white/60">
                  Showing {((pagination.page - 1) * pagination.limit) + 1}&ndash;{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(1)}
                    disabled={page <= 1}
                    className="px-2"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  {/* Page numbers */}
                  {(() => {
                    const pages: number[] = [];
                    const maxVisible = 5;
                    let start = Math.max(1, page - Math.floor(maxVisible / 2));
                    const end = Math.min(pagination.pages, start + maxVisible - 1);
                    start = Math.max(1, end - maxVisible + 1);

                    for (let i = start; i <= end; i++) {
                      pages.push(i);
                    }

                    return pages.map((p) => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                          p === page
                            ? 'bg-primary text-primary-foreground'
                            : 'text-white/60 hover:bg-white/5'
                        }`}
                      >
                        {p}
                      </button>
                    ));
                  })()}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                    disabled={page >= pagination.pages}
                    className="px-2"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(pagination.pages)}
                    disabled={page >= pagination.pages}
                    className="px-2"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </GlassPanel>
      </FadeIn>
    </StaggerContainer>
  );
}
