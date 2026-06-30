'use client';

/**
 * Employee Overtime Page — RALPH-20260630-019
 *
 * Employee view: submit and track overtime requests.
 *
 * @module app/employee/(main)/overtime/page
 */

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, Plus } from 'lucide-react';

interface OTRequest {
  id: string;
  date: string;
  hours: number;
  reason: string | null;
  status: string;
  payout_type: string;
}

const statusColor: Record<string, string> = {
  pending: 'warning', approved: 'success', rejected: 'danger',
};

export default function EmployeeOvertimePage() {
  const [requests, setRequests] = useState<OTRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/overtime', { credentials: 'include' })
      .then((r) => r.json().catch(() => ({})))
      .then((d) => { setRequests(d.requests ?? []); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-4xl mx-auto w-full">
      <PageHeader
        title="Overtime Requests"
        description="Submit and track your overtime requests"
        icon={<Clock className="w-6 h-6" />}
        action={<Button size="sm" className="gap-2"><Plus className="w-4 h-4" />New Request</Button>}
      />

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : requests.length === 0 ? (
        <div className="card p-12 text-center">
          <Clock className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">No overtime requests submitted.</p>
        </div>
      ) : (
        <div className="card divide-y divide-[var(--border)]">
          {requests.map((r) => (
            <div key={r.id} className="p-4 flex items-center gap-3">
              <div className="flex-1">
                <p className="font-medium">{new Date(r.date).toLocaleDateString()} · {r.hours}h</p>
                <p className="text-sm text-muted-foreground capitalize">{r.payout_type} payout{r.reason ? ` · ${r.reason}` : ''}</p>
              </div>
              <Badge variant={(statusColor[r.status] ?? 'outline') as 'outline'}>{r.status}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
