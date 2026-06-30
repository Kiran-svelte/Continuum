'use client';

/**
 * Employee Tax Declaration Page — RALPH-20260630-015
 *
 * Employee view: fill and submit investment declaration.
 *
 * @module app/employee/(main)/tax-declaration/page
 */

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Receipt, Send } from 'lucide-react';
import { ensureMe } from '@/lib/client-auth';

interface TaxDeclaration {
  id: string;
  fiscal_year: string;
  regime: string;
  status: string;
  total_declared: number;
  submitted_at: string | null;
}

const statusColor: Record<string, string> = {
  draft: 'outline', submitted: 'warning', approved: 'success', rejected: 'destructive',
};

export default function EmployeeTaxDeclarationPage() {
  const [declaration, setDeclaration] = useState<TaxDeclaration | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const me = await ensureMe();
      if (!me) return;
      const r = await fetch('/api/tax-declarations', { credentials: 'include' });
      const d = await r.json().catch(() => ({}));
      setDeclaration(d.declaration ?? null);
      setLoading(false);
    })();
  }, []);

  const submit = async () => {
    if (!declaration) return;
    const r = await fetch(`/api/tax-declarations/${declaration.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'submit' }),
    });
    const d = await r.json();
    if (d.declaration) setDeclaration(d.declaration);
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-3xl mx-auto w-full">
      <PageHeader
        title="Tax Declaration"
        description="Submit your investment declarations for TDS computation"
        icon={<Receipt className="w-6 h-6" />}
      />

      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : !declaration ? (
        <div className="card p-12 text-center">
          <Receipt className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground mb-4">No declaration for this fiscal year. Contact HR to open the declaration window.</p>
        </div>
      ) : (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">FY {declaration.fiscal_year}</h3>
              <p className="text-sm text-muted-foreground capitalize">{declaration.regime} tax regime</p>
            </div>
            <Badge variant={(statusColor[declaration.status] ?? 'outline') as 'outline'}>{declaration.status}</Badge>
          </div>

          <div className="p-4 bg-[var(--muted)] rounded-lg">
            <p className="text-sm text-muted-foreground">Total Declared</p>
            <p className="text-2xl font-bold">₹{declaration.total_declared.toLocaleString()}</p>
          </div>

          {declaration.submitted_at && (
            <p className="text-sm text-muted-foreground">Submitted on {new Date(declaration.submitted_at).toLocaleDateString()}</p>
          )}

          {declaration.status === 'draft' && (
            <Button onClick={submit} className="gap-2 w-full">
              <Send className="w-4 h-4" />
              Submit Declaration
            </Button>
          )}
          {declaration.status === 'rejected' && (
            <Button variant="outline" onClick={submit} className="gap-2 w-full">
              <Send className="w-4 h-4" />
              Resubmit
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
