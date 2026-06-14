/**
 * Attendance Rules Engine for Continuum HR.
 *
 * Evaluates attendance events against company-configured attendance policies.
 * Rules supported: late detection, half-day auto-marking, overtime, consecutive-absent alerts.
 *
 * Design: Pure functions only — no side-effects. Callers are responsible for persistence.
 *
 * @module lib/attendance-rules-engine
 */

import type { AttendancePolicy, AttendanceStatus } from '@prisma/client';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Minutes in a standard workday used for normalisation. */
const MINUTES_PER_HOUR = 60;

/** OT rate for overtime calculation (fallback when policy not set). */
const DEFAULT_OT_MULTIPLIER = 1.5;

// ─── Types ───────────────────────────────────────────────────────────────────

/** Result of evaluating a check-in event. */
export interface CheckInEvaluation {
  /** Whether the employee is late. */
  isLate: boolean;
  /** Minutes late relative to shift start. 0 if on time. */
  minutesLate: number;
  /** Computed attendance status for the day. */
  computedStatus: AttendanceStatus;
}

/** Result of evaluating a check-out event. */
export interface CheckOutEvaluation {
  /** Total hours worked (decimal). */
  hoursWorked: number;
  /** Whether this qualifies as a half-day. */
  isHalfDay: boolean;
  /** Whether overtime applies. */
  hasOvertime: boolean;
  /** Overtime hours (0 if none). */
  overtimeHours: number;
  /** Final attendance status after full-day computation. */
  computedStatus: AttendanceStatus;
}

/** Result of evaluating consecutive absences. */
export interface AbsenceAlertEvaluation {
  /** Whether alert threshold is reached. */
  shouldAlert: boolean;
  /** Count of consecutive absent days. */
  consecutiveAbsences: number;
  /** Suggested action label. */
  suggestedAction: string;
}

/** Minimal attendance record used for consecutive-absence check. */
export interface AttendanceRecord {
  date: Date;
  status: AttendanceStatus;
}

/** Policy shape — mirrors the Prisma AttendancePolicy model. */
export type PolicyInput = Pick<
  AttendancePolicy,
  | 'late_threshold_minutes'
  | 'half_day_threshold_minutes'
  | 'lates_for_half_day'
  | 'lates_for_absent'
  | 'overtime_enabled'
  | 'overtime_rate_multiplier'
  | 'overtime_daily_cap_hours'
  | 'auto_checkout_enabled'
  | 'auto_checkout_time'
>;

// ─── Default Policy Fallback ──────────────────────────────────────────────────

/**
 * Returns a safe default policy when a company has no AttendancePolicy configured.
 *
 * @returns A policy object with conservative defaults.
 */
export function getDefaultPolicy(): PolicyInput {
  return {
    late_threshold_minutes: 15,
    half_day_threshold_minutes: 240,
    lates_for_half_day: 3,
    lates_for_absent: 6,
    overtime_enabled: false,
    overtime_rate_multiplier: DEFAULT_OT_MULTIPLIER,
    overtime_daily_cap_hours: 2,
    auto_checkout_enabled: false,
    auto_checkout_time: null,
  };
}

// ─── Core Engine Functions ────────────────────────────────────────────────────

/**
 * Evaluates a check-in event against the attendance policy.
 *
 * @param checkInTime - Actual check-in time (UTC).
 * @param shiftStartTime - Expected shift start time (UTC).
 * @param policy - Company attendance policy.
 * @returns CheckInEvaluation with lateness and status.
 */
export function evaluateCheckIn(
  checkInTime: Date,
  shiftStartTime: Date,
  policy: PolicyInput
): CheckInEvaluation {
  const minutesLate = calculateMinutesDelta(checkInTime, shiftStartTime);
  const isLate = minutesLate > policy.late_threshold_minutes;

  return {
    isLate,
    minutesLate: Math.max(0, minutesLate),
    computedStatus: isLate ? 'late' : 'present',
  };
}

/**
 * Evaluates a check-out event to compute hours worked, half-day, and overtime.
 *
 * @param checkInTime - Actual check-in time (UTC).
 * @param checkOutTime - Actual check-out time (UTC).
 * @param shiftEndTime - Expected shift end time (UTC).
 * @param policy - Company attendance policy.
 * @returns CheckOutEvaluation with hours and overtime.
 */
