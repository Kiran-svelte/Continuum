'use client';

/**
 * Employee Policies Page — RALPH-20260630-016
 *
 * Employee view: read and acknowledge company policies.
 *
 * @module app/employee/(main)/policies/page
 */

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BookMarked, CheckCircle2 } from 'lucide-react';

interface Policy {
  id: string;
  title: string;
  category: string;
  version: string;
  requires_ack: boolean;
  acknowledgements: Array<{ acked_at: string }>;
}

export default function EmployeePoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/policies', { credentials: 'include' })
      .then((r) => r.json().catch(() => ({})))
      .then((d) => { setPolicies(d.policies ?? []); })
      .finally(() => setLoading(false));
  }, []);

  const ack = async (id: string) => {
    await fetch(`/api/policies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ack' }),
    });
    setPolicies((prev) => prev.map((p) => p.id === id ? { ...p, acknowledgements: [{ acked_at: new Date().toISOString() }] } : p));
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-4xl mx-auto w-full">
      <PageHeader
        title="Company Policies"
        description="Read and acknowledge company policies"
        icon={<BookMarked className="w-6 h-6" />}
      />

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : policies.length === 0 ? (
        <div className="card p-12 text-center">
          <BookMarked className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">No policies published yet.</p>
        </div>
      ) : (
        <div className="card divide-y divide-[var(--border)]">
          {policies.map((p) => {
            const acked = p.acknowledgements.length > 0;
            return (
              <div key={p.id} className="p-4 flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{p.title}</p>
                    <Badge variant="outline" className="capitalize">{p.category}</Badge>
                    <Badge variant="outline">v{p.version}</Badge>
                  </div>
                </div>
                {p.requires_ack && (
                  acked ? (
                    <div className="flex items-center gap-1.5 text-sm text-green-600">
                      <CheckCircle2 className="w-4 h-4" />Acknowledged
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => ack(p.id)}>Acknowledge</Button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
