'use client';

/**
 * Employee Expenses Page — RALPH-20260630-028
 * Submit and track expense claims.
 * @module app/employee/(main)/expenses/page
 */

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Receipt, Plus } from 'lucide-react';

interface Expense {
  id: string;
  title: string;
  amount: number;
  currency: string;
  category: string;
  status: string;
  expense_date: string;
  created_at: string;
}

const statusVariant = (s: string): 'success' | 'warning' | 'danger' | 'outline' =>
  s === 'approved' ? 'success' : s === 'pending' ? 'warning' : s === 'rejected' ? 'danger' : 'outline';

export default function EmployeeExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/expenses?mine=true', { credentials: 'include' })
      .then((r) => r.json().catch(() => ({})))
      .then((d) => setExpenses(d.expenses ?? []))
      .finally(() => setLoading(false));
  }, []);

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const approved = expenses.filter((e) => e.status === 'approved').reduce((s, e) => s + e.amount, 0);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-4xl mx-auto w-full">
      <PageHeader
        title="My Expenses"
        description="Submit and track your expense claims"
        icon={<Receipt className="w-6 h-6" />}
        action={<Button size="sm" className="gap-2"><Plus className="w-4 h-4" />New Claim</Button>}
      />

      {!loading && (
        <div className="grid grid-cols-2 gap-4">
          <div className="card p-5">
            <p className="text-xs text-muted-foreground">Total Claimed</p>
            <p className="text-2xl font-bold mt-1">₹{total.toLocaleString()}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs text-muted-foreground">Approved</p>
            <p className="text-2xl font-bold mt-1 text-success">₹{approved.toLocaleString()}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : expenses.length === 0 ? (
        <div className="card p-12 text-center">
          <Receipt className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">No expense claims submitted yet.</p>
          <Button size="sm" className="mt-4 gap-2"><Plus className="w-4 h-4" />Submit First Claim</Button>
        </div>
      ) : (
        <div className="card divide-y divide-[var(--border)]">
          {expenses.map((e) => (
            <div key={e.id} className="p-4 flex items-center gap-3">
              <div className="flex-1">
                <p className="font-medium">{e.title}</p>
                <p className="text-sm text-muted-foreground">
                  {e.category} · {new Date(e.expense_date).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{e.currency} {e.amount.toLocaleString()}</p>
                <Badge variant={statusVariant(e.status)}>{e.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