export function evaluateCheckOut(
  checkInTime: Date,
  checkOutTime: Date,
  shiftEndTime: Date,
  policy: PolicyInput
): CheckOutEvaluation {
  const hoursWorked = calculateHoursWorked(checkInTime, checkOutTime);
  const minutesWorked = hoursWorked * MINUTES_PER_HOUR;

  const isHalfDay = minutesWorked < policy.half_day_threshold_minutes;
  const { hasOvertime, overtimeHours } = computeOvertime(
    checkOutTime,
    shiftEndTime,
    policy
  );

  const computedStatus = resolveEndOfDayStatus(isHalfDay);

  return { hoursWorked, isHalfDay, hasOvertime, overtimeHours, computedStatus };
}

/**
 * Evaluates consecutive absences to determine if an HR alert is needed.
 * Scans backward from today through the provided records.
 *
 * @param records - Recent attendance records in ascending date order.
 * @returns AbsenceAlertEvaluation with alert flag and count.
 */
export function evaluateConsecutiveAbsences(
  records: AttendanceRecord[]
): AbsenceAlertEvaluation {
  const sorted = [...records].sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );

  let consecutiveAbsences = 0;
  for (const record of sorted) {
    if (record.status === 'absent') {
      consecutiveAbsences++;
    } else {
      break;
    }
  }

  const shouldAlert = consecutiveAbsences >= 3;
  const suggestedAction = resolveSuggestedAction(consecutiveAbsences);

  return { shouldAlert, consecutiveAbsences, suggestedAction };
}

/**
 * Determines how many late arrivals count toward deductions this month.
 * Applies policy: N lates = 1 half-day, M lates = 1 absent.
 *
 * @param lateCountThisMonth - Number of late arrivals in the current month.
 * @param policy - Company attendance policy.
 * @returns Object with half-day and absent deduction counts.
 */
export function calculateLateDeductions(
  lateCountThisMonth: number,
  policy: PolicyInput
): { halfDayDeductions: number; absentDeductions: number } {
  const halfDayDeductions = Math.floor(
    lateCountThisMonth / policy.lates_for_half_day
  );
  const absentDeductions = Math.floor(
    lateCountThisMonth / policy.lates_for_absent
  );
  return { halfDayDeductions, absentDeductions };
}

/**
 * Determines if an auto-checkout should be triggered for a given time.
 * Used by the cron job to auto-close attendance records at configured EOD.
 *
 * @param now - Current time (UTC).
 * @param policy - Company attendance policy.
 * @returns true if auto-checkout should fire.
 */
export function shouldAutoCheckout(now: Date, policy: PolicyInput): boolean {
  if (!policy.auto_checkout_enabled || !policy.auto_checkout_time) {
    return false;
  }

  const [hours, minutes] = policy.auto_checkout_time.split(':').map(Number);
  const threshold = new Date(now);
  threshold.setUTCHours(hours, minutes, 0, 0);

  return now >= threshold;
}

// ─── Private Helpers ─────────────────────────────────────────────────────────

/**
 * Calculates the signed minute delta between actual and expected time.
 * Positive = late, negative = early.
 */
function calculateMinutesDelta(actual: Date, expected: Date): number {
  return Math.round((actual.getTime() - expected.getTime()) / (1000 * 60));
}

/**
 * Calculates hours worked between check-in and check-out.
 */
function calculateHoursWorked(checkIn: Date, checkOut: Date): number {
  const ms = checkOut.getTime() - checkIn.getTime();
  return Math.max(0, ms / (1000 * 60 * 60));
}

/**
 * Computes overtime hours given check-out and shift-end times.
 * Caps at policy.overtime_daily_cap_hours.
 */
function computeOvertime(
  checkOutTime: Date,
  shiftEndTime: Date,
  policy: PolicyInput
): { hasOvertime: boolean; overtimeHours: number } {
  if (!policy.overtime_enabled) {
    return { hasOvertime: false, overtimeHours: 0 };
  }

  const rawOtMinutes = calculateMinutesDelta(checkOutTime, shiftEndTime);
  if (rawOtMinutes <= 0) {
    return { hasOvertime: false, overtimeHours: 0 };
  }

  const rawOtHours = rawOtMinutes / MINUTES_PER_HOUR;
  const cappedOtHours = Math.min(rawOtHours, policy.overtime_daily_cap_hours);

  return { hasOvertime: true, overtimeHours: cappedOtHours };
}

/**
 * Resolves final attendance status from half-day flag.
 */
function resolveEndOfDayStatus(isHalfDay: boolean): AttendanceStatus {
  return isHalfDay ? 'half_day' : 'present';
}

/**
 * Returns a human-readable suggested HR action based on consecutive absences.
 */
function resolveSuggestedAction(consecutiveAbsences: number): string {
  if (consecutiveAbsences >= 7) return 'Initiate disciplinary review';
  if (consecutiveAbsences >= 5) return 'Escalate to HR director';
  if (consecutiveAbsences >= 3) return 'Send wellness check notification';
  return 'Monitor';
}
