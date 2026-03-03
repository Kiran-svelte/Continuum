'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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

export default function LeaveHistoryPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  async function loadRequests(p: number, status: string) {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(p), limit: '10' });
      if (status) params.set('status', status);
      const res = await fetch(`/api/leaves/list?${params}`);
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
  }

  useEffect(() => {
    loadRequests(page, statusFilter);
  }, [page, statusFilter]);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave History</h1>
          <p className="text-gray-500 mt-1">All your leave requests for this year</p>
        </div>
        <Link
          href="/employee/request-leave"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          📝 New Request
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['', 'pending', 'approved', 'rejected', 'cancelled'].map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leave Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
          )}
          {error && !loading && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {!loading && !error && requests.length === 0 && (
            <div className="py-12 text-center">
              <span className="text-4xl">📭</span>
              <p className="text-gray-500 mt-3 text-sm">No leave requests found.</p>
              <Link
                href="/employee/request-leave"
                className="mt-3 inline-block text-blue-600 text-sm font-medium hover:underline"
              >
                Submit your first request →
              </Link>
            </div>
          )}
          {!loading && !error && requests.length > 0 && (
            <div className="space-y-3">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900">{req.leave_type}</span>
                        {req.is_half_day && (
                          <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                            Half day
                          </span>
                        )}
                        <Badge variant={STATUS_BADGE[req.status] ?? 'default'}>{req.status}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {formatDate(req.start_date)}
                        {req.start_date !== req.end_date && ` – ${formatDate(req.end_date)}`}
                        {' · '}
                        <span className="font-medium">{req.total_days} day{req.total_days !== 1 ? 's' : ''}</span>
                      </p>
                      {req.reason && (
                        <p className="text-xs text-gray-400 mt-1 truncate max-w-md">{req.reason}</p>
                      )}
                      {req.approver_comments && (
                        <p className="text-xs text-gray-500 mt-1 italic">
                          💬 {req.approver?.first_name} {req.approver?.last_name}: {req.approver_comments}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-400">
                        {formatDate(req.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                ← Previous
              </Button>
              <span className="text-sm text-gray-500">
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
    </div>
  );
}
