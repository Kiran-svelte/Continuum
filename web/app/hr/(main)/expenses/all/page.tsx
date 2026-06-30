'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, DollarSign } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface Expense {
  id: string;
  category: string;
  amount: number;
  currency: string;
  description: string | null;
  status: string;
  created_at: string;
  Employee: { first_name: string; last_name: string };
}

export default function ExpenseHistoryPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadExpenses() {
      try {
        const response = await fetch('/api/expenses', { credentials: 'include' });
        const data = await response.json().catch(() => ({}));
        setExpenses(data.expenses ?? []);
      } finally {
        setLoading(false);
      }
    }

    void loadExpenses();
  }, []);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-5xl mx-auto w-full">
      <Link href="/hr/travel" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" />
        Back to Travel & Expense
      </Link>
      <PageHeader title="Expense History" description="Review all visible expense claims" icon={<DollarSign className="w-6 h-6" />} />
      <section className="card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-16 w-full" />)}</div>
        ) : expenses.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No expense claims found.</div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {expenses.map((expense) => (
              <div key={expense.id} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium capitalize">{expense.category}</p>
                  <p className="text-xs text-muted-foreground">
                    {expense.Employee.first_name} {expense.Employee.last_name} · {expense.description || 'No description'} · {new Date(expense.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant={expense.status === 'approved' ? 'success' : expense.status === 'rejected' ? 'danger' : 'outline'}>{expense.status}</Badge>
                  <p className="text-xs text-muted-foreground mt-1">{expense.currency} {expense.amount.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
