import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';

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

    const constraintEngineUrl = process.env.CONSTRAINT_ENGINE_URL;

    if (!constraintEngineUrl) {
      // No constraint engine configured -- return clean pass
      return NextResponse.json({
        approved: true,
        status: 'pass',
        violations: [],
        warnings: [],
        suggestions: [],
        message: 'No constraint engine configured',
      });
    }

    // Calculate total_days to match submit route logic
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    const diffMs = endDate.getTime() - startDate.getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
    const totalDays = is_half_day ? 0.5 : days;

    // Call the constraint engine -- matching the exact URL and payload from submit route
    try {
      const constraintResp = await fetch(`${constraintEngineUrl}/api/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.CRON_SECRET || '',
        },
        body: JSON.stringify({
          employee_id: employee.id,
          company_id: employee.org_id,
          leave_type,
          start_date,
          end_date,
          total_days: totalDays,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!constraintResp.ok) {
        // Engine error -- return clean pass so the user is not blocked from previewing
        return NextResponse.json({
          approved: true,
          status: 'pass',
          violations: [],
          warnings: [],
          suggestions: [
            'Constraint engine is temporarily unavailable. Your request will be fully validated on submit.',
          ],
          message: 'Constraint engine unavailable',
        });
      }

      const result = await constraintResp.json();
      return NextResponse.json(result);
    } catch {
      // Constraint engine unreachable -- return clean pass
      return NextResponse.json({
        approved: true,
        status: 'pass',
        violations: [],
        warnings: [],
        suggestions: [
          'Constraint engine is temporarily unavailable. Your request will be fully validated on submit.',
        ],
        message: 'Constraint engine unavailable',
      });
    }
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
