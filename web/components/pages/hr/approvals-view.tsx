'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Inbox,
  CalendarDays,
  Hash,
  User,
} from 'lucide-react';
import { useDebounce } from '@/lib/use-debounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

// --- Types ---
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

interface BulkActionResult {
  requestId: string;
  success: boolean;
  error?: string;
}

// --- Constants ---
const LEAVE_TYPE_STYLES: Record<string, string> = {
  CL: 'bg-[var(--status-info-soft)] text-[var(--status-info)] border-[var(--status-info)]/20',
  SL: 'bg-[var(--status-danger-soft)] text-[var(--status-danger)] border-[var(--status-danger)]/20',
  EL: 'bg-[var(--status-success-soft)] text-[var(--status-success)] border-[var(--status-success)]/20',
  PL: 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20',
  ML: 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20',
  LWP: 'bg-[var(--accent)] text-foreground/90 border-[var(--border)]/60',
  CO: 'bg-[var(--status-warning-soft)] text-[var(--status-warning)] border-[var(--status-warning)]/20',
};

const SLA_HOURS = 48;

// --- Helper Functions ---
const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const getSlaInfo = (createdAt: string) => {
  const deadline = new Date(createdAt).getTime() + SLA_HOURS * 3600000;
  const remainingMs = deadline - Date.now();
  const remainingHrs = Math.ceil(remainingMs / 3600000);

  if (remainingMs <= 0) {
    const overdue = Math.abs(remainingHrs);
    return { label: `${overdue}h overdue`, urgent: true, breached: true, remaining: -overdue };
  }
  return { label: `${remainingHrs}h left`, urgent: remainingHrs <= 12, breached: false, remaining: remainingHrs };
};

