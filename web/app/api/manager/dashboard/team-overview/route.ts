import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requirePermissionGuard, requireCompanyContext } from '@/lib/auth-guard';
import { toConflictLeaveEntry } from '@/lib/manager-team-overview-mappers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/manager/dashboard/team-overview
 * 
 * Provides comprehensive team overview data for managers including:
 * - Direct reports with current status
 * - Team leave balances and usage
 * - Coverage metrics and availability
 * - Upcoming leaves and scheduling conflicts
 */
export async function GET() {
  try {
    // Authenticate and authorize manager
    const manager = await getAuthEmployee();
    requirePermissionGuard(manager, 'leave.approve_team');
    requireCompanyContext(manager);

    // Parallel queries for optimal performance
    const [teamMembers, teamLeaveBalances, upcomingLeaves, currentLeaves] = await Promise.all([
      // Get direct reports
      prisma.employee.findMany({
        where: {
          org_id: manager.org_id,
          manager_id: manager.id,
          status: { not: 'terminated' }
        },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          designation: true,
          department: true,
          email: true,
          status: true,
          created_at: true
        },
        orderBy: { first_name: 'asc' }
      }),

      // Get leave balances for team members
      prisma.leaveBalance.findMany({
        where: {
          employee: {
            org_id: manager.org_id,
            manager_id: manager.id,
            status: { not: 'terminated' }
          },
          year: new Date().getFullYear()
        },
        include: {
          employee: {
            select: {
              id: true,
              first_name: true,
              last_name: true
            }
          }
        },
        orderBy: [
          { emp_id: 'asc' },
          { leave_type: 'asc' }
        ]
      }),

      // Get upcoming approved leaves (next 30 days)
      prisma.leaveRequest.findMany({
        where: {
          employee: {
            org_id: manager.org_id,
            manager_id: manager.id
          },
          status: 'approved',
          start_date: {
            gte: new Date(),
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Next 30 days
          }
        },
        include: {
          employee: {
            select: {
              id: true,
              first_name: true,
              last_name: true
            }
          }
        },
        orderBy: { start_date: 'asc' }
      }),

      // Get current ongoing leaves
      prisma.leaveRequest.findMany({
        where: {
          employee: {
            org_id: manager.org_id,
            manager_id: manager.id
          },
          status: 'approved',
          start_date: { lte: new Date() },
          end_date: { gte: new Date() }
        },
        include: {
          employee: {
            select: {
              id: true,
              first_name: true,
              last_name: true
            }
          }
        }
      })
    ]);

    // Calculate team metrics
    const totalTeamSize = teamMembers.length;
    const currentlyOnLeave = currentLeaves.length;
    const availableMembers = totalTeamSize - currentlyOnLeave;
    const coveragePercentage = totalTeamSize > 0 ? Math.round((availableMembers / totalTeamSize) * 100) : 0;

    // Process leave balances by employee
    type BalanceEntry = {
      leave_type: string;
      annual_entitlement: number;
      used_days: number;
      pending_days: number;
      remaining: number;
    };

    type BalanceMapEntry = {
      employee: {
        id: string;
        first_name: string;
        last_name: string;
      };
      balances: BalanceEntry[];
    };

    const balancesByEmployee = teamLeaveBalances.reduce((acc, balance) => {
      const empId = balance.emp_id;
      if (!acc[empId]) {
        acc[empId] = {
          employee: balance.employee,
          balances: []
        };
      }
      acc[empId].balances.push({
        leave_type: balance.leave_type,
        annual_entitlement: balance.annual_entitlement,
        used_days: balance.used_days,
        pending_days: balance.pending_days,
        remaining: balance.annual_entitlement - balance.used_days - balance.pending_days
      });
      return acc;
    }, {} as Record<string, BalanceMapEntry>);

    // Enhance team members with leave data
    const enhancedTeamMembers = teamMembers.map(member => {
      const balanceData = balancesByEmployee[member.id];
      const isOnLeave = currentLeaves.some(leave => leave.emp_id === member.id);
      
      // Calculate total remaining leave days
      const totalRemaining = balanceData?.balances?.reduce((sum: number, balance: BalanceEntry) => {
        return sum + balance.remaining;
      }, 0) || 0;

      return {
        ...member,
        status: isOnLeave ? 'on_leave' : 'available',
        leave_balances: balanceData?.balances || [],
        total_remaining_leave: totalRemaining,
        current_leave: isOnLeave ? currentLeaves.find(leave => leave.emp_id === member.id) : null
      };
    });

    // Upcoming leave conflicts (multiple people on same dates)
    type ConflictLeaveEntry = {
      employee: {
        id: string;
        first_name: string;
        last_name: string;
        department: string | null;
      };
      leave_id: string;
      leave_type: string;
    };

    const upcomingConflicts: { date: string; conflicting_leaves: ConflictLeaveEntry[]; impact_level: string }[] = [];
    const dateMap: Record<string, ConflictLeaveEntry[]> = {};
    
    upcomingLeaves.forEach(leave => {
      const startDate = leave.start_date.toISOString().split('T')[0];
      const endDate = leave.end_date.toISOString().split('T')[0];
      
      // Add each date in the range
      const current = new Date(startDate);
      const end = new Date(endDate);
      
      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        if (!dateMap[dateStr]) {
          dateMap[dateStr] = [];
        }
        dateMap[dateStr].push(
          toConflictLeaveEntry(
            leave.employee,
            leave.id,
            leave.leave_type
          )
        );
        current.setDate(current.getDate() + 1);
      }
    });

    // Find dates with conflicts
    Object.entries(dateMap).forEach(([date, leaves]) => {
      if (leaves.length > 1) {
        upcomingConflicts.push({
          date,
          conflicting_leaves: leaves,
          impact_level: leaves.length >= totalTeamSize * 0.5 ? 'high' : 'medium'
        });
      }
    });

    // Team workload indicators
    const workloadMetrics = {
      high_utilization_members: enhancedTeamMembers.filter(member => 
        member.total_remaining_leave < 5 && member.status !== 'on_leave'
      ).length,
      low_balance_members: enhancedTeamMembers.filter(member => 
        member.total_remaining_leave === 0
      ).length,
      available_capacity: coveragePercentage
    };

    return NextResponse.json({
      team_overview: {
        total_team_size: totalTeamSize,
        currently_on_leave: currentlyOnLeave,
        available_members: availableMembers,
        coverage_percentage: coveragePercentage
      },
      team_members: enhancedTeamMembers,
      upcoming_leaves: upcomingLeaves.map(leave => ({
        id: leave.id,
        employee: leave.employee,
        leave_type: leave.leave_type,
        start_date: leave.start_date,
        end_date: leave.end_date,
        total_days: leave.total_days,
        reason: leave.reason
      })),
      scheduling_conflicts: upcomingConflicts,
      workload_metrics: workloadMetrics,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Manager Team Overview] Error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          error: 'Failed to fetch team overview',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching team data' },
      { status: 500 }
    );
  }
}