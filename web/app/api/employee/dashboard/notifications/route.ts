import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';

export const dynamic = 'force-dynamic';

type NotificationPriority = 'high' | 'medium' | 'low';

type DashboardNotification = {
  id: string;
  type: 'pending_request' | 'leave_reminder' | 'low_balance' | 'holiday' | 'status_update';
  priority: NotificationPriority;
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  actionUrl: string | null;
  data: Record<string, unknown>;
};

export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const unreadOnly = searchParams.get('unread') === 'true';

    // Build notification-like alerts from different sources
    const currentDate = new Date();
    const thirtyDaysFromNow = new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Get various alerts/notifications in parallel
    const [
      pendingLeaveRequests,
      upcomingLeaveReminders,
      lowLeaveBalanceAlerts,
      upcomingCompanyHolidays,
      recentLeaveStatusUpdates
    ] = await Promise.all([
      // Pending leave requests (user's own)
      prisma.leaveRequest.findMany({
        where: {
          emp_id: employee.id,
          status: 'pending',
        },
        orderBy: { created_at: 'desc' },
        take: 5,
      }),

      // Upcoming approved leaves (reminders)
      prisma.leaveRequest.findMany({
        where: {
          emp_id: employee.id,
          status: 'approved',
          start_date: {
            gte: currentDate,
            lte: new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
          },
        },
        orderBy: { start_date: 'asc' },
      }),

      // Low leave balances (less than 5 days remaining)
      prisma.leaveBalance.findMany({
        where: {
          emp_id: employee.id,
          year: currentDate.getFullYear(),
        },
      }),

      // Upcoming company holidays
      prisma.publicHoliday.findMany({
        where: {
          company_id: employee.org_id,
          date: {
            gte: currentDate,
            lte: thirtyDaysFromNow,
          },
        },
        orderBy: { date: 'asc' },
        take: 3,
      }),

      // Recent leave status updates (last 7 days)
      prisma.leaveRequest.findMany({
        where: {
          emp_id: employee.id,
          status: { in: ['approved', 'rejected'] },
          updated_at: {
            gte: new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { updated_at: 'desc' },
        take: 5,
      }),
    ]);

    // Build notifications array
    const notifications: DashboardNotification[] = [];

    // Add pending request notifications
    pendingLeaveRequests.forEach(request => {
      notifications.push({
        id: `pending-${request.id}`,
        type: 'pending_request',
        priority: 'medium',
        title: 'Leave Request Pending',
        message: `Your ${request.leave_type} request from ${new Date(request.start_date).toLocaleDateString()} is awaiting approval`,
        timestamp: request.created_at,
        isRead: false,
        actionUrl: `/employee/leave-history?highlight=${request.id}`,
        data: {
          requestId: request.id,
          leaveType: request.leave_type,
          startDate: request.start_date,
          endDate: request.end_date,
        },
      });
    });

    // Add upcoming leave reminders
    upcomingLeaveReminders.forEach(request => {
      const daysUntil = Math.ceil((new Date(request.start_date).getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      notifications.push({
        id: `reminder-${request.id}`,
        type: 'leave_reminder',
        priority: daysUntil <= 1 ? 'high' : 'low',
        title: daysUntil === 0 ? 'Leave Starts Today' : daysUntil === 1 ? 'Leave Starts Tomorrow' : 'Upcoming Leave',
        message: `Your ${request.leave_type} leave ${daysUntil === 0 ? 'starts today' : `starts in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`}`,
        timestamp: new Date(),
        isRead: false,
        actionUrl: `/employee/leave-history?highlight=${request.id}`,
        data: {
          requestId: request.id,
          leaveType: request.leave_type,
          startDate: request.start_date,
          endDate: request.end_date,
          daysUntil,
        },
      });
    });

    // Add low balance alerts
    lowLeaveBalanceAlerts.forEach(balance => {
      const remaining = balance.annual_entitlement + balance.carried_forward - 
                       balance.used_days - balance.pending_days - balance.encashed_days;
      if (remaining <= 5 && remaining > 0) {
        notifications.push({
          id: `low-balance-${balance.id}`,
          type: 'low_balance',
          priority: remaining <= 2 ? 'high' : 'medium',
          title: 'Low Leave Balance',
          message: `You have only ${remaining} ${balance.leave_type} days remaining`,
          timestamp: new Date(),
          isRead: false,
          actionUrl: '/employee/request-leave',
          data: {
            leaveType: balance.leave_type,
            remaining,
            total: balance.annual_entitlement,
          },
        });
      }
    });

    // Add holiday notifications
    upcomingCompanyHolidays.forEach(holiday => {
      const daysUntil = Math.ceil((new Date(holiday.date).getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil <= 7) {
        notifications.push({
          id: `holiday-${holiday.id}`,
          type: 'holiday',
          priority: 'low',
          title: daysUntil === 0 ? 'Holiday Today' : daysUntil === 1 ? 'Holiday Tomorrow' : 'Upcoming Holiday',
          message: `${holiday.name} ${daysUntil === 0 ? 'is today' : daysUntil === 1 ? 'is tomorrow' : `is in ${daysUntil} days`}`,
          timestamp: new Date(),
          isRead: false,
          actionUrl: null,
          data: {
            holidayId: holiday.id,
            holidayName: holiday.name,
            holidayDate: holiday.date,
            daysUntil,
          },
        });
      }
    });

    // Add recent status updates
    recentLeaveStatusUpdates.forEach(request => {
      notifications.push({
        id: `status-${request.id}`,
        type: 'status_update',
        priority: request.status === 'rejected' ? 'high' : 'medium',
        title: request.status === 'approved' ? 'Leave Request Approved' : 'Leave Request Rejected',
        message: `Your ${request.leave_type} request from ${new Date(request.start_date).toLocaleDateString()} has been ${request.status}`,
        timestamp: request.updated_at,
        isRead: false,
        actionUrl: `/employee/leave-history?highlight=${request.id}`,
        data: {
          requestId: request.id,
          leaveType: request.leave_type,
          status: request.status,
          startDate: request.start_date,
          endDate: request.end_date,
          approverComments: request.approver_comments,
        },
      });
    });

    // Sort by priority and timestamp
    const priorityOrder: Record<NotificationPriority, number> = { high: 3, medium: 2, low: 1 };
    notifications.sort((a, b) => {
      if (a.priority !== b.priority) {
        return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    // Apply filters and limit
    let filteredNotifications = notifications;
    if (unreadOnly) {
      filteredNotifications = notifications.filter(n => !n.isRead);
    }
    
    const limitedNotifications = filteredNotifications.slice(0, limit);

    // Summary counts
    const summary = {
      total: notifications.length,
      unread: notifications.filter(n => !n.isRead).length,
      highPriority: notifications.filter(n => n.priority === 'high').length,
      byType: {
        pending_request: notifications.filter(n => n.type === 'pending_request').length,
        leave_reminder: notifications.filter(n => n.type === 'leave_reminder').length,
        low_balance: notifications.filter(n => n.type === 'low_balance').length,
        holiday: notifications.filter(n => n.type === 'holiday').length,
        status_update: notifications.filter(n => n.type === 'status_update').length,
      },
    };

    return NextResponse.json({
      notifications: limitedNotifications,
      summary,
      hasMore: filteredNotifications.length > limit,
    });

  } catch (error) {
    console.error('Dashboard Notifications API Error:', error);
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Mark notification as read
export async function PATCH(request: NextRequest) {
  try {
    await getAuthEmployee();
    const body = await request.json();
    const { notificationId, isRead = true } = body;

    // For now, we'll just return success since we're generating notifications dynamically
    // In a real system, you'd store notification read states
    
    return NextResponse.json({ 
      success: true, 
      notificationId,
      isRead,
    });

  } catch (error) {
    console.error('Mark Notification Read API Error:', error);
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