// --- Helper Components ---
const StatCard = ({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) => (
  <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 flex-1">
    <div className="flex items-center gap-3 text-[var(--muted-foreground)] mb-1">
      <Icon className="w-4 h-4" />
      <span className="text-xs font-medium uppercase">{label}</span>
    </div>
    <p className="text-2xl font-bold text-foreground">{value}</p>
  </div>
);

const LoadingRequestCard = () => (
  <div className="border border-[var(--border)] bg-[var(--card)] rounded-lg p-4">
    <div className="flex items-start gap-4">
      <Skeleton className="w-5 h-5 mt-1 rounded" />
      <div className="flex-1 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-1/3 rounded" />
          <Skeleton className="h-4 w-20 rounded" />
        </div>
        <Skeleton className="h-4 w-3/4 rounded" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>
    </div>
  </div>
);

const EmptyState = ({ status }: { status: string }) => (
  <div className="border border-[var(--border)] bg-[var(--card)] rounded-lg text-center py-16">
    <Inbox className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-4" />
    <h3 className="text-lg font-semibold text-foreground mb-1">All Caught Up!</h3>
    <p className="text-sm text-[var(--muted-foreground)]">No {status} leave requests at the moment.</p>
  </div>
);

// --- Main Page Component ---
export default function ApprovalsView() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState<'pending' | 'escalated'>('pending');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState<'approve' | 'reject' | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 300);

  const filteredRequests = useMemo(() => {
    if (!debouncedSearch) return requests;
    const q = debouncedSearch.toLowerCase();
    return requests.filter(r =>
      `${r.employee.first_name} ${r.employee.last_name}`.toLowerCase().includes(q) ||
      r.employee.department?.toLowerCase().includes(q) ||
      r.leave_type.toLowerCase().includes(q)
    );
  }, [requests, debouncedSearch]);

  const loadRequests = useCallback(async (page: number, status: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10', status });
      const res = await fetch(`/api/leaves/list?${params}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to load requests');
      setRequests(json.requests ?? []);
      setPagination({
        page: json.pagination?.page || 1,
        totalPages: json.pagination?.pages || 1,
        total: json.pagination?.total || 0,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests(pagination.page, statusTab);
    setSelectedIds(new Set());
  }, [pagination.page, statusTab, loadRequests]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleAction = async (requestId: string, action: 'approve' | 'reject') => {
    setActionLoading({ id: requestId, action });
    try {
      const isApproval = action === 'approve';
      const requestBody = isApproval
        ? { action: 'approve' }
        : { comments: 'Action taken by HR.' };
      const res = await fetch(`/api/leaves/${action}/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });
      if (!res.ok) throw new Error(await res.text());
      
      setRequests(prev => prev.filter(r => r.id !== requestId));
      setPagination(p => ({ ...p, total: p.total - 1 }));
      showMessage('success', `Request ${action}d successfully.`);
    } catch {
      showMessage('error', `Failed to ${action} request.`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkAction = async (action: 'approve' | 'reject') => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkLoading(action);
    try {
      const res = await fetch('/api/leaves/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ requestIds: ids, action }),
      });
      const data = (await res.json()) as {
        results?: BulkActionResult[];
        successCount?: number;
        failCount?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || `Bulk ${action} failed`);
      
      const successIds = new Set((data.results ?? []).filter((r) => r.success).map((r) => r.requestId));
      setRequests(prev => prev.filter(r => !successIds.has(r.id)));
      setPagination(p => ({ ...p, total: p.total - successIds.size }));
      setSelectedIds(new Set());
      showMessage('success', `Bulk ${action}: ${data.successCount ?? 0} succeeded, ${data.failCount ?? 0} failed.`);
    } catch (err: unknown) {
      showMessage('error', err instanceof Error ? err.message : `Bulk ${action} failed`);
    } finally {
      setBulkLoading(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (filteredRequests.length === selectedIds.size) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRequests.map(r => r.id)));
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="border-b border-[var(--border)] pb-6">
            <h1 className="text-3xl font-bold text-foreground mb-2">Leave Approvals</h1>
            <p className="text-sm text-[var(--muted-foreground)]">Review and process leave requests requiring HR action.</p>
          </div>

          {/* Message */}
          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`flex items-center gap-2 p-3 rounded-lg text-sm border ${
                  message.type === 'success' ? 'bg-[var(--status-success-soft)] text-[var(--status-success)] border-[var(--status-success)]/20' : 'bg-[var(--status-danger-soft)] text-[var(--status-danger)] border-[var(--status-danger)]/20'
                }`}
              >
                {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tabs and Search */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex border-b border-[var(--border)] gap-1">
              <Button
                type="button"
                variant="ghost"
                onClick={() => { setStatusTab('pending'); setPagination(p => ({ ...p, page: 1 })); }}
                className={`flex items-center gap-2 rounded-none px-4 py-2 border-b-2 transition-colors ${
                  statusTab === 'pending'
                    ? 'border-[var(--primary)] text-[var(--primary)]'
                    : 'border-transparent text-[var(--muted-foreground)] hover:text-foreground'
                }`}
              >
                <Clock className="w-4 h-4" /> Pending
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => { setStatusTab('escalated'); setPagination(p => ({ ...p, page: 1 })); }}
                className={`flex items-center gap-2 rounded-none px-4 py-2 border-b-2 transition-colors ${
                  statusTab === 'escalated'
                    ? 'border-[var(--primary)] text-[var(--primary)]'
                    : 'border-transparent text-[var(--muted-foreground)] hover:text-foreground'
                }`}
              >
                <AlertTriangle className="w-4 h-4" /> Escalated
              </Button>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <Input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-foreground placeholder:text-[var(--muted-foreground)]"
                aria-label="Search leave requests"
                title="Search leave requests"
              />
            </div>
          </div>

          {/* Bulk Actions */}
          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border border-[var(--border)] bg-[var(--card)] rounded-lg p-4"
              >
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-foreground">{selectedIds.size} selected</span>
                  <Button size="sm" onClick={() => handleBulkAction('approve')} loading={bulkLoading === 'approve'} disabled={!!bulkLoading}>
                    <Check className="w-4 h-4 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction('reject')} loading={bulkLoading === 'reject'} disabled={!!bulkLoading}>
                    <X className="w-4 h-4 mr-1" /> Reject
                  </Button>
                  <Button onClick={() => setSelectedIds(new Set())} className="text-sm text-[var(--muted-foreground)] hover:text-foreground ml-auto" variant="ghost" size="sm">Clear</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Clock} label={`Total ${statusTab}`} value={pagination.total} />
            <StatCard icon={Users} label="Showing" value={filteredRequests.length} />
            <StatCard icon={CheckCircle} label="Selected" value={selectedIds.size} />
            <StatCard icon={AlertTriangle} label="SLA Urgent" value={requests.filter(r => getSlaInfo(r.created_at).urgent && !getSlaInfo(r.created_at).breached).length} />
          </div>

          {/* Error */}
          {error && <div className="p-3 bg-[var(--status-danger-soft)] text-[var(--status-danger)] border border-[var(--status-danger)]/20 rounded-lg text-sm">{error}</div>}

          {/* Requests List */}
          <div className="space-y-3">
            {loading ? (
              [...Array(5)].map((_, i) => <LoadingRequestCard key={i} />)
            ) : filteredRequests.length === 0 ? (
              <EmptyState status={statusTab} />
            ) : (
              <>
                <div className="flex items-center gap-3 px-4 py-2 text-xs text-[var(--muted-foreground)] font-medium uppercase">
                  <input
                    type="checkbox"
                    checked={filteredRequests.length > 0 && selectedIds.size === filteredRequests.length}
                    onChange={toggleSelectAll}
                    className="form-checkbox rounded"
                    aria-label="Select all visible leave requests"
                    title="Select all visible leave requests"
                  />
                  Select all shown
                </div>
                {filteredRequests.sort((a, b) => getSlaInfo(a.created_at).remaining - getSlaInfo(b.created_at).remaining).map(req => {
                  const sla = getSlaInfo(req.created_at);
                  const isActioning = actionLoading?.id === req.id;
                  return (
                    <div
                      key={req.id}
                      className={`border rounded-lg p-4 transition-all duration-300 bg-[var(--card)] ${
                        selectedIds.has(req.id) ? 'border-[var(--primary)]/50 shadow-md' : 'border-[var(--border)]/50'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(req.id)}
                          onChange={() => toggleSelect(req.id)}
                          className="form-checkbox mt-1 rounded"
                          aria-label={`Select request for ${req.employee.first_name} ${req.employee.last_name}`}
                          title={`Select request for ${req.employee.first_name} ${req.employee.last_name}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-[var(--muted-foreground)]" />
                              <span className="font-medium text-foreground">{req.employee.first_name} {req.employee.last_name}</span>
                              {req.employee.department && <span className="text-xs text-[var(--muted-foreground)]">{req.employee.department}</span>}
                            </div>
                            <div className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                              sla.breached ? 'bg-[var(--status-danger-soft)] text-[var(--status-danger)] border-[var(--status-danger)]/20' : sla.urgent ? 'bg-[var(--status-warning-soft)] text-[var(--status-warning)] border-[var(--status-warning)]/20' : 'text-[var(--muted-foreground)] border-transparent'
                            }`}>
                              SLA: {sla.label}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-foreground/90 mb-3">
                            <div className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${LEAVE_TYPE_STYLES[req.leave_type] || LEAVE_TYPE_STYLES.LWP}`}>
                              <Hash className="w-3 h-3" /> {req.leave_type}
                            </div>
                            <div className="flex items-center gap-1.5"><CalendarDays className="w-4 h-4 text-[var(--muted-foreground)]" /> {formatDate(req.start_date)} - {formatDate(req.end_date)}</div>
                            <div className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-[var(--muted-foreground)]" /> {req.total_days} day{req.total_days !== 1 ? 's' : ''}</div>
                          </div>

                          {req.reason && <p className="text-sm text-[var(--muted-foreground)] bg-[var(--muted)]/30 p-2 rounded-md mb-3">{req.reason}</p>}

                          <div className="flex items-center gap-2">
                            <Button size="sm" onClick={() => handleAction(req.id, 'approve')} loading={isActioning && actionLoading?.action === 'approve'} disabled={isActioning}>
                              <Check className="w-4 h-4 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleAction(req.id, 'reject')} loading={isActioning && actionLoading?.action === 'reject'} disabled={isActioning}>
                              <X className="w-4 h-4 mr-1" /> Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} disabled={pagination.page <= 1}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-[var(--muted-foreground)]">Page {pagination.page} of {pagination.totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} disabled={pagination.page >= pagination.totalPages}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


