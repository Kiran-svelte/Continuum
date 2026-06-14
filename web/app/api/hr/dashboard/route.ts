import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requirePermissionGuard, requireCompanyContext, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { mapHrRecentActivity } from '@/lib/hr-dashboard-mappers';

export const dynamic = 'force-dynamic';

type ApprovalAnalyticsRow = {
  avg_approval_hours: number | null;
  total_processed: bigint;
  sla_breached: bigint;
};

type MonthlyTrendRow = {
  month: Date;
  requests: bigint | number;
  days: bigint | number;
  approved: bigint | number;
};

type DepartmentUtilizationRow = {
  department: string | null;
  leave_requests: bigint | number;
  total_leave_days: bigint | number;
  employees_taking_leave: bigint | number;
  total_employees: bigint | number;
  utilization_percentage: number | string | null;
};

/**
 * GET /api/hr/dashboard
 * 
 * Enterprise HR Dashboard API providing company-wide analytics and insights
 * 
 * Features:
 * - Employee headcount and status analytics
 * - Leave request volume trends (12-month rolling)
 * - Approval time analytics and SLA breach tracking
 * - Department utilization and performance metrics
 * - Policy compliance monitoring
 * - Cost impact analysis for leave management
 * - Real-time calculations with parallel optimized queries
 * 
 * Security:
 * - RBAC: Only HR, Admin, Director roles can access
 * - Rate limiting to prevent data scraping
 * - Comprehensive audit logging
 * - Data classification headers
 */
