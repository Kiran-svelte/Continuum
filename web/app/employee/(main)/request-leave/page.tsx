'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
} from 'lucide-react';

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
  const [leaveTypes, setLeaveTypes] = useState<Array<{ value: string; label: string }>>([]);
  const [leaveTypesError, setLeaveTypesError] = useState('');
  const [constraintResult, setConstraintResult] = useState<ConstraintResult | null>(null);
  
  // Enhanced state for optimistic UI
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [constraintChecking, setConstraintChecking] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  
  // Processing steps for submission - simplified to single step with sub-messages
  const [currentSubmissionStep, setCurrentSubmissionStep] = useState('');
  const [submissionProgress, setSubmissionProgress] = useState(0);

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
          } else {
            setLeaveTypesError('No leave types configured. Please contact your HR administrator to complete company onboarding.');
          }
        } else {
          setLeaveTypesError('Failed to load leave types. Please try again later.');
        }
      } catch {
        setLeaveTypesError('Unable to connect to the server. Please check your connection and try again.');
      } finally {
        setPageLoading(false);
      }
    }
    fetchLeaveTypes();
  }, []);
  
  // Auto-save draft functionality (disabled — was causing stale data on revisit)
  const saveDraft = useCallback(async () => {
    // No-op: drafts removed to prevent stale constraint results on revisit
    void 0;
  }, []);
  
  // Auto-save when form data changes
  useEffect(() => {
    const timeoutId = setTimeout(saveDraft, 2000); // Auto-save after 2 seconds of inactivity
    return () => clearTimeout(timeoutId);
  }, [saveDraft]);

  // Clear stale state on mount — always start with a fresh form.
  // Drafts caused confusion by auto-restoring old constraint violations.
  useEffect(() => {
    localStorage.removeItem('leave_request_draft');
    setConstraintResult(null);
    setError('');
    setSubmitError('');
    setSuccess('');
    setSubmitSuccess(false);
  }, []);
  
  // Real-time constraint checking (debounced)
  const checkConstraints = useCallback(async () => {
    if (!leaveType || !startDate || !endDate || constraintChecking) return;
    
    setConstraintChecking(true);
    try {
      const res = await fetch('/api/leaves/check-constraints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leave_type: leaveType,
          start_date: startDate,
          end_date: endDate,
          is_half_day: halfDay,
        }),
      });
      
      if (res.ok) {
        const result = await res.json();
        setConstraintResult(result);
      }
    } catch {
      // Silent fail for constraint checking
    } finally {
      setConstraintChecking(false);
    }
  }, [leaveType, startDate, endDate, halfDay]);
  
  // Debounced constraint checking
  useEffect(() => {
    const timeoutId = setTimeout(checkConstraints, 1000);
    return () => clearTimeout(timeoutId);
  }, [checkConstraints]);

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
    
    // Reset states
    setError('');
    setSuccess('');
    setSubmitError('');
    setConstraintResult(null);
    setLoading(true);
    setIsSubmitting(true);
    setSubmitSuccess(false);
    setSubmissionProgress(0);
    
    try {
      // Show progress animation while API processes
      setCurrentSubmissionStep('Validating your request...');
      setSubmissionProgress(20);
      
      // Add small delay to show progress
      await new Promise(r => setTimeout(r, 200));
      setCurrentSubmissionStep('Checking constraints...');
      setSubmissionProgress(40);
      
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
      
      setSubmissionProgress(80);
      setCurrentSubmissionStep('Processing response...');
      
      const json = await res.json();
      
      if (!res.ok) {
        // Check if this is a constraint violation response
        if (json.violations && typeof json.violations === 'object' && !Array.isArray(json.violations)) {
          setConstraintResult(json.violations as ConstraintResult);
          setSubmitError('Some constraints were not met');
        } else if (json.error === 'Insufficient leave balance') {
          const remaining = typeof json.remaining === 'number' ? json.remaining : null;
          const requested = typeof json.requested === 'number' ? json.requested : null;
          const errorMsg = `Insufficient leave balance.` +
            (remaining !== null ? ` You have ${remaining} day(s) remaining` : '') +
            (requested !== null ? ` but requested ${requested} day(s).` : '.') +
            ' Consider using Leave Without Pay (LWP) or adjusting the dates.';
          setError(errorMsg);
          setSubmitError('Insufficient balance');
        } else {
          setError(json.error ?? 'Failed to submit leave request');
          setSubmitError('Submission failed');
        }
        return;
      }
      
      // Success!
      setSubmissionProgress(100);
      setSubmitSuccess(true);
      setCurrentSubmissionStep('Request submitted successfully!');
      setSuccess('Leave request submitted successfully! Your manager will review it shortly.');
      
      // Clear draft
      localStorage.removeItem('leave_request_draft');
      
      // Reset form
      setLeaveType('');
      setStartDate('');
      setEndDate('');
      setHalfDay(false);
      setReason('');
      
      // Navigate after delay
      setTimeout(() => router.push('/employee/leave-history'), 2000);
      
    } catch (err) {
      setSubmitError('Network error');
      setError('Network error occurred. Please try again.');
    } finally {
      setLoading(false);
      setIsSubmitting(false);
      setCurrentSubmissionStep('');
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Request Leave</h1>
          <p className="text-muted-foreground mt-1">Submit a new leave application</p>
        </div>
        {autoSaving && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Auto-saving draft...
          </div>
        )}
      </div>

      {/* Loading State */}
      {pageLoading && (
        <Card>
          <CardContent className="pt-6">
            <SkeletonForm fields={5} />
          </CardContent>
        </Card>
      )}

      {/* Submission Processing State */}
      {isSubmitting && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {submitSuccess ? <CheckCircle className="w-6 h-6 text-green-500" /> : <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />}
                <div className="flex-1">
                  <div className={`font-medium ${submitSuccess ? 'text-green-600' : 'text-blue-600'}`}>
                    {currentSubmissionStep || 'Processing...'}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="text-muted-foreground">{submissionProgress}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: `${submissionProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leave types not configured error */}
      {!pageLoading && leaveTypesError && (
        <Card>
          <CardContent className="pt-6">
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-4 dark:bg-yellow-900/20 dark:border-yellow-800">
              <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">Leave Types Not Available</h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-200">{leaveTypesError}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Form */}
      {!pageLoading && !isSubmitting && !leaveTypesError && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Leave Details</span>
              {constraintChecking && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Checking constraints...
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Success State */}
            {submitSuccess && success && (
              <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                  {success}
                </div>
              </div>
            )}

            {/* Error State */}
            {error && !constraintResult && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                  {error}
                </div>
              </div>
            )}
            {/* Constraint Preview - Real-time feedback */}
            {constraintResult && (
              <div className="mb-6 space-y-4">
                {/* Blocking Violations */}
                {constraintResult.violations && constraintResult.violations.length > 0 && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-4 dark:bg-red-900/20 dark:border-red-800">
                    <h4 className="font-semibold text-red-800 dark:text-red-300 mb-3 flex items-center gap-2">
                      <Ban className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
                      Constraint Violations — Request cannot be submitted
                    </h4>
                    <div className="space-y-3">
                      {constraintResult.violations.map((v, i) => {
                        const label = v.name || v.rule_name || v.rule_id;
                        const suggestion = buildSuggestion(v);
                        return (
                          <div key={i} className="rounded-lg bg-red-100 dark:bg-red-900/40 px-3 py-3 border border-red-200 dark:border-red-800">
                            <div className="font-semibold text-red-800 dark:text-red-200">{label}</div>
                            <div className="mt-1 text-red-700 dark:text-red-300 text-sm">{v.message}</div>
                            {suggestion && (
                              <div className="mt-2 flex items-start gap-2 rounded bg-red-200 dark:bg-red-800/50 px-3 py-2 text-red-900 dark:text-red-100">
                                <Lightbulb className="w-4 h-4 mt-0.5 text-red-700 dark:text-red-200 shrink-0" />
                                <span className="text-sm italic">{suggestion}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {constraintResult.warnings && constraintResult.warnings.length > 0 && (
                  <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-4 dark:bg-yellow-900/20 dark:border-yellow-800">
                    <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0" />
                      Warnings
                    </h4>
                    <div className="space-y-3">
                      {constraintResult.warnings.map((w, i) => {
                        const label = w.name || w.rule_name || w.rule_id;
                        const suggestion = buildSuggestion(w);
                        return (
                          <div key={i} className="text-sm text-yellow-700 dark:text-yellow-200">
                            <div className="font-semibold">{label}</div>
                            <div className="mt-1">{w.message}</div>
                            {suggestion && (
                              <div className="mt-2 flex items-start gap-2 rounded bg-yellow-100 dark:bg-yellow-900/40 px-2 py-2 text-yellow-800 dark:text-yellow-100">
                                <Lightbulb className="w-4 h-4 mt-0.5 text-yellow-700 dark:text-yellow-200 shrink-0" />
                                <span className="italic">{suggestion}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* AI Recommendation */}
                {constraintResult.recommendation && (
                  <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-4 dark:bg-blue-900/20 dark:border-blue-800">
                    <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                      AI Recommendation
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-200">{constraintResult.recommendation}</p>
                    {constraintResult.confidence_score !== undefined && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                          <div 
                            className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(constraintResult.confidence_score || 0) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-blue-600 dark:text-blue-300">
                          {Math.round((constraintResult.confidence_score || 0) * 100)}% confidence
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {/* Enhanced Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Leave Type with better styling */}
              <div>
                <label htmlFor="leaveType" className="block text-sm font-medium text-foreground mb-2">
                  Leave Type
                </label>
                <select
                  id="leaveType"
                  value={leaveType}
                  onChange={(e) => {
                    setLeaveType(e.target.value);
                    // Reset form context when leave type changes
                    setConstraintResult(null);
                    setStartDate('');
                    setEndDate('');
                    setHalfDay(false);
                    setError('');
                    setSubmitError('');
                    setSuccess('');
                  }}
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                  required
                  disabled={isSubmitting}
                >
                  <option value="">Select leave type</option>
                  {leaveTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Enhanced Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-foreground mb-2">
                    Start Date
                  </label>
                  <input
                    id="startDate"
                    type="date"
                    value={startDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (halfDay && e.target.value) {
                        setEndDate(e.target.value);
                      }
                    }}
                    className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-foreground mb-2">
                    End Date
                  </label>
                  <input
                    id="endDate"
                    type="date"
                    value={endDate}
                    min={startDate || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                    required
                    disabled={isSubmitting || halfDay}
                  />
                </div>
              </div>

              {/* Enhanced Days counter with better visual feedback */}
              {totalDays > 0 && (
                <div className="flex items-center gap-4 rounded-lg bg-primary/5 border border-primary/10 px-4 py-3">
                  <div className="flex items-center gap-2 text-primary">
                    <CalendarDays className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">Total Duration:</span>
                  </div>
                  <span className="text-lg font-bold text-primary">
                    {totalDays} day{totalDays !== 1 ? 's' : ''}
                  </span>
                </div>
              )}

              {/* Enhanced Half Day Toggle */}
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border">
                <input
                  id="halfDay"
                  type="checkbox"
                  checked={halfDay}
                  onChange={(e) => {
                    setHalfDay(e.target.checked);
                    if (e.target.checked && startDate) {
                      setEndDate(startDate);
                    }
                  }}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary transition-colors"
                  disabled={isSubmitting}
                />
                <label htmlFor="halfDay" className="text-sm text-foreground font-medium">
                  Half-day leave
                </label>
                {halfDay && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    Duration will be 0.5 days
                  </span>
                )}
              </div>

              {/* Enhanced Reason field */}
              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-foreground mb-2">
                  Reason <span className="text-muted-foreground font-normal">(required)</span>
                </label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none resize-none transition-all"
                  placeholder="Provide a clear reason for your leave request..."
                  required
                  minLength={3}
                  maxLength={1000}
                  disabled={isSubmitting}
                />
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-muted-foreground">
                    {reason.length}/1000 characters
                  </span>
                  {reason.length > 0 && reason.length < 10 && (
                    <span className="text-xs text-yellow-600 dark:text-yellow-400">
                      Please provide more details
                    </span>
                  )}
                </div>
              </div>

              {/* Submit Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/employee/dashboard')}
                  disabled={isSubmitting}
                  className="min-w-[100px]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!leaveType || !startDate || !endDate || !reason || isSubmitting || (constraintResult?.violations && constraintResult.violations.length > 0)}
                  className="min-w-[140px]"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Submitting...
                    </span>
                  ) : (
                    'Submit Request'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
