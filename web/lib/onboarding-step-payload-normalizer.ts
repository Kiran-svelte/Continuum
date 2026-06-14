/**
 * onboarding-step-payload-normalizer.ts
 *
 * Sanitises and coerces raw JSON payloads before Zod validation for each
 * onboarding step. Every normalizer function strips surplus whitespace, clamps
 * numbers to legal ranges, and ensures arrays are always arrays.
 *
 * Step map — must match onboarding-step-contract.ts and app/onboarding/page.tsx:
 *  1  Company Basics
 *  2  Org Structure         ← NEW
 *  3  Approval Mapping      ← NEW
 *  4  Active Modules        ← NEW
 *  5  Role Structure        (was 2)
 *  6  Leave Types           (was 3)
 *  7  Role Quotas           (was 4)
 *  8  Attendance Rules      (was 5)
 *  9  Holidays              (was 6)
 * 10  AI & Automation       (was 7)
 * 11  Payroll Defaults      (was 8)
 * 12  Notifications         (was 9)
 * 13  Finalize Setup        (was 10)
 *
 * @module lib/onboarding-step-payload-normalizer
 */

const OWNER_ROLE_VALUES = new Set([
  'admin',
  'hr',
  'director',
  'manager',
  'team_lead',
  'employee',
]);

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const VALID_WORKFLOW_TYPES = new Set(['leave', 'expense', 'payroll_advance', 'travel']);
const VALID_ORG_MODELS = new Set(['flat', 'two_tier', 'full_hierarchy']);

/** Clamps a numeric value to [min, max], returning fallback if non-finite. */
function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

/** Lowercases, trims, and replaces spaces/illegal chars with underscores. */
function normalizeSlug(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z_]/g, '');
}

/** Coerces tax regime to 'old' | 'new'. */
function normalizeTaxRegime(value: unknown): 'old' | 'new' {
  return value === 'old' ? 'old' : 'new';
}

/** Coerces LOP calculation method. */
function normalizeLopMethod(value: unknown): 'calendar_days' | 'working_days' {
  return value === 'calendar_days' ? 'calendar_days' : 'working_days';
}

/** Returns role slug if it is a known owner role, otherwise undefined. */
function normalizeOwnerRole(value: unknown): string | undefined {
  const role = normalizeSlug(value);
  return OWNER_ROLE_VALUES.has(role) ? role : undefined;
}

/** Returns true/false. Non-boolean values fall back to the provided default. */
function toBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/** Coerces a value to a trimmed string. */
function toNonEmptyTrimmed(value: unknown): string {
  return String(value ?? '').trim();
}

/** Ensures a value is a plain object, returning {} for everything else. */
function ensureObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

// ─── Per-step normalizers ─────────────────────────────────────────────────────

/** Step 1: Company Basics */
function normalizeStep1(source: Record<string, unknown>): unknown {
  return {
    companyName: toNonEmptyTrimmed(source.companyName),
    industry: toNonEmptyTrimmed(source.industry),
    employeeCount: toNonEmptyTrimmed(source.employeeCount),
    country: toNonEmptyTrimmed(source.country).toUpperCase(),
    timezone: toNonEmptyTrimmed(source.timezone),
    slaHours: clampNumber(source.slaHours, 1, 336, 48),
    negativeBal: toBoolean(source.negativeBal),
    probationDays: clampNumber(source.probationDays, 0, 730, 180),
    workStart: toNonEmptyTrimmed(source.workStart),
    workEnd: toNonEmptyTrimmed(source.workEnd),
    gracePeriodMinutes: clampNumber(source.gracePeriodMinutes, 0, 120, 15),
    halfDayHours: clampNumber(source.halfDayHours, 1, 12, 4),
  };
}

/** Step 2: Org Structure — pass through without strict normalization; validated by Zod. */
function normalizeStep2(source: Record<string, unknown>): unknown {
  const rawOrg = ensureObject(source.orgStructure);
  return {
    orgStructure: {
      orgModel: VALID_ORG_MODELS.has(String(rawOrg.orgModel)) ? rawOrg.orgModel : 'two_tier',
      departments: Array.isArray(rawOrg.departments) ? rawOrg.departments : [],
      locations: Array.isArray(rawOrg.locations) ? rawOrg.locations : [],
      costCenters: Array.isArray(rawOrg.costCenters) ? rawOrg.costCenters : [],
    },
  };
}

/** Step 3: Approval Chain Mapping */
function normalizeStep3(source: Record<string, unknown>): unknown {
  const rawChains = Array.isArray(source.approvalChains) ? source.approvalChains : [];
  return {
    approvalChains: rawChains
      .map((rawChain) => {
        const chain = ensureObject(rawChain);
        const workflowType = String(chain.workflowType ?? '');
        return {
          workflowType: VALID_WORKFLOW_TYPES.has(workflowType) ? workflowType : null,
          level1Role: normalizeSlug(chain.level1Role),
          level2Role: normalizeSlug(chain.level2Role),
          autoApproveAfterHours: clampNumber(chain.autoApproveAfterHours, 0, 720, 0),
        };
      })
      .filter((c) => c.workflowType !== null),
  };
}

