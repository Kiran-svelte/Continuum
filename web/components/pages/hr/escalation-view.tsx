'use client';

import { useState, useEffect, useCallback } from 'react';
import { StaggerContainer, FadeIn, TiltCard } from '@/components/motion';
import { PageHeader } from '@/components/page-header';
import { GlassPanel } from '@/components/glass-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ensureMe } from '@/lib/client-auth';
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  RotateCcw,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface LeaveRequest {
  id: string;
  employee: { first_name: string; last_name: string; email: string; department: string | null };
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: string;
  reason: string | null;
  sla_deadline: string | null;
  sla_breached: boolean;
  escalation_count: number;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function EscalationView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchEscalated = useCallback(async () => {
    setError(null);
    try {
      await ensureMe();
      const res = await fetch('/api/leaves/list?status=escalated,pending&limit=100', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load escalated requests');
      const data = await res.json();
      // Filter to show escalated and SLA-breached requests
      const escalated = (data.requests || []).filter(
        (r: LeaveRequest) => r.status === 'escalated' || r.sla_breached
      );
      setRequests(escalated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEscalated();
  }, [fetchEscalated]);

  async function handleAction(requestId: string, action: 'approve' | 'reject') {
    setActionLoading(requestId);
    try {
      const url = `/api/leaves/${action}/${requestId}`;
      const isApproval = action === 'approve';
      const requestBody = isApproval
        ? { action: 'approve' }
        : { comments: 'Rejected after SLA escalation review' };
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `${action} failed`);
      }
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      setFeedback({ type: 'success', message: `Request ${action === 'approve' ? 'approved' : 'rejected'} successfully.` });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Action failed' });
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setActionLoading(null);
    }
  }

  function getHoursOverdue(slaDeadline: string | null): string {
    if (!slaDeadline) return '--';
    const deadline = new Date(slaDeadline);
    const now = new Date();
    const diffHrs = Math.round((now.getTime() - deadline.getTime()) / (1000 * 60 * 60));
    if (diffHrs <= 0) return 'Not yet breached';
    if (diffHrs < 24) return `${diffHrs}h overdue`;
    return `${Math.round(diffHrs / 24)}d ${diffHrs % 24}h overdue`;
  }

  return (
    <StaggerContainer className="space-y-6">

      {/* Header */}
      <PageHeader
        title="Escalations"
        description="SLA-breached and escalated leave requests requiring immediate attention"
        icon={<AlertTriangle className="w-6 h-6 text-primary" />}
        action={
          <Button variant="outline" size="sm" onClick={fetchEscalated} className="gap-1">
            <RotateCcw className="w-3.5 h-3.5" /> Refresh
          </Button>
        }
      />

      {/* Feedback */}
      {feedback && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2 ${
          feedback.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {feedback.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {feedback.message}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl px-4 py-3 text-sm font-medium bg-red-50 text-red-700 border border-red-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span className="flex-1">{error}</span>
          <Button variant="ghost" size="sm" onClick={fetchEscalated}>Retry</Button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !error && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <GlassPanel key={i}>
              <Skeleton className="h-24 rounded-xl" />
            </GlassPanel>
          ))}
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {/* Summary */}
          <FadeIn>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <TiltCard>
                <GlassPanel className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase">Total Escalated</p>
                      <p className="text-2xl font-bold text-red-600 mt-1">{requests.length}</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    </div>
                  </div>
                </GlassPanel>
              </TiltCard>
              <TiltCard>
                <GlassPanel className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase">SLA Breached</p>
                      <p className="text-2xl font-bold text-amber-600 mt-1">
                        {requests.filter((r) => r.sla_breached).length}
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                      <Clock className="h-5 w-5 text-amber-500" />
                    </div>
                  </div>
                </GlassPanel>
              </TiltCard>
              <TiltCard>
                <GlassPanel className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase">Avg Escalation Count</p>
                      <p className="text-2xl font-bold text-foreground mt-1">
                        {requests.length > 0
                          ? (requests.reduce((s, r) => s + (r.escalation_count || 0), 0) / requests.length).toFixed(1)
                          : '0'}
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
                      <AlertTriangle className="h-5 w-5 text-purple-500" />
                    </div>
                  </div>
                </GlassPanel>
              </TiltCard>
            </div>
          </FadeIn>

          {/* Request list */}
          <FadeIn>
            <GlassPanel>
              <div className="px-6 py-4 border-b border-[var(--border)]">
                <h3 className="text-lg font-semibold text-foreground">Escalated Requests</h3>
              </div>
              <div>
                {requests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                    <CheckCircle className="h-10 w-10 text-green-500 mb-3" />
                    <h3 className="text-base font-semibold text-foreground">All clear</h3>
                    <p className="text-sm text-muted-foreground mt-1">No escalated or SLA-breached requests at the moment.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border)]">
                    {requests.map((req) => (
                      <div key={req.id} className="px-4 py-4 hover:bg-[var(--bg-surface-hover)] transition-colors">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                              req.sla_breached ? 'bg-red-100' : 'bg-amber-100'
                            }`}>
                              <AlertTriangle className={`h-4 w-4 ${req.sla_breached ? 'text-red-600' : 'text-amber-600'}`} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-sm text-foreground">{req.employee.first_name} {req.employee.last_name}</p>
                                <Badge variant={req.sla_breached ? 'danger' : 'warning'} size="sm">
                                  {req.sla_breached ? 'SLA Breached' : 'Escalated'}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {req.leave_type} &middot; {req.total_days} day{req.total_days !== 1 ? 's' : ''} &middot;{' '}
                                {new Date(req.start_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                {req.start_date !== req.end_date && ` - ${new Date(req.end_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`}
                              </p>
                              {req.sla_deadline && (
                                <p className="text-xs text-red-600 mt-0.5">
                                  {getHoursOverdue(req.sla_deadline)}
                                </p>
                              )}
                              {req.reason && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{req.reason}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              variant="success"
                              size="sm"
                              className="text-xs gap-1"
                              disabled={actionLoading === req.id}
                              onClick={() => handleAction(req.id, 'approve')}
                            >
                              {actionLoading === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                              Approve
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              className="text-xs gap-1"
                              disabled={actionLoading === req.id}
                              onClick={() => handleAction(req.id, 'reject')}
                            >
                              {actionLoading === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </GlassPanel>
          </FadeIn>
        </>
      )}
    </StaggerContainer>
  );
}


