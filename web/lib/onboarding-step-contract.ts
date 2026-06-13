import { z } from 'zod';

/**
 * onboarding-step-contract.ts
 *
 * Single source of truth for:
 * - TOTAL_ONBOARDING_STEPS — must match the UI wizard's TOTAL_STEPS constant
 * - onboardingStepPayloadSchemas — Zod schema for each step's POST body
 * - parseOnboardingStep — validates and returns a step number from a URL param
 *
 * Step map (current):
 *  1  Company Basics
 *  2  Org Structure         ← NEW (Zoho-parity)
 *  3  Approval Mapping      ← NEW (Zoho-parity)
 *  4  Active Modules        ← NEW (Zoho-parity)
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
 * @module lib/onboarding-step-contract
 */

import type { ModuleSlug } from '@/lib/core-functions/catalog';

/** Total number of wizard steps. Must stay in sync with TOTAL_STEPS in app/onboarding/page.tsx. */
export const TOTAL_ONBOARDING_STEPS = 13;

/**
 * Optional module required for an onboarding step (undefined = always shown).
 */
export const ONBOARDING_STEP_MODULES: Record<number, ModuleSlug | undefined> = {
  1: undefined,
  2: undefined,
  3: undefined,
  4: undefined,
  5: undefined,
  6: 'leave',
  7: 'leave',
  8: 'attendance',
  9: 'leave',
  10: 'leave',
  11: 'payroll',
  12: undefined,
  13: undefined,
};

/** Returns step numbers that should be shown for the given enabled module slugs. */
export function filterOnboardingSteps(enabledSlugs: readonly ModuleSlug[]): number[] {
  const enabled = new Set(enabledSlugs);
  const steps: number[] = [];
  for (let step = 1; step <= TOTAL_ONBOARDING_STEPS; step += 1) {
    const required = ONBOARDING_STEP_MODULES[step];
    if (!required || enabled.has(required)) {
      steps.push(step);
    }
  }
  return steps;
}

// ─── Shared sub-schemas ───────────────────────────────────────────────────────

const roleSchema = z.object({
  name: z.string().min(1).max(80),
  slug: z.string().min(1).max(40).regex(/^[a-z_]+$/),
  authority_level: z.number().int().min(1).max(20),
  can_approve_leaves: z.boolean().optional(),
  can_create_users: z.boolean().optional(),
  color: z.string().max(30).optional(),
  description: z.string().max(300).optional(),
});

const capabilityOwnersSchema = z.object({
  peopleOperationsOwner: z
    .enum(['admin', 'hr', 'director', 'manager', 'team_lead', 'employee'])
    .optional(),
});

const leaveTypeSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(120),
  days: z.number().min(0).max(365).optional(),
  carry_forward: z.boolean().optional(),
  max_carry_forward: z.number().min(0).max(365).optional(),
  encashment_enabled: z.boolean().optional(),
  encashment_max_days: z.number().min(0).max(365).optional(),
  paid: z.boolean().optional(),
});

const holidaySchema = z.object({
  name: z.string().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  enabled: z.boolean().optional(),
  custom: z.boolean().optional(),
});

const roleQuotaSchema = z.object({
  role_slug: z.string().min(1).max(40),
  leave_type_code: z.string().min(1).max(20),
  annual_quota: z.number().min(0).max(365),
});

const companySchema = z.object({
  companyName: z.string().min(1).max(200).optional(),
  industry: z.string().max(100).optional(),
  employeeCount: z.string().max(50).optional(),
  country: z.string().max(5).optional(),
  timezone: z.string().max(80).optional(),
  slaHours: z.number().int().min(1).max(336).optional(),
  negativeBal: z.boolean().optional(),
  probationDays: z.number().int().min(0).max(730).optional(),
  workStart: z.string().optional(),
  workEnd: z.string().optional(),
  gracePeriodMinutes: z.number().int().min(0).max(120).optional(),
  halfDayHours: z.number().min(1).max(12).optional(),
});

const attendanceSchema = z.object({
  enabled: z.boolean().optional(),
  workHoursPerDay: z.number().min(1).max(24).optional(),
  checkInWindowStart: z.string().optional(),
  checkInWindowEnd: z.string().optional(),
  checkOutWindowStart: z.string().optional(),
  checkOutWindowEnd: z.string().optional(),
  gracePeriodMinutes: z.number().min(0).max(120).optional(),
  lateMarksToHalfDay: z.number().min(1).max(12).optional(),
  wfhAllowed: z.boolean().optional(),
  geoFencingEnabled: z.boolean().optional(),
  photoVerificationEnabled: z.boolean().optional(),
  workingDays: z.array(z.number().min(0).max(6)).optional(),
});

