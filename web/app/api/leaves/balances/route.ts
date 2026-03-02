import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';
import { getDefaultLeaveTypes } from '@/lib/leave-types-config';

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

    // INV-15: Auto-seed balances if none exist
    if (balances.length === 0) {
      const defaults = getDefaultLeaveTypes();
      const seedData = defaults.map((lt) => ({
        emp_id: employee.id,
        company_id: employee.org_id,
        leave_type: lt.code,
        year: currentYear,
        annual_entitlement: lt.defaultQuota,
        carried_forward: 0,
        used_days: 0,
        pending_days: 0,
        encashed_days: 0,
        remaining: lt.defaultQuota,
      }));

      await prisma.leaveBalance.createMany({ data: seedData });

      balances = await prisma.leaveBalance.findMany({
        where: { emp_id: employee.id, year: currentYear },
        orderBy: { leave_type: 'asc' },
      });
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
