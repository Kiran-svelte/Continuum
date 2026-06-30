'use client';

/**
 * Policy Management HR Page — RALPH-20260630-016
 *
 * HR view: create and manage company policies.
 *
 * @module app/hr/(main)/policies/page
 */

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BookMarked, Users, Plus } from 'lucide-react';
import { ensureMe } from '@/lib/client-auth';

interface Policy {
  id: string;
  title: string;
  category: string;
  version: string;
  requires_ack: boolean;
  is_active: boolean;
  published_at: string | null;
  _count: { acknowledgements: number };
}

const catBadge: Record<string, string> = {
  leave: 'info', conduct: 'default', attendance: 'warning', expense: 'success', it: 'outline', other: 'outline',
};

export default function HRPoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      const me = await ensureMe();
      if (!me) return;
      setIsAdmin(me.permissions?.includes('employee.edit_any') ?? false);
      const r = await fetch('/api/policies', { credentials: 'include' });
      const d = await r.json().catch(() => ({}));
      setPolicies(d.policies ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-5xl mx-auto w-full">
      <PageHeader
        title="Policy Management"
        description="Company policies and compliance documents"
        icon={<BookMarked className="w-6 h-6" />}
        action={isAdmin ? <Button size="sm" className="gap-2"><Plus className="w-4 h-4" />New Policy</Button> : undefined}
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
          {policies.map((p) => (
            <div key={p.id} className="p-4 flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{p.title}</p>
                  <Badge variant={(catBadge[p.category] ?? 'outline') as 'outline'}>{p.category}</Badge>
                  <Badge variant="outline">v{p.version}</Badge>
                  {p.requires_ack && <Badge variant="warning">Requires ACK</Badge>}
                </div>
                {p.published_at && (
                  <p className="text-xs text-muted-foreground mt-0.5">Published {new Date(p.published_at).toLocaleDateString()}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                {p._count.acknowledgements} ACKs
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
