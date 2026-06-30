'use client';

/**
 * Loans & Advances HR Page — RALPH-20260630-011
 *
 * HR view: all loan applications, approve/reject.
 *
 * @module app/hr/(main)/loans/page
 */

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet, CheckCircle, XCircle } from 'lucide-react';
import { ensureMe } from '@/lib/client-auth';

interface Loan {
  id: string;
  amount: number;
  purpose: string;
  installments: number;
  emi_amount: number | null;
  status: string;
  created_at: string;
  Employee: { id: string; first_name: string; last_name: string; designation: string | null };
}

const statusColors: Record<string, string> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
  disbursed: 'info',
  closed: 'outline',
};

export default function HRLoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      const me = await ensureMe();
      if (!me) return;
      setIsAdmin(me.permissions?.includes('payroll.view_payslips') ?? false);
      const r = await fetch('/api/loans', { credentials: 'include' });
      const d = await r.json().catch(() => ({}));
      setLoans(d.loans ?? []);
      setLoading(false);
    })();
  }, []);

  const act = async (id: string, status: 'approved' | 'rejected' | 'disbursed') => {
    await fetch(`/api/loans/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setLoans((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-5xl mx-auto w-full">
      <PageHeader
        title="Loans & Advances"
        description="Manage employee loan applications"
        icon={<Wallet className="w-6 h-6" />}
      />

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : loans.length === 0 ? (
        <div className="card p-12 text-center">
          <Wallet className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">No loan applications.</p>
        </div>
      ) : (
        <div className="card divide-y divide-[var(--border)]">
          {loans.map((loan) => (
            <div key={loan.id} className="p-4 flex items-center gap-4">
              <div className="flex-1">
                <p className="font-medium">{loan.Employee.first_name} {loan.Employee.last_name}</p>
                <p className="text-sm text-muted-foreground">{loan.purpose}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  ₹{loan.amount.toLocaleString()} · {loan.installments} EMIs
                  {loan.emi_amount ? ` · ₹${loan.emi_amount.toFixed(0)}/mo` : ''}
                </p>
              </div>
              <Badge variant={(statusColors[loan.status] ?? 'outline') as 'outline'}>{loan.status}</Badge>
              {isAdmin && loan.status === 'pending' && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-1 text-green-600" onClick={() => act(loan.id, 'approved')}>
                    <CheckCircle className="w-3.5 h-3.5" />Approve
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1 text-red-600" onClick={() => act(loan.id, 'rejected')}>
                    <XCircle className="w-3.5 h-3.5" />Reject
                  </Button>
                </div>
              )}
              {isAdmin && loan.status === 'approved' && (
                <Button size="sm" variant="outline" onClick={() => act(loan.id, 'disbursed')}>Disburse</Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
