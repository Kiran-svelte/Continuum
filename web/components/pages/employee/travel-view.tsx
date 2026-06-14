'use client';

/**
 * Employee Travel & Expense Self-Service Portal
 *
 * Features:
 * - Submit travel request
 * - View own travel request history
 * - Submit expense claim
 * - View own expense history
 *
 * @module app/employee/(main)/travel/page
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ensureMe } from '@/lib/client-auth';
import { Plane, DollarSign, Plus, X } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = ['food', 'transport', 'accommodation', 'communication', 'supplies', 'training', 'entertainment', 'medical', 'other'] as const;

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
  created_at: string;
}

interface Expense {
  id: string;
  category: string;
  amount: number;
  currency: string;
  description: string | null;
  status: string;
  created_at: string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TravelView() {
  const [travelRequests, setTravelRequests] = useState<TravelRequest[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTravelForm, setShowTravelForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      await ensureMe();
      const [travelRes, expensesRes] = await Promise.allSettled([
        fetch('/api/travel-requests', { credentials: 'include' }),
        fetch('/api/expenses', { credentials: 'include' }),
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

  const statusBadgeVariant = (status: string): 'default' | 'success' | 'outline' | 'danger' => {
    if (status === 'approved') return 'success';
    if (status === 'rejected' || status === 'cancelled') return 'danger';
    return 'outline';
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-[1200px] mx-auto w-full">
      <PageHeader
        title="Travel & Expenses"
        description="Request travel approvals and submit expense claims"
        icon={<Plane className="w-6 h-6" />}
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowTravelForm((v) => !v)}>
              <Plus className="w-4 h-4 mr-1" /> Travel Request
            </Button>
            <Button size="sm" onClick={() => setShowExpenseForm((v) => !v)}>
              <Plus className="w-4 h-4 mr-1" /> Expense Claim
            </Button>
          </div>
        }
      />

      {/* Travel Request Form */}
      {showTravelForm && (
        <TravelRequestForm
          onSuccess={() => { setShowTravelForm(false); void fetchData(); }}
          onCancel={() => setShowTravelForm(false)}
        />
      )}

      {/* Expense Form */}
      {showExpenseForm && (
        <ExpenseForm
          onSuccess={() => { setShowExpenseForm(false); void fetchData(); }}
          onCancel={() => setShowExpenseForm(false)}
        />
      )}

      {/* Travel History */}
      <section className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-[var(--border)]">
          <h3 className="text-h4 font-semibold flex items-center gap-2">
            <Plane className="w-4 h-4" /> Travel Requests
          </h3>
        </div>
        {isLoading ? (
          <div className="p-4 space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : travelRequests.length === 0 ? (
          <div className="p-6 text-center text-sm text-[var(--muted-foreground)]">No travel requests submitted yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
                  {['Purpose', 'Destination', 'Dates', 'Est. Cost', 'Status'].map((h) => (
                    <th key={h} className="py-2 px-4 text-[11px] font-semibold text-[var(--muted-foreground)] uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-[var(--border)]">
                {travelRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-[var(--accent)] transition-colors">
                    <td className="py-3 px-4 font-medium">{req.purpose}</td>
                    <td className="py-3 px-4 text-[var(--muted-foreground)]">{req.destination}</td>
                    <td className="py-3 px-4 text-xs">
                      {new Date(req.departure_date).toLocaleDateString('en-IN')} → {new Date(req.return_date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-xs">{req.estimated_cost ? `${req.currency} ${req.estimated_cost.toLocaleString()}` : '—'}</td>
                    <td className="py-3 px-4"><Badge variant={statusBadgeVariant(req.status)}>{req.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Expense History */}
      <section className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-[var(--border)]">
          <h3 className="text-h4 font-semibold flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> My Expenses
          </h3>
        </div>
        {isLoading ? (
          <div className="p-4 space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : expenses.length === 0 ? (
          <div className="p-6 text-center text-sm text-[var(--muted-foreground)]">No expense claims submitted yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
                  {['Category', 'Amount', 'Description', 'Date', 'Status'].map((h) => (
                    <th key={h} className="py-2 px-4 text-[11px] font-semibold text-[var(--muted-foreground)] uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-[var(--border)]">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-[var(--accent)] transition-colors">
                    <td className="py-3 px-4 capitalize font-medium">{expense.category}</td>
                    <td className="py-3 px-4 font-semibold">{expense.currency} {expense.amount.toLocaleString()}</td>
                    <td className="py-3 px-4 text-xs text-[var(--muted-foreground)]">{expense.description ?? '—'}</td>
                    <td className="py-3 px-4 text-xs">{new Date(expense.created_at).toLocaleDateString('en-IN')}</td>
                    <td className="py-3 px-4"><Badge variant={statusBadgeVariant(expense.status)}>{expense.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Travel Request Form ───────────────────────────────────────────────────────

interface FormProps { onSuccess: () => void; onCancel: () => void }

function TravelRequestForm({ onSuccess, onCancel }: FormProps) {
  const [form, setForm] = useState({ purpose: '', destination: '', departureDate: '', returnDate: '', estimatedCost: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/travel-requests', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose: form.purpose,
          destination: form.destination,
          departureDate: form.departureDate,
          returnDate: form.returnDate,
          estimatedCost: form.estimatedCost ? Number(form.estimatedCost) : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message ?? 'Submission failed');
      }
      toast.success('Travel request submitted!');
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card p-6">
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-h4 font-semibold">New Travel Request</h3>
        <button onClick={onCancel} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
          <X className="w-5 h-5" />
        </button>
      </div>
      <form onSubmit={(e) => void handleSubmit(e)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Label htmlFor="travel-purpose">Purpose *</Label>
          <Input id="travel-purpose" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} required placeholder="Business meeting, client visit..." />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="travel-destination">Destination *</Label>
          <Input id="travel-destination" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} required placeholder="City, Country" />
        </div>
        <div>
          <Label htmlFor="travel-departure">Departure Date *</Label>
          <Input id="travel-departure" type="date" value={form.departureDate} onChange={(e) => setForm({ ...form, departureDate: e.target.value })} required />
        </div>
        <div>
          <Label htmlFor="travel-return">Return Date *</Label>
          <Input id="travel-return" type="date" value={form.returnDate} onChange={(e) => setForm({ ...form, returnDate: e.target.value })} required />
        </div>
        <div>
          <Label htmlFor="travel-cost">Estimated Cost (₹)</Label>
          <Input id="travel-cost" type="number" min="0" value={form.estimatedCost} onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })} placeholder="Optional" />
        </div>
        <div className="sm:col-span-2 flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : 'Submit Request'}</Button>
        </div>
      </form>
    </div>
  );
}

// ─── Expense Form ─────────────────────────────────────────────────────────────

function ExpenseForm({ onSuccess, onCancel }: FormProps) {
  const [form, setForm] = useState({ category: 'food', amount: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(form.amount) <= 0) { toast.error('Amount must be positive'); return; }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: form.category, amount: Number(form.amount), description: form.description || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message ?? 'Submission failed');
      }
      toast.success('Expense claim submitted!');
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card p-6">
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-h4 font-semibold">Submit Expense Claim</h3>
        <button onClick={onCancel} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
          <X className="w-5 h-5" />
        </button>
      </div>
      <form onSubmit={(e) => void handleSubmit(e)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="expense-category">Category *</Label>
          <select id="expense-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full rounded-md border px-3 py-2 text-sm" style={{ background: 'var(--input)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="expense-amount">Amount (₹) *</Label>
          <Input id="expense-amount" type="number" min="1" step="0.01" value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })} required placeholder="0.00" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="expense-desc">Description</Label>
          <Textarea id="expense-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Brief description of the expense..." rows={2} />
        </div>
        <div className="sm:col-span-2 flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : 'Submit Claim'}</Button>
        </div>
      </form>
    </div>
  );
}