/** Step 4: Module Enablement */
function normalizeStep4(source: Record<string, unknown>): unknown {
  const raw = Array.isArray(source.enabledModules) ? source.enabledModules : [];
  return {
    enabledModules: raw.map((m) => String(m ?? '').trim().toLowerCase()).filter((m) => m.length > 0),
  };
}

/** Step 5: Role Structure (was step 2) */
function normalizeStep5(source: Record<string, unknown>): unknown {
  const rawRoles = Array.isArray(source.roles) ? source.roles : [];
  const roles = rawRoles
    .map((rawRole, index) => {
      const role = ensureObject(rawRole);
      const slug = normalizeSlug(role.slug);
      const name = toNonEmptyTrimmed(role.name);
      return {
        name,
        slug,
        authority_level: clampNumber(role.authority_level, 1, 20, index + 1),
        can_approve_leaves: toBoolean(role.can_approve_leaves),
        can_create_users: toBoolean(role.can_create_users),
        color: toNonEmptyTrimmed(role.color) || undefined,
        description: toNonEmptyTrimmed(role.description) || undefined,
      };
    })
    .filter((role) => role.name.length > 0 && role.slug.length > 0);

  const rawCapabilityOwners = ensureObject(source.capabilityOwners);
  return {
    roles,
    capabilityOwners: {
      peopleOperationsOwner: normalizeOwnerRole(rawCapabilityOwners.peopleOperationsOwner),
    },
  };
}

/** Step 6: Leave Types (was step 3) */
function normalizeStep6(source: Record<string, unknown>): unknown {
  const rawLeaveTypes = Array.isArray(source.leaveTypes) ? source.leaveTypes : [];
  return {
    leaveTypes: rawLeaveTypes
      .map((rawLeaveType) => {
        const leaveType = ensureObject(rawLeaveType);
        return {
          code: toNonEmptyTrimmed(leaveType.code).toUpperCase(),
          name: toNonEmptyTrimmed(leaveType.name),
          days: clampNumber(leaveType.days, 0, 365, 0),
          carry_forward: toBoolean(leaveType.carry_forward),
          max_carry_forward: clampNumber(leaveType.max_carry_forward, 0, 365, 0),
          encashment_enabled: toBoolean(leaveType.encashment_enabled),
          encashment_max_days: clampNumber(leaveType.encashment_max_days, 0, 365, 0),
          paid: toBoolean(leaveType.paid, true),
        };
      })
      .filter((lt) => lt.code.length > 0 && lt.name.length > 0),
  };
}

/** Step 7: Role Quotas (was step 4) */
function normalizeStep7(source: Record<string, unknown>): unknown {
  const rawRoleQuotas = Array.isArray(source.roleQuotas) ? source.roleQuotas : [];
  return {
    roleQuotas: rawRoleQuotas
      .map((rawRoleQuota) => {
        const roleQuota = ensureObject(rawRoleQuota);
        return {
          role_slug: normalizeSlug(roleQuota.role_slug),
          leave_type_code: toNonEmptyTrimmed(roleQuota.leave_type_code).toUpperCase(),
          annual_quota: clampNumber(roleQuota.annual_quota, 0, 365, 0),
        };
      })
      .filter((rq) => rq.role_slug.length > 0 && rq.leave_type_code.length > 0),
  };
}

/** Step 8: Attendance Rules (was step 5) */
function normalizeStep8(source: Record<string, unknown>): unknown {
  const workingDays = Array.isArray(source.workingDays)
    ? Array.from(new Set(source.workingDays.map((day) => clampNumber(day, 0, 6, 0))))
    : [1, 2, 3, 4, 5];

  return {
    enabled: toBoolean(source.enabled, true),
    workHoursPerDay: clampNumber(source.workHoursPerDay, 1, 24, 8),
    checkInWindowStart: toNonEmptyTrimmed(source.checkInWindowStart),
    checkInWindowEnd: toNonEmptyTrimmed(source.checkInWindowEnd),
    checkOutWindowStart: toNonEmptyTrimmed(source.checkOutWindowStart),
    checkOutWindowEnd: toNonEmptyTrimmed(source.checkOutWindowEnd),
    gracePeriodMinutes: clampNumber(source.gracePeriodMinutes, 0, 120, 15),
    lateMarksToHalfDay: clampNumber(source.lateMarksToHalfDay, 1, 12, 3),
    wfhAllowed: toBoolean(source.wfhAllowed, true),
    geoFencingEnabled: toBoolean(source.geoFencingEnabled),
    photoVerificationEnabled: toBoolean(source.photoVerificationEnabled),
    workingDays,
  };
}

