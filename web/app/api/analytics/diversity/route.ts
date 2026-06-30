/**
 * Analytics — Diversity Metrics — RALPH-20260630-029
 * GET /api/analytics/diversity
 *
 * Gender distribution, dept breakdown, tenure diversity.
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';
import { assertModule } from '@/lib/core-functions/assert-module';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const employee = await getAuthEmployee(req);
    await assertModule(employee.org_id!, 'analytics');

    const employees = await prisma.employee.findMany({
      where: { org_id: employee.org_id!, status: 'active' },
      select: { gender: true, department: true, date_of_joining: true, designation: true },
    });

    const total = employees.length;

    // Gender breakdown
    const byGender: Record<string, number> = {};
    for (const emp of employees) {
      const g = emp.gender ?? 'not_specified';
      byGender[g] = (byGender[g] ?? 0) + 1;
    }

    // Gender by department
    const genderByDept: Record<string, Record<string, number>> = {};
    for (const emp of employees) {
      const dept = emp.department ?? 'Unknown';
      const g = emp.gender ?? 'not_specified';
      if (!genderByDept[dept]) genderByDept[dept] = {};
      genderByDept[dept][g] = (genderByDept[dept][g] ?? 0) + 1;
    }

    // Tenure buckets (months)
    const tenure = { '<6mo': 0, '6-12mo': 0, '1-2yr': 0, '2-5yr': 0, '5+yr': 0 };
    const now = Date.now();
    for (const emp of employees) {
      if (!emp.date_of_joining) continue;
      const months = (now - emp.date_of_joining.getTime()) / (30 * 24 * 60 * 60 * 1000);
      if (months < 6) tenure['<6mo']++;
      else if (months < 12) tenure['6-12mo']++;
      else if (months < 24) tenure['1-2yr']++;
      else if (months < 60) tenure['2-5yr']++;
      else tenure['5+yr']++;
    }

    return NextResponse.json({
      total,
      by_gender: Object.entries(byGender).map(([gender, count]) => ({
        gender,
        count,
        pct: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      })),
      gender_by_department: Object.entries(genderByDept).map(([department, breakdown]) => ({
        department,
        total: Object.values(breakdown).reduce((s, c) => s + c, 0),
        breakdown,
      })).sort((a, b) => b.total - a.total),
      tenure_distribution: Object.entries(tenure).map(([bucket, count]) => ({ bucket, count })),
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
