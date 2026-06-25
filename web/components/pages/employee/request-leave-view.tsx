'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { reportApiActionOutcome } from '@/lib/client/report-action-outcome';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { SkeletonForm } from '@/components/ui/skeleton';
import {
  CheckCircle,
  XCircle,
  Ban,
  Lightbulb,
  AlertTriangle,
  Sparkles,
  CalendarDays,
  Loader2,
  CalendarPlus,
} from 'lucide-react';
import { WizardTemplate } from '@/components/layouts/wizard-template';
import { getTodayDateKey, isPastDateKey } from '@/lib/leave-workflow';

// Type definitions for constraint violations
interface ConstraintViolation {
  rule_id: string;
  name?: string;
  rule_name?: string;
  message: string;
  severity?: 'blocking' | 'warning';
  is_blocking?: boolean;
  details?: Record<string, unknown>;
  suggestion?: string;
  category?: string;
}

interface ConstraintResult {
  passed: boolean;
  violations: ConstraintViolation[];
  warnings: ConstraintViolation[];
  recommendation?: string;
  confidence_score?: number;
}

interface LeaveBalanceSummary {
  leave_type: string;
  annual_entitlement: number;
  used_days: number;
  pending_days: number;
  remaining: number;
}

/**
 * Wizard steps for the leave request flow.
 * Step 1: Pick leave type + date range.
 * Step 2: Review AI constraint check results.
 * Step 3: Add reason and confirm submission.
 */
const WIZARD_STEPS = [
  { id: 'dates', label: 'Leave & Dates' },
  { id: 'ai-check', label: 'AI Policy Check' },
  { id: 'confirm', label: 'Confirm & Submit' },
];

/** Build a human-readable suggestion from violation details. */
function buildSuggestion(v: ConstraintViolation): string | null {
  if (v.suggestion) return v.suggestion;
  const d = v.details ?? {};
  const ruleId = v.rule_id?.toUpperCase() ?? '';
  if (ruleId === 'RULE002') {
    const remaining = d.remaining_days ?? d.remaining;
    return remaining !== undefined
      ? `You have ${remaining} day(s) remaining. Consider reducing duration or using LWP.`
      : 'Not enough balance. Try a shorter duration or Leave Without Pay.';
  }
  if (ruleId === 'RULE001') {
    const max = d.max_days;
    return max !== undefined
      ? `Maximum allowed is ${max} day(s). Split into multiple requests.`
      : 'Reduce days or split into shorter requests.';
  }
  if (ruleId === 'RULE005') return 'These dates are in a restricted blackout window.';
  if (ruleId === 'RULE003') return 'Team coverage too low. Try different dates.';
  if (ruleId === 'RULE004') return 'Too many team members on leave. Try different dates.';
  if (ruleId === 'RULE006') {
    const minDays = d.required;
    return minDays !== undefined
      ? `Minimum ${minDays} day(s) advance notice required.`
      : null;
  }
  return null;
}

function getDateValidationError(startDate: string, endDate: string): string | null {
  if (!startDate || !endDate) return null;
  const todayKey = getTodayDateKey();
  if (isPastDateKey(startDate, todayKey)) return 'Start date cannot be in the past.';
  if (endDate < startDate) return 'End date must be on or after start date.';
  return null;
}

const PORTAL_LEAVE_HISTORY_MAP: Record<string, string> = {
  '/hr': '/hr/leave-requests',
  '/manager': '/manager/approvals',
  '/employee': '/employee/leave-history',
};

function getPortalLeaveHistoryPath(pathname: string): string {
  for (const [prefix, target] of Object.entries(PORTAL_LEAVE_HISTORY_MAP)) {
    if (pathname.startsWith(prefix + '/') || pathname === prefix) return target;
  }
  return '/employee/leave-history';
}

/**
 * RequestLeavePage
 * Three-step wizard: (1) Leave & Dates → (2) AI Policy Check → (3) Confirm & Submit.
 * Constraint validation runs in the background after step 1 is filled.
 */
