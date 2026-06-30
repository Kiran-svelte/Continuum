'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Banknote, Plus, Clock, CheckCircle2, XCircle, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { ensureMe } from '@/lib/client-auth';

interface PayrollAdvance {
  id: string;
  emp_id?: string;
  amount: number;
  currency: string;
  reason: string | null;
  repayment_months: number;
  status: string;
  created_at: string;
  Employee?: { first_name: string; last_name: string; department: string | null };
  pendingApprover?: {
    id: string;
    name: string;
    role: string;
    department: string | null;
  } | null;
}

type PayrollAdvancesViewProps = {
  /** When true, shows pending team requests assigned to you (manager / team lead). */
  enableTeamApprovals?: boolean;
};

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'danger',
  processed: 'info',
  cancelled: 'default',
};

export default function PayrollAdvancesView({ enableTeamApprovals = false }: PayrollAdvancesViewProps) {
  const [advances, setAdvances] = useState<PayrollAdvance[]>([]);
  const [teamPending, setTeamPending] = useState<PayrollAdvance[]>([]);
  const [myEmployeeId, setMyEmployeeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [teamLoading, setTeamLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [repaymentMonths, setRepaymentMonths] = useState('1');
  const [successMsg, setSuccessMsg] = useState('');

  const loadAdvances = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/payroll-advances', { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message ?? json.error ?? 'Failed to load payroll advances');
        return;
      }
      setAdvances(json.advances ?? []);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTeamPending = useCallback(async (employeeId: string) => {
    if (!enableTeamApprovals) return;
    setTeamLoading(true);
    try {
      const res = await fetch('/api/payroll-advances?status=pending', { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) return;
      const rows = (json.advances ?? []) as PayrollAdvance[];
      setTeamPending(
        rows.filter((row) => row.emp_id && row.emp_id !== employeeId && row.status === 'pending')
      );
    } catch {
      /* team queue is optional */
    } finally {
      setTeamLoading(false);
    }
  }, [enableTeamApprovals]);

  useEffect(() => {
    ensureMe().then((me) => {
      if (!me) return;
      setMyEmployeeId(me.id);
      void loadAdvances();
      void loadTeamPending(me.id);
    });
  }, [loadAdvances, loadTeamPending]);

  async function actOnTeamRequest(id: string, action: 'approve' | 'reject') {
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
      if (myEmployeeId) {
        await loadTeamPending(myEmployeeId);
      }
    } catch {
      setError('Network error.');
    } finally {
      setActingId(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const parsedAmount = parseFloat(amount);
    const months = parseInt(repaymentMonths, 10);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Enter a valid positive amount.');
      setSubmitting(false);
      return;
    }
    try {
      const res = await fetch('/api/payroll-advances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount: parsedAmount,
          reason: reason.trim() || undefined,
          repaymentMonths: months,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message ?? json.error ?? 'Submission failed');
        return;
      }
      const approverName = json.pendingApprover?.name;
      const msg = approverName
        ? `Request submitted. Pending approval from ${approverName}.`
        : 'Payroll advance request submitted.';
      setSuccessMsg(msg);
      toast.success(msg);
      setShowForm(false);
      setAmount('');
      setReason('');
      setRepaymentMonths('1');
      await loadAdvances();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h2 flex items-center gap-2">
            <Banknote className="h-6 w-6 text-[var(--primary)]" />
            Payroll Advances
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Request a salary advance. Approvers follow your company&apos;s Step 3 approval matrix.
          </p>
        </div>
        <Button type="button" onClick={() => setShowForm((v) => !v)} className="btn btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          New request
        </Button>
      </div>

      {successMsg && (
        <p className="text-sm text-[var(--success)] bg-[var(--success)]/10 rounded-lg px-3 py-2">{successMsg}</p>
      )}
      {error && (
        <p className="text-sm text-[var(--danger)] bg-[var(--danger)]/10 rounded-lg px-3 py-2">{error}</p>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
          <Input
            className="input h-11"
            label="Amount (INR)"
            type="number"
            min={1}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <Input
            className="input h-11"
            label="Repayment months"
            type="number"
            min={1}
            max={24}
            value={repaymentMonths}
            onChange={(e) => setRepaymentMonths(e.target.value)}
          />
          <Textarea
            className="input min-h-[80px]"
            label="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? 'Submitting…' : 'Submit request'}
            </Button>
          </div>
        </form>
      )}

      <section>
        <h2 className="text-sm font-semibold text-[var(--foreground)] mb-2">My requests</h2>
        {loading ? (
          <p className="text-sm text-[var(--muted-foreground)]">Loading…</p>
        ) : advances.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">No payroll advance requests yet.</p>
        ) : (
          <ul className="space-y-3">
            {advances.map((row) => (
              <li
                key={row.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 flex flex-wrap items-start justify-between gap-3"
              >
                <div>
                  <p className="font-semibold text-[var(--foreground)]">
                    {row.currency} {row.amount.toLocaleString()}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">
                    {row.repayment_months} month{row.repayment_months !== 1 ? 's' : ''} repayment
                    {row.reason ? ` · ${row.reason}` : ''}
                  </p>
                  {row.pendingApprover && row.status === 'pending' && (
                    <p className="text-xs text-[var(--muted-foreground)] mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Sent to {row.pendingApprover.name} ({row.pendingApprover.role})
                    </p>
                  )}
                </div>
                <Badge variant={STATUS_BADGE[row.status] ?? 'default'}>
                  {row.status === 'approved' ? (
                    <CheckCircle2 className="h-3 w-3 mr-1 inline" />
                  ) : row.status === 'rejected' ? (
                    <XCircle className="h-3 w-3 mr-1 inline" />
                  ) : null}
                  {row.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      {enableTeamApprovals && (
        <section className="pt-4 border-t border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--foreground)] mb-1">Team approvals</h2>
          <p className="text-xs text-[var(--muted-foreground)] mb-3">
            Pending requests routed to you via your company&apos;s payroll advance approval matrix (configured in
            onboarding).
          </p>
          {teamLoading ? (
            <p className="text-sm text-[var(--muted-foreground)]">Loading team queue…</p>
          ) : teamPending.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">No team payroll advances awaiting your action.</p>
          ) : (
            <ul className="space-y-3">
              {teamPending.map((row) => {
                const emp = row.Employee;
                const name = emp ? `${emp.first_name} ${emp.last_name}` : 'Team member';
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
                        onClick={() => actOnTeamRequest(row.id, 'approve')}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={actingId === row.id}
                        onClick={() => actOnTeamRequest(row.id, 'reject')}
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
        </section>
      )}
    </div>
  );
}
