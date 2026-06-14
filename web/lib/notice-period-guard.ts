/**
 * Notice period guard.
 *
 * Prevents employees in notice period (status = 'resigned') from submitting
 * new leave requests, reimbursements, or other entitlement claims.
 *
 * Resigned employees can still:
 * - Log in and view dashboards
 * - View payslips and attendance
 * - Clock in/out (they're still working during notice)
 * - Complete exit checklist items
 *
 * @module notice-period-guard
 */

import { AuthError } from '@/lib/auth-guard';

/** Employee statuses that indicate the employee is leaving the company */
const NOTICE_PERIOD_STATUSES = ['resigned'] as const;

/**
 * Checks if an employee is in their notice period.
 *
 * @param employee - The authenticated employee
 * @returns true if the employee has resigned and is serving notice
 */
export function isInNoticePeriod(employee: { status: string }): boolean {
  return NOTICE_PERIOD_STATUSES.includes(
    employee.status as (typeof NOTICE_PERIOD_STATUSES)[number]
  );
}

/**
 * Throws AuthError if the employee is in notice period.
 * Use in routes where new entitlement requests should be blocked.
 *
 * @param employee - The authenticated employee
 * @throws AuthError with status 403 if the employee is in notice period
 */
export function requireNotInNoticePeriod(employee: { status: string }): void {
  if (isInNoticePeriod(employee)) {
    throw new AuthError(
      'You cannot submit new requests during your notice period. Please contact HR for assistance.',
      403
    );
  }
}
