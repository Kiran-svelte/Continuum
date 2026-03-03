'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

export default function ManagerApprovalsPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/leaves/list?status=pending&limit=50');
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to load pending requests');
        return;
      }
      setRequests(json.requests);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  async function handleAction(requestId: string, action: 'approve' | 'reject', empName: string) {
    setActionLoading(requestId + action);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/leaves/${action}/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments: null }),
      });
      const json = await res.json();
      if (res.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
        setActionSuccess(`${action === 'approve' ? 'Approved' : 'Rejected'} ${empName}'s request.`);
        setTimeout(() => setActionSuccess(null), 4000);
      } else {
        setError(json.error ?? `${action} failed`);
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

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3_600_000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  const pendingCount = requests.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pending Approvals</h1>
        <p className="text-gray-500 mt-1">
          {pendingCount > 0 ? `${pendingCount} request${pendingCount !== 1 ? 's' : ''} need your attention` : 'All caught up!'}
        </p>
      </div>

      {actionSuccess && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          ✓ {actionSuccess}
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Team Requests</CardTitle>
            {pendingCount > 0 && <Badge variant="warning">{pendingCount} pending</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          {loading && <div className="py-12 text-center text-sm text-gray-400">Loading…</div>}
          {!loading && requests.length === 0 && !error && (
            <div className="py-12 text-center">
              <span className="text-4xl">🎉</span>
              <p className="text-gray-500 mt-3 text-sm">No pending requests — all caught up!</p>
            </div>
          )}
          {!loading && requests.length > 0 && (
            <div className="space-y-3">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-start justify-between p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-600 shrink-0">
                      {req.employee.first_name[0]}{req.employee.last_name[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900">
                          {req.employee.first_name} {req.employee.last_name}
                        </p>
                        <span className="text-xs text-gray-400">{req.employee.department ?? '—'}</span>
                        <Badge variant="warning">{req.leave_type}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {formatDate(req.start_date)}
                        {req.start_date !== req.end_date && ` – ${formatDate(req.end_date)}`}
                        {' · '}
                        <span className="font-medium">{req.total_days} day{req.total_days !== 1 ? 's' : ''}</span>
                        {' · '}
                        <span className="text-gray-400">{timeAgo(req.created_at)}</span>
                      </p>
                      {req.reason && (
                        <p className="text-xs text-gray-400 mt-1 max-w-sm truncate">&ldquo;{req.reason}&rdquo;</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4 shrink-0">
                    <button
                      onClick={() => handleAction(req.id, 'approve', `${req.employee.first_name} ${req.employee.last_name}`)}
                      disabled={!!actionLoading}
                      className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors"
                    >
                      {actionLoading === req.id + 'approve' ? '…' : '✓ Approve'}
                    </button>
                    <button
                      onClick={() => handleAction(req.id, 'reject', `${req.employee.first_name} ${req.employee.last_name}`)}
                      disabled={!!actionLoading}
                      className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                    >
                      {actionLoading === req.id + 'reject' ? '…' : '✗ Reject'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
