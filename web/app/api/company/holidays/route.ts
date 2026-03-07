import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';

export const dynamic = 'force-dynamic';

/**
 * GET /api/company/holidays
 *
 * Returns upcoming public holidays for the authenticated user's company.
 * Includes both company-specific and national holidays (country_code=IN).
 */
export async function GET() {
  try {
    const employee = await getAuthEmployee();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const holidays = await prisma.publicHoliday.findMany({
      where: {
        OR: [
          { company_id: employee.org_id },
          { company_id: null, country_code: 'IN' },
        ],
        date: { gte: today },
      },
      orderBy: { date: 'asc' },
      take: 20,
      select: {
        id: true,
        name: true,
        date: true,
        country_code: true,
        is_custom: true,
      },
    });

    return NextResponse.json({ holidays });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