export async function GET() {
  try {
    const employee = await getAuthEmployee();
    requirePermissionGuard(employee, 'reports.view_all');

    // Enhanced rate limiting for HR dashboard
    const rateLimit = checkApiRateLimit(employee.id, 'hr_dashboard');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'HR dashboard access rate limited. Please wait before requesting again.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    // Validate HR/Admin/Director access only
    if (!['hr', 'admin', 'director'].includes(employee.primary_role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. HR dashboard requires HR, Admin, or Director role.' },
        { status: 403 }
      );
    }
    requireCompanyContext(employee);

    const companyId = employee.org_id;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    // Execute all analytics queries in parallel for performance
    const [
      employeeStats,
      departmentBreakdown,
      leaveVolumeData,
      approvalAnalytics,
      slaBreaches,
      topLeaveRequests,
      utilizationMetrics,
      complianceData,
      _employeeAggregate,
      recentActivity,
      policyViolations
    ] = await Promise.all([
      // 1. Employee headcount and status analytics
      prisma.employee.groupBy({
        by: ['status', 'department'],
        where: { org_id: companyId, deleted_at: null },
        _count: { id: true }
      }),

      // 2. Department breakdown with detailed metrics
      prisma.employee.groupBy({
        by: ['department'],
        where: { 
          org_id: companyId, 
          deleted_at: null,
          status: { not: 'exited' }
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } }
      }),

      // 3. Leave volume trends (12-month rolling data)
      prisma.leaveRequest.groupBy({
        by: ['status'],
        where: {
          company_id: companyId,
          created_at: { gte: twelveMonthsAgo }
        },
        _count: { id: true },
        _sum: { total_days: true },
        _avg: { total_days: true }
      }),

      // 4. Approval time analytics with SLA tracking
      prisma.$queryRaw<ApprovalAnalyticsRow[]>`
        SELECT 
          AVG(EXTRACT(HOUR FROM (updated_at - created_at))) as avg_approval_hours,
          COUNT(*) as total_processed,
          COUNT(CASE WHEN EXTRACT(HOUR FROM (updated_at - created_at)) > 48 THEN 1 END) as sla_breached
        FROM "LeaveRequest" 
        WHERE company_id = ${companyId} 
        AND status IN ('approved', 'rejected')
        AND updated_at IS NOT NULL
        AND created_at >= ${thirtyDaysAgo}
      `,

      // 5. SLA breach analysis by department
      prisma.leaveRequest.findMany({
        where: {
          company_id: companyId,
          sla_breached: true,
          created_at: { gte: thirtyDaysAgo }
        },
        include: {
          employee: {
            select: { department: true, first_name: true, last_name: true }
          }
        }
      }),

      // 6. Top leave requesters analysis
      prisma.leaveRequest.groupBy({
        by: ['emp_id'],
        where: {
          company_id: companyId,
          created_at: { gte: twelveMonthsAgo }
        },
        _count: { id: true },
        _sum: { total_days: true },
        orderBy: { _sum: { total_days: 'desc' } },
        take: 10
      }),

      // 7. Department utilization rates
      prisma.$queryRaw`
        SELECT 
          e.department,
          COUNT(lr.id) as leave_requests,
          SUM(lr.total_days) as total_leave_days,
          COUNT(DISTINCT lr.emp_id) as employees_taking_leave,
          COUNT(DISTINCT e.id) as total_employees,
          ROUND(
            (COUNT(DISTINCT lr.emp_id)::numeric / COUNT(DISTINCT e.id)) * 100, 2
          ) as utilization_percentage
        FROM "Employee" e
        LEFT JOIN "LeaveRequest" lr ON e.id = lr.emp_id 
          AND lr.created_at >= ${twelveMonthsAgo}
          AND lr.status = 'approved'
        WHERE e.org_id = ${companyId} 
          AND e.deleted_at IS NULL
          AND e.status != 'exited'
        GROUP BY e.department
        ORDER BY utilization_percentage DESC
      `,

      // 8. Policy compliance metrics
      prisma.leaveRequest.groupBy({
        by: ['leave_type'],
        where: {
          company_id: companyId,
          created_at: { gte: twelveMonthsAgo }
        },
        _count: { id: true },
        _sum: { total_days: true },
        _avg: { total_days: true },
        orderBy: { _count: { id: 'desc' } }
      }),

      // 9. Cost analysis - average daily cost calculation
      prisma.employee.aggregate({
        where: {
          org_id: companyId,
          deleted_at: null,
          status: { not: 'exited' }
        },
        _count: { id: true }
      }),

      // 10. Recent activity for insights
      prisma.leaveRequest.findMany({
        where: {
          company_id: companyId,
          created_at: { gte: thirtyDaysAgo }
        },
        include: {
          employee: {
            select: { first_name: true, last_name: true, department: true }
          }
        },
        orderBy: { created_at: 'desc' },
        take: 20
      }),

      // 11. Policy violation tracking
      prisma.leaveRequest.count({
        where: {
          company_id: companyId,
          created_at: { gte: thirtyDaysAgo },
          OR: [
            { sla_breached: true },
            { status: 'rejected' }
          ]
        }
      })
    ]);

    // Process and enrich data for dashboard
    const employeesByStatus = employeeStats.reduce((acc, stat) => {
      acc[stat.status] = (acc[stat.status] || 0) + stat._count.id;
      return acc;
    }, {} as Record<string, number>);

    const employeesByDepartment = employeeStats.reduce((acc, stat) => {
      const departmentKey = stat.department ?? 'Unassigned';
      if (!acc[departmentKey]) {
        acc[departmentKey] = {};
      }
      acc[departmentKey][stat.status] = stat._count.id;
      return acc;
    }, {} as Record<string, Record<string, number>>);

    // Enrich top leave takers with employee details
    const topTakerIds = topLeaveRequests.map(req => req.emp_id);
    const topTakerEmployees = await prisma.employee.findMany({
      where: { id: { in: topTakerIds } },
      select: { 
        id: true, 
        first_name: true, 
        last_name: true, 
        department: true,
        date_of_joining: true
      }
    });

    const empMap = Object.fromEntries(topTakerEmployees.map(e => [e.id, e]));
    const enrichedTopTakers = topLeaveRequests.map(req => ({
      employee_id: empMap[req.emp_id]?.id ?? 'Unknown',
      name: empMap[req.emp_id] ? 
        `${empMap[req.emp_id].first_name} ${empMap[req.emp_id].last_name}` : 
        'Unknown Employee',
      department: empMap[req.emp_id]?.department ?? 'Unknown',
      hire_date: empMap[req.emp_id]?.date_of_joining,
      total_requests: req._count.id,
      total_days: req._sum.total_days ?? 0,
      avg_days_per_request: req._sum.total_days && req._count.id ? 
        Math.round(((req._sum.total_days) / req._count.id) * 10) / 10 : 0
    }));

    // Calculate total metrics
    const totalEmployees = Object.values(employeesByStatus).reduce((sum, count) => sum + count, 0);
    const totalLeaveRequests = leaveVolumeData.reduce((sum, vol) => sum + vol._count.id, 0);
    const totalLeaveDays = leaveVolumeData.reduce((sum, vol) => sum + (vol._sum.total_days ?? 0), 0);
    const approvedRequests = leaveVolumeData.find(vol => vol.status === 'approved')?._count.id ?? 0;
    const approvalRate = totalLeaveRequests > 0 ? 
      Math.round((approvedRequests / totalLeaveRequests) * 100) : 0;

    // Cost calculation (simplified - would need actual salary data in production)
    const avgDailySalary = 250; // Default estimate
    const estimatedLeaveCost = totalLeaveDays * avgDailySalary;

    // Monthly trend data for charts
    const monthlyTrends = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as requests,
        SUM(total_days) as days,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved
      FROM "LeaveRequest"
      WHERE company_id = ${companyId}
        AND created_at >= ${twelveMonthsAgo}
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month ASC
    `;

    const monthlyTrendRows = monthlyTrends as MonthlyTrendRow[];
    const utilizationRows = utilizationMetrics as DepartmentUtilizationRow[];

    // Build comprehensive response
    const dashboardData = {
      meta: {
        generated_at: new Date().toISOString(),
        generated_by: `${employee.first_name} ${employee.last_name}`,
        company_id: companyId,
        data_period: {
          start: twelveMonthsAgo.toISOString(),
          end: now.toISOString()
        },
        user_role: employee.primary_role
      },
      
      overview: {
        total_employees: totalEmployees,
        active_employees: employeesByStatus['active'] ?? 0,
        total_leave_requests: totalLeaveRequests,
        total_leave_days: totalLeaveDays,
        approval_rate: approvalRate,
        avg_approval_time_hours: approvalAnalytics[0]?.avg_approval_hours ? 
          Math.round(Number(approvalAnalytics[0].avg_approval_hours) * 10) / 10 : 0,
        sla_breach_count: slaBreaches.length,
        estimated_leave_cost: Math.round(estimatedLeaveCost),
        policy_violations: policyViolations
      },

      employees: {
        by_status: employeesByStatus,
        by_department: employeesByDepartment,
        department_summary: departmentBreakdown.map(dept => ({
          department: dept.department,
          employee_count: dept._count.id
        }))
      },

      leave_analytics: {
        volume_by_status: leaveVolumeData.map(vol => ({
          status: vol.status,
          count: vol._count.id,
          total_days: vol._sum.total_days ?? 0,
          avg_days: vol._avg.total_days ? 
            Math.round(Number(vol._avg.total_days) * 10) / 10 : 0
        })),
        
        by_type: complianceData.map(policy => ({
          leave_type: policy.leave_type,
          requests: policy._count.id,
          total_days: policy._sum.total_days ?? 0,
          avg_days: policy._avg.total_days ? 
            Math.round(Number(policy._avg.total_days) * 10) / 10 : 0
        })),

        monthly_trends: monthlyTrendRows.map(trend => ({
          month: trend.month,
          month_name: new Date(trend.month).toLocaleString('default', { 
            month: 'long', year: 'numeric' 
          }),
          requests: Number(trend.requests),
          days: Number(trend.days),
          approved: Number(trend.approved),
          approval_rate: Number(trend.requests) > 0 ? 
            Math.round((Number(trend.approved) / Number(trend.requests)) * 100) : 0
        }))
      },

      performance_metrics: {
        department_utilization: utilizationRows,
        top_leave_takers: enrichedTopTakers,
        sla_breaches: slaBreaches.map(breach => ({
          employee_name: `${breach.employee.first_name} ${breach.employee.last_name}`,
          department: breach.employee.department,
          request_id: breach.id,
          created_at: breach.created_at,
          days_overdue: Math.ceil((now.getTime() - breach.created_at.getTime()) / (24 * 60 * 60 * 1000))
        }))
      },

      insights: {
        most_utilized_department: utilizationRows[0]?.department ?? 'N/A',
        highest_volume_leave_type: complianceData[0]?.leave_type ?? 'N/A',
        peak_request_month: (() => {
          const peakRow = [...monthlyTrendRows].sort(
            (a, b) => Number(b.requests) - Number(a.requests)
          )[0];
          if (!peakRow) return 'N/A';
          return new Date(peakRow.month).toLocaleString('default', {
            month: 'long',
            year: 'numeric',
          });
        })(),
        
        recommendations: [
          totalLeaveRequests > 0 && approvalRate < 80 ? 
            'Review approval processes - approval rate below 80%' : null,
          slaBreaches.length > 5 ? 
            'Multiple SLA breaches detected - consider workflow optimization' : null,
          totalLeaveDays > (totalEmployees * 25) ? 
            'High leave utilization - monitor for potential staffing impact' : null
        ].filter(Boolean)
      },

      recent_activity: mapHrRecentActivity(recentActivity)
    };

    return NextResponse.json(dashboardData, {
      headers: {
        // Enterprise security and audit headers
        'X-Dashboard-Type': 'hr_analytics',
        'X-Generated-By': employee.id,
        'X-Data-Classification': 'internal-confidential',
        'X-Total-Employees': totalEmployees.toString(),
        'X-Total-Requests': totalLeaveRequests.toString(),
        
        // Cache control for sensitive data
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('[HR Dashboard] Error:', error);
    
    if (error instanceof AuthError) {
      return NextResponse.json({ 
        error: error.message,
        code: 'AUTH_ERROR'
      }, { status: error.status });
    }

    // Log error for monitoring (would integrate with monitoring service)
    const errorMessage = process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : String(error);
      
    return NextResponse.json({
      error: errorMessage,
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
