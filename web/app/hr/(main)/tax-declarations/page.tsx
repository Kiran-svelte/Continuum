'use client';

/**
 * Tax Declarations HR Page — RALPH-20260630-015
 *
 * HR view: review and approve/reject employee tax declarations.
 *
 * @module app/hr/(main)/tax-declarations/page
 */

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Receipt, CheckCircle, XCircle } from 'lucide-react';
import { ensureMe } from '@/lib/client-auth';

interface TaxDeclaration {
  id: string;
  fiscal_year: string;
  regime: string;
  status: string;
  total_declared: number;
  submitted_at: string | null;
  Employee: { id: string; first_name: string; last_name: string; designation: string | null };
}

const statusColor: Record<string, string> = {
  draft: 'outline', submitted: 'warning', approved: 'success', rejected: 'destructive',
};

export default function HRTaxDeclarationsPage() {
  const [declarations, setDeclarations] = useState<TaxDeclaration[]>([]);
  const [loading, setLoading] = useState(true);
  const [canApprove, setCanApprove] = useState(false);

  useEffect(() => {
    (async () => {
      const me = await ensureMe();
      if (!me) return;
      setCanApprove(me.permissions?.includes('payroll.approve') ?? false);
      const r = await fetch('/api/tax-declarations', { credentials: 'include' });
      const d = await r.json().catch(() => ({}));
      setDeclarations(d.declarations ?? []);
      setLoading(false);
    })();
  }, []);

  const act = async (id: string, status: 'approved' | 'rejected') => {
    await fetch(`/api/tax-declarations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setDeclarations((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)));
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-5xl mx-auto w-full">
      <PageHeader
        title="Tax Declarations"
        description="Review employee investment declarations"
        icon={<Receipt className="w-6 h-6" />}
      />

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : declarations.length === 0 ? (
        <div className="card p-12 text-center">
          <Receipt className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">No declarations submitted.</p>
        </div>
      ) : (
        <div className="card divide-y divide-[var(--border)]">
          {declarations.map((d) => (
            <div key={d.id} className="p-4 flex items-center gap-4">
              <div className="flex-1">
                <p className="font-medium">{d.Employee.first_name} {d.Employee.last_name}</p>
                <p className="text-sm text-muted-foreground">FY {d.fiscal_year} · {d.regime} regime · ₹{d.total_declared.toLocaleString()}</p>
              </div>
              <Badge variant={(statusColor[d.status] ?? 'outline') as 'outline'}>{d.status}</Badge>
              {canApprove && d.status === 'submitted' && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-1 text-green-600" onClick={() => act(d.id, 'approved')}>
                    <CheckCircle className="w-3.5 h-3.5" />Approve
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1 text-red-600" onClick={() => act(d.id, 'rejected')}>
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
