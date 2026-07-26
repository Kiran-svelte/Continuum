const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const TIMEZONE_ENTITY_MAP: Record<string, string> = {
  '&quot;': '"',
  '&#34;': '"',
  '&#x22;': '"',
  '&#39;': "'",
  '&#x27;': "'",
  '&apos;': "'",
  '&#96;': '`',
  '&lt;': '<',
  '&gt;': '>',
  '&#x2F;': '/',
  '&#47;': '/',
  '&amp;': '&',
};

const TIMEZONE_ENTITY_REGEX = /&quot;|&#34;|&#x22;|&#39;|&#x27;|&apos;|&#96;|&lt;|&gt;|&#x2F;|&#47;|&amp;/gi;

export interface NormalizedTimezoneResult {
  value: string | null;
  reason: string | null;
}

function decodeTimezoneEntities(value: string): string {
  return value.replace(TIMEZONE_ENTITY_REGEX, (match) => TIMEZONE_ENTITY_MAP[match] ?? TIMEZONE_ENTITY_MAP[match.toLowerCase()] ?? match);
}

function stripBalancedQuotes(value: string): string {
  let candidate = value.trim();

  while (candidate.length >= 2) {
    const first = candidate[0];
    const last = candidate[candidate.length - 1];
    if ((first === '"' || first === "'" || first === '`') && first === last) {
      candidate = candidate.slice(1, -1).trim();
      continue;
    }
    break;
  }

  return candidate;
}

function normalizeTimezoneRaw(input: unknown): string | null {
  if (typeof input !== 'string') {
    return null;
  }

  let candidate = input.trim();
  if (!candidate) {
    return null;
  }

  candidate = decodeTimezoneEntities(candidate);
  candidate = candidate.replace(/\\(["'`/])/g, '$1');
  candidate = stripBalancedQuotes(candidate);

  if (!candidate) {
    return null;
  }

  return candidate;
}

function isValidIanaTimezone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function normalizeCompanyTimezone(input: unknown): NormalizedTimezoneResult {
  const candidate = normalizeTimezoneRaw(input);
  if (!candidate) {
    return { value: null, reason: 'Timezone must be a non-empty string.' };
  }

  if (!isValidIanaTimezone(candidate)) {
    return { value: null, reason: 'Timezone must be a valid IANA timezone identifier.' };
  }

  const canonical = new Intl.DateTimeFormat('en-US', { timeZone: candidate }).resolvedOptions().timeZone;
  return { value: canonical, reason: null };
}

export function assertValidCompanyTimezone(input: unknown): string {
  const normalized = normalizeCompanyTimezone(input);
  if (!normalized.value) {
    throw new Error(normalized.reason ?? 'Invalid timezone.');
  }
  return normalized.value;
}

export function resolveOperationalTimezone(
  input: unknown,
  fallbackTimeZone = 'UTC'
): { timezone: string; fallbackApplied: boolean; reason: string | null } {
  const normalized = normalizeCompanyTimezone(input);
  if (normalized.value) {
    return { timezone: normalized.value, fallbackApplied: false, reason: null };
  }

  const fallback = normalizeCompanyTimezone(fallbackTimeZone);
  if (fallback.value) {
    return {
      timezone: fallback.value,
      fallbackApplied: true,
      reason: normalized.reason,
    };
  }

  return {
    timezone: 'UTC',
    fallbackApplied: true,
    reason: normalized.reason ?? 'Invalid timezone.',
  };
}

export interface ParseIntOptions {
  defaultValue: number;
  min: number;
  max: number;
}

export function parseBoundedInt(raw: string | null | undefined, options: ParseIntOptions): number {
  const parsed = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(parsed)) {
    return options.defaultValue;
  }
  return Math.min(options.max, Math.max(options.min, parsed));
}

export function parseDateKey(raw: string | null | undefined): string | null {
  const candidate = (raw ?? '').trim();
  if (!DATE_ONLY_REGEX.test(candidate)) {
    return null;
  }

  const [year, month, day] = candidate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return candidate;
}

export function getDateKeyInTimeZone(date: Date, timeZone: string): string {
  const resolved = resolveOperationalTimezone(timeZone);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: resolved.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return formatter.format(date);
}

/**
 * Wall-clock minutes since midnight at `date`, as observed in `timeZone`.
 *
 * Needed wherever a policy time ("work starts 09:30") is compared against an
 * instant. Doing that with Date#setHours compares against the *server's*
 * timezone, which on a UTC host silently shifts every company's schedule.
 */
export function getMinutesOfDayInTimeZone(date: Date, timeZone: string): number {
  const resolved = resolveOperationalTimezone(timeZone);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: resolved.timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  // en-GB renders midnight as "24" in some ICU versions.
  return (hour % 24) * 60 + minute;
}

/** Parses "HH:MM" into minutes since midnight; null when malformed. */
export function parseClockTimeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function dateKeyToUtcRange(dateKey: string): { start: Date; endExclusive: Date } {
  const parsedKey = parseDateKey(dateKey);
  if (!parsedKey) {
    throw new Error('Invalid date key. Expected YYYY-MM-DD.');
  }

  const [year, month, day] = parsedKey.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, day));
  const endExclusive = new Date(Date.UTC(year, month - 1, day + 1));

  return { start, endExclusive };
}

export function isFutureDateKey(dateKey: string, timeZone: string, now = new Date()): boolean {
  const parsedKey = parseDateKey(dateKey);
  if (!parsedKey) {
    return false;
  }
  const todayKey = getDateKeyInTimeZone(now, timeZone);
  return parsedKey > todayKey;
}

export interface DateRangeOptions {
  startDateRaw: string | null;
  endDateRaw: string | null;
  defaultStart: Date;
  defaultEndExclusive: Date;
  maxDays: number;
}

export type DateRangeResult =
  | { ok: true; start: Date; endExclusive: Date }
  | { ok: false; error: string };

export function parseDateOnlyRange(options: DateRangeOptions): DateRangeResult {
  const hasStart = Boolean(options.startDateRaw);
  const hasEnd = Boolean(options.endDateRaw);

  if (hasStart !== hasEnd) {
    return { ok: false, error: 'Both startDate and endDate are required together.' };
  }

  let start = options.defaultStart;
  let endExclusive = options.defaultEndExclusive;

  if (hasStart && hasEnd) {
    const startKey = parseDateKey(options.startDateRaw);
    const endKey = parseDateKey(options.endDateRaw);

    if (!startKey || !endKey) {
      return { ok: false, error: 'Dates must use YYYY-MM-DD format.' };
    }

    start = dateKeyToUtcRange(startKey).start;
    endExclusive = dateKeyToUtcRange(endKey).endExclusive;
  }

  if (start >= endExclusive) {
    return { ok: false, error: 'startDate must be before or equal to endDate.' };
  }

  const rangeDays = (endExclusive.getTime() - start.getTime()) / (24 * 60 * 60 * 1000);
  if (rangeDays > options.maxDays) {
    return { ok: false, error: `Date range cannot exceed ${options.maxDays} days.` };
  }

  return { ok: true, start, endExclusive };
}
