/**
 * Country holiday resolution for onboarding and HR holiday import.
 * Uses API Ninjas when configured; otherwise falls back to curated national calendars.
 */

export type CountryHolidayDraft = {
  name: string;
  date: string;
};

const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  india: 'IN',
  in: 'IN',
  ind: 'IN',
  'united states': 'US',
  usa: 'US',
  us: 'US',
  'united kingdom': 'GB',
  uk: 'GB',
  gb: 'GB',
  canada: 'CA',
  ca: 'CA',
  australia: 'AU',
  au: 'AU',
  singapore: 'SG',
  sg: 'SG',
};

/** Fixed-date national holidays (month/day) per ISO country code. */
const FIXED_HOLIDAYS: Record<string, Array<{ name: string; month: number; day: number }>> = {
  IN: [
    { name: 'Republic Day', month: 1, day: 26 },
    { name: 'Independence Day', month: 8, day: 15 },
    { name: 'Gandhi Jayanti', month: 10, day: 2 },
    { name: 'Christmas', month: 12, day: 25 },
  ],
  US: [
    { name: "New Year's Day", month: 1, day: 1 },
    { name: 'Independence Day', month: 7, day: 4 },
    { name: 'Thanksgiving', month: 11, day: 27 },
    { name: 'Christmas', month: 12, day: 25 },
  ],
  GB: [
    { name: "New Year's Day", month: 1, day: 1 },
    { name: 'Christmas Day', month: 12, day: 25 },
    { name: 'Boxing Day', month: 12, day: 26 },
  ],
};

const TIMEZONE_COUNTRY: Record<string, string> = {
  'Asia/Kolkata': 'IN',
  'Asia/Calcutta': 'IN',
  'America/New_York': 'US',
  'America/Los_Angeles': 'US',
  'Europe/London': 'GB',
  'Europe/Berlin': 'DE',
};

const OFFICIAL_API_TYPES = new Set([
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

function padDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function normalizeCountryCode(input?: string | null): string {
  const raw = (input || '').trim();
  if (!raw) return 'IN';
  if (/^[A-Za-z]{2}$/.test(raw)) return raw.toUpperCase();
  const mapped = COUNTRY_NAME_TO_ISO[raw.toLowerCase()];
  return mapped || 'IN';
}

export function resolveOnboardingCountryCode(options: {
  explicitCountry?: string | null;
  timezone?: string | null;
  locationCountries?: string[];
}): string {
  if (options.explicitCountry?.trim()) {
    return normalizeCountryCode(options.explicitCountry);
  }

  for (const locationCountry of options.locationCountries ?? []) {
    const code = normalizeCountryCode(locationCountry);
    if (code) return code;
  }

  const tz = (options.timezone || '').trim();
  if (tz && TIMEZONE_COUNTRY[tz]) {
    return TIMEZONE_COUNTRY[tz];
  }

  return 'IN';
}

export function listStaticCountryHolidays(
  countryCode: string,
  year: number = new Date().getFullYear()
): CountryHolidayDraft[] {
  const code = normalizeCountryCode(countryCode);
  const templates = FIXED_HOLIDAYS[code] ?? FIXED_HOLIDAYS.IN;
  return templates.map((holiday) => ({
    name: holiday.name,
    date: padDate(year, holiday.month, holiday.day),
  }));
}

interface ApiNinjasHoliday {
  name: string;
  date: string;
  type: string;
}

export async function fetchCountryHolidaysFromProvider(
  countryCode: string
): Promise<{ holidays: CountryHolidayDraft[]; source: 'api_ninjas' | 'static' }> {
  const country = normalizeCountryCode(countryCode);
  const apiKey = process.env.API_NINJAS_KEY?.trim();

  if (apiKey) {
    try {
      const url = `https://api.api-ninjas.com/v1/holidays?country=${encodeURIComponent(country)}`;
      const res = await fetch(url, {
        headers: { 'X-Api-Key': apiKey },
        next: { revalidate: 86400 },
      });

      if (res.ok) {
        const data = (await res.json()) as ApiNinjasHoliday[];
        const official = data.filter((row) => OFFICIAL_API_TYPES.has(row.type));
        const candidates =
          official.length > 0
            ? official
            : data.filter((row) => !row.type.includes('OBSERVANCE') && !row.type.includes('SEASON'));

        const seen = new Set<string>();
        const holidays = candidates
          .filter((row) => {
            const key = `${row.name}|${row.date}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return /^\d{4}-\d{2}-\d{2}$/.test(row.date);
          })
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((row) => ({ name: row.name, date: row.date }));

        if (holidays.length > 0) {
          return { holidays, source: 'api_ninjas' };
        }
      }
    } catch (error) {
      console.warn('[country-holidays] API Ninjas fetch failed, using static fallback:', error);
    }
  }

  return { holidays: listStaticCountryHolidays(country), source: 'static' };
}
