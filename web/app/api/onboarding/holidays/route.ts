import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee, AuthError, requirePermissionGuard } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import {
  fetchCountryHolidaysFromProvider,
  normalizeCountryCode,
  resolveOnboardingCountryCode,
} from '@/lib/country-holidays';

export const dynamic = 'force-dynamic';

/**
 * GET /api/onboarding/holidays?country=IN
 * Suggested public holidays for the onboarding Holidays step.
 */
export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();
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
    const message = error instanceof Error ? error.message : 'Failed to load holiday suggestions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
