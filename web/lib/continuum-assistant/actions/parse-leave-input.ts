import prisma from '@/lib/prisma';

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11,
  dec: 12, december: 12,
};

const LEAVE_TYPE_ALIASES: Record<string, string[]> = {
  sick: ['sick', 'sl', 'medical', 'fever', 'ill'],
  casual: ['casual', 'cl'],
  annual: ['annual', 'al', 'earned', 'privilege', 'vacation', 'pto'],
  marriage: ['marriage', 'mrl', 'wedding', 'madve', 'maduve'],
};

export function isConfirmMessage(message: string): boolean {
  const t = message.trim();
  if (!t) return false;
  if (
    /^(yes|yep|yeah|confirm|confirmed|ok|okay|proceed|submit|go ahead|do it|approve it)[!.]*$/i.test(t)
  ) {
    return true;
  }
  return /^(yes|yep|yeah)\s+please[!.]*$/i.test(t);
}

export function isCancelMessage(message: string): boolean {
  return /^(no|nope|cancel|abort|stop|nevermind|never mind|discard)\b/i.test(message.trim());
}

export function isRejectActionMessage(message: string): boolean {
  return /\b(reject|deny|decline)\b/i.test(message) && /\bleave\b/i.test(message);
}

function padDate(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const parsed = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  if (parsed.getUTCMonth() + 1 !== m || parsed.getUTCDate() !== d) return null;
  return iso;
}

function inferYear(month: number, explicitYear?: number): number {
  if (explicitYear) return explicitYear;
  const now = new Date();
  const y = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;
  if (month < currentMonth - 1) return y + 1;
  return y;
}

function addDaysInclusive(startIso: string, dayCount: number): string | null {
  if (dayCount < 1) return null;
  const start = new Date(`${startIso}T12:00:00Z`);
  if (Number.isNaN(start.getTime())) return null;
  start.setUTCDate(start.getUTCDate() + dayCount - 1);
  const y = start.getUTCFullYear();
  const m = start.getUTCMonth() + 1;
  const d = start.getUTCDate();
  return padDate(y, m, d);
}

function parseSingleDayFragment(fragment: string): { start_date: string; end_date: string } | null {
  return parseNaturalDateRange(fragment.trim());
}

