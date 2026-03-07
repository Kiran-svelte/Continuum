'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface LeaveRequest {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  is_half_day: boolean;
  reason: string;
  status: string;
  approver_comments: string | null;
  created_at: string;
  approver: { first_name: string; last_name: string } | null;
}

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  approved: 'success',
  pending: 'warning',
  escalated: 'warning',
  rejected: 'danger',
  cancelled: 'default',
  draft: 'info',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
};

export default function LeaveHistoryPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const loadRequests = useCallback(async (p: number, status: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(p), limit: '10' });
      if (status) params.set('status', status);
      const res = await fetch(`/api/leaves/list?${params}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to load leave history');
        return;
      }
      setRequests(json.requests);
      setTotalPages(json.pagination.pages || 1);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests(page, statusFilter);
  }, [page, statusFilter, loadRequests]);

  async function handleCancel(requestId: string) {
    if (!confirm('Are you sure you want to cancel this leave request?')) return;
    setCancellingId(requestId);
    try {
      const res = await fetch(`/api/leaves/cancel/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: 'Cancelled by employee' }),
      });
      if (res.ok) {
        setRequests((prev) =>
          prev.map((r) => (r.id === requestId ? { ...r, status: 'cancelled' } : r))
        );
      }
    } finally {
      setCancellingId(null);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  return (
    <motion.div
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div className="flex items-center justify-between" variants={itemVariants}>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leave History</h1>
          <p className="text-muted-foreground mt-1">All your leave requests for this year</p>
        </div>
        <Link
          href="/employee/request-leave"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
        >
          📝 New Request
        </Link>
      </motion.div>

      {/* Filters */}
      <motion.div className="flex gap-2 flex-wrap" variants={itemVariants}>
        {['', 'pending', 'approved', 'rejected', 'cancelled'].map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              statusFilter === s
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            }`}
          >
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-md overflow-hidden">
          <CardHeader className="border-b border-border/50 bg-muted/30">
            <CardTitle className="text-base">Leave Requests</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading && (
              <div className="divide-y divide-border/50">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="px-6 py-4 animate-pulse">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-5 w-16 rounded-full" />
                        </div>
                        <Skeleton className="h-3 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {error && !loading && (
              <div className="m-6 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {!loading && !error && requests.length === 0 && (
              <div className="py-16 text-center">
                <span className="text-4xl">📭</span>
                <p className="text-muted-foreground mt-3 text-sm">No leave requests found.</p>
                <Link
                  href="/employee/request-leave"
                  className="mt-3 inline-block text-primary text-sm font-medium hover:underline"
                >
                  Submit your first request →
                </Link>
              </div>
            )}
            {!loading && !error && requests.length > 0 && (
              <motion.div
                className="divide-y divide-border/50"
                initial="hidden"
                animate="visible"
                variants={containerVariants}
              >
                {requests.map((req) => (
                  <motion.div
                    key={req.id}
                    variants={itemVariants}
                    className="px-6 py-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground">{req.leave_type}</span>
                          {req.is_half_day && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              Half day
                            </span>
                          )}
                          <Badge variant={STATUS_BADGE[req.status] ?? 'default'}>{req.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatDate(req.start_date)}
                          {req.start_date !== req.end_date && ` – ${formatDate(req.end_date)}`}
                          {' · '}
                          <span className="font-medium text-foreground">{req.total_days} day{req.total_days !== 1 ? 's' : ''}</span>
                        </p>
                        {req.reason && (
                          <p className="text-xs text-muted-foreground mt-1 truncate max-w-md">{req.reason}</p>
                        )}
                        {req.approver_comments && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            💬 {req.approver?.first_name} {req.approver?.last_name}: {req.approver_comments}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <p className="text-xs text-muted-foreground">
                          {formatDate(req.created_at)}
                        </p>
                        {(req.status === 'pending' || req.status === 'escalated') && (
                          <button
                            onClick={() => handleCancel(req.id)}
                            disabled={cancellingId === req.id}
                            className="text-xs text-destructive hover:text-destructive/80 font-medium hover:underline disabled:opacity-50 transition-colors"
                          >
                            {cancellingId === req.id ? 'Cancelling...' : '✕ Cancel'}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-muted/20">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  ← Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next →
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
