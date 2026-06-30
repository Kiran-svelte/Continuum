'use client';

/**
 * Employee Loans Page — RALPH-20260630-028
 * Apply for and track salary loans and advances.
 * @module app/employee/(main)/loans/page
 */

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet, Plus } from 'lucide-react';

interface Loan {
  id: string;
  amount: number;
  loan_type: string;
  status: string;
  tenure_months: number | null;
  disbursed_at: string | null;
  created_at: string;
  notes: string | null;
}

const statusVariant = (s: string): 'success' | 'warning' | 'danger' | 'info' | 'outline' =>
  s === 'disbursed' ? 'success' : s === 'approved' ? 'info' : s === 'pending' ? 'warning' : s === 'rejected' ? 'danger' : 'outline';

export default function EmployeeLoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/loans', { credentials: 'include' })
      .then((r) => r.json().catch(() => ({})))
      .then((d) => setLoans(d.loans ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-4xl mx-auto w-full">
      <PageHeader
        title="My Loans & Advances"
        description="Apply for salary loans and track repayments"
        icon={<Wallet className="w-6 h-6" />}
        action={<Button size="sm" className="gap-2"><Plus className="w-4 h-4" />Apply</Button>}
      />

      {loading ? (
        <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : loans.length === 0 ? (
        <div className="card p-12 text-center">
          <Wallet className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">No loan applications yet.</p>
          <Button size="sm" className="mt-4 gap-2"><Plus className="w-4 h-4" />Apply for Loan</Button>
        </div>
      ) : (
        <div className="card divide-y divide-[var(--border)]">
          {loans.map((l) => (
            <div key={l.id} className="p-4 flex items-center gap-3">
              <div className="flex-1">
                <p className="font-medium capitalize">{l.loan_type.replace(/_/g, ' ')} · ₹{l.amount.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">
                  {l.tenure_months ? `${l.tenure_months} months` : 'No tenure set'}
                  {l.disbursed_at ? ` · Disbursed ${new Date(l.disbursed_at).toLocaleDateString()}` : ''}
                </p>
                {l.notes && <p className="text-xs text-muted-foreground italic mt-0.5">{l.notes}</p>}
              </div>
              <Badge variant={statusVariant(l.status)}>{l.status}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
