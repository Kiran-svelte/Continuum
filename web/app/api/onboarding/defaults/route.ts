import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee, AuthError, requirePermissionGuard} from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { buildPersonalizedOnboardingDefaults } from '@/lib/onboarding-defaults';
import { logOnboardingApiError, onboardingSafeErrorBody } from '@/lib/onboarding/api-errors';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  let employeeIdForLog: string | undefined;

  try {
    const employee = await getAuthEmployee();
    employeeIdForLog = employee.id;
    requirePermissionGuard(employee, 'employee.onboard');

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const { searchParams } = request.nextUrl;
    const industry = searchParams.get('industry') || undefined;
    const size = searchParams.get('size') || undefined;
    const country = searchParams.get('country') || undefined;
    const timezone = searchParams.get('timezone') || undefined;

    const defaults = buildPersonalizedOnboardingDefaults({
      industry,
      size,
      country,
      timezone,
    });

    return NextResponse.json({
      success: true,
      defaults,
      meta: {
        industry: industry ?? 'other',
        size: size ?? 'unknown',
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    logOnboardingApiError('defaults', error, { userId: employeeIdForLog });
    return NextResponse.json(
      onboardingSafeErrorBody('ONBOARDING_DEFAULTS_FAILED'),
      { status: 500 }
    );
  }
}
