/**
 * AI Decision Explainability
 * As mentioned in README: lib/enterprise/explainability.ts — reasoning breakdown
 *
 * Provides human-readable explanations for leave decisions, constraint
 * violations, and AI recommendations to support transparency and compliance.
 */

import { logger } from './logger';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ConstraintResult {
  constraintId: string;
  name: string;
  result: 'pass' | 'warn' | 'fail';
  score: number;
  weight: number;
  message?: string;
  details?: Record<string, unknown>;
}

export interface AIRecommendation {
  action: 'approve' | 'reject' | 'escalate';
  confidence: number;
  reasons: string[];
  model?: string;
  factors?: Array<{
    name: string;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number;
    description: string;
  }>;
}

export interface ConstraintViolation {
  constraintId: string;
  name: string;
  severity: 'warning' | 'error' | 'critical';
  actualValue: unknown;
  expectedValue: unknown;
  description: string;
}

export interface DecisionExplanation {
  summary: string;
  action: string;
  confidence: number;
  constraintBreakdown: Array<{
    name: string;
    result: string;
    explanation: string;
    impact: string;
  }>;
  aiFactors: Array<{
    factor: string;
    impact: string;
    explanation: string;
  }>;
  overallReasoning: string;
}

export interface ViolationExplanation {
  constraintName: string;
  severity: string;
  whatHappened: string;
  whyItMatters: string;
  suggestedAction: string;
}

export interface DecisionReport {
  leaveRequestId: string;
  generatedAt: string;
  employee: { id: string; name?: string };
  request: { type?: string; startDate?: string; endDate?: string; days?: number };
  decision: {
    action: string;
    decidedBy: string;
    decidedAt?: string;
  };
  explanation: DecisionExplanation;
  constraintDetails: ConstraintResult[];
  aiRecommendation: AIRecommendation | null;
  violations: ViolationExplanation[];
  auditTrail: Array<{
    timestamp: string;
    event: string;
    actor: string;
    details?: string;
  }>;
}

export interface DecisionHistoryEntry {
  leaveRequestId: string;
  date: string;
  type: string;
  action: string;
  summary: string;
  confidence?: number;
}

// ─── Result Explanations ────────────────────────────────────────────────────

const RESULT_LABELS: Record<string, string> = {
  pass: 'Satisfied',
  warn: 'Warning',
  fail: 'Not satisfied',
};

const SEVERITY_EXPLANATIONS: Record<string, string> = {
  warning: 'This is a soft constraint — the request can still proceed but may need review.',
  error: 'This constraint must be satisfied for the request to be approved.',
  critical: 'This is a hard constraint — the request cannot proceed without resolution.',
};

// ─── Core Functions ─────────────────────────────────────────────────────────

/**
 * Generate a human-readable explanation of why a leave request was
 * approved, rejected, or escalated based on constraint results and
 * an optional AI recommendation.
 */
export function explainLeaveDecision(
  constraintResults: ConstraintResult[],
  aiRecommendation: AIRecommendation | null
): DecisionExplanation {
  const failures = constraintResults.filter((c) => c.result === 'fail');
  const warnings = constraintResults.filter((c) => c.result === 'warn');
  const passes = constraintResults.filter((c) => c.result === 'pass');

  const action = aiRecommendation?.action ?? (failures.length > 0 ? 'reject' : 'approve');
  const confidence = aiRecommendation?.confidence ?? (failures.length > 0 ? 0.9 : 0.8);

  // Build constraint breakdown
  const constraintBreakdown = constraintResults.map((c) => ({
    name: c.name,
    result: RESULT_LABELS[c.result] ?? c.result,
    explanation: c.message ?? `Constraint "${c.name}" ${RESULT_LABELS[c.result] ?? c.result}.`,
    impact: c.result === 'fail' ? 'Blocks approval' : c.result === 'warn' ? 'Needs attention' : 'No issue',
  }));

  // Build AI factor breakdown
  const aiFactors = (aiRecommendation?.factors ?? []).map((f) => ({
    factor: f.name,
    impact: f.impact === 'positive' ? 'Supports approval' : f.impact === 'negative' ? 'Supports rejection' : 'Neutral',
    explanation: f.description,
  }));

  // Compose overall reasoning
  const parts: string[] = [];

  if (failures.length > 0) {
    parts.push(
      `${failures.length} constraint(s) failed: ${failures.map((f) => f.name).join(', ')}.`
    );
  }
  if (warnings.length > 0) {
    parts.push(
      `${warnings.length} constraint(s) raised warnings: ${warnings.map((w) => w.name).join(', ')}.`
    );
  }
  if (passes.length > 0) {
    parts.push(`${passes.length} constraint(s) passed successfully.`);
  }
  if (aiRecommendation) {
    parts.push(
      `AI recommendation: ${aiRecommendation.action} (confidence: ${(aiRecommendation.confidence * 100).toFixed(0)}%).`
    );
    if (aiRecommendation.reasons.length > 0) {
      parts.push(`AI reasons: ${aiRecommendation.reasons.join('; ')}.`);
    }
  }

  const overallReasoning = parts.join(' ');

  // Summary
  const summary =
    action === 'approve'
      ? `Leave request approved — all critical constraints satisfied${warnings.length > 0 ? ` (${warnings.length} warning(s) noted)` : ''}.`
      : action === 'reject'
        ? `Leave request rejected — ${failures.length} constraint(s) not met.`
        : `Leave request escalated for manual review — mixed signals from constraints and AI.`;

  return {
    summary,
    action,
    confidence,
    constraintBreakdown,
    aiFactors,
    overallReasoning,
  };
}

