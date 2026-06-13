/**
 * API-level company setup guard.
 * Implements L5-01-006: assertCompanySetupComplete throws 403 if company
 * onboarding is not complete. Apply this to all mutating HR routes.
 *
 * This is distinct from web/lib/company-settings-guard.ts which is a Prisma
 * middleware guard for CompanySettings write fields.
 */
import { AuthError } from '@/lib/auth-guard';
import prisma from '@/lib/prisma';

/**
 * Standardized API response body for company setup incomplete (L5-01-006).
 * Routes can spread this into NextResponse.json().
 */
export const COMPANY_SETUP_INCOMPLETE_RESPONSE = {
  error: {
    code: 'COMPANY_SETUP_INCOMPLETE',
    message: 'Complete company setup before using HR features.',
  },
} as const;

/**
 * Asserts that the company has completed onboarding.
 * Throws AuthError(403) if company.onboarding_completed is false.
 *
 * @param company - Object with onboarding_completed flag.
 * @throws AuthError 403 if onboarding not complete.
 */
export function assertCompanySetupComplete(
  company: { onboarding_completed: boolean }
): void {
  if (!company.onboarding_completed) {
    throw new AuthError(
      COMPANY_SETUP_INCOMPLETE_RESPONSE.error.message,
      403
    );
  }
}

/**
 * Fetches company by orgId and asserts it has completed setup.
 * Convenience wrapper for API routes that only have orgId available.
 *
 * @param orgId - Company UUID from employee.org_id.
 * @throws AuthError 400 if company not found.
 * @throws AuthError 403 if setup is incomplete.
 */
export async function requireCompanySetupComplete(orgId: string): Promise<void> {
  const company = await prisma.company.findUnique({
    where: { id: orgId },
    select: { onboarding_completed: true },
  });

  if (!company) {
    throw new AuthError('Company not found for user', 400);
  }

  assertCompanySetupComplete(company);
}
