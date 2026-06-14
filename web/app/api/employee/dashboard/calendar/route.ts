import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';

export const dynamic = 'force-dynamic';

type LeaveCalendarEvent = {
  id: string;
  type: 'leave';
  title: string;
  status: string;
  isHalfDay: boolean;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
};

type HolidayCalendarEvent = {
  id: string;
  type: 'holiday';
  title: string;
  isCustom: boolean;
  date: Date;
};

type CalendarEvent = LeaveCalendarEvent | HolidayCalendarEvent;

type CalendarDateEntry = {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  events: CalendarEvent[];
};

export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();
    const { searchParams } = new URL(request.url);
    
    // Get month and year from query params, default to current month
    const currentDate = new Date();
    const month = parseInt(searchParams.get('month') || String(currentDate.getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(currentDate.getFullYear()));

    // Calculate month boundaries
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);

    // Get all dates for the month (including surrounding dates for calendar view)
    const startOfCalendar = new Date(startOfMonth);
    startOfCalendar.setDate(startOfCalendar.getDate() - startOfCalendar.getDay()); // Start from Sunday

    const endOfCalendar = new Date(endOfMonth);
    endOfCalendar.setDate(endOfCalendar.getDate() + (6 - endOfCalendar.getDay())); // End on Saturday

    // Parallel queries for performance
    const [employeeLeaves, companyHolidays] = await Promise.all([
      // Employee's approved and pending leaves for the calendar period
      prisma.leaveRequest.findMany({
        where: {
          emp_id: employee.id,
          status: { in: ['approved', 'pending'] },
          OR: [
            {
              // Leave starts within calendar view
              start_date: {
                gte: startOfCalendar,
                lte: endOfCalendar,
              },
            },
            {
              // Leave ends within calendar view
              end_date: {
                gte: startOfCalendar,
                lte: endOfCalendar,
              },
            },
            {
              // Leave spans the entire calendar view
              AND: [
                { start_date: { lt: startOfCalendar } },
                { end_date: { gt: endOfCalendar } },
              ],
            },
          ],
        },
        orderBy: { start_date: 'asc' },
      }),

      // Company holidays for the calendar period
      prisma.publicHoliday.findMany({
        where: {
          company_id: employee.org_id,
          date: {
            gte: startOfCalendar,
            lte: endOfCalendar,
          },
        },
        orderBy: { date: 'asc' },
      }),
    ]);

    // Create a map of dates with their events
    const calendarDates: Record<string, CalendarDateEntry> = {};
    
    // Generate all calendar dates
    const currentCalendarDate = new Date(startOfCalendar);
    while (currentCalendarDate <= endOfCalendar) {
      const dateKey = currentCalendarDate.toISOString().split('T')[0];
      calendarDates[dateKey] = {
        date: new Date(currentCalendarDate),
        isCurrentMonth: currentCalendarDate.getMonth() === (month - 1),
        isToday: currentCalendarDate.toDateString() === new Date().toDateString(),
        isWeekend: currentCalendarDate.getDay() === 0 || currentCalendarDate.getDay() === 6,
        events: [],
      };
      currentCalendarDate.setDate(currentCalendarDate.getDate() + 1);
    }

    // Add employee leaves to calendar
    employeeLeaves.forEach(leave => {
      const startDate = new Date(leave.start_date);
      const endDate = new Date(leave.end_date);
      
      // Add leave to each day it spans
      const leaveDate = new Date(Math.max(startDate.getTime(), startOfCalendar.getTime()));
      const leaveEndDate = new Date(Math.min(endDate.getTime(), endOfCalendar.getTime()));
      
      while (leaveDate <= leaveEndDate) {
        const dateKey = leaveDate.toISOString().split('T')[0];
        if (calendarDates[dateKey]) {
          calendarDates[dateKey].events.push({
            id: leave.id,
            type: 'leave',
            title: leave.leave_type,
            status: leave.status,
            isHalfDay: leave.is_half_day,
            leaveType: leave.leave_type,
            startDate: leave.start_date,
            endDate: leave.end_date,
            totalDays: leave.total_days,
          });
        }
        leaveDate.setDate(leaveDate.getDate() + 1);
      }
    });

    // Add company holidays to calendar
    companyHolidays.forEach(holiday => {
      const dateKey = holiday.date.toISOString().split('T')[0];
      if (calendarDates[dateKey]) {
        calendarDates[dateKey].events.push({
          id: holiday.id,
          type: 'holiday',
          title: holiday.name,
          isCustom: holiday.is_custom,
          date: holiday.date,
        });
      }
    });

    // Convert to array format for easier consumption
    const calendarData = Object.values(calendarDates).map(date => ({
      ...date,
      hasEvents: date.events.length > 0,
      hasLeave: date.events.some((event) => event.type === 'leave'),
      hasHoliday: date.events.some((event) => event.type === 'holiday'),
      hasPendingLeave: date.events.some(
        (event) => event.type === 'leave' && event.status === 'pending'
      ),
    }));

    // Summary stats for the month
    const monthlyStats = {
      totalLeaveDays: employeeLeaves.reduce((sum, leave) => {
        // Calculate overlap with current month
        const leaveStart = new Date(leave.start_date);
        const leaveEnd = new Date(leave.end_date);
        const monthStart = startOfMonth;
        const monthEnd = endOfMonth;
        
        const overlapStart = new Date(Math.max(leaveStart.getTime(), monthStart.getTime()));
        const overlapEnd = new Date(Math.min(leaveEnd.getTime(), monthEnd.getTime()));
        
        if (overlapStart <= overlapEnd) {
          const days = Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          return sum + days;
        }
        return sum;
      }, 0),
      approvedLeaves: employeeLeaves.filter(l => l.status === 'approved').length,
      pendingLeaves: employeeLeaves.filter(l => l.status === 'pending').length,
      totalHolidays: companyHolidays.length,
    };

    return NextResponse.json({
      calendar: calendarData,
      month,
      year,
      monthlyStats,
      leaves: employeeLeaves,
      holidays: companyHolidays,
    });

  } catch (error) {
    console.error('Dashboard Calendar API Error:', error);
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}