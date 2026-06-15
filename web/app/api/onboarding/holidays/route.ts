import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee, AuthError, requirePermissionGuard } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import {
  fetchCountryHolidaysFromProvider,
  normalizeCountryCode,
  resolveOnboardingCountryCode,
} from '@/lib/country-holidays';
import { logOnboardingApiError, onboardingSafeErrorBody } from '@/lib/onboarding/api-errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/onboarding/holidays?country=IN
 * Suggested public holidays for the onboarding Holidays step.
 */
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
    const country = resolveOnboardingCountryCode({
      explicitCountry: searchParams.get('country'),
      timezone: searchParams.get('timezone'),
      locationCountries: searchParams.getAll('locationCountry').filter(Boolean),
    });

    const { holidays, source } = await fetchCountryHolidaysFromProvider(country);

    return NextResponse.json({
      success: true,
      country: normalizeCountryCode(country),
      year: new Date().getFullYear(),
      count: holidays.length,
      source,
      holidays,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logOnboardingApiError('holidays', error, { userId: employeeIdForLog });
    return NextResponse.json(
      onboardingSafeErrorBody('ONBOARDING_HOLIDAYS_FAILED'),
      { status: 500 }
    );
  }
}
