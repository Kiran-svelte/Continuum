'use client';

import { useCallback, useEffect, useState } from 'react';
import { Banknote, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ensureMe } from '@/lib/client-auth';

interface PayrollAdvance {
  id: string;
  amount: number;
  currency: string;
  reason: string | null;
  repayment_months: number;
  status: string;
  created_at: string;
  Employee?: { first_name: string; last_name: string; department: string | null };
  pendingApprover?: { name: string; role: string } | null;
}

export default function HrPayrollAdvancesView() {
  const [advances, setAdvances] = useState<PayrollAdvance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingId, setActingId] = useState<string | null>(null);

  const loadAdvances = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/payroll-advances?status=pending', { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message ?? json.error ?? 'Failed to load');
        return;
      }
      setAdvances(json.advances ?? []);
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    ensureMe().then((me) => {
      if (me) void loadAdvances();
    });
  }, [loadAdvances]);

  async function act(id: string, action: 'approve' | 'reject') {
    setActingId(id);
    setError('');
    try {
      const res = await fetch(`/api/payroll-advances?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message ?? json.error ?? 'Action failed');
        return;
      }
      await loadAdvances();
    } catch {
      setError('Network error.');
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <h1 className="text-h2 flex items-center gap-2">
        <Banknote className="h-6 w-6 text-[var(--primary)]" />
        Payroll advance approvals
      </h1>
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      {loading ? (
        <p className="text-sm text-[var(--muted-foreground)]">Loading…</p>
      ) : advances.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">No pending payroll advances.</p>
      ) : (
        <ul className="space-y-3">
          {advances.map((row) => {
            const emp = row.Employee;
            const name = emp ? `${emp.first_name} ${emp.last_name}` : 'Employee';
            return (
              <li key={row.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="font-semibold">{name}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {row.currency} {row.amount.toLocaleString()} · {row.repayment_months} mo repayment
                    </p>
                    {row.reason && <p className="text-xs mt-1">{row.reason}</p>}
                  </div>
                  <Badge variant="warning">{row.status}</Badge>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    type="button"
                    className="btn btn-primary"
                    disabled={actingId === row.id}
                    onClick={() => act(row.id, 'approve')}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={actingId === row.id}
                    onClick={() => act(row.id, 'reject')}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