/**
 * Explain a specific constraint violation in plain language.
 */
export function explainConstraintViolation(
  violation: ConstraintViolation
): ViolationExplanation {
  const severityNote = SEVERITY_EXPLANATIONS[violation.severity] ?? '';

  const whatHappened = violation.description
    || `The constraint "${violation.name}" expected ${JSON.stringify(violation.expectedValue)} but received ${JSON.stringify(violation.actualValue)}.`;

  const whyItMatters = severityNote
    || `This constraint has severity "${violation.severity}".`;

  let suggestedAction: string;
  switch (violation.severity) {
    case 'critical':
      suggestedAction =
        'This must be resolved before the request can proceed. Contact your manager or HR.';
      break;
    case 'error':
      suggestedAction =
        'Adjust the request parameters to satisfy this constraint, or request a policy exception.';
      break;
    case 'warning':
    default:
      suggestedAction =
        'No immediate action required, but this will be flagged for review.';
      break;
  }

  return {
    constraintName: violation.name,
    severity: violation.severity,
    whatHappened,
    whyItMatters,
    suggestedAction,
  };
}

/**
 * Generate a full decision audit report for a leave request.
 * In a full implementation this would fetch data from the database;
 * here we compose the report from the provided inputs.
 */
export async function generateDecisionReport(
  leaveRequestId: string,
  context?: {
    employee?: { id: string; name?: string };
    request?: { type?: string; startDate?: string; endDate?: string; days?: number };
    decision?: { action: string; decidedBy: string; decidedAt?: string };
    constraintResults?: ConstraintResult[];
    aiRecommendation?: AIRecommendation | null;
    violations?: ConstraintViolation[];
    auditTrail?: Array<{ timestamp: string; event: string; actor: string; details?: string }>;
  }
): Promise<DecisionReport> {
  const constraintResults = context?.constraintResults ?? [];
  const aiRecommendation = context?.aiRecommendation ?? null;
  const violations = context?.violations ?? [];

  const explanation = explainLeaveDecision(constraintResults, aiRecommendation);
  const violationExplanations = violations.map(explainConstraintViolation);

  const report: DecisionReport = {
    leaveRequestId,
    generatedAt: new Date().toISOString(),
    employee: context?.employee ?? { id: 'unknown' },
    request: context?.request ?? {},
    decision: context?.decision ?? { action: explanation.action, decidedBy: 'system' },
    explanation,
    constraintDetails: constraintResults,
    aiRecommendation,
    violations: violationExplanations,
    auditTrail: context?.auditTrail ?? [
      {
        timestamp: new Date().toISOString(),
        event: 'report_generated',
        actor: 'system',
        details: `Decision report generated for leave request ${leaveRequestId}`,
      },
    ],
  };

  logger.audit('Decision report generated', { leaveRequestId });
  return report;
}

/**
 * Retrieve past decision explanations for an employee within a company.
 * In production this would query the database; here we return a typed
 * empty array and log the request.
 */
export async function getDecisionHistory(
  empId: string,
  companyId: string
): Promise<DecisionHistoryEntry[]> {
  logger.info('Decision history requested', { empId, companyId });

  // In a full implementation this would query the audit_logs and
  // leave_requests tables. We return an empty array so callers
  // get the expected type without a database dependency.
  return [];
}
