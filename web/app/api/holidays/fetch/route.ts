import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee } from '@/lib/auth-guard';

export const dynamic = 'force-dynamic';

interface ApiNinjasHoliday {
  country: string;
  iso: string;
  year: number;
  date: string;
  day: string;
  name: string;
  type: string;
}

/**
 * GET /api/holidays/fetch?country=IN
 *
 * Proxies the API Ninjas Holidays API to fetch public/national holidays
 * for a given country. Keeps the API key server-side.
 * Free tier returns current-year data only.
 */
export async function GET(request: NextRequest) {
  // Require authentication to prevent API key abuse
  try {
    await getAuthEmployee();
  } catch {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const country = searchParams.get('country');

  if (!country) {
    return NextResponse.json(
      { error: 'country query parameter is required (ISO 3166-2 code, e.g. IN, US, GB)' },
      { status: 400 }
    );
  }

  const apiKey = process.env.API_NINJAS_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'API Ninjas key not configured' },
      { status: 500 }
    );
  }

  // Holiday types considered "official" / worth showing in onboarding
  const OFFICIAL_TYPES = new Set([
    'GAZETTED_HOLIDAY',
    'NATIONAL_HOLIDAY',
    'PUBLIC_HOLIDAY',
    'FEDERAL_HOLIDAY',
    'BANK_HOLIDAY',
    'RESTRICTED_HOLIDAY',
    'OFFICIAL_HOLIDAY',
    'STATE_HOLIDAY',
    'OPTIONAL_HOLIDAY',
  ]);

  try {
    // Free tier: no year param (returns current year automatically)
    const url = `https://api.api-ninjas.com/v1/holidays?country=${encodeURIComponent(country)}`;

    const res = await fetch(url, {
      headers: { 'X-Api-Key': apiKey },
      next: { revalidate: 86400 }, // cache for 24h
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[HolidaysFetch] API Ninjas error:', res.status, text);
      return NextResponse.json(
        { error: `API Ninjas returned ${res.status}` },
        { status: 502 }
      );
    }

    const data: ApiNinjasHoliday[] = await res.json();

    // Filter to official/public holidays, exclude observances and seasons
    const officialHolidays = data.filter((h) => OFFICIAL_TYPES.has(h.type));

    // If no official holidays matched, return all non-observance/non-season holidays
    const candidates = officialHolidays.length > 0
      ? officialHolidays
      : data.filter((h) => !h.type.includes('OBSERVANCE') && !h.type.includes('SEASON'));

    // Deduplicate by name+date (API sometimes returns duplicates for different types)
    const seen = new Set<string>();
    const holidays = candidates
      .filter((h) => {
        const key = `${h.name}|${h.date}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((h) => ({
        name: h.name,
        date: h.date,
        day: h.day,
        type: h.type,
      }));

    return NextResponse.json({
      country: country.toUpperCase(),
      year: new Date().getFullYear(),
      count: holidays.length,
      holidays,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[HolidaysFetch] Failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
