'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  approved: 'success',
  pending: 'warning',
  escalated: 'warning',
  rejected: 'danger',
  cancelled: 'default',
  draft: 'info',
};

export default function HRLeaveRequestsPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('pending');

  const loadRequests = useCallback(async (p: number, status: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' });
      if (status) params.set('status', status);
      const res = await fetch(`/api/leaves/list?${params}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to load requests');
        return;
      }
      setRequests(json.requests);
      setTotalPages(json.pagination.pages || 1);
      setTotal(json.pagination.total || 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests(page, statusFilter);
  }, [page, statusFilter, loadRequests]);

  async function handleAction(requestId: string, action: 'approve' | 'reject') {
    setActionLoading(requestId + action);
    try {
      const res = await fetch(`/api/leaves/${action}/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments: null }),
      });
      if (res.ok) {
        setRequests((prev) =>
          prev.map((r) =>
            r.id === requestId ? { ...r, status: action === 'approve' ? 'approved' : 'rejected' } : r
          )
        );
      }
    } finally {
      setActionLoading(null);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Requests</h1>
          <p className="text-gray-500 mt-1">
            {total > 0 ? `${total} requests` : 'Manage leave requests'}
          </p>
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: 'pending', label: 'Pending' },
          { value: 'approved', label: 'Approved' },
          { value: 'rejected', label: 'Rejected' },
          { value: '', label: 'All' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => { setStatusFilter(f.value); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === f.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {statusFilter ? statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1) + ' ' : 'All '}
              Requests
            </CardTitle>
            {statusFilter === 'pending' && total > 0 && (
              <Badge variant="warning">{total} pending</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading && <div className="py-12 text-center text-sm text-gray-400">Loading…</div>}
          {error && !loading && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {!loading && !error && requests.length === 0 && (
            <div className="py-12 text-center">
              <span className="text-4xl">📭</span>
              <p className="text-gray-500 mt-3 text-sm">No leave requests found.</p>
            </div>
          )}
          {!loading && !error && requests.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 pr-4 text-gray-500 font-medium">Employee</th>
                    <th className="text-left py-3 px-2 text-gray-500 font-medium">Type</th>
                    <th className="text-left py-3 px-2 text-gray-500 font-medium">Dates</th>
                    <th className="text-left py-3 px-2 text-gray-500 font-medium">Days</th>
                    <th className="text-left py-3 px-2 text-gray-500 font-medium">Status</th>
                    <th className="text-left py-3 pl-2 text-gray-500 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr key={req.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-600 shrink-0">
                            {req.employee.first_name[0]}{req.employee.last_name[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {req.employee.first_name} {req.employee.last_name}
                            </p>
                            <p className="text-xs text-gray-400">{req.employee.department ?? '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 font-medium text-gray-900">{req.leave_type}</td>
                      <td className="py-3 px-2 text-gray-600">
                        {formatDate(req.start_date)}
                        {req.start_date !== req.end_date && ` – ${formatDate(req.end_date)}`}
                      </td>
                      <td className="py-3 px-2 text-gray-600">{req.total_days}</td>
                      <td className="py-3 px-2">
                        <Badge variant={STATUS_BADGE[req.status] ?? 'default'}>{req.status}</Badge>
                      </td>
                      <td className="py-3 pl-2">
                        {(req.status === 'pending' || req.status === 'escalated') ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAction(req.id, 'approve')}
                              disabled={actionLoading === req.id + 'approve'}
                              className="px-2.5 py-1 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 disabled:opacity-50"
                            >
                              {actionLoading === req.id + 'approve' ? '…' : 'Approve'}
                            </button>
                            <button
                              onClick={() => handleAction(req.id, 'reject')}
                              disabled={actionLoading === req.id + 'reject'}
                              className="px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50"
                            >
                              {actionLoading === req.id + 'reject' ? '…' : 'Reject'}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                ← Previous
              </Button>
              <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                Next →
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
