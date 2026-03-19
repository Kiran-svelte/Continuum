import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const employee = await getAuthEmployee();
    const currentYear = new Date().getFullYear();

    let balances = await prisma.leaveBalance.findMany({
      where: {
        emp_id: employee.id,
        year: currentYear,
      },
      orderBy: { leave_type: 'asc' },
    });

    // INV-15: Auto-seed balances if none exist.
    // Only seed from company-configured leave types — the system is config-driven.
    if (balances.length === 0) {
      const companyLeaveTypes = await prisma.leaveType.findMany({
        where: {
          company_id: employee.org_id!,
          is_active: true,
          deleted_at: null,
        },
        select: { code: true, default_quota: true, gender_specific: true },
      });

      // Only seed if the company has configured leave types (onboarding completed)
      if (companyLeaveTypes.length > 0) {
        // Filter by gender if applicable
        const empGender = employee.gender ?? 'other';
        const typesToSeed = companyLeaveTypes.filter((lt) => {
          if (!lt.gender_specific || lt.gender_specific === 'all') return true;
          if (empGender === 'other') return true;
          return lt.gender_specific === empGender;
        });

        const seedData = typesToSeed.map((lt) => ({
          emp_id: employee.id,
          company_id: employee.org_id!,
          leave_type: lt.code,
          year: currentYear,
          annual_entitlement: lt.default_quota,
          carried_forward: 0,
          used_days: 0,
          pending_days: 0,
          encashed_days: 0,
          remaining: lt.default_quota,
        }));

        await prisma.leaveBalance.createMany({ data: seedData, skipDuplicates: true });

        balances = await prisma.leaveBalance.findMany({
          where: { emp_id: employee.id, year: currentYear },
          orderBy: { leave_type: 'asc' },
        });
      }
    }

    // Compute remaining for each balance
    const result = balances.map((b) => ({
      ...b,
      remaining:
        b.annual_entitlement +
        b.carried_forward -
        b.used_days -
        b.pending_days -
        b.encashed_days,
    }));

    return NextResponse.json({ year: currentYear, balances: result });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
