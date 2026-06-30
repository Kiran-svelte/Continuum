'use client';

/**
 * Overtime Management HR Page — RALPH-20260630-019
 *
 * HR view: approve/reject overtime requests, view summary.
 *
 * @module app/hr/(main)/overtime/page
 */

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { ensureMe } from '@/lib/client-auth';

interface OTRequest {
  id: string;
  date: string;
  hours: number;
  reason: string | null;
  status: string;
  payout_type: string;
  Employee: { id: string; first_name: string; last_name: string; designation: string | null; department: string | null };
}

const statusColor: Record<string, string> = {
  pending: 'warning', approved: 'success', rejected: 'danger',
};

export default function HROvertimePage() {
  const [requests, setRequests] = useState<OTRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [canApprove, setCanApprove] = useState(false);

  useEffect(() => {
    (async () => {
      const me = await ensureMe();
      if (!me) return;
      setCanApprove(me.permissions?.includes('employee.view_all') ?? false);
      const r = await fetch('/api/overtime?status=pending', { credentials: 'include' });
      const d = await r.json().catch(() => ({}));
      setRequests(d.requests ?? []);
      setLoading(false);
    })();
  }, []);

  const act = async (id: string, status: 'approved' | 'rejected') => {
    await fetch(`/api/overtime/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setRequests((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-5xl mx-auto w-full">
      <PageHeader
        title="Overtime Management"
        description="Review and approve overtime requests"
        icon={<Clock className="w-6 h-6" />}
      />

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : requests.length === 0 ? (
        <div className="card p-12 text-center">
          <Clock className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">No pending overtime requests.</p>
        </div>
      ) : (
        <div className="card divide-y divide-[var(--border)]">
          {requests.map((r) => (
            <div key={r.id} className="p-4 flex items-center gap-4">
              <div className="flex-1">
                <p className="font-medium">{r.Employee.first_name} {r.Employee.last_name}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(r.date).toLocaleDateString()} · {r.hours}h OT
                  {r.reason && ` · ${r.reason}`}
                </p>
                <p className="text-xs text-muted-foreground capitalize mt-0.5">{r.payout_type} payout</p>
              </div>
              <Badge variant={(statusColor[r.status] ?? 'outline') as 'outline'}>{r.status}</Badge>
              {canApprove && r.status === 'pending' && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-1 text-green-600" onClick={() => act(r.id, 'approved')}>
                    <CheckCircle className="w-3.5 h-3.5" />Approve
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1 text-red-600" onClick={() => act(r.id, 'rejected')}>
                    <XCircle className="w-3.5 h-3.5" />Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
