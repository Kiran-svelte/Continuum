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
  Loader2,
  Inbox,
  CalendarDays,
  Hash,
  User,
} from 'lucide-react';
import { useDebounce } from '@/lib/use-debounce';
import { StaggerContainer, FadeIn } from '@/components/motion';
import { PageHeader } from '@/components/page-header';
import { TabButton } from '@/components/tab-button';
import { GlassPanel } from '@/components/glass-panel';
import { Button } from '@/components/ui/button';
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

// --- Constants ---
const LEAVE_TYPE_STYLES: Record<string, string> = {
  CL: 'bg-blue-900/50 text-blue-300 border-blue-700/60',
  SL: 'bg-red-900/50 text-red-300 border-red-700/60',
  EL: 'bg-green-900/50 text-green-300 border-green-700/60',
  PL: 'bg-purple-900/50 text-purple-300 border-purple-700/60',
  ML: 'bg-pink-900/50 text-pink-300 border-pink-700/60',
  LWP: 'bg-slate-700/50 text-slate-300 border-slate-600/60',
  CO: 'bg-amber-900/50 text-amber-300 border-amber-700/60',
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
const StatCard = ({ icon: Icon, label, value }: any) => (
  <GlassPanel className="p-4 flex-1">
    <div className="flex items-center gap-3 text-slate-400 mb-1">
      <Icon className="w-4 h-4" />
      <span className="text-xs font-medium uppercase">{label}</span>
    </div>
    <p className="text-2xl font-bold text-slate-100">{value}</p>
  </GlassPanel>
);

const LoadingRequestCard = () => (
  <GlassPanel className="p-4">
    <div className="flex items-start gap-4">
      <Skeleton className="w-5 h-5 mt-1 rounded bg-slate-700/50" />
      <div className="flex-1 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-1/3 rounded bg-slate-700/50" />
          <Skeleton className="h-4 w-20 rounded bg-slate-700/50" />
        </div>
        <Skeleton className="h-4 w-3/4 rounded bg-slate-700/50" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24 rounded-lg bg-slate-700/50" />
          <Skeleton className="h-8 w-24 rounded-lg bg-slate-700/50" />
        </div>
      </div>
    </div>
  </GlassPanel>
);

const EmptyState = ({ status }: { status: string }) => (
  <GlassPanel className="text-center py-16">
    <Inbox className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
    <h3 className="text-lg font-semibold text-slate-200 mb-1">All Caught Up!</h3>
    <p className="text-sm text-slate-400">No {status} leave requests at the moment.</p>
  </GlassPanel>
);

// --- Main Page Component ---
export default function HRApprovalsPage() {
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
    } catch (err: any) {
      setError(err.message);
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
      const res = await fetch(`/api/leaves/${action}/${requestId}`, {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ comments: `Action taken by HR.` }),
      });
      if (!res.ok) throw new Error(await res.text());
      
      setRequests(prev => prev.filter(r => r.id !== requestId));
      setPagination(p => ({ ...p, total: p.total - 1 }));
      showMessage('success', `Request ${action}d successfully.`);
    } catch (err: any) {
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Bulk ${action} failed`);
      
      const successIds = new Set(data.results.filter((r: any) => r.success).map((r: any) => r.requestId));
      setRequests(prev => prev.filter(r => !successIds.has(r.id)));
      setPagination(p => ({ ...p, total: p.total - successIds.size }));
      setSelectedIds(new Set());
      showMessage('success', `Bulk ${action}: ${data.successCount} succeeded, ${data.failCount} failed.`);
    } catch (err: any) {
      showMessage('error', err.message);
    } finally {
      setBulkLoading(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
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
    <StaggerContainer>
      <FadeIn>
        <PageHeader
          title="Leave Approvals"
          description="Review and process leave requests requiring HR action."
        />
      </FadeIn>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`mb-4 flex items-center gap-2 p-3 rounded-lg text-sm border ${
              message.type === 'success' ? 'bg-green-900/30 text-green-300 border-green-500/30' : 'bg-red-900/30 text-red-300 border-red-500/30'
            }`}
          >
            {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      <FadeIn>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
          <div className="flex border-b border-slate-700">
            <TabButton active={statusTab === 'pending'} onClick={() => { setStatusTab('pending'); setPagination(p => ({ ...p, page: 1 })); }}><Clock className="w-4 h-4" /> Pending</TabButton>
            <TabButton active={statusTab === 'escalated'} onClick={() => { setStatusTab('escalated'); setPagination(p => ({ ...p, page: 1 })); }}><AlertTriangle className="w-4 h-4" /> Escalated</TabButton>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input w-full pl-10"
            />
          </div>
        </div>
      </FadeIn>

      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4"
          >
            <GlassPanel className="flex items-center gap-4 p-3">
              <span className="text-sm font-medium text-slate-200">{selectedIds.size} selected</span>
              <Button size="sm" variant="success" onClick={() => handleBulkAction('approve')} loading={bulkLoading === 'approve'} disabled={!!bulkLoading}>
                <Check className="w-4 h-4 mr-1" /> Approve
              </Button>
              <Button size="sm" variant="danger" onClick={() => handleBulkAction('reject')} loading={bulkLoading === 'reject'} disabled={!!bulkLoading}>
                <X className="w-4 h-4 mr-1" /> Reject
              </Button>
              <button onClick={() => setSelectedIds(new Set())} className="text-sm text-slate-400 hover:text-white ml-auto">Clear</button>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>

      <FadeIn>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={Clock} label={`Total ${statusTab}`} value={pagination.total} />
          <StatCard icon={Users} label="Showing" value={filteredRequests.length} />
          <StatCard icon={CheckCircle} label="Selected" value={selectedIds.size} />
          <StatCard icon={AlertTriangle} label="SLA Urgent" value={requests.filter(r => getSlaInfo(r.created_at).urgent && !getSlaInfo(r.created_at).breached).length} />
        </div>
      </FadeIn>

      {error && <div className="mb-4 p-3 bg-red-900/30 text-red-300 border border-red-500/30 rounded-lg text-sm">{error}</div>}

      <div className="space-y-3">
        {loading ? (
          [...Array(5)].map((_, i) => <LoadingRequestCard key={i} />)
        ) : filteredRequests.length === 0 ? (
          <EmptyState status={statusTab} />
        ) : (
          <>
            <div className="flex items-center gap-3 px-4 py-2">
              <input
                type="checkbox"
                checked={filteredRequests.length > 0 && selectedIds.size === filteredRequests.length}
                onChange={toggleSelectAll}
                className="form-checkbox"
              />
              <span className="text-xs text-slate-400 font-medium uppercase">Select all shown</span>
            </div>
            {filteredRequests.sort((a, b) => getSlaInfo(a.created_at).remaining - getSlaInfo(b.created_at).remaining).map(req => {
              const sla = getSlaInfo(req.created_at);
              const isActioning = actionLoading?.id === req.id;
              return (
                <GlassPanel
                  key={req.id}
                  className={`p-4 transition-all duration-300 ${selectedIds.has(req.id) ? 'border-emerald-500/50 ring-2 ring-emerald-500/20' : 'border-slate-700/50'}`}
                >
                  <div className="flex items-start gap-4">
                    <input type="checkbox" checked={selectedIds.has(req.id)} onChange={() => toggleSelect(req.id)} className="form-checkbox mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400" />
                          <span className="font-medium text-slate-100">{req.employee.first_name} {req.employee.last_name}</span>
                          {req.employee.department && <span className="text-xs text-slate-500">{req.employee.department}</span>}
                        </div>
                        <div className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                          sla.breached ? 'bg-red-900/50 text-red-300 border-red-700/60' : sla.urgent ? 'bg-amber-900/50 text-amber-300 border-amber-700/60' : 'text-slate-400 border-transparent'
                        }`}>
                          SLA: {sla.label}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-300 mb-3">
                        <div className={`flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded-full border ${LEAVE_TYPE_STYLES[req.leave_type] || LEAVE_TYPE_STYLES.LWP}`}>
                          <Hash className="w-3 h-3" /> {req.leave_type}
                        </div>
                        <div className="flex items-center gap-1.5"><CalendarDays className="w-4 h-4 text-slate-500" /> {formatDate(req.start_date)} - {formatDate(req.end_date)}</div>
                        <div className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-slate-500" /> {req.total_days} day{req.total_days !== 1 ? 's' : ''}</div>
                      </div>

                      {req.reason && <p className="text-sm text-slate-400 bg-slate-800/40 p-2 rounded-md mb-3">{req.reason}</p>}

                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="success" onClick={() => handleAction(req.id, 'approve')} loading={isActioning && actionLoading?.action === 'approve'} disabled={isActioning}>
                          <Check className="w-4 h-4 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => handleAction(req.id, 'reject')} loading={isActioning && actionLoading?.action === 'reject'} disabled={isActioning}>
                          <X className="w-4 h-4 mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                </GlassPanel>
              );
            })}
          </>
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button variant="outline" size="sm" onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} disabled={pagination.page <= 1}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-slate-400">Page {pagination.page} of {pagination.totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} disabled={pagination.page >= pagination.totalPages}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </StaggerContainer>
  );
}
