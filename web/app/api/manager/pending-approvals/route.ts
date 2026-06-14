import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requirePermissionGuard, requireCompanyContext } from '@/lib/auth-guard';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const manager = await getAuthEmployee();
    requirePermissionGuard(manager, 'leave.approve_team');
    requireCompanyContext(manager);

    const pendingRequests = await prisma.leaveRequest.findMany({
      where: {
        company_id: manager.org_id,
        status: { in: ['pending', 'escalated'] },
        employee: {
          manager_id: manager.id
        }
      },
      include: {
        employee: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
          }
        },
      },
      orderBy: { created_at: 'desc' }
    });

    const formattedRequests = pendingRequests.map(req => {
      let aiRecommendation = undefined;
      let confidenceScore = undefined;
      
      if (req.constraint_result) {
        const constraint = req.constraint_result as {
          recommendation?: string;
          confidence_score?: number;
        };
        aiRecommendation = constraint.recommendation;
        confidenceScore = constraint.confidence_score;
      }
      
      const emp = req.employee;
      return {
        id: req.id,
        employeeName: `${emp.first_name} ${emp.last_name}`,
        leaveType: req.leave_type,
        startDate: req.start_date,
        endDate: req.end_date,
        totalDays: req.total_days,
        reason: req.reason,
        aiRecommendation,
        confidenceScore,
        createdAt: req.created_at
      };
    });

    return NextResponse.json({ approvals: formattedRequests });
  } catch (error) {
    console.error('Error fetching manager pending approvals:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
