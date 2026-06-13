import type { ConstraintEvaluationResult, ConstraintIssue } from '@/lib/leave-constraint-evaluator';

function issueTitle(issue: ConstraintIssue): string {
  return issue.name ?? issue.rule_name ?? issue.rule_id ?? 'Policy rule';
}

function issueAdvice(issue: ConstraintIssue): string {
  if (issue.suggestion) return issue.suggestion;
  const id = (issue.rule_id ?? '').toUpperCase();
  const d = issue.details ?? {};
  if (id === 'RULE002') {
    const remaining = d.remaining_days ?? d.remaining;
    return remaining !== undefined
      ? `You only have **${remaining}** day(s) left on this leave type. Shorten the request or ask HR about LWP.`
      : 'Your balance is too low for these dates.';
  }
  if (id === 'RULE001') {
    const max = d.max_days;
    return max !== undefined
      ? `Maximum consecutive days allowed is **${max}**. Split into smaller requests.`
      : 'The requested span is longer than allowed.';
  }
  if (id === 'RULE005') return 'These dates fall in a **blackout period** when leave is not allowed.';
  if (id === 'RULE003') return '**Team coverage** would drop below the minimum — too many people would be away.';
  if (id === 'RULE004') return 'Too many teammates are already on leave for those dates.';
  if (id === 'RULE006') {
    const min = d.required ?? d.min_notice_days;
    return min !== undefined
      ? `You need at least **${min}** day(s) advance notice for this leave type.`
      : 'Apply earlier to meet the notice rule.';
  }
  return issue.message;
}

export function formatConstraintPlainEnglish(
  evaluation: ConstraintEvaluationResult,
  context?: { leaveType?: string; startDate?: string; endDate?: string }
): string {
  const header =
    context?.leaveType && context?.startDate && context?.endDate
      ? `For **${context.leaveType}** from **${context.startDate}** to **${context.endDate}**:\n\n`
      : '';

  const blocking = evaluation.violations.filter((v) => v.is_blocking !== false);
  const warnings = evaluation.warnings.length > 0 ? evaluation.warnings : evaluation.violations.filter((v) => v.is_blocking === false);

  if (blocking.length === 0 && warnings.length === 0) {
    return (
      header +
      '**You can take these dates** under current policy checks. Submit the request for manager approval if required.'
    );
  }

  const parts: string[] = [];

  if (blocking.length > 0) {
    parts.push('**Why these dates may be blocked:**');
    blocking.forEach((v, i) => {
      parts.push(`${i + 1}. **${issueTitle(v)}** — ${v.message}`);
      parts.push(`   → ${issueAdvice(v)}`);
    });
  }

  if (warnings.length > 0) {
    parts.push(blocking.length > 0 ? '\n**Warnings (may still submit, but review escalates):**' : '**Warnings:**');
    warnings.forEach((v, i) => {
      parts.push(`${i + 1}. **${issueTitle(v)}** — ${v.message}`);
      parts.push(`   → ${issueAdvice(v)}`);
    });
  }

  if (evaluation.recommendation && evaluation.recommendation !== 'APPROVE') {
    parts.push(`\n_System recommendation: **${evaluation.recommendation}**._`);
  }

  return header + parts.join('\n');
}

/** Map request-leave wizard / check-constraints API shape to plain-English summary. */
export function formatWizardConstraintPlainEnglish(
  result: {
    passed: boolean;
    violations: Array<{
      rule_id: string;
      name?: string;
      rule_name?: string;
      message: string;
      is_blocking?: boolean;
      severity?: string;
      details?: Record<string, unknown>;
      suggestion?: string;
    }>;
    warnings: Array<{
      rule_id: string;
      name?: string;
      rule_name?: string;
      message: string;
      is_blocking?: boolean;
      severity?: string;
      details?: Record<string, unknown>;
      suggestion?: string;
    }>;
    recommendation?: string;
  },
  context?: { leaveType?: string; startDate?: string; endDate?: string }
): string {
  const mapIssue = (v: (typeof result.violations)[0]) => ({
    rule_id: v.rule_id,
    name: v.name ?? v.rule_name,
    rule_name: v.rule_name,
    message: v.message,
    is_blocking: v.is_blocking ?? v.severity === 'blocking',
    details: v.details,
    suggestion: v.suggestion,
  });

  return formatConstraintPlainEnglish(
    {
      passed: result.passed,
      violations: result.violations.map(mapIssue),
      warnings: result.warnings.map(mapIssue),
      recommendation: result.recommendation,
    },
    context
  );
}
