import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const employee = await getAuthEmployee();
    const currentYear = new Date().getFullYear();

    // Get current month range for filtering
    const startOfMonth = new Date(currentYear, new Date().getMonth(), 1);
    const endOfMonth = new Date(currentYear, new Date().getMonth() + 1, 0);
    
    // Parallel queries for better performance
    const [
      leaveBalances,
      upcomingLeaves,
      pendingRequests,
      monthlyUsage,
      totalNotifications,
      recentLeaveHistory
    ] = await Promise.all([
      // Leave balances for current year
      prisma.leaveBalance.findMany({
        where: {
          emp_id: employee.id,
          year: currentYear,
        },
        orderBy: { leave_type: 'asc' },
      }),

      // Upcoming approved leaves (next 30 days)
      prisma.leaveRequest.findMany({
        where: {
          emp_id: employee.id,
          status: 'approved',
          start_date: {
            gte: new Date(),
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next 30 days
          },
        },
        orderBy: { start_date: 'asc' },
      }),

      // Pending requests (all time)
      prisma.leaveRequest.count({
        where: {
          emp_id: employee.id,
          status: 'pending',
        },
      }),

      // Current month usage
      prisma.leaveRequest.aggregate({
        where: {
          emp_id: employee.id,
          status: { in: ['approved', 'pending'] },
          OR: [
            {
              // Leave starts this month
              start_date: {
                gte: startOfMonth,
                lte: endOfMonth,
              },
            },
            {
              // Leave ends this month
              end_date: {
                gte: startOfMonth,
                lte: endOfMonth,
              },
            },
            {
              // Leave spans this month
              AND: [
                { start_date: { lt: startOfMonth } },
                { end_date: { gt: endOfMonth } },
              ],
            },
          ],
        },
        _sum: {
          total_days: true,
        },
      }),

      // Count unread notifications for current employee
      employee.org_id
        ? prisma.notification.count({
            where: {
              company_id: employee.org_id,
              emp_id: employee.id,
              is_read: false,
            },
          })
        : Promise.resolve(0),

      // Recent leave history (last 5 requests)
      prisma.leaveRequest.findMany({
        where: {
          emp_id: employee.id,
        },
        orderBy: { created_at: 'desc' },
        take: 5,
      }),
    ]);

    // Calculate total leave balance
    const totalLeaveBalance = leaveBalances.reduce((sum, balance) => {
      const remaining = balance.annual_entitlement + balance.carried_forward - 
                       balance.used_days - balance.pending_days - balance.encashed_days;
      return sum + Math.max(0, remaining);
    }, 0);

    // Calculate upcoming leaves count and days
    const upcomingLeaveDays = upcomingLeaves.reduce((sum, leave) => sum + leave.total_days, 0);

    // Calculate this month's usage
    const thisMonthUsage = monthlyUsage._sum.total_days || 0;

    // Format KPI data
    const kpis = {
      leaveBalance: {
        value: Math.round(totalLeaveBalance * 10) / 10,
        label: 'Available Leave Days',
        trend: totalLeaveBalance > 10 ? 'positive' : totalLeaveBalance > 5 ? 'neutral' : 'negative',
        breakdown: leaveBalances.map(balance => ({
          type: balance.leave_type,
          remaining: Math.max(0, balance.annual_entitlement + balance.carried_forward - 
                                 balance.used_days - balance.pending_days - balance.encashed_days),
          total: balance.annual_entitlement,
        })),
      },
      upcomingLeaves: {
        value: upcomingLeaves.length,
        label: 'Upcoming Leaves',
        trend: 'neutral',
        details: {
          totalDays: upcomingLeaveDays,
          nextLeave: upcomingLeaves.length > 0 ? upcomingLeaves[0] : null,
        },
      },
      pendingRequests: {
        value: pendingRequests,
        label: 'Pending Requests',
        trend: pendingRequests > 0 ? 'warning' : 'positive',
      },
      monthlyUsage: {
        value: Math.round(thisMonthUsage * 10) / 10,
        label: 'This Month Usage',
        trend: thisMonthUsage > 5 ? 'negative' : thisMonthUsage > 2 ? 'neutral' : 'positive',
      },
    };

    // Format recent leave history
    const recentHistory = recentLeaveHistory.map(request => ({
      id: request.id,
      leave_type: request.leave_type,
      start_date: request.start_date,
      end_date: request.end_date,
      total_days: request.total_days,
      status: request.status,
      created_at: request.created_at,
      reason: request.reason,
    }));

    return NextResponse.json({
      kpis,
      recentHistory,
      notifications: {
        unreadCount: totalNotifications,
      },
    });

  } catch (error) {
    console.error('Dashboard KPIs API Error:', error);
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}