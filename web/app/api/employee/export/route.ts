/**
 * Employee Data Export (GDPR Article 20 — Data Portability) — RALPH-20260630-030
 * GET /api/employee/export
 *
 * Returns a JSON package of all data held about the authenticated employee.
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const employee = await getAuthEmployee(req);
    const empId = employee.id;
    const orgId = employee.org_id!;

    const [
      profile,
      leaveRequests,
      attendanceRecords,
      payslips,
      goals,
      reviewInstances,
      documents,
      courseEnrollments,
      notifications,
      taxDeclarations,
    ] = await Promise.all([
      prisma.employee.findUnique({
        where: { id: empId },
        select: {
          id: true, email: true, first_name: true, last_name: true,
          phone: true, designation: true, department: true, date_of_joining: true,
          status: true, gender: true, created_at: true,
        },
      }),
      prisma.leaveRequest.findMany({
        where: { emp_id: empId, company_id: orgId },
        select: { id: true, leave_type: true, start_date: true, end_date: true, total_days: true, status: true, reason: true, created_at: true },
      }),
      prisma.attendance.findMany({
        where: { emp_id: empId, company_id: orgId },
        select: { id: true, date: true, check_in: true, check_out: true, status: true, total_hours: true },
        take: 365,
        orderBy: { date: 'desc' },
      }),
      prisma.payrollSlip.findMany({
        where: { emp_id: empId, company_id: orgId },
        select: { id: true, month: true, year: true, gross: true, net_pay: true, created_at: true },
      }),
      prisma.goal.findMany({
        where: { emp_id: empId, company_id: orgId },
        select: { id: true, title: true, description: true, status: true, target_value: true, current_value: true, created_at: true },
      }),
      prisma.reviewInstance.findMany({
        where: { reviewee_id: empId, company_id: orgId },
        select: { id: true, review_type: true, status: true, overall_rating: true, strengths: true, improvements: true, submitted_at: true },
      }),
      prisma.document.findMany({
        where: { emp_id: empId, company_id: orgId },
        select: { id: true, name: true, type: true, created_at: true },
      }),
      prisma.courseEnrollment.findMany({
        where: { emp_id: empId, company_id: orgId },
        select: { id: true, status: true, progress_percent: true, score: true, completed_at: true },
      }),
      prisma.notification.findMany({
        where: { emp_id: empId },
        select: { id: true, type: true, title: true, message: true, is_read: true, created_at: true },
        take: 100,
        orderBy: { created_at: 'desc' },
      }),
      prisma.taxDeclaration.findMany({
        where: { emp_id: empId, company_id: orgId },
        select: { id: true, fiscal_year: true, status: true, regime: true, total_declared: true, submitted_at: true },
      }),
    ]);

    const exportPackage = {
      export_generated_at: new Date().toISOString(),
      format: 'GDPR-Article-20-Data-Portability',
      subject: profile,
      data: {
        leave_requests: leaveRequests,
        attendance_records: attendanceRecords,
        payslips,
        goals,
        performance_reviews: reviewInstances,
        documents,
        course_enrollments: courseEnrollments,
        notifications,
        tax_declarations: taxDeclarations,
      },
    };

    return NextResponse.json(exportPackage, {
      headers: {
        'Content-Disposition': `attachment; filename="employee-data-export-${empId}.json"`,
        'Content-Type': 'application/json',
      },
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
