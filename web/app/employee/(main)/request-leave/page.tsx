'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { SkeletonForm } from '@/components/ui/skeleton';
import {
  CheckCircle,
  XCircle,
  Ban,
  Lightbulb,
  AlertTriangle,
  Sparkles,
  CalendarDays,
  CalendarPlus,
  Loader2,
} from 'lucide-react';
import { FadeIn, TiltCard, StaggerContainer } from '@/components/motion';
import { PageHeader } from '@/components/page-header';
import { GlassPanel } from '@/components/glass-panel';

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
    <StaggerContainer className="max-w-2xl mx-auto space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Request Leave"
        description="Submit a new leave application"
        icon={<CalendarPlus className="w-6 h-6 text-primary" />}
        action={
          autoSaving ? (
            <div className="flex items-center gap-2 text-sm text-primary font-medium bg-primary/10 px-4 py-2 rounded-full border border-primary/20">
              <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Auto-saving draft...
            </div>
          ) : undefined
        }
      />

      {/* Loading State */}
      {pageLoading && (
        <FadeIn>
          <TiltCard>
            <GlassPanel>
              <div className="px-6 pb-6 pt-6">
                <SkeletonForm fields={5} />
              </div>
            </GlassPanel>
          </TiltCard>
        </FadeIn>
      )}

      {/* Submission Processing State */}
      {isSubmitting && (
        <FadeIn>
          <TiltCard>
            <GlassPanel>
              <div className="px-6 pb-6 pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    {submitSuccess ? <CheckCircle className="w-6 h-6 text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]" /> : <Loader2 className="w-6 h-6 text-blue-400 animate-spin drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]" />}
                    <div className="flex-1">
                      <div className={`font-bold text-lg ${submitSuccess ? 'text-green-500' : 'text-blue-500'}`}>
                        {currentSubmissionStep || 'Processing...'}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-white/60">Progress</span>
                      <span className="text-white/60">{submissionProgress}%</span>
                    </div>
                    <div className="w-full bg-black/40 rounded-full h-3 overflow-hidden border border-white/10 shadow-inner">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(56,189,248,0.5)]"
                        style={{ width: `${submissionProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </GlassPanel>
          </TiltCard>
        </FadeIn>
      )}

      {/* Leave types not configured error */}
      {!pageLoading && leaveTypesError && (
        <FadeIn>
          <TiltCard>
            <GlassPanel className="border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.1)]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl -z-10 transform translate-x-1/2 -translate-y-1/2" />
              <div className="px-6 pb-6 pt-6 relative z-10">
                <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 px-5 py-5 backdrop-blur-sm">
                  <h4 className="font-bold text-yellow-500 mb-2 flex items-center gap-2 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]">
                    <AlertTriangle className="w-5 h-5" />
                    Leave Types Not Available
                  </h4>
                  <p className="text-sm text-yellow-200/80 font-medium">{leaveTypesError}</p>
                </div>
              </div>
            </GlassPanel>
          </TiltCard>
        </FadeIn>
      )}

      {/* Main Form */}
      {!pageLoading && !isSubmitting && !leaveTypesError && (
        <FadeIn>
          <TiltCard>
            <GlassPanel className="shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10 transform translate-x-1/2 -translate-y-1/2 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -z-10 transform -translate-x-1/2 translate-y-1/2 pointer-events-none" />

              <div className="p-6 pb-4 border-b border-white/5">
                <h2 className="text-lg font-semibold text-white flex items-center justify-between">
                  <span>Leave Details</span>
                  {constraintChecking && (
                    <div className="flex items-center gap-2 text-sm text-cyan-400 font-medium">
                      <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin shadow-[0_0_5px_rgba(34,211,238,0.8)]" />
                      Checking constraints...
                    </div>
                  )}
                </h2>
              </div>
              <div className="px-6 pb-6 pt-6 relative z-10">
            {/* Success State */}
            {submitSuccess && success && (
              <div className="mb-6 rounded-xl bg-green-500/10 border border-green-500/30 px-5 py-4 backdrop-blur-sm shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                <div className="flex items-center gap-3 text-green-400 font-bold drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]">
                  <CheckCircle className="w-6 h-6 shrink-0" />
                  {success}
                </div>
              </div>
            )}

            {/* Error State */}
            {error && !constraintResult && (
              <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/30 px-5 py-4 backdrop-blur-sm shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                <div className="flex items-center gap-3 text-red-400 font-bold drop-shadow-[0_0_5px_rgba(248,113,113,0.5)]">
                  <XCircle className="w-6 h-6 shrink-0" />
                  {error}
                </div>
              </div>
            )}
            {/* Constraint Preview - Real-time feedback */}
            {constraintResult && (
              <div className="mb-8 space-y-5">
                {/* Blocking Violations */}
                {constraintResult.violations && constraintResult.violations.length > 0 && (
                  <div className="rounded-2xl bg-red-500/10 border border-red-500/30 px-5 py-5 backdrop-blur-sm shadow-[0_0_15px_rgba(239,68,68,0.15)]">
                    <h4 className="font-bold text-red-500 mb-4 flex items-center gap-2 drop-shadow-[0_0_5px_rgba(248,113,113,0.5)]">
                      <Ban className="w-5 h-5 shrink-0" />
                      Issue Prevent Submission
                    </h4>
                    <div className="space-y-3">
                      {constraintResult.violations.map((v, i) => {
                        const label = v.name || v.rule_name || v.rule_id;
                        const suggestion = buildSuggestion(v);
                        return (
                          <div key={i} className="rounded-xl bg-black/40 px-4 py-3 border border-red-500/20 shadow-inner">
                            <div className="font-bold text-red-400">{label}</div>
                            <div className="mt-1 text-white/80 text-sm font-medium">{v.message}</div>
                            {suggestion && (
                              <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-500/10 px-3 py-2 border border-red-500/20">
                                <Lightbulb className="w-4 h-4 mt-0.5 text-red-400 shrink-0 drop-shadow-[0_0_5px_rgba(248,113,113,0.8)]" />
                                <span className="text-sm italic font-medium text-red-200/90">{suggestion}</span>
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
                  <div className="rounded-2xl bg-yellow-500/10 border border-yellow-500/30 px-5 py-5 backdrop-blur-sm shadow-[0_0_15px_rgba(234,179,8,0.15)]">
                    <h4 className="font-bold text-yellow-500 mb-4 flex items-center gap-2 drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]">
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                      Warnings
                    </h4>
                    <div className="space-y-3">
                      {constraintResult.warnings.map((w, i) => {
                        const label = w.name || w.rule_name || w.rule_id;
                        const suggestion = buildSuggestion(w);
                        return (
                          <div key={i} className="rounded-xl bg-black/40 px-4 py-3 border border-yellow-500/20 shadow-inner">
                            <div className="font-bold text-yellow-400">{label}</div>
                            <div className="mt-1 text-white/80 text-sm font-medium">{w.message}</div>
                            {suggestion && (
                              <div className="mt-3 flex items-start gap-2 rounded-lg bg-yellow-500/10 px-3 py-2 border border-yellow-500/20">
                                <Lightbulb className="w-4 h-4 mt-0.5 text-yellow-400 shrink-0 drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]" />
                                <span className="text-sm italic font-medium text-yellow-200/90">{suggestion}</span>
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
                  <div className="rounded-2xl bg-blue-500/10 border border-blue-500/30 px-5 py-5 backdrop-blur-sm shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                    <h4 className="font-bold text-blue-500 mb-3 flex items-center gap-2 drop-shadow-[0_0_5px_rgba(96,165,250,0.5)]">
                      <Sparkles className="w-5 h-5 shrink-0" />
                      AI Recommendation
                    </h4>
                    <p className="text-sm font-medium text-blue-100">{constraintResult.recommendation}</p>
                    {constraintResult.confidence_score !== undefined && (
                      <div className="mt-4 flex items-center gap-3">
                        <div className="flex-1 bg-black/40 rounded-full h-2 shadow-inner border border-white/5">
                          <div 
                            className="bg-gradient-to-r from-blue-600 to-blue-400 h-2 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(96,165,250,0.6)]"
                            style={{ width: `${(constraintResult.confidence_score || 0) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-blue-400">
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
              <div className="space-y-2">
                <label htmlFor="leaveType" className="block text-sm font-bold text-white/80">
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
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3.5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all backdrop-blur-sm shadow-inner appearance-none cursor-pointer"
                  required
                  disabled={isSubmitting}
                >
                  <option value="" className="bg-slate-900 text-white">Select leave type</option>
                  {leaveTypes.map((type) => (
                    <option key={type.value} value={type.value} className="bg-slate-900 text-white">
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Enhanced Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label htmlFor="startDate" className="block text-sm font-bold text-white/80">
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
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3.5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all backdrop-blur-sm shadow-inner [color-scheme:dark]"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="endDate" className="block text-sm font-bold text-white/80">
                    End Date
                  </label>
                  <input
                    id="endDate"
                    type="date"
                    value={endDate}
                    min={startDate || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3.5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all backdrop-blur-sm shadow-inner [color-scheme:dark] disabled:opacity-50"
                    required
                    disabled={isSubmitting || halfDay}
                  />
                </div>
              </div>

              {/* Enhanced Days counter with better visual feedback */}
              {totalDays > 0 && (
                <TiltCard>
                  <GlassPanel className="p-5">
                    <div className="flex items-center gap-4 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-full bg-primary/10 rounded-full blur-xl -z-10 translate-x-1/2" />
                      <div className="flex items-center gap-3 text-primary drop-shadow-[0_0_5px_rgba(var(--primary-rgb),0.8)]">
                        <CalendarDays className="w-6 h-6 text-primary" />
                        <span className="text-base font-bold text-white">Total Duration:</span>
                      </div>
                      <span className="text-2xl font-black text-primary drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.8)] ml-auto">
                        {totalDays} day{totalDays !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </GlassPanel>
                </TiltCard>
              )}

              {/* Enhanced Half Day Toggle */}
              <div className="flex items-center gap-3 p-5 rounded-xl bg-white/5 border border-white/10 shadow-inner group transition-colors hover:bg-white/10">
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
                  className="h-5 w-5 rounded border-white/20 bg-black/50 text-primary focus:ring-primary focus:ring-offset-black transition-all cursor-pointer accent-primary"
                  disabled={isSubmitting}
                />
                <label htmlFor="halfDay" className="text-sm font-bold text-white cursor-pointer select-none">
                  Half-day leave
                </label>
                {halfDay && (
                  <span className="text-xs font-bold text-cyan-400 ml-auto bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                    Duration will be 0.5 days
                  </span>
                )}
              </div>

              {/* Enhanced Reason field */}
              <div className="space-y-2">
                <label htmlFor="reason" className="block text-sm font-bold text-white/80">
                  Reason <span className="text-white/40 font-normal italic">(required)</span>
                </label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3.5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 resize-none transition-all backdrop-blur-sm shadow-inner"
                  placeholder="Provide a clear reason for your leave request..."
                  required
                  minLength={3}
                  maxLength={1000}
                  disabled={isSubmitting}
                />
                <div className="flex justify-between items-center mt-2 px-1">
                  <span className="text-xs font-medium text-white/50">
                    {reason.length} / 1000
                  </span>
                  {reason.length > 0 && reason.length < 10 && (
                    <span className="text-xs font-bold text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]">
                      Please provide more details
                    </span>
                  )}
                </div>
              </div>

              {/* Submit Actions */}
              <div className="flex justify-end gap-4 pt-8 border-t border-white/10 mt-8">
                <Button
                  type="button"
                  onClick={() => router.push('/employee/dashboard')}
                  disabled={isSubmitting}
                  className="min-w-[120px] bg-transparent border border-white/20 hover:bg-white/10 text-white font-bold h-12 rounded-xl transition-all"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!leaveType || !startDate || !endDate || !reason || isSubmitting || (constraintResult?.violations && constraintResult.violations.length > 0)}
                  className="min-w-[160px] bg-primary hover:bg-white text-white hover:text-primary font-bold h-12 rounded-xl shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] hover:shadow-[0_0_30px_rgba(255,255,255,0.8)] transition-all group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Request'
                    )}
                  </span>
                </Button>
              </div>
            </form>
          </div>
            </GlassPanel>
          </TiltCard>
        </FadeIn>
      )}
    </StaggerContainer>
  );
}
