import prisma from '@/lib/prisma';
import { constraintEngineBreaker } from '@/lib/circuit-breaker';
import { DEFAULT_CONSTRAINT_RULES } from '@/lib/constraint-rules-config';
import {
  calculateLeaveDays,
  createConstraintEngineFallback,
  resolveConstraintEngineUrl,
} from '@/lib/leave-workflow';

export type ConstraintIssue = {
  rule_id: string;
  name?: string;
  rule_name?: string;
  message: string;
  is_blocking?: boolean;
  severity?: 'blocking' | 'warning';
  details?: Record<string, unknown>;
  suggestion?: string;
};

export type ConstraintEvaluationResult = {
  passed: boolean;
  violations: ConstraintIssue[];
  warnings: ConstraintIssue[];
  recommendation?: string;
  confidence_score?: number;
  evaluation_time_ms?: number;
  source?: 'engine' | 'inline' | 'fallback';
};

function asIssue(raw: unknown): ConstraintIssue | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const message = typeof row.message === 'string' ? row.message : null;
  if (!message) return null;
  return {
    rule_id: String(row.rule_id ?? row.ruleId ?? 'RULE'),
    name: typeof row.name === 'string' ? row.name : typeof row.rule_name === 'string' ? row.rule_name : undefined,
    rule_name: typeof row.rule_name === 'string' ? row.rule_name : undefined,
    message,
    is_blocking: Boolean(row.is_blocking ?? row.isBlocking ?? false),
    severity: row.is_blocking ? 'blocking' : 'warning',
    details: typeof row.details === 'object' && row.details ? (row.details as Record<string, unknown>) : undefined,
    suggestion: typeof row.suggestion === 'string' ? row.suggestion : undefined,
  };
}

/** Normalize external engine / API payloads for the leave request UI. */
export function normalizeConstraintEvaluation(raw: unknown): ConstraintEvaluationResult {
  if (!raw || typeof raw !== 'object') {
    return { passed: true, violations: [], warnings: [], confidence_score: 1, recommendation: 'APPROVE' };
  }

  const payload = raw as Record<string, unknown>;
  const violations = Array.isArray(payload.violations)
    ? payload.violations.map(asIssue).filter((v): v is ConstraintIssue => v !== null)
    : [];
  const warnings = Array.isArray(payload.warnings)
    ? payload.warnings.map(asIssue).filter((w): w is ConstraintIssue => w !== null)
    : [];

  const passed =
    typeof payload.passed === 'boolean'
      ? payload.passed
      : violations.filter((v) => v.is_blocking).length === 0;

  return {
    passed,
    violations,
    warnings,
    recommendation:
      typeof payload.recommendation === 'string'
        ? payload.recommendation
        : passed && warnings.length === 0
          ? 'APPROVE'
          : 'REVIEW',
    confidence_score:
      typeof payload.confidence_score === 'number'
        ? payload.confidence_score
        : typeof payload.confidence === 'number'
          ? payload.confidence
          : passed
            ? 0.85
            : 0.5,
    evaluation_time_ms:
      typeof payload.evaluation_time_ms === 'number' ? payload.evaluation_time_ms : undefined,
    source: 'engine',
  };
}

