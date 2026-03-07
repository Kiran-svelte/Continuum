import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';
import { LEAVE_TYPE_CATALOG } from '@/lib/leave-types-config';

export const dynamic = 'force-dynamic';

/**
 * GET /api/company/leave-types
 *
 * Returns the active leave types configured for the authenticated employee's
 * company. Falls back to the global catalog defaults when no company-specific
 * types are found (e.g. during initial onboarding).
 *
 * Response shape:
 *   { leaveTypes: [{ code, name, defaultQuota, carryForward, paid, genderSpecific }] }
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

    if (dbTypes.length > 0) {
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
      });
    }

    // Fallback: return full catalog so employees always have leave types available
    return NextResponse.json({
      leaveTypes: LEAVE_TYPE_CATALOG.map((t) => ({
        code: t.code,
        name: t.name,
        defaultQuota: t.defaultQuota,
        carryForward: t.carryForward,
        paid: t.paid,
        genderSpecific: t.genderSpecific,
        category: t.category,
      })),
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
