import type { Prisma } from '@prisma/client';

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

export class LeaveWorkflowError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'LeaveWorkflowError';
    this.status = status;
  }
}

export function getTodayDateKey(reference = new Date()): string {
  return reference.toISOString().slice(0, 10);
}

export function getLeaveDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isDateKeyValid(dateKey: string): boolean {
  return DATE_KEY_PATTERN.test(dateKey);
}

export function isPastDateKey(dateKey: string, todayKey = getTodayDateKey()): boolean {
  return dateKey < todayKey;
}

export function canProcessLeaveApproval(status: string): boolean {
  return status === 'pending' || status === 'escalated';
}

export function parseLeaveDateKey(dateKey: string, fieldName: string): Date {
  if (!isDateKeyValid(dateKey)) {
    throw new LeaveWorkflowError(400, `${fieldName} must be in YYYY-MM-DD format`);
  }

  return new Date(`${dateKey}T00:00:00Z`);
}

export function getLeaveBalanceYear(date: Date): number {
  return date.getUTCFullYear();
}

export function calculateLeaveDays(startDateKey: string, endDateKey: string, isHalfDay: boolean): number {
  const startDate = parseLeaveDateKey(startDateKey, 'start_date');
  const endDate = parseLeaveDateKey(endDateKey, 'end_date');
  const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / DAY_MS) + 1;
  return isHalfDay ? 0.5 : diffDays;
}

export function validateLeaveDateRange(
  startDateKey: string,
  endDateKey: string,
  options?: { allowPastStartDate?: boolean; todayKey?: string }
): { startDate: Date; endDate: Date; todayKey: string } {
  const todayKey = options?.todayKey ?? getTodayDateKey();
  const startDate = parseLeaveDateKey(startDateKey, 'start_date');
  const endDate = parseLeaveDateKey(endDateKey, 'end_date');

  if (startDateKey > endDateKey) {
    throw new LeaveWorkflowError(400, 'end_date must be on or after start_date');
  }

  if (!options?.allowPastStartDate && isPastDateKey(startDateKey, todayKey)) {
    throw new LeaveWorkflowError(400, 'start_date cannot be in the past');
  }

  return { startDate, endDate, todayKey };
}

export function createConstraintEngineFallback() {
  return {
    passed: true,
    violations: [],
    warnings: [
      {
        rule_id: 'SYSTEM',
        name: 'Manual Review Required',
        message: 'Constraint engine was unavailable. Request will be escalated for manual review.',
        is_blocking: false,
      },
    ],
    recommendation: 'MANUAL_REVIEW',
    confidence_score: 0.5,
  };
}

/**
 * Resolve and sanitize the constraint engine URL from environment variables.
 * Handles accidental wrapping quotes/newlines from env injection scripts.
 */
export function resolveConstraintEngineUrl(): string | null {
  const raw =
    process.env.CONSTRAINT_ENGINE_URL ??
    process.env.NEXT_PUBLIC_CONSTRAINT_ENGINE_URL ??
    '';

  const normalized = raw
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .replace(/[\r\n]/g, '')
    .replace(/\/+$/, '');

  if (!normalized) {
    return null;
  }

  if (!/^https?:\/\//i.test(normalized)) {
    return null;
  }

  if (process.env.NODE_ENV === 'production') {
    try {
      const parsed = new URL(normalized);
      const isLocalhost =
        parsed.hostname === 'localhost' ||
        parsed.hostname === '127.0.0.1' ||
        parsed.hostname === '::1';
      if (parsed.protocol !== 'https:' && !isLocalhost) {
        return null;
      }
    } catch {
      return null;
    }
  }

  return normalized;
}

export async function updateLeaveBalanceWithConcurrencyCheck(
  tx: Prisma.TransactionClient,
  params: {
    empId: string;
    leaveType: string;
    year: number;
    data: Prisma.LeaveBalanceUpdateManyMutationInput;
    notFoundMessage?: string;
  }
): Promise<void> {
  const balance = await tx.leaveBalance.findUnique({
    where: {
      emp_id_leave_type_year: {
        emp_id: params.empId,
        leave_type: params.leaveType,
        year: params.year,
      },
    },
    select: {
      updated_at: true,
    },
  });

  if (!balance) {
    throw new LeaveWorkflowError(409, params.notFoundMessage ?? 'Leave balance not found for the request year');
  }

  const updateResult = await tx.leaveBalance.updateMany({
    where: {
      emp_id: params.empId,
      leave_type: params.leaveType,
      year: params.year,
      updated_at: balance.updated_at,
    },
    data: {
      ...params.data,
      updated_at: new Date(),
    },
  });

  if (updateResult.count === 0) {
    throw new LeaveWorkflowError(409, 'Leave balance was modified concurrently; please retry');
  }
}
