'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ConstraintViolation {
  message?: string;
  rule_name?: string;
}

interface ConstraintWarning {
  message?: string;
  rule_name?: string;
}

interface ConstraintSuggestion {
  message?: string;
}

interface ConstraintResult {
  violations?: (ConstraintViolation | string)[];
  warnings?: (ConstraintWarning | string)[];
  suggestions?: (ConstraintSuggestion | string)[];
  ai_recommendation?: {
    decision: string;
    confidence?: number;
  };
}

interface LeaveRequest {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'escalated' | 'draft';
  reason: string | null;
  created_at: string;
  constraint_result: ConstraintResult | null;
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
  const [commentingId, setCommentingId] = useState<string | null>(null);
  const [commentAction, setCommentAction] = useState<'approve' | 'reject' | null>(null);
  const [comment, setComment] = useState('');

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/leaves/list?status=pending,escalated&limit=50');
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

  function startAction(requestId: string, action: 'approve' | 'reject') {
    setCommentingId(requestId);
    setCommentAction(action);
    setComment('');
  }

  function cancelAction() {
    setCommentingId(null);
    setCommentAction(null);
    setComment('');
  }

  async function confirmAction(requestId: string, action: 'approve' | 'reject', empName: string) {
    setActionLoading(requestId + action);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/leaves/${action}/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments: comment || null }),
      });
      const json = await res.json();
      if (res.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
        setActionSuccess(`${action === 'approve' ? 'Approved' : 'Rejected'} ${empName}'s request.`);
        setTimeout(() => setActionSuccess(null), 4000);
        cancelAction();
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
        <h1 className="text-2xl font-bold text-foreground">Pending Approvals</h1>
        <p className="text-muted-foreground mt-1">
          {pendingCount > 0 ? `${pendingCount} request${pendingCount !== 1 ? 's' : ''} need your attention` : 'All caught up!'}
        </p>
      </div>

      {actionSuccess && (
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-300">
          {actionSuccess}
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
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
          {loading && <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>}
          {!loading && requests.length === 0 && !error && (
            <div className="py-12 text-center">
              <p className="text-muted-foreground mt-3 text-sm">No pending requests -- all caught up!</p>
            </div>
          )}
          {!loading && requests.length > 0 && (
            <div className="space-y-3">
              {requests.map((req) => {
                const empName = `${req.employee.first_name} ${req.employee.last_name}`;
                const isCommenting = commentingId === req.id;
                return (
                  <div
                    key={req.id}
                    className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-sm font-bold text-primary shrink-0">
                          {req.employee.first_name[0]}{req.employee.last_name[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-foreground">
                              {empName}
                            </p>
                            <span className="text-xs text-muted-foreground">{req.employee.department ?? '--'}</span>
                            <Badge variant="warning">{req.leave_type}</Badge>
                            {req.status === 'escalated' && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300">
                                Escalated
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {formatDate(req.start_date)}
                            {req.start_date !== req.end_date && ` \u2013 ${formatDate(req.end_date)}`}
                            {' \u00b7 '}
                            <span className="font-medium">{req.total_days} day{req.total_days !== 1 ? 's' : ''}</span>
                            {' \u00b7 '}
                            <span className="text-muted-foreground">{timeAgo(req.created_at)}</span>
                          </p>
                          {req.reason && (
                            <p className="text-xs text-muted-foreground mt-1 max-w-sm truncate">&ldquo;{req.reason}&rdquo;</p>
                          )}
                        </div>
                      </div>
                      {!isCommenting && (
                        <div className="flex gap-2 ml-4 shrink-0">
                          <button
                            onClick={() => startAction(req.id, 'approve')}
                            disabled={!!actionLoading}
                            className="px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 disabled:opacity-50 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => startAction(req.id, 'reject')}
                            disabled={!!actionLoading}
                            className="px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-50 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Constraint Engine Results */}
                    {req.constraint_result && (
                      <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                        <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-2">Constraint Engine Results</p>
                        {(req.constraint_result.violations?.length ?? 0) > 0 && (
                          <div className="space-y-1">
                            {req.constraint_result.violations!.map((v, i) => (
                              <p key={i} className="text-xs text-red-600 dark:text-red-400">
                                {typeof v === 'string' ? v : v.message || v.rule_name || 'Violation'}
                              </p>
                            ))}
                          </div>
                        )}
                        {(req.constraint_result.warnings?.length ?? 0) > 0 && (
                          <div className="space-y-1 mt-1">
                            {req.constraint_result.warnings!.map((w, i) => (
                              <p key={i} className="text-xs text-amber-600 dark:text-amber-400">
                                {typeof w === 'string' ? w : w.message || w.rule_name || 'Warning'}
                              </p>
                            ))}
                          </div>
                        )}
                        {(req.constraint_result.suggestions?.length ?? 0) > 0 && (
                          <div className="space-y-1 mt-1">
                            {req.constraint_result.suggestions!.map((s, i) => (
                              <p key={i} className="text-xs text-muted-foreground">
                                {typeof s === 'string' ? s : s.message || 'Suggestion'}
                              </p>
                            ))}
                          </div>
                        )}
                        {req.constraint_result.ai_recommendation && (
                          <p className="text-xs text-primary mt-2">
                            AI: {req.constraint_result.ai_recommendation.decision}
                            {' '}({Math.round((req.constraint_result.ai_recommendation.confidence || 0) * 100)}% confidence)
                          </p>
                        )}
                      </div>
                    )}

                    {/* Comment input for approve/reject */}
                    {isCommenting && commentAction && (
                      <div className="mt-3 p-3 rounded-lg border border-border bg-muted/30">
                        <p className="text-xs font-medium text-foreground mb-2">
                          {commentAction === 'approve' ? 'Approve' : 'Reject'} {empName}&apos;s request
                        </p>
                        <textarea
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder="Add a comment (optional)..."
                          rows={2}
                          className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        />
                        <div className="flex gap-2 mt-2 justify-end">
                          <button
                            onClick={cancelAction}
                            disabled={!!actionLoading}
                            className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted rounded-lg hover:bg-muted/80 disabled:opacity-50 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => confirmAction(req.id, commentAction, empName)}
                            disabled={!!actionLoading}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg disabled:opacity-50 transition-colors ${
                              commentAction === 'approve'
                                ? 'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40'
                                : 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40'
                            }`}
                          >
                            {actionLoading === req.id + commentAction
                              ? 'Processing...'
                              : `Confirm ${commentAction === 'approve' ? 'Approval' : 'Rejection'}`}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