/** Parse natural language dates: ranges, durations, half-day, ISO. */
export function parseNaturalDateRange(message: string): { start_date: string; end_date: string } | null {
  const text = message.trim().toLowerCase();
  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) {
    const d = padDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    return d ? { start_date: d, end_date: d } : null;
  }

  const durationFrom =
    text.match(/\b(?:for\s+)?(\d{1,2})\s*days?\s+(?:from|starting|beginning)\s+(.+?)(?:\s+for\s+|\s+reason\b|$)/i) ||
    text.match(/\b(\d{1,2})\s*days?\s+(?:off\s+)?from\s+(.+?)(?:\s+for\s+|\s+reason\b|$)/i);
  if (durationFrom) {
    const days = Number(durationFrom[1]);
    const anchor = parseSingleDayFragment(durationFrom[2]);
    if (anchor) {
      const end = addDaysInclusive(anchor.start_date, days);
      if (end) return { start_date: anchor.start_date, end_date: end };
    }
  }

  const crossMonth = text.match(
    /\b([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s*(?:to|–|-)\s*([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(20\d{2}))?\b/
  );
  if (crossMonth) {
    const m1 = MONTHS[crossMonth[1]];
    const m2 = MONTHS[crossMonth[3]];
    if (m1 && m2) {
      const y = inferYear(m1, crossMonth[5] ? Number(crossMonth[5]) : undefined);
      const start = padDate(y, m1, Number(crossMonth[2]));
      const end = padDate(y, m2, Number(crossMonth[4]));
      if (start && end) return { start_date: start, end_date: end };
    }
  }

  const sameMonth = text.match(
    /\b([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s*(?:to|–|-)\s*(\d{1,2})(?:st|nd|rd|th)?(?:\s+(20\d{2}))?\b/
  );
  if (sameMonth) {
    const month = MONTHS[sameMonth[1]];
    if (month) {
      const y = inferYear(month, sameMonth[4] ? Number(sameMonth[4]) : undefined);
      const start = padDate(y, month, Number(sameMonth[2]));
      const end = padDate(y, month, Number(sameMonth[3]));
      if (start && end) return { start_date: start, end_date: end };
    }
  }

  const range = text.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s*[-–to]+\s*(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)(?:\s+(20\d{2}))?\b/
  );
  if (range) {
    const month = MONTHS[range[3]];
    if (month) {
      const y = inferYear(month, range[4] ? Number(range[4]) : undefined);
      const start = padDate(y, month, Number(range[1]));
      const end = padDate(y, month, Number(range[2]));
      if (start && end) return { start_date: start, end_date: end };
    }
  }

  let year = inferYear(new Date().getUTCMonth() + 1);

  const dayMonth =
    text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([a-z]+)(?:\s+(20\d{2}))?\b/) ||
    text.match(/\b([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(20\d{2}))?\b/);

  if (dayMonth) {
    const a = dayMonth[1];
    const b = dayMonth[2];
    const yPart = dayMonth[3];
    let day: number;
    let monthKey: string;
    if (/^\d+$/.test(a)) {
      day = Number(a);
      monthKey = b;
    } else {
      monthKey = a;
      day = Number(b);
    }
    const month = MONTHS[monthKey];
    if (!month) return null;
    year = inferYear(month, yPart ? Number(yPart) : undefined);
    const d = padDate(year, month, day);
    return d ? { start_date: d, end_date: d } : null;
  }

  return null;
}

export function detectHalfDay(message: string): boolean {
  return /\bhalf\s*[- ]?day\b/i.test(message);
}

/** True when the user is asking about balance/policy, not submitting leave. */
export function isLeaveBalanceOrPolicyQuestion(message: string): boolean {
  const t = message.trim();
  if (!/\bleave\b/i.test(t) && !/\b(sick|casual|annual|pto|time\s*off)\b/i.test(t)) {
    return false;
  }
  return /\b(how many|how much|balance|balances|remaining|left|available|quota|entitled|entitlement|policy|carry\s*forward)\b/i.test(
    t
  );
}

/** True when message looks like leave submission details (not general how-to questions). */
export function looksLikeLeaveRequestDetails(message: string): boolean {
  const t = message.trim();
  if (!t || isConfirmMessage(t) || isCancelMessage(t)) return false;
  if (isLeaveBalanceOrPolicyQuestion(t)) return false;
  if (detectRequestLeaveIntent(t)) return true;
  if (parseNaturalDateRange(t)) return true;
  if (/\b(\d{1,2})\s*days?\s+(from|off)\b/i.test(t)) return true;
  if (detectHalfDay(t)) return true;
  if (
    /\b(request|apply|submit|book|take|need)\b/i.test(t) &&
    /\b(annual|casual|sick|marriage|mrl|wedding|vacation|pto|earned|leave|time\s*off)\b/i.test(t)
  ) {
    return true;
  }
  return false;
}

/** Drop an in-progress leave draft when the user clearly changed topic. */
export function shouldAbandonLeaveDraft(message: string): boolean {
  const t = message.trim();
  if (!t || isConfirmMessage(t) || isCancelMessage(t)) return false;
  if (detectRequestLeaveIntent(t) || looksLikeLeaveRequestDetails(t)) return false;
  if (detectApproveLeaveIntent(t) || detectRejectLeaveActionIntent(t)) return false;

  if (isLeaveBalanceOrPolicyQuestion(t)) return true;
  if (
    /\b(how|where|what|when|why|help|explain|show me|find|navigate|open|menu|sidebar|payslip|payroll|salary|setup|wizard|module|dashboard|notification|invite|import|compliance|attendance|reimburse|travel|performance)\b/i.test(
      t
    )
  ) {
    return true;
  }
  if (/\b(summarize|summary|pending approval|escalat|bulk|preflight|audit)\b/i.test(t)) {
    return true;
  }
  return false;
}

/** Extract employee name hint for approve/reject, e.g. "for Riya Rajveer". */
export function parseEmployeeNameHint(message: string): string | null {
  const patterns = [
    /\b(?:approve|reject|deny)\s+(?:leave\s+)?(?:for\s+)?([a-z][a-z\s'-]{1,48})/i,
    /\b(?:for)\s+([a-z][a-z\s'-]{1,48})(?:\s*'s)?\s+leave\b/i,
    /\bleave\s+for\s+([a-z][a-z\s'-]{1,48})/i,
  ];
  for (const re of patterns) {
    const m = message.match(re);
    if (m?.[1]) {
      const name = m[1]
        .replace(/\b(please|thanks|confirm|leave|request)\b/gi, '')
        .trim();
      if (name.length >= 2) return name;
    }
  }
  return null;
}

export function inferLeaveTypeCode(message: string, knownCodes: string[]): string | null {
  const lower = message.toLowerCase();
  const normalized = knownCodes.map((c) => c.toUpperCase());

  for (const code of normalized) {
    if (new RegExp(`\\b${code}\\b`, 'i').test(message)) {
      return code;
    }
  }

  for (const [canonical, aliases] of Object.entries(LEAVE_TYPE_ALIASES)) {
    if (!aliases.some((a) => new RegExp(`\\b${a}\\b`, 'i').test(lower))) continue;
    const byCanonical = normalized.find(
      (c) => c.toLowerCase() === canonical || c.toLowerCase().startsWith(canonical.slice(0, 1))
    );
    if (byCanonical) return byCanonical;
    if (canonical === 'sick') {
      const sl = normalized.find((c) => c === 'SL' || c.startsWith('SICK'));
      if (sl) return sl;
    }
    if (canonical === 'casual') {
      const cl = normalized.find((c) => c === 'CL' || c.startsWith('CAS'));
      if (cl) return cl;
    }
    if (canonical === 'annual') {
      const al = normalized.find((c) => c === 'AL' || c.includes('ANN'));
      if (al) return al;
    }
    if (canonical === 'marriage') {
      const mrl = normalized.find((c) => c === 'MRL' || c.includes('MARR'));
      if (mrl) return mrl;
    }
  }

  return null;
}

export function extractReason(message: string): string | null {
  const trimmed = message.trim();
  if (trimmed.length < 3) return null;

  const explicit =
    trimmed.match(/\breason\s*[:-]\s*(.+)$/i) ||
    trimmed.match(/\bbecause\s+(.+)$/i) ||
    trimmed.match(/\bfor\s+([a-z].+)$/i);
  if (explicit?.[1]) {
    const r = explicit[1].trim();
    if (r.length >= 2 && !/^\d/.test(r)) return r.slice(0, 1000);
  }

  let working = trimmed
    .replace(/\b(request|apply|book|submit)\s+(annual|casual|sick|leave)\b/gi, '')
    .replace(/\b\d{1,2}\s*days?\s+(from|off)\b/gi, '')
    .replace(/\bhalf\s*[- ]?day\b/gi, '')
    .replace(/\b(annual|casual|sick|earned|privilege)\s+leave\b/gi, '')
    .trim();

  const dates = parseNaturalDateRange(working);
  if (dates) {
    working = working
      .replace(/\b\d{1,2}(?:st|nd|rd|th)?\b/gi, '')
      .replace(
        /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\b/gi,
        ''
      )
      .replace(/\b(to|from|on|for)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  if (working.length >= 3 && !/^(request|apply|sick|leave|annual|casual)\b/i.test(working)) {
    return working.slice(0, 1000);
  }

  if (!dates && trimmed.length >= 3) return trimmed.slice(0, 1000);
  return null;
}

export async function loadCompanyLeaveTypeCodes(companyId: string): Promise<string[]> {
  const types = await prisma.leaveType.findMany({
    where: { company_id: companyId, is_active: true, deleted_at: null },
    select: { code: true },
  });
  return types.map((t) => t.code);
}

export function detectRequestLeaveIntent(message: string): boolean {
  const t = message.trim();
  if (!t) return false;

  if (
    /\b(request|apply|book|submit)\b/i.test(t) &&
    /\b(leave|time\s*off|sick|casual|day\s*off|pto|vacation)\b/i.test(t)
  ) {
    return true;
  }

  // "request on my behalf", "I need you to request for me" (no explicit "leave" word)
  if (
    /\b(on my behalf|on behalf of me|behalf of me|for me|do it for me)\b/i.test(t) &&
    /\b(request|apply|submit|leave|sick|casual|time\s*off)\b/i.test(t)
  ) {
    return true;
  }

  if (
    /\b(need you to|want you to|can you|could you|please)\b/i.test(t) &&
    /\b(request|apply|submit)\b/i.test(t) &&
    /\b(behalf|for me|leave|sick)\b/i.test(t)
  ) {
    return true;
  }

  return false;
}

export function detectApproveLeaveIntent(message: string): boolean {
  if (/\b(approve|accept|grant)\b/i.test(message) && /\b(leave|request|al|cl|sl|mrl)\b/i.test(message)) {
    return true;
  }
  if (/\bapprove\b/i.test(message) && parseEmployeeNameHint(message)) return true;
  return false;
}

export function detectRejectLeaveActionIntent(message: string): boolean {
  if (isRejectActionMessage(message)) return true;
  if (/\b(reject|deny|decline)\b/i.test(message) && parseEmployeeNameHint(message)) return true;
  return false;
}
