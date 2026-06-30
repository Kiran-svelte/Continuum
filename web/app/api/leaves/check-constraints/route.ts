import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { requireModuleForOrg } from '@/lib/core-functions/guard-handler';
import { evaluateLeaveConstraintsForRequest } from '@/lib/leave-constraint-evaluator';
import { LeaveWorkflowError, validateLeaveDateRange } from '@/lib/leave-workflow';

export const dynamic = 'force-dynamic';

/**
 * POST /api/leaves/check-constraints
 * Real-time constraint preview for leave request form.
 * Returns constraint engine results (violations, warnings, suggestions)
 * without creating a leave request.
 */
export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();
    const moduleGuard = await requireModuleForOrg(employee.org_id, 'leave');
    if (moduleGuard) return moduleGuard;

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const body = await request.json();
    const { leave_type, start_date, end_date, is_half_day } = body;

    if (!leave_type || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'Missing required fields: leave_type, start_date, end_date' },
        { status: 400 }
      );
    }

    try {
      validateLeaveDateRange(start_date, end_date);
    } catch (error) {
      if (error instanceof LeaveWorkflowError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      throw error;
    }

    const evaluation = await evaluateLeaveConstraintsForRequest({
      employeeId: employee.id,
      companyId: employee.org_id!,
      leaveType: leave_type,
      startDate: start_date,
      endDate: end_date,
      isHalfDay: Boolean(is_half_day),
    });
    const status =
      evaluation.violations.length > 0 ? 'fail' : evaluation.warnings.length > 0 ? 'warnings' : 'pass';

    return NextResponse.json({
      approved: evaluation.passed,
      status,
      violations: evaluation.violations,
      warnings: evaluation.warnings,
      suggestions: [
        ...evaluation.violations.map((violation) => violation.suggestion || violation.message),
        ...evaluation.warnings.map((warning) => warning.suggestion || warning.message),
      ],
      recommendation: evaluation.recommendation,
      confidence_score: evaluation.confidence_score,
      source: evaluation.source,
      message:
        evaluation.source === 'engine'
          ? 'Constraint engine evaluated the request.'
          : 'Constraint engine fallback evaluated the request locally.',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
