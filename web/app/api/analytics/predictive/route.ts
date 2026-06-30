/**
 * Predictive Analytics — RALPH-20260630-026
 * GET /api/analytics/predictive
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';
import { assertModule } from '@/lib/core-functions/assert-module';

export const dynamic = 'force-dynamic';

interface EmployeeRisk {
  emp_id: string;
  name: string;
  department: string | null;
  designation: string | null;
  risk_score: number;
  risk_level: string;
}

interface LeaveAnomaly {
  emp_id: string;
  name: string;
  department: string | null;
  leave_days_90d: number;
}

export async function GET(req: NextRequest) {
  try {
    const employee = await getAuthEmployee(req);
    await assertModule(employee.org_id!, 'analytics');

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const [employees, recentExitCount, leaveRequests, reviews] = await Promise.all([
      prisma.employee.findMany({
        where: { org_id: employee.org_id!, status: 'active' },
        select: { id: true, first_name: true, last_name: true, department: true, designation: true, date_of_joining: true },
      }),
      prisma.employeeStatusHistory.count({
        where: {
          company_id: employee.org_id!,
          to_status: { in: ['terminated', 'resigned', 'inactive'] },
          created_at: { gte: ninetyDaysAgo },
        },
      }),
      prisma.leaveRequest.findMany({
        where: { company_id: employee.org_id!, created_at: { gte: ninetyDaysAgo } },
        select: { emp_id: true, status: true, total_days: true },
      }),
      prisma.reviewInstance.findMany({
        where: { company_id: employee.org_id!, created_at: { gte: ninetyDaysAgo } },
        select: { reviewee_id: true, overall_rating: true },
      }),
    ]);

    const leaveCountByEmp: Record<string, number> = {};
    for (const lr of leaveRequests) {
      leaveCountByEmp[lr.emp_id] = (leaveCountByEmp[lr.emp_id] ?? 0) + (lr.total_days ?? 0);
    }
    const ratingByEmp: Record<string, number> = {};
    for (const r of reviews) {
      if (r.overall_rating != null) ratingByEmp[r.reviewee_id] = r.overall_rating;
    }

    const attritionRisks: EmployeeRisk[] = employees
      .map((emp) => {
        let risk = 0;
        const tenureMonths = emp.date_of_joining
          ? (Date.now() - emp.date_of_joining.getTime()) / (30 * 24 * 60 * 60 * 1000)
          : 12;
        if (tenureMonths < 6) risk += 30;
        else if (tenureMonths < 12) risk += 15;
        const leaveDays = leaveCountByEmp[emp.id] ?? 0;
        if (leaveDays > 10) risk += 25;
        else if (leaveDays > 5) risk += 10;
        const rating = ratingByEmp[emp.id];
        if (rating != null) {
          if (rating < 2.5) risk += 35;
          else if (rating < 3.5) risk += 10;
        }
        return {
          emp_id: emp.id,
          name: `${emp.first_name} ${emp.last_name}`,
          department: emp.department,
          designation: emp.designation,
          risk_score: Math.min(100, risk),
          risk_level: risk >= 50 ? 'high' : risk >= 25 ? 'medium' : 'low',
        };
      })
      .sort((a, b) => b.risk_score - a.risk_score);

    const leaveAnomalies: LeaveAnomaly[] = employees
      .filter((emp) => (leaveCountByEmp[emp.id] ?? 0) > 8)
      .map((emp) => ({
        emp_id: emp.id,
        name: `${emp.first_name} ${emp.last_name}`,
        department: emp.department,
        leave_days_90d: leaveCountByEmp[emp.id] ?? 0,
      }))
      .sort((a, b) => b.leave_days_90d - a.leave_days_90d);

    return NextResponse.json({
      generated_at: new Date().toISOString(),
      period_days: 90,
      attrition_risk: {
        high: attritionRisks.filter((e) => e.risk_level === 'high').length,
        medium: attritionRisks.filter((e) => e.risk_level === 'medium').length,
        low: attritionRisks.filter((e) => e.risk_level === 'low').length,
        top_risks: attritionRisks.slice(0, 10),
      },
      hiring_forecast: {
        recommended_hires: Math.ceil(recentExitCount * 1.1),
        recent_exits_90d: recentExitCount,
        note: 'Based on exit rate × 1.1 buffer',
      },
      leave_anomalies: leaveAnomalies.slice(0, 10),
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
