"use client"

import React, { useState, useEffect } from 'react';
import { Scale, Search, Loader2, Plus, Minus, CheckCircle2, XCircle } from 'lucide-react';
import { PortalSelect } from '@/components/ui/portal-select';

/**
 * HR Leave Balance Adjustment Page.
 * Provides UI for HR to manually adjust employee leave balances
 * with reason tracking and audit trail.
 *
 * @page /hr/leave-balance
 */

interface EmployeeOption {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  primary_role: string;
}

interface FormState {
  employeeId: string;
  leaveType: string;
  adjustment: number;
  reason: string;
}

interface LeaveTypeOption {
  code: string;
  name: string;
}

const INITIAL_FORM: FormState = {
  employeeId: '',
  leaveType: '',
  adjustment: 0,
  reason: '',
};

export default function LeaveBalanceView() {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void fetchEmployees();
    void fetchLeaveTypes();
  }, []);

  async function fetchLeaveTypes() {
    try {
      const response = await fetch('/api/company/leave-types', { credentials: 'include' });
      if (!response.ok) return;
      const data = await response.json() as {
        leaveTypes?: Array<{ code: string; name: string }>;
      };
      if (data.leaveTypes?.length) {
        setLeaveTypes(data.leaveTypes.map((lt) => ({ code: lt.code, name: lt.name })));
      }
    } catch (error) {
      console.error('[LeaveBalance] Failed to fetch leave types:', error);
    }
  }

  /** Fetch employees for dropdown. */
  async function fetchEmployees() {
    try {
      const response = await fetch('/api/employees?limit=500', { credentials: 'include' });
      if (!response.ok) return;
      const data = await response.json();
      const list = data.employees || data.data || [];
      setEmployees(list);
    } catch (error) {
      console.error('[LeaveBalance] Failed to fetch employees:', error);
    } finally {
      setIsLoading(false);
    }
  }

  /** Submit the balance adjustment. */
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.employeeId || !form.leaveType || form.adjustment === 0 || !form.reason) {
      setResult({ success: false, message: 'All fields are required. Adjustment cannot be 0.' });
      return;
    }

    setIsSubmitting(true);
    setResult(null);

    try {
      const response = await fetch('/api/hr/leave-balance-adjust', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: form.employeeId,
          leaveType: form.leaveType,
          adjustment: form.adjustment,
          reason: form.reason,
          year: new Date().getFullYear(),
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setResult({
          success: true,
          message: `Balance updated: ${data.balance?.allocated ?? '?'} total, ${data.balance?.remaining ?? '?'} remaining`,
        });
        setForm(INITIAL_FORM);
      } else {
        setResult({ success: false, message: data.error || 'Failed to adjust balance' });
      }
    } catch (error) {
      setResult({ success: false, message: 'Network error. Please try again.' });
      console.error('[LeaveBalance] Submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  const filteredEmployees = employees.filter((emp) => {
    const query = searchQuery.toLowerCase();
    return (
      emp.first_name.toLowerCase().includes(query) ||
      emp.last_name.toLowerCase().includes(query) ||
      emp.email.toLowerCase().includes(query)
    );
  });

  const selectedEmployee = employees.find((emp) => emp.id === form.employeeId);

  return (
    <div className="flex flex-col gap-6 max-w-[900px] mx-auto w-full p-4 md:p-8">
      <header>
        <h1 className="text-display flex items-center gap-3">
          <Scale className="w-7 h-7 text-[var(--primary)]" />
          Leave Balance Adjustment
        </h1>
        <p className="text-body mt-2 max-w-2xl">
          Manually adjust employee leave balances for mid-year joins, corrections, or special grants.
          Every adjustment is recorded in the audit log.
        </p>
      </header>

      {/* Result Banner */}
      {result && (
        <div className={`card p-4 flex items-start gap-3 border ${
          result.success
            ? 'border-[var(--success)]/30 bg-[var(--success)]/5'
            : 'border-[var(--danger)]/30 bg-[var(--danger)]/5'
        }`}>
          {result.success ? (
            <CheckCircle2 className="w-5 h-5 text-[var(--success)] shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-5 h-5 text-[var(--danger)] shrink-0 mt-0.5" />
          )}
          <div>
            <p className={`text-sm font-semibold ${result.success ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
              {result.success ? 'Adjustment Applied' : 'Error'}
            </p>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">{result.message}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 sm:p-8 shadow-lg space-y-6">
        {/* Employee Search & Select */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
            Employee
          </label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              type="text"
              className="input h-11 pl-10 w-full"
              placeholder="Search employee by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] py-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading employees...
            </div>
          ) : (
            <PortalSelect
              aria-label="Select employee"
              value={form.employeeId}
              onChange={(value) => setForm((prev) => ({ ...prev, employeeId: value }))}
              placeholder="-- Select Employee --"
              options={filteredEmployees.map((emp) => ({
                value: emp.id,
                label: `${emp.first_name} ${emp.last_name} (${emp.email}) — ${emp.primary_role}`,
              }))}
            />
          )}
          {selectedEmployee && (
            <p className="text-xs text-[var(--muted-foreground)]">
              Selected: <span className="font-semibold text-[var(--foreground)]">{selectedEmployee.first_name} {selectedEmployee.last_name}</span> — {selectedEmployee.primary_role}
            </p>
          )}
        </div>

        {/* Leave Type */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
            Leave Type
          </label>
          <PortalSelect
            aria-label="Select leave type"
            value={form.leaveType}
            onChange={(value) => setForm((prev) => ({ ...prev, leaveType: value }))}
            placeholder="-- Select Leave Type --"
            disabled={leaveTypes.length === 0}
            options={leaveTypes.map((lt) => ({
              value: lt.code,
              label: `${lt.name} (${lt.code})`,
            }))}
          />
          {leaveTypes.length === 0 ? (
            <p className="text-xs text-[var(--muted-foreground)]">
              No leave types configured. Complete company onboarding to define leave types.
            </p>
          ) : null}
        </div>

        {/* Adjustment */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
            Adjustment (days)
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="btn btn-secondary h-11 w-11 flex items-center justify-center"
              onClick={() => setForm((prev) => ({ ...prev, adjustment: prev.adjustment - 1 }))}
            >
              <Minus className="w-4 h-4" />
            </button>
            <input
              type="number"
              className="input h-11 w-24 text-center text-lg font-bold"
              value={form.adjustment}
              onChange={(e) => setForm((prev) => ({ ...prev, adjustment: parseInt(e.target.value) || 0 }))}
              required
            />
            <button
              type="button"
              className="btn btn-secondary h-11 w-11 flex items-center justify-center"
              onClick={() => setForm((prev) => ({ ...prev, adjustment: prev.adjustment + 1 }))}
            >
              <Plus className="w-4 h-4" />
            </button>
            <span className={`text-sm font-semibold ${form.adjustment > 0 ? 'text-[var(--success)]' : form.adjustment < 0 ? 'text-[var(--danger)]' : 'text-[var(--muted-foreground)]'}`}>
              {form.adjustment > 0 ? `+${form.adjustment} days` : form.adjustment < 0 ? `${form.adjustment} days` : '0 days'}
            </span>
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">
            Positive = add days. Negative = deduct days. This updates both entitlement and remaining balance.
          </p>
        </div>

        {/* Reason */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
            Reason (Required — logged to audit trail)
          </label>
          <textarea
            className="input w-full min-h-[100px] py-3"
            placeholder="e.g., Mid-year join proration, Special grant for bereavement..."
            value={form.reason}
            onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
            required
          />
        </div>

        {/* Submit */}
        <div className="pt-4 border-t border-[var(--border)] flex justify-end gap-3">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setForm(INITIAL_FORM);
              setResult(null);
            }}
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !form.employeeId || !form.leaveType || form.adjustment === 0}
            className="btn btn-primary min-w-[160px] relative overflow-hidden"
          >
            <span className={`flex items-center gap-2 ${isSubmitting ? 'opacity-0' : ''}`}>
              <Scale className="w-4 h-4" /> Apply Adjustment
            </span>
            {isSubmitting && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
