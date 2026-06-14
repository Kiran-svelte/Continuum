'use client';

/**
 * Travel & Expense Dashboard — HR Portal
 *
 * Features:
 * - Pending travel requests requiring approval
 * - Expense claims pending approval
 * - Budget summary
 * - Quick approve/reject inline
 *
 * @module app/hr/(main)/travel/page
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ensureMe } from '@/lib/client-auth';
import {
  Plane, DollarSign, Clock, CheckCircle,
  ChevronRight, XCircle, AlertCircle,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TravelRequest {
  id: string;
  purpose: string;
  destination: string;
  departure_date: string;
  return_date: string;
  estimated_cost: number | null;
  currency: string;
  status: string;
  Employee: { first_name: string; last_name: string; department: string | null };
}

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TravelView() {
  const [travelRequests, setTravelRequests] = useState<TravelRequest[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      await ensureMe();
      const [travelRes, expensesRes] = await Promise.allSettled([
        fetch('/api/travel-requests?status=pending', { credentials: 'include' }),
        fetch('/api/expenses?status=pending', { credentials: 'include' }),
      ]);

      if (travelRes.status === 'fulfilled' && travelRes.value.ok) {
        const data = await travelRes.value.json();
        setTravelRequests(data.requests ?? []);
      }

      if (expensesRes.status === 'fulfilled' && expensesRes.value.ok) {
        const data = await expensesRes.value.json();
        setExpenses(data.expenses ?? []);
      }
    } catch {
      toast.error('Failed to load travel & expense data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleTravelAction = useCallback(async (id: string, action: 'approve' | 'reject') => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/travel-requests?id=${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error('Action failed');
      toast.success(`Travel request ${action}d`);
      setTravelRequests((prev) => prev.filter((r) => r.id !== id));
    } catch {
      toast.error('Failed to process travel request');
    } finally {
      setProcessingId(null);
    }
  }, []);

  const handleExpenseAction = useCallback(async (id: string, action: 'approve' | 'reject') => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/expenses?id=${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error('Action failed');
      toast.success(`Expense ${action}d`);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } catch {
      toast.error('Failed to process expense');
    } finally {
      setProcessingId(null);
    }
  }, []);

  const totalPendingCost = travelRequests.reduce((s, r) => s + (r.estimated_cost ?? 0), 0);
  const totalPendingExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-[1400px] mx-auto w-full">
      <PageHeader
        title="Travel & Expense"
        description="Approve travel requests and expense claims"
        icon={<Plane className="w-6 h-6" />}
      />

      {/* KPI Cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={<Clock className="w-5 h-5 text-orange-400" />} label="Pending Travel" value={isLoading ? '...' : String(travelRequests.length)} subtext="requests awaiting approval" />
        <KpiCard icon={<AlertCircle className="w-5 h-5 text-yellow-400" />} label="Pending Expenses" value={isLoading ? '...' : String(expenses.length)} subtext="claims to review" />
        <KpiCard icon={<Plane className="w-5 h-5" />} label="Est. Travel Budget" value={isLoading ? '...' : `₹${totalPendingCost.toLocaleString()}`} subtext="pending approval" />
        <KpiCard icon={<DollarSign className="w-5 h-5" />} label="Expense Total" value={isLoading ? '...' : `₹${totalPendingExpenses.toLocaleString()}`} subtext="pending reimbursement" />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Travel Requests */}
        <section className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-[var(--border)] flex justify-between items-center">
            <h3 className="text-h4 font-semibold flex items-center gap-2">
              <Plane className="w-4 h-4" /> Travel Requests
              {travelRequests.length > 0 && (
                <span className="text-xs bg-orange-500/20 text-orange-400 rounded-full px-2 py-0.5">{travelRequests.length}</span>
              )}
            </h3>
            <Link href="/hr/travel/all" className="text-xs font-semibold text-[var(--info)] hover:underline flex items-center">
              History <ChevronRight className="w-3 h-3 ml-1" />
            </Link>
          </div>

          {isLoading ? (
            <div className="p-4 space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
          ) : travelRequests.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-400 opacity-60" />
              <p className="text-sm font-medium">All caught up!</p>
              <p className="text-xs mt-1 text-[var(--muted-foreground)]">No pending travel requests</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {travelRequests.map((req) => (
                <div key={req.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium">{req.Employee.first_name} {req.Employee.last_name}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{req.Employee.department ?? 'N/A'}</p>
                    </div>
                    {req.estimated_cost && (
                      <span className="text-sm font-semibold">₹{req.estimated_cost.toLocaleString()}</span>
                    )}
                  </div>
                  <p className="text-xs mb-1"><span className="font-semibold">Purpose:</span> {req.purpose}</p>
                  <p className="text-xs text-[var(--muted-foreground)] mb-3">
                    {req.destination} · {new Date(req.departure_date).toLocaleDateString('en-IN')} → {new Date(req.return_date).toLocaleDateString('en-IN')}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 text-green-400 border-green-500/30 hover:bg-green-500/10"
                      disabled={processingId === req.id}
                      onClick={() => void handleTravelAction(req.id, 'approve')}>
                      <CheckCircle className="w-4 h-4 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 text-red-400 border-red-500/30 hover:bg-red-500/10"
                      disabled={processingId === req.id}
                      onClick={() => void handleTravelAction(req.id, 'reject')}>
                      <XCircle className="w-4 h-4 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Expense Claims */}
        <section className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-[var(--border)] flex justify-between items-center">
            <h3 className="text-h4 font-semibold flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Expense Claims
              {expenses.length > 0 && (
                <span className="text-xs bg-yellow-500/20 text-yellow-400 rounded-full px-2 py-0.5">{expenses.length}</span>
              )}
            </h3>
            <Link href="/hr/expenses/all" className="text-xs font-semibold text-[var(--info)] hover:underline flex items-center">
              History <ChevronRight className="w-3 h-3 ml-1" />
            </Link>
          </div>

          {isLoading ? (
            <div className="p-4 space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : expenses.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-400 opacity-60" />
              <p className="text-sm font-medium">All caught up!</p>
              <p className="text-xs mt-1 text-[var(--muted-foreground)]">No pending expense claims</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {expenses.map((expense) => (
                <div key={expense.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium">{expense.Employee.first_name} {expense.Employee.last_name}</p>
                      <p className="text-xs text-[var(--muted-foreground)] capitalize">{expense.category} · {new Date(expense.created_at).toLocaleDateString('en-IN')}</p>
                    </div>
                    <span className="text-sm font-bold">{expense.currency} {expense.amount.toLocaleString()}</span>
                  </div>
                  {expense.description && (
                    <p className="text-xs text-[var(--muted-foreground)] mb-3">{expense.description}</p>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 text-green-400 border-green-500/30 hover:bg-green-500/10"
                      disabled={processingId === expense.id}
                      onClick={() => void handleExpenseAction(expense.id, 'approve')}>
                      <CheckCircle className="w-4 h-4 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 text-red-400 border-red-500/30 hover:bg-red-500/10"
                      disabled={processingId === expense.id}
                      onClick={() => void handleExpenseAction(expense.id, 'reject')}>
                      <XCircle className="w-4 h-4 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps { icon: React.ReactNode; label: string; value: string; subtext: string }

function KpiCard({ icon, label, value, subtext }: KpiCardProps) {
  return (
    <div className="card p-4 flex flex-col gap-2">
      <div className="bg-[var(--muted)] w-10 h-10 rounded-md flex items-center justify-center">{icon}</div>
      <span className="text-xs font-semibold text-[var(--muted-foreground)]">{label}</span>
      <span className="text-display text-2xl leading-none">{value}</span>
      <span className="text-xs text-[var(--muted-foreground)]">{subtext}</span>
    </div>
  );
}
