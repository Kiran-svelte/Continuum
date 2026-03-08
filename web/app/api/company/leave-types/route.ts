import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';

export const dynamic = 'force-dynamic';

/**
 * GET /api/company/leave-types
 *
 * Returns the active leave types configured for the authenticated employee's
 * company.  The system is fully config-driven: leave types MUST be set up
 * during onboarding.  If no company-specific types exist the response
 * returns an empty array — the UI should prompt the admin to complete
 * onboarding rather than falling back to a hardcoded catalog.
 *
 * Response shape:
 *   { leaveTypes: [{ code, name, defaultQuota, carryForward, paid, genderSpecific, category }], configured: boolean }
 */
export async function GET() {
  try {
    const employee = await getAuthEmployee();

    const dbTypes = await prisma.leaveType.findMany({
      where: {
        company_id: employee.org_id,
        is_active: true,
        deleted_at: null,
      },
      orderBy: { code: 'asc' },
      select: {
        code: true,
        name: true,
        default_quota: true,
        carry_forward: true,
        paid: true,
        gender_specific: true,
        category: true,
      },
    });

    return NextResponse.json({
      leaveTypes: dbTypes.map((t) => ({
        code: t.code,
        name: t.name,
        defaultQuota: t.default_quota,
        carryForward: t.carry_forward,
        paid: t.paid,
        genderSpecific: t.gender_specific ?? 'all',
        category: t.category,
      })),
      configured: dbTypes.length > 0,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