const aiRuleSchema = z.object({
  id: z.string().optional(),
  condition: z.string().min(1).max(300),
  escalateTo: z.string().min(1).max(80),
  priority: z.number().int().min(1).max(100).optional(),
});

const aiSchema = z.object({
  enabled: z.boolean().optional(),
  confidenceThreshold: z.number().min(0).max(1).optional(),
  autoApproveMaxDays: z.number().min(0).max(30).optional(),
  requireTeamCoverage: z.boolean().optional(),
  minTeamCoverage: z.number().min(0).max(100).optional(),
  autoEscalateTimeoutHours: z.number().min(1).max(168).optional(),
  escalationRules: z.array(aiRuleSchema).optional(),
});

const notificationsSchema = z.object({
  emailNotifications: z.boolean().optional(),
  managerAlerts: z.boolean().optional(),
  dailyDigest: z.boolean().optional(),
  slaAlerts: z.boolean().optional(),
});

const payrollSchema = z.object({
  pfEnabled: z.boolean().optional(),
  pfCeiling: z.number().min(0).max(1000000).optional(),
  esiEnabled: z.boolean().optional(),
  esiCeiling: z.number().min(0).max(1000000).optional(),
  ptEnabled: z.boolean().optional(),
  ptState: z.string().max(60).optional(),
  tdsEnabled: z.boolean().optional(),
  defaultTaxRegime: z.enum(['old', 'new']).optional(),
  lopCalculationMethod: z.enum(['calendar_days', 'working_days']).optional(),
  salaryPayDay: z.number().int().min(1).max(28).optional(),
  payrollCurrency: z.string().max(8).optional(),
});

// ─── New Zoho-parity step schemas ─────────────────────────────────────────────

/** Step 2: Org Structure */
const orgStructureSchema = z.object({
  orgStructure: z.object({
    departments: z.array(z.object({
      id: z.string().max(40),
      name: z.string().min(1).max(100),
      code: z.string().min(1).max(16),
      headRole: z.string().max(40),
    })).optional(),
    locations: z.array(z.object({
      id: z.string().max(40),
      name: z.string().min(1).max(100),
      city: z.string().max(100),
      country: z.string().max(100),
    })).optional(),
    costCenters: z.array(z.object({
      id: z.string().max(40),
      name: z.string().min(1).max(100),
      code: z.string().max(16),
    })).optional(),
    orgModel: z.enum(['flat', 'two_tier', 'full_hierarchy']).optional(),
  }).optional(),
});

/** Step 3: Approval Chain Mapping */
const approvalChainsSchema = z.object({
  approvalChains: z.array(z.object({
    workflowType: z.enum(['leave', 'expense', 'payroll_advance', 'travel']),
    level1Role: z.string().min(1).max(40),
    level2Role: z.string().min(1).max(40),
    autoApproveAfterHours: z.number().int().min(0).max(720),
  })).optional(),
});

/** Step 4: Module Enablement */
const modulesSchema = z.object({
  enabledModules: z.array(z.string().max(40)).optional(),
});

// ─── Master step schema map ────────────────────────────────────────────────────

/**
 * Maps each wizard step number to its Zod validation schema.
 * All schemas are intentionally permissive (most fields optional) because
 * the user can skip any step; strict validation happens at finalize.
 */
export const onboardingStepPayloadSchemas: Record<number, z.ZodTypeAny> = {
  1:  companySchema,
  2:  orgStructureSchema,
  3:  approvalChainsSchema,
  4:  modulesSchema,
  5:  z.object({ roles: z.array(roleSchema).min(1), capabilityOwners: capabilityOwnersSchema.optional() }),
  6:  z.object({ leaveTypes: z.array(leaveTypeSchema).min(1) }),
  7:  z.object({ roleQuotas: z.array(roleQuotaSchema).optional() }),
  8:  attendanceSchema,
  9:  z.object({ holidays: z.array(holidaySchema).optional() }),
  10: aiSchema,
  11: payrollSchema,
  12: notificationsSchema,
  13: z.object({ completed: z.boolean().optional() }).passthrough(),
};

/**
 * Parses and validates a step URL parameter.
 *
 * @param value - Raw string from the URL param (e.g. "3")
 * @returns The step as a number, or null if out of range or non-numeric
 */
export function parseOnboardingStep(value: string): number | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const step = Number(value);
  if (!Number.isInteger(step) || step < 1 || step > TOTAL_ONBOARDING_STEPS) {
    return null;
  }

  return step;
}