async function evaluateLeaveConstraintsInline(params: {
  employeeId: string;
  companyId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  isHalfDay: boolean;
  balance?: {
    remaining: number;
    pending_days: number;
    annual_entitlement: number;
  } | null;
}): Promise<ConstraintEvaluationResult> {
  const leaveType = params.leaveType.toUpperCase();
  const totalDays = calculateLeaveDays(params.startDate, params.endDate, params.isHalfDay);
  const violations: ConstraintIssue[] = [];
  const warnings: ConstraintIssue[] = [];

  const maxRule = DEFAULT_CONSTRAINT_RULES.find((r) => r.rule_id === 'RULE001');
  const maxDaysMap = (maxRule?.config.max_days ?? {}) as Record<string, number>;
  const maxAllowed = maxDaysMap[leaveType] ?? maxDaysMap.default ?? 30;
  if (totalDays > maxAllowed) {
    violations.push({
      rule_id: 'RULE001',
      name: 'Max Leave Duration',
      message: `Requested ${totalDays} day(s) exceeds the maximum of ${maxAllowed} for ${leaveType}.`,
      is_blocking: true,
    });
  }

  let remaining = params.balance?.remaining;
  if (remaining === undefined) {
    const year = new Date(`${params.startDate}T00:00:00Z`).getUTCFullYear();
    const balance = await prisma.leaveBalance.findUnique({
      where: {
        emp_id_leave_type_year: {
          emp_id: params.employeeId,
          leave_type: leaveType,
          year,
        },
      },
      select: { remaining: true, pending_days: true },
    });
    remaining = balance?.remaining ?? 0;
  }

  const company = await prisma.company.findUnique({
    where: { id: params.companyId },
    select: { negative_balance: true },
  });

  if (!company?.negative_balance && remaining < totalDays) {
    violations.push({
      rule_id: 'RULE002',
      name: 'Leave Balance Check',
      message: `Insufficient balance: ${remaining} day(s) remaining, ${totalDays} requested.`,
      is_blocking: true,
      details: { remaining_days: remaining, requested_days: totalDays },
    });
  }

  const noticeRule = DEFAULT_CONSTRAINT_RULES.find((r) => r.rule_id === 'RULE006');
  const noticeDaysMap = (noticeRule?.config.notice_days ?? {}) as Record<string, number>;
  const requiredNotice = noticeDaysMap[leaveType] ?? 0;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const start = new Date(`${params.startDate}T00:00:00Z`);
  const noticeDays = Math.floor((start.getTime() - today.getTime()) / 86_400_000);
  if (requiredNotice > 0 && noticeDays < requiredNotice) {
    warnings.push({
      rule_id: 'RULE006',
      name: 'Advance Notice',
      message: `Only ${Math.max(0, noticeDays)} day(s) notice; ${requiredNotice} recommended for ${leaveType}.`,
      is_blocking: false,
    });
  }

  const passed = violations.length === 0;
  return {
    passed,
    violations,
    warnings,
    recommendation: passed && warnings.length === 0 ? 'APPROVE' : warnings.length > 0 ? 'REVIEW' : 'REJECT',
    confidence_score: passed ? (warnings.length ? 0.75 : 0.9) : 0.35,
    source: 'inline',
  };
}

async function callExternalConstraintEngine(params: {
  employeeId: string;
  companyId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  balance?: Record<string, unknown>;
}): Promise<ConstraintEvaluationResult> {
  const constraintEngineUrl = resolveConstraintEngineUrl();
  if (!constraintEngineUrl) {
    throw new Error('Constraint engine URL not configured');
  }

  const raw = await constraintEngineBreaker.execute(
    async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8_000);
      try {
        const constraintResp = await fetch(`${constraintEngineUrl}/api/evaluate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': process.env.CRON_SECRET || '',
          },
          body: JSON.stringify({
            employee_id: params.employeeId,
            company_id: params.companyId,
            leave_type: params.leaveType,
            start_date: params.startDate,
            end_date: params.endDate,
            total_days: params.totalDays,
            ...(params.balance ? { balance: params.balance } : {}),
          }),
          signal: controller.signal,
        });

        if (!constraintResp.ok) {
          throw new Error(`Constraint engine returned ${constraintResp.status}`);
        }

        return await constraintResp.json();
      } finally {
        clearTimeout(timeoutId);
      }
    },
    () => {
      throw new Error('Constraint engine circuit open');
    }
  );

  return normalizeConstraintEvaluation(raw);
}

/**
 * Evaluate leave constraints: external engine when reachable, otherwise inline rules.
 * Never leaves the employee blocked — worst case is warnings + manual review on submit.
 */
export async function evaluateLeaveConstraintsForRequest(params: {
  employeeId: string;
  companyId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  isHalfDay: boolean;
  balance?: {
    annual_entitlement: number;
    carried_forward: number;
    used_days: number;
    pending_days: number;
    encashed_days: number;
    remaining: number;
  } | null;
}): Promise<ConstraintEvaluationResult> {
  const leaveType = params.leaveType.toUpperCase();
  const totalDays = calculateLeaveDays(params.startDate, params.endDate, params.isHalfDay);

  try {
    return await callExternalConstraintEngine({
      employeeId: params.employeeId,
      companyId: params.companyId,
      leaveType,
      startDate: params.startDate,
      endDate: params.endDate,
      totalDays,
      balance: params.balance ?? undefined,
    });
  } catch (engineError) {
    console.warn('[LeaveConstraints] External engine unavailable, using inline evaluator:', engineError);
  }

  try {
    return await evaluateLeaveConstraintsInline({
      employeeId: params.employeeId,
      companyId: params.companyId,
      leaveType,
      startDate: params.startDate,
      endDate: params.endDate,
      isHalfDay: params.isHalfDay,
      balance: params.balance
        ? {
            remaining: params.balance.remaining,
            pending_days: params.balance.pending_days,
            annual_entitlement: params.balance.annual_entitlement,
          }
        : null,
    });
  } catch (inlineError) {
    console.error('[LeaveConstraints] Inline evaluator failed:', inlineError);
    const fallback = createConstraintEngineFallback();
    return {
      ...normalizeConstraintEvaluation(fallback),
      source: 'fallback',
    };
  }
}