/** Step 9: Holidays (was step 6) */
function normalizeStep9(source: Record<string, unknown>): unknown {
  const rawHolidays = Array.isArray(source.holidays) ? source.holidays : [];
  return {
    holidays: rawHolidays
      .map((rawHoliday) => {
        const holiday = ensureObject(rawHoliday);
        const date = toNonEmptyTrimmed(holiday.date);
        return {
          name: toNonEmptyTrimmed(holiday.name),
          date,
          enabled: toBoolean(holiday.enabled, true),
          custom: toBoolean(holiday.custom, true),
        };
      })
      .filter((h) => h.name.length > 0 && DATE_REGEX.test(h.date)),
  };
}

/** Step 10: AI & Automation (was step 7) */
function normalizeStep10(source: Record<string, unknown>): unknown {
  return {
    enabled: toBoolean(source.enabled, true),
    confidenceThreshold: clampNumber(source.confidenceThreshold, 0, 1, 0.8),
    autoApproveMaxDays: clampNumber(source.autoApproveMaxDays, 0, 30, 2),
    requireTeamCoverage: toBoolean(source.requireTeamCoverage, true),
    minTeamCoverage: clampNumber(source.minTeamCoverage, 0, 100, 50),
    autoEscalateTimeoutHours: clampNumber(source.autoEscalateTimeoutHours, 1, 168, 24),
    escalationRules: Array.isArray(source.escalationRules) ? source.escalationRules : undefined,
  };
}

/** Step 11: Payroll Defaults (was step 8) */
function normalizeStep11(source: Record<string, unknown>): unknown {
  return {
    pfEnabled: toBoolean(source.pfEnabled, true),
    pfCeiling: clampNumber(source.pfCeiling, 0, 1000000, 15000),
    esiEnabled: toBoolean(source.esiEnabled, true),
    esiCeiling: clampNumber(source.esiCeiling, 0, 1000000, 21000),
    ptEnabled: toBoolean(source.ptEnabled, true),
    ptState: toNonEmptyTrimmed(source.ptState),
    tdsEnabled: toBoolean(source.tdsEnabled, true),
    defaultTaxRegime: normalizeTaxRegime(source.defaultTaxRegime),
    lopCalculationMethod: normalizeLopMethod(source.lopCalculationMethod),
    salaryPayDay: clampNumber(source.salaryPayDay, 1, 28, 28),
    payrollCurrency: toNonEmptyTrimmed(source.payrollCurrency),
  };
}

/** Step 12: Notifications (was step 9) */
function normalizeStep12(source: Record<string, unknown>): unknown {
  return {
    emailNotifications: toBoolean(source.emailNotifications, true),
    managerAlerts: toBoolean(source.managerAlerts, true),
    dailyDigest: toBoolean(source.dailyDigest, true),
    slaAlerts: toBoolean(source.slaAlerts, true),
  };
}

/** Step 13: Finalize Setup (was step 10) */
function normalizeStep13(source: Record<string, unknown>): unknown {
  return { completed: toBoolean(source.completed, true) };
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

const STEP_NORMALIZERS: Record<number, (source: Record<string, unknown>) => unknown> = {
  1:  normalizeStep1,
  2:  normalizeStep2,
  3:  normalizeStep3,
  4:  normalizeStep4,
  5:  normalizeStep5,
  6:  normalizeStep6,
  7:  normalizeStep7,
  8:  normalizeStep8,
  9:  normalizeStep9,
  10: normalizeStep10,
  11: normalizeStep11,
  12: normalizeStep12,
  13: normalizeStep13,
};

/**
 * Sanitises a raw POST body for the given onboarding step.
 * Falls through to the raw payload for unknown step numbers
 * (the subsequent Zod parse will catch them).
 *
 * @param step - Validated step number (1–13)
 * @param payload - Raw JSON from the request body
 * @returns Normalised payload ready for Zod validation
 */
export function normalizeOnboardingStepPayload(step: number, payload: unknown): unknown {
  const source = ensureObject(payload);
  const normalizer = STEP_NORMALIZERS[step];
  return normalizer ? normalizer(source) : payload;
}

/**
 * Formats a Zod flatten() output into a single pipe-delimited string
 * suitable for inclusion in an API error message.
 *
 * @param details - Output of zod.error.flatten()
 * @returns A human-readable error string, or null if no messages found
 */
export function formatValidationDetails(details: unknown): string | null {
  if (!details || typeof details !== 'object') return null;

  const flattened = details as {
    fieldErrors?: Record<string, string[] | undefined>;
    formErrors?: string[];
  };

  const messages: string[] = [];

  for (const message of (flattened.formErrors ?? [])) {
    if (typeof message === 'string' && message.trim().length > 0) {
      messages.push(message.trim());
    }
  }

  for (const [field, fieldMessages] of Object.entries(flattened.fieldErrors ?? {})) {
    for (const message of (fieldMessages ?? [])) {
      if (typeof message === 'string' && message.trim().length > 0) {
        messages.push(`${field}: ${message.trim()}`);
      }
    }
  }

  return messages.length === 0 ? null : messages.join(' | ');
}