export default function RequestLeaveView() {
  const router = useRouter();
  const pathname = usePathname();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);

  // Form state
  const [leaveType, setLeaveType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [halfDay, setHalfDay] = useState(false);
  const [reason, setReason] = useState('');

  // Data state
  const [leaveTypes, setLeaveTypes] = useState<Array<{ value: string; label: string }>>([]);
  const [leaveTypesError, setLeaveTypesError] = useState('');
  const [leaveBalancesByType, setLeaveBalancesByType] = useState<Record<string, LeaveBalanceSummary>>({});
  const [constraintResult, setConstraintResult] = useState<ConstraintResult | null>(null);
  const [constraintChecking, setConstraintChecking] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateError, setDateError] = useState('');

  // Load leave types + balances on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const [leaveTypesRes, balancesRes] = await Promise.all([
          fetch('/api/company/leave-types', { credentials: 'include' }),
          fetch('/api/leaves/balances', { credentials: 'include' }),
        ]);
        if (leaveTypesRes.ok) {
          const data = await leaveTypesRes.json();
          if (data.leaveTypes?.length > 0) {
            setLeaveTypes(data.leaveTypes.map((lt: { code: string; name: string }) => ({
              value: lt.code,
              label: `${lt.name} (${lt.code})`,
            })));
          } else {
            setLeaveTypesError('No leave types configured. Contact your HR administrator.');
          }
        } else {
          setLeaveTypesError('Failed to load leave types. Please try again.');
        }
        if (balancesRes.ok) {
          const payload = await balancesRes.json();
          const byType: Record<string, LeaveBalanceSummary> = {};
          for (const b of (payload.balances ?? []) as LeaveBalanceSummary[]) {
            byType[b.leave_type] = b;
          }
          setLeaveBalancesByType(byType);
        }
      } catch {
        setLeaveTypesError('Cannot connect. Check your connection and try again.');
      } finally {
        setPageLoading(false);
      }
    }
    fetchData();
  }, []);

  // Real-time constraint check (debounced 900ms)
  const checkConstraints = useCallback(async () => {
    if (!leaveType || !startDate || !endDate || constraintChecking) return;
    const error = getDateValidationError(startDate, endDate);
    if (error) { setDateError(error); setConstraintResult(null); return; }
    setDateError('');
    setConstraintChecking(true);
    try {
      const res = await fetch('/api/leaves/check-constraints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leave_type: leaveType, start_date: startDate, end_date: endDate, is_half_day: halfDay }),
      });
      if (res.ok) {
        const result = await res.json();
        setConstraintResult(result);
      } else {
        setConstraintResult(null);
      }
    } catch {
      toast('AI policy check unavailable — you can still submit.', { icon: '⚠️' });
    } finally {
      setConstraintChecking(false);
    }
  }, [leaveType, startDate, endDate, halfDay, constraintChecking]);

  useEffect(() => {
    const t = setTimeout(checkConstraints, 900);
    return () => clearTimeout(t);
  }, [checkConstraints]);

  const totalDays =
    startDate && endDate
      ? halfDay
        ? 0.5
        : Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000) + 1)
      : 0;

  const selectedBalance = leaveType ? leaveBalancesByType[leaveType] : null;

  const isStep1Complete = !!leaveType && !!startDate && !!endDate && !dateError;
  const isStep3Complete = reason.trim().length >= 3;

  function handleNext() {
    if (currentStep < WIZARD_STEPS.length - 1) setCurrentStep((s) => s + 1);
  }
  function handleBack() {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  }

  async function handleSubmit() {
    if (!leaveType || !startDate || !endDate || !reason) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/leaves/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ leave_type: leaveType, start_date: startDate, end_date: endDate, is_half_day: halfDay, reason }),
      });
      const json = await res.json() as { error?: string | { message?: string }; actionOutcome?: unknown };
      if (res.ok) {
        reportApiActionOutcome(json);
        router.push(getPortalLeaveHistoryPath(pathname ?? '/employee'));
      } else {
        const errMsg =
          typeof json.error === 'string'
            ? json.error
            : json.error?.message ?? 'Submission failed. Please try again.';
        toast.error(errMsg);
      }
    } catch {
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (pageLoading) {
    return (
      <div className="p-6 md:p-8">
        <SkeletonForm fields={5} />
      </div>
    );
  }

  if (leaveTypesError) {
    return (
      <div className="p-6 md:p-8">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-300">Leave Types Unavailable</p>
            <p className="text-sm text-amber-400/80 mt-1">{leaveTypesError}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <WizardTemplate
      title="Request Leave"
      description="Complete the steps below to submit your leave request."
      steps={WIZARD_STEPS}
      currentStepIndex={currentStep}
      onNext={handleNext}
      onBack={handleBack}
      onSubmit={handleSubmit}
      isNextDisabled={currentStep === 0 ? !isStep1Complete : currentStep === 2 ? !isStep3Complete : false}
      isSubmitting={isSubmitting}
    >
      {/* ── Step 1: Leave Type & Dates ── */}
      {currentStep === 0 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-1">Select Leave Type</h2>
            <p className="text-sm text-[var(--muted-foreground)]">Choose the type of leave and the dates you need.</p>
          </div>

          {/* Leave Type */}
          <div className="space-y-2">
            <label htmlFor="leaveType" className="block text-sm font-medium">Leave Type <span className="text-red-400">*</span></label>
            <Select
              id="leaveType"
              value={leaveType}
              onChange={(e) => { setLeaveType(e.target.value); setConstraintResult(null); }}
              required
            >
              <option value="">Select leave type</option>
              {leaveTypes.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
          </div>

          {/* Balance bar */}
          {leaveType && selectedBalance && (
            <div className="grid grid-cols-3 gap-3 rounded-xl bg-[var(--muted)] border border-[var(--border)] p-4">
              {[
                { label: 'Used', value: selectedBalance.used_days },
                { label: 'Pending', value: selectedBalance.pending_days },
                { label: 'Available', value: selectedBalance.remaining, highlight: true },
              ].map((item) => (
                <div key={item.label} className={`rounded-lg p-3 ${item.highlight ? 'bg-[var(--primary)]/10 border border-[var(--primary)]/20' : 'bg-[var(--card)] border border-[var(--border)]'}`}>
                  <p className="text-[10px] uppercase text-[var(--muted-foreground)] mb-0.5">{item.label}</p>
                  <p className={`text-lg font-bold ${item.highlight ? 'text-[var(--primary)]' : ''}`}>{item.value}d</p>
                </div>
              ))}
            </div>
          )}

          {/* Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="startDate" className="block text-sm font-medium">Start Date <span className="text-red-400">*</span></label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (halfDay && e.target.value) setEndDate(e.target.value);
                }}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="endDate" className="block text-sm font-medium">End Date <span className="text-red-400">*</span></label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                min={startDate || new Date().toISOString().split('T')[0]}
                onChange={(e) => setEndDate(e.target.value)}
                required
                disabled={halfDay}
              />
            </div>
          </div>

          {dateError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
              <XCircle className="w-4 h-4 shrink-0" />
              {dateError}
            </div>
          )}

          {/* Duration summary */}
          {totalDays > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-[var(--muted)] border border-[var(--border)] px-5 py-4">
              <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                <CalendarDays className="w-4 h-4" />
                <span className="text-sm">Duration</span>
              </div>
              <span className="text-2xl font-black text-[var(--primary)]">
                {totalDays} day{totalDays !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Half-day toggle */}
          <label className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--muted)] px-5 py-4 cursor-pointer hover:bg-[var(--accent)] transition-colors">
            <input
              type="checkbox"
              checked={halfDay}
              onChange={(e) => {
                setHalfDay(e.target.checked);
                if (e.target.checked && startDate) setEndDate(startDate);
              }}
              className="h-4 w-4 rounded accent-[var(--primary)]"
            />
            <span className="text-sm font-medium">Half-day leave</span>
            {halfDay && <span className="ml-auto text-xs font-bold text-[var(--primary)]">0.5 days</span>}
          </label>

          {/* Background constraint check indicator */}
          {constraintChecking && (
            <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Running AI policy check in background...
            </div>
          )}
        </div>
      )}

      {/* ── Step 2: AI Policy Check Results ── */}
      {currentStep === 1 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold mb-1">AI Policy Check</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              Our AI engine has verified your request against company leave policies.
            </p>
          </div>

          {/* Summary bar */}
          <div className={`rounded-xl border p-4 flex items-center gap-4 ${
            constraintChecking
              ? 'border-[var(--border)] bg-[var(--muted)]'
              : !constraintResult
              ? 'border-[var(--border)] bg-[var(--muted)]'
              : constraintResult.violations.length > 0
              ? 'border-red-500/30 bg-red-500/5'
              : constraintResult.warnings.length > 0
              ? 'border-amber-500/30 bg-amber-500/5'
              : 'border-emerald-500/30 bg-emerald-500/5'
          }`}>
            {constraintChecking ? (
              <><Loader2 className="w-5 h-5 animate-spin text-[var(--muted-foreground)]" /><span className="text-sm">Checking policies...</span></>
            ) : !constraintResult ? (
              <><CalendarPlus className="w-5 h-5 text-[var(--muted-foreground)]" /><span className="text-sm text-[var(--muted-foreground)]">No check performed yet. Go back and fill in dates.</span></>
            ) : constraintResult.violations.length > 0 ? (
              <><XCircle className="w-5 h-5 text-red-400" /><span className="text-sm font-semibold text-red-300">{constraintResult.violations.length} policy violation(s) detected</span>
              {constraintResult.confidence_score !== undefined && (
                <span className="ml-auto text-xs text-[var(--muted-foreground)]">Confidence: {Math.round(constraintResult.confidence_score * 100)}%</span>
              )}</>
            ) : constraintResult.warnings.length > 0 ? (
              <><AlertTriangle className="w-5 h-5 text-amber-400" /><span className="text-sm font-semibold text-amber-300">{constraintResult.warnings.length} warning(s) — submission allowed</span>
              {constraintResult.confidence_score !== undefined && (
                <span className="ml-auto text-xs text-[var(--muted-foreground)]">Confidence: {Math.round(constraintResult.confidence_score * 100)}%</span>
              )}</>
            ) : (
              <><CheckCircle className="w-5 h-5 text-emerald-400" /><span className="text-sm font-semibold text-emerald-300">All policies satisfied — you are eligible</span>
              {constraintResult.confidence_score !== undefined && (
                <span className="ml-auto text-xs text-[var(--muted-foreground)]">Confidence: {Math.round(constraintResult.confidence_score * 100)}%</span>
              )}</>
            )}
          </div>

          {/* Violations */}
          {constraintResult?.violations && constraintResult.violations.length > 0 && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-red-400 flex items-center gap-1.5">
                <Ban className="w-3.5 h-3.5" /> Violations
              </h3>
              {constraintResult.violations.map((v, i) => (
                <div key={i} className="rounded-lg bg-[var(--card)] border border-red-500/20 p-3">
                  <p className="text-sm font-semibold text-red-300">{v.name ?? v.rule_name ?? v.rule_id}</p>
                  <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{v.message}</p>
                  {buildSuggestion(v) && (
                    <div className="mt-2 flex items-start gap-1.5 text-xs text-red-400/80">
                      <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{buildSuggestion(v)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Warnings */}
          {constraintResult?.warnings && constraintResult.warnings.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Warnings
              </h3>
              {constraintResult.warnings.map((w, i) => (
                <div key={i} className="rounded-lg bg-[var(--card)] border border-amber-500/20 p-3">
                  <p className="text-sm font-semibold text-amber-300">{w.name ?? w.rule_name ?? w.rule_id}</p>
                  <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{w.message}</p>
                  {buildSuggestion(w) && (
                    <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-400/80">
                      <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{buildSuggestion(w)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* AI Recommendation */}
          {constraintResult?.recommendation && (
            <div className="rounded-xl border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--primary)] flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5" /> AI Recommendation
              </h3>
              <p className="text-sm text-[var(--foreground)]">{constraintResult.recommendation}</p>
            </div>
          )}

          {/* All clear */}
          {constraintResult && !constraintResult.violations.length && !constraintResult.warnings.length && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              <p className="text-sm text-emerald-300">No policy violations detected. Your request looks good to submit.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Confirm & Submit ── */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-1">Confirm Your Request</h2>
            <p className="text-sm text-[var(--muted-foreground)]">Review details, add your reason, then submit.</p>
          </div>

          {/* Summary card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Type', value: leaveType || '—' },
              { label: 'From', value: startDate ? new Date(startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—' },
              { label: 'To', value: endDate ? new Date(endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—' },
              { label: 'Duration', value: `${totalDays} day${totalDays !== 1 ? 's' : ''}`, highlight: true },
            ].map((item) => (
              <div key={item.label} className={`rounded-xl p-4 border ${item.highlight ? 'bg-[var(--primary)]/10 border-[var(--primary)]/20' : 'bg-[var(--muted)] border-[var(--border)]'}`}>
                <p className="text-[10px] uppercase text-[var(--muted-foreground)] mb-1">{item.label}</p>
                <p className={`text-sm font-bold ${item.highlight ? 'text-[var(--primary)]' : ''}`}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <label htmlFor="reason" className="block text-sm font-medium">
              Reason <span className="text-red-400">*</span>
              <span className="text-[var(--muted-foreground)] font-normal ml-1">(min. 3 characters)</span>
            </label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Provide a clear reason for your leave request..."
              required
              minLength={3}
              maxLength={1000}
            />
            <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
              <span>{reason.length} / 1000</span>
              {reason.length > 0 && reason.length < 3 && (
                <span className="text-amber-400">Too short</span>
              )}
            </div>
          </div>

          {/* Policy check status summary */}
          {constraintResult && (
            <div className={`rounded-xl border p-3 flex items-center gap-2 text-xs ${
              constraintResult.violations.length > 0
                ? 'border-red-500/20 bg-red-500/5 text-red-400'
                : constraintResult.warnings.length > 0
                ? 'border-amber-500/20 bg-amber-500/5 text-amber-400'
                : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
            }`}>
              {constraintResult.violations.length > 0
                ? <><Ban className="w-3.5 h-3.5" /> {constraintResult.violations.length} violation(s) on record — submission will proceed</>
                : constraintResult.warnings.length > 0
                ? <><AlertTriangle className="w-3.5 h-3.5" /> {constraintResult.warnings.length} warning(s) on record</>
                : <><CheckCircle className="w-3.5 h-3.5" /> All policies satisfied</>
              }
            </div>
          )}
        </div>
      )}
    </WizardTemplate>
  );
}
