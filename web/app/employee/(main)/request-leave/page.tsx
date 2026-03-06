'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Fallback leave types if API fails
const FALLBACK_LEAVE_TYPES = [
  { value: 'CL', label: 'Casual Leave (CL)' },
  { value: 'SL', label: 'Sick Leave (SL)' },
  { value: 'PL', label: 'Privilege Leave (PL)' },
  { value: 'EL', label: 'Earned Leave (EL)' },
  { value: 'LWP', label: 'Leave Without Pay (LWP)' },
];

// Type definitions for constraint violations
// NOTE: The Python constraint engine returns `name` (not `rule_name`), so we
// accept both to stay forward-compatible.
interface ConstraintViolation {
  rule_id: string;
  /** Engine returns `name`; older callers may use `rule_name` */
  name?: string;
  rule_name?: string;
  message: string;
  /**
   * `is_blocking` (boolean, from engine) and `severity` (string, from older callers)
   * both represent whether the violation prevents submission.
   * Blocking violations live in `constraintResult.violations`;
   * non-blocking ones live in `constraintResult.warnings`.
   */
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

/** Build a human-readable suggestion from violation details when the engine
 *  does not supply one explicitly. */
function buildSuggestion(v: ConstraintViolation): string | null {
  if (v.suggestion) return v.suggestion;
  const d = v.details ?? {};
  const ruleId = v.rule_id?.toUpperCase() ?? '';

  // RULE002: Leave Balance Check
  if (ruleId === 'RULE002') {
    const remaining = d.remaining_days ?? d.remaining;
    if (remaining !== undefined) {
      return `You have ${remaining} day(s) remaining. Consider reducing the duration or using Leave Without Pay (LWP) for the extra days.`;
    }
    return 'You do not have enough leave balance. Try a shorter duration or switch to Leave Without Pay (LWP).';
  }
  // RULE001: Max Duration
  if (ruleId === 'RULE001') {
    const max = d.max_days;
    if (max !== undefined) {
      return `Maximum allowed is ${max} day(s) per request. Split your request into multiple shorter requests.`;
    }
    return 'Reduce the number of days or split into multiple shorter requests.';
  }
  // RULE005: Blackout Period
  if (ruleId === 'RULE005') {
    return 'These dates fall in a restricted period. Please choose dates outside the blackout window.';
  }
  // RULE003: Min Team Coverage
  if (ruleId === 'RULE003') {
    return 'Team coverage would be too low. Try different dates or coordinate with your colleagues to stagger leave.';
  }
  // RULE004: Max Concurrent Leave
  if (ruleId === 'RULE004') {
    return 'Too many team members are already on leave during this period. Try different dates or discuss with your manager.';
  }
  // RULE006: Advance Notice
  if (ruleId === 'RULE006') {
    const minDays = d.required;
    if (minDays !== undefined) {
      return `A minimum notice of ${minDays} day(s) is required. Please request leave earlier in advance.`;
    }
  }
  // RULE007: Consecutive Leave Limit
  if (ruleId === 'RULE007') {
    const max = d.max_consecutive;
    if (max !== undefined) {
      return `Consecutive leave limit is ${max} day(s). Space out your requests or use a different leave type for part of the period.`;
    }
  }
  return null;
}

export default function RequestLeavePage() {
  const router = useRouter();
  const [leaveType, setLeaveType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [halfDay, setHalfDay] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [leaveTypes, setLeaveTypes] = useState(FALLBACK_LEAVE_TYPES);
  const [constraintResult, setConstraintResult] = useState<ConstraintResult | null>(null);

  // Fetch company-specific leave types on mount
  useEffect(() => {
    async function fetchLeaveTypes() {
      try {
        const res = await fetch('/api/company/leave-types');
        if (res.ok) {
          const data = await res.json();
          if (data.leaveTypes && data.leaveTypes.length > 0) {
            setLeaveTypes(data.leaveTypes.map((lt: { code: string; name: string }) => ({
              value: lt.code,
              label: `${lt.name} (${lt.code})`,
            })));
          }
        }
      } catch {
        // Use fallback types
      }
    }
    fetchLeaveTypes();
  }, []);

  // Calculate number of days for display
  const totalDays =
    startDate && endDate
      ? halfDay
        ? 0.5
        : Math.max(
            1,
            Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000) + 1
          )
      : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setConstraintResult(null);
    setLoading(true);
    try {
      const res = await fetch('/api/leaves/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leave_type: leaveType,
          start_date: startDate,
          end_date: endDate,
          is_half_day: halfDay,
          reason,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        // Check if this is a constraint violation response
        if (json.violations && typeof json.violations === 'object' && !Array.isArray(json.violations)) {
          setConstraintResult(json.violations as ConstraintResult);
          setError('');
        } else if (json.error === 'Insufficient leave balance') {
          const remaining = typeof json.remaining === 'number' ? json.remaining : null;
          const requested = typeof json.requested === 'number' ? json.requested : null;
          setError(
            `Insufficient leave balance.` +
            (remaining !== null ? ` You have ${remaining} day(s) remaining` : '') +
            (requested !== null ? ` but requested ${requested} day(s).` : '.') +
            ' Consider using Leave Without Pay (LWP) or adjusting the dates.'
          );
        } else {
          setError(json.error ?? 'Failed to submit leave request');
        }
        return;
      }
      setSuccess('Leave request submitted successfully! Your manager will review it shortly.');
      // Reset form
      setLeaveType('');
      setStartDate('');
      setEndDate('');
      setHalfDay(false);
      setReason('');
      setTimeout(() => router.push('/employee/leave-history'), 1500);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Request Leave</h1>
        <p className="text-gray-500 mt-1">Submit a new leave application</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leave Details</CardTitle>
        </CardHeader>
        <CardContent>
          {error && !constraintResult && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          
          {/* Detailed Constraint Violations Display */}
          {constraintResult && (
            <div className="mb-4 space-y-3">
              {/* Blocking Violations */}
              {constraintResult.violations && constraintResult.violations.length > 0 && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                  <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Constraint Violations — your request cannot be submitted
                  </h4>
                  <ul className="space-y-3">
                    {constraintResult.violations.map((v, i) => {
                      const label = v.name || v.rule_name || v.rule_id;
                      const suggestion = buildSuggestion(v);
                      return (
                        <li key={i} className="text-sm text-red-700 border-t border-red-100 pt-2 first:border-0 first:pt-0">
                          <div className="font-semibold">{label}</div>
                          <div className="mt-0.5">{v.message}</div>
                          {suggestion && (
                            <div className="mt-1.5 flex items-start gap-1.5 rounded bg-red-100 px-2 py-1.5 text-red-800">
                              <span className="mt-0.5 shrink-0">💡</span>
                              <span className="italic">{suggestion}</span>
                            </div>
                          )}
                          {v.details && Object.keys(v.details).length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-red-500">
                              {Object.entries(v.details).map(([key, val]) => (
                                <span key={key}>{key.replace(/_/g, ' ')}: <strong>{String(val)}</strong></span>
                              ))}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Warnings */}
              {constraintResult.warnings && constraintResult.warnings.length > 0 && (
                <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3">
                  <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Warnings
                  </h4>
                  <ul className="space-y-3">
                    {constraintResult.warnings.map((w, i) => {
                      const label = w.name || w.rule_name || w.rule_id;
                      const suggestion = buildSuggestion(w);
                      return (
                        <li key={i} className="text-sm text-yellow-700 border-t border-yellow-100 pt-2 first:border-0 first:pt-0">
                          <div className="font-semibold">{label}</div>
                          <div className="mt-0.5">{w.message}</div>
                          {suggestion && (
                            <div className="mt-1.5 flex items-start gap-1.5 rounded bg-yellow-100 px-2 py-1.5 text-yellow-800">
                              <span className="mt-0.5 shrink-0">💡</span>
                              <span className="italic">{suggestion}</span>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* AI Recommendation */}
              {constraintResult.recommendation && (
                <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
                  <h4 className="font-semibold text-blue-800 mb-1 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Recommendation
                  </h4>
                  <p className="text-sm text-blue-700">{constraintResult.recommendation}</p>
                  {constraintResult.confidence_score !== undefined && (
                    <p className="text-xs text-blue-500 mt-1">
                      Confidence: {Math.round(constraintResult.confidence_score * 100)}%
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          
          {success && (
            <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Leave Type */}
            <div>
              <label htmlFor="leaveType" className="block text-sm font-medium text-gray-700 mb-1">
                Leave Type
              </label>
              <select
                id="leaveType"
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              >
                <option value="">Select leave type</option>
                {leaveTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  id="endDate"
                  type="date"
                  value={endDate}
                  min={startDate || new Date().toISOString().split('T')[0]}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Days count */}
            {totalDays > 0 && (
              <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-2 text-sm text-blue-700">
                Total: <span className="font-semibold">{totalDays} day{totalDays !== 1 ? 's' : ''}</span>
              </div>
            )}

            {/* Half Day Toggle */}
            <div className="flex items-center gap-3">
              <input
                id="halfDay"
                type="checkbox"
                checked={halfDay}
                onChange={(e) => setHalfDay(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="halfDay" className="text-sm text-gray-700">
                Half-day leave
              </label>
            </div>

            {/* Reason */}
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                Reason <span className="text-gray-400 font-normal">(required)</span>
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                placeholder="Provide a reason for your leave request..."
                required
                minLength={3}
                maxLength={1000}
              />
              <p className="text-xs text-gray-400 mt-1">{reason.length}/1000</p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/employee/dashboard')}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Submitting…' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
