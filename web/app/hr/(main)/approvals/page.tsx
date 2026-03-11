'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Check,
  X,
  Clock,
  Users,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface LeaveRequest {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: string;
  reason: string | null;
  created_at: string;
  employee: {
    id: string;
    first_name: string;
    last_name: string;
    department: string | null;
  };
}

interface BulkResult {
  requestId: string;
  success: boolean;
  error?: string;
}

const LEAVE_TYPE_COLORS: Record<string, string> = {
  CL: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  SL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  EL: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  PL: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  ML: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  LWP: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  CO: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function hoursAgo(dateStr: string) {
  const now = new Date();
  const created = new Date(dateStr);
  const diffMs = now.getTime() - created.getTime();
  const diffHrs = Math.floor(diffMs / 3600000);
  if (diffHrs < 1) return 'Just submitted';
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const days = Math.floor(diffHrs / 24);
  return `${days}d ago`;
}

// SLA countdown: default 48h SLA for pending leave requests
const SLA_HOURS = 48;

function getSlaInfo(createdAt: string): { remaining: number; label: string; urgent: boolean; breached: boolean } {
  const now = new Date();
  const created = new Date(createdAt);
  const deadlineMs = created.getTime() + SLA_HOURS * 3600000;
  const remainingMs = deadlineMs - now.getTime();
  const remainingHrs = Math.ceil(remainingMs / 3600000);

  if (remainingMs <= 0) {
    const overdueHrs = Math.abs(remainingHrs);
    return { remaining: overdueHrs, label: `${overdueHrs}h overdue`, urgent: true, breached: true };
  }
  if (remainingHrs <= 4) {
    return { remaining: remainingHrs, label: `${remainingHrs}h left`, urgent: true, breached: false };
  }
  if (remainingHrs <= 12) {
    return { remaining: remainingHrs, label: `${remainingHrs}h left`, urgent: false, breached: false };
  }
  return { remaining: remainingHrs, label: `${remainingHrs}h left`, urgent: false, breached: false };
}

export default function HRApprovalsPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState<'pending' | 'escalated'>('pending');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // Message
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const filteredRequests = useMemo(() => {
    if (!searchQuery) return requests;
    const q = searchQuery.toLowerCase();
    return requests.filter((r) =>
      `${r.employee.first_name} ${r.employee.last_name}`.toLowerCase().includes(q) ||
      r.employee.department?.toLowerCase().includes(q) ||
      r.leave_type.toLowerCase().includes(q)
    );
  }, [requests, searchQuery]);

  const allSelected = filteredRequests.length > 0 && filteredRequests.every((r) => selectedIds.has(r.id));

  const loadRequests = useCallback(async (p: number, status: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20', status });
      const res = await fetch(`/api/leaves/list?${params}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to load requests');
        return;
      }
      setRequests(json.requests ?? []);
      setTotalPages(json.pagination?.pages || 1);
      setTotal(json.pagination?.total || 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests(page, statusTab);
    setSelectedIds(new Set());
  }, [page, statusTab, loadRequests]);

  function showMsg(type: 'success' | 'error', text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  }

  async function handleAction(requestId: string, action: 'approve' | 'reject') {
    setActionLoading(requestId + action);
    try {
      const res = await fetch(`/api/leaves/${action}/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ comments: null }),
      });
      if (res.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
        setTotal((prev) => Math.max(0, prev - 1));
        const req = requests.find((r) => r.id === requestId);
        showMsg('success', `${action === 'approve' ? 'Approved' : 'Rejected'} request for ${req?.employee.first_name ?? 'employee'}`);
      } else {
        const data = await res.json().catch(() => ({}));
        showMsg('error', data.error ?? `Failed to ${action} request`);
      }
    } catch {
      showMsg('error', `Network error while trying to ${action} request`);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleBulkAction(action: 'approve' | 'reject') {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkLoading(true);
    try {
      const res = await fetch('/api/leaves/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ requestIds: ids, action }),
      });
      if (res.ok) {
        const data = await res.json() as { results: BulkResult[]; successCount: number; failCount: number };
        const successIds = new Set(data.results.filter((r) => r.success).map((r) => r.requestId));
        setRequests((prev) => prev.filter((r) => !successIds.has(r.id)));
        setTotal((prev) => Math.max(0, prev - data.successCount));
        setSelectedIds(new Set());
        showMsg(
          data.failCount > 0 ? 'error' : 'success',
          `Bulk ${action}: ${data.successCount} succeeded${data.failCount > 0 ? `, ${data.failCount} failed` : ''}`
        );
      } else {
        const data = await res.json().catch(() => ({}));
        showMsg('error', data.error ?? `Bulk ${action} failed`);
      }
    } catch {
      showMsg('error', `Network error during bulk ${action}`);
    } finally {
      setBulkLoading(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRequests.map((r) => r.id)));
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Pending Approvals</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review and approve or reject leave requests requiring your action.
        </p>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-4 flex items-center gap-2 p-3 rounded-lg text-sm ${
          message.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => { setStatusTab('pending'); setPage(1); }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              statusTab === 'pending'
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="w-4 h-4 inline mr-1.5" />
            Pending
          </button>
          <button
            onClick={() => { setStatusTab('escalated'); setPage(1); }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              statusTab === 'escalated'
                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            <AlertTriangle className="w-4 h-4 inline mr-1.5" />
            Escalated
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <span className="text-sm font-medium text-foreground">
            {selectedIds.size} selected
          </span>
          <Button
            size="sm"
            onClick={() => handleBulkAction('approve')}
            disabled={bulkLoading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Check className="w-4 h-4 mr-1" />
            Approve All
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleBulkAction('reject')}
            disabled={bulkLoading}
          >
            <X className="w-4 h-4 mr-1" />
            Reject All
          </Button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-sm text-muted-foreground hover:text-foreground ml-auto"
          >
            Clear
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-medium uppercase">Total {statusTab}</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{total}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="w-4 h-4" />
            <span className="text-xs font-medium uppercase">Shown</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{filteredRequests.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs font-medium uppercase">Selected</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{selectedIds.size}</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Request list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-muted rounded" />
                <div className="w-10 h-10 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">All caught up!</h3>
          <p className="text-sm text-muted-foreground">
            No {statusTab} leave requests at the moment.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Select all */}
          <div className="flex items-center gap-3 px-4 py-2">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
            />
            <span className="text-xs text-muted-foreground font-medium uppercase">Select all</span>
          </div>

          {filteredRequests.map((req) => {
            const isActioning = actionLoading === req.id + 'approve' || actionLoading === req.id + 'reject';
            const ltColor = LEAVE_TYPE_COLORS[req.leave_type] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
            return (
              <div
                key={req.id}
                className={`bg-card rounded-xl border transition-colors ${
                  selectedIds.has(req.id)
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-border hover:border-border/80'
                } p-4`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(req.id)}
                    onChange={() => toggleSelect(req.id)}
                    className="w-4 h-4 mt-1 rounded border-input text-primary focus:ring-primary"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {req.employee.first_name} {req.employee.last_name}
                        </span>
                        {req.employee.department && (
                          <span className="text-xs text-muted-foreground">{req.employee.department}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {(() => {
                          const sla = getSlaInfo(req.created_at);
                          return (
                            <span className={`text-xs font-medium whitespace-nowrap px-1.5 py-0.5 rounded ${
                              sla.breached
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                : sla.urgent
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                  : 'text-muted-foreground'
                            }`}>
                              {sla.breached ? `SLA: ${sla.label}` : `SLA: ${sla.label}`}
                            </span>
                          );
                        })()}
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {hoursAgo(req.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${ltColor}`}>
                        {req.leave_type}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(req.start_date)} — {formatDate(req.end_date)}
                      </span>
                      <Badge variant="info" className="text-xs">
                        {req.total_days} day{req.total_days !== 1 ? 's' : ''}
                      </Badge>
                      {req.status === 'escalated' && (
                        <Badge variant="danger" className="text-xs">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Escalated
                        </Badge>
                      )}
                    </div>

                    {req.reason && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{req.reason}</p>
                    )}

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAction(req.id, 'approve')}
                        disabled={isActioning}
                        className="bg-green-600 hover:bg-green-700 text-white h-8 px-3"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleAction(req.id, 'reject')}
                        disabled={isActioning}
                        className="h-8 px-3"
                      >
                        <X className="w-3.5 h-3.5 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="p-2 rounded-lg hover:bg-muted disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="p-2 rounded-lg hover:bg-muted disabled:opacity-40 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
