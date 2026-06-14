import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireCompanyContext } from '@/lib/auth-guard';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthEmployee(request);
    requireCompanyContext(user);

    const empId = user.id; const companyId = user.org_id;

    // Fetch in parallel
    const [balances, upcomingLeaves, companyHolidays] = await Promise.all([
      // 1. Leave Balances
      prisma.leaveBalance.findMany({
        where: { emp_id: empId, company_id: companyId, year: new Date().getFullYear() },
      }),

      // 2. Upcoming Leaves
      prisma.leaveRequest.findMany({
        where: {
          emp_id: empId,
          company_id: companyId,
          start_date: { gte: new Date() },
          status: { in: ['approved', 'pending'] }
        },
        orderBy: { start_date: 'asc' },
        take: 3,
      }),

      // 3. Upcoming Company Holidays
      prisma.publicHoliday.findMany({
        where: {
          company_id: companyId, // Might be null for national holidays in some models, but we'll fetch explicitly assigned ones + global ones
          date: { gte: new Date() }
        },
        orderBy: { date: 'asc' },
        take: 3
      })
    ]);

    // Format the response
    const formattedBalances = balances.map((b) => ({
      id: b.id,
      typeName: b.leave_type,
      typeCode: b.leave_type,
      total: b.annual_entitlement + b.carried_forward,
      used: b.used_days,
      pending: b.pending_days,
      available: b.remaining,
    }));

    return NextResponse.json({
      balances: formattedBalances,
      upcomingLeaves: upcomingLeaves.map(ul => ({
        id: ul.id,
        leaveTypeName: ul.leave_type,
        startDate: ul.start_date,
        endDate: ul.end_date,
        status: ul.status,
        days: ul.total_days
      })),
      upcomingHolidays: companyHolidays.map(h => ({
        id: h.id,
        name: h.name,
        date: h.date,
        isCustom: h.is_custom
      }))
    });

  } catch (error) {
    console.error('Error fetching employee dashboard summary:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

