import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireCompanyContext } from '@/lib/auth-guard';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthEmployee(request);
    requireCompanyContext(user);

    const companyId = user.org_id;

    // HR attention queue looks for:
    // 1. Leave Requests that are escalated
    // 2. Sensitive leaves that bypass managers
    // 3. Pending Documents needing verification (sick leaves > X days)
    
    const [escalatedLeaves, pendingDocuments] = await Promise.all([
      prisma.leaveRequest.findMany({
        where: {
          company_id: companyId,
          OR: [{ status: 'escalated' }, { status: 'pending', escalation_count: { gt: 0 } }],
        },
        include: {
          employee: {
            select: { first_name: true, last_name: true, department: true },
          },
        },
      }),
      prisma.document.findMany({
        where: {
          company_id: companyId,
          status: 'pending'
        },
        include: {
          employee: {
            select: { first_name: true, last_name: true, department: true },
          },
        },
      }),
    ]);

    const formattedLeaves = escalatedLeaves.map(l => ({
      id: l.id,
      type: 'leave_escalation',
      employeeName: `${l.employee.first_name} ${l.employee.last_name}`,
      department: l.employee.department || 'N/A',
      title: `${l.leave_type} Request`,
      details: `${l.total_days} days (${new Date(l.start_date).toLocaleDateString()} - ${new Date(l.end_date).toLocaleDateString()})`,
      createdAt: l.created_at,
    }));

    const formattedDocs = pendingDocuments.map(d => ({
      id: d.id,
      type: 'document_verification',
      employeeName: `${d.employee.first_name} ${d.employee.last_name}`,
      department: d.employee.department || 'N/A',
      title: `Document Uploaded: ${d.type}`,
      details: d.name,
      createdAt: d.created_at,
    }));

    // Combine and sort by oldest first (longest waiting)
    const allItems = [...formattedLeaves, ...formattedDocs].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [totalEmployees, presentToday, onLeaveToday, monthlyApprovals] = await Promise.all([
      prisma.employee.count({
        where: {
          org_id: companyId,
          deleted_at: null,
          status: 'active',
        },
      }),
      prisma.attendance.count({
        where: {
          company_id: companyId,
          date: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
          },
          status: { in: ['present', 'late', 'half_day'] },
        },
      }),
      prisma.leaveRequest.count({
        where: {
          company_id: companyId,
          status: 'approved',
          start_date: { lte: now },
          end_date: { gte: now },
        },
      }),
      prisma.leaveRequest.findMany({
        where: {
          company_id: companyId,
          status: 'approved',
          approved_at: {
            gte: monthStart,
            lt: nextMonthStart,
          },
        },
        select: {
          created_at: true,
          approved_at: true,
          approver_comments: true,
          approver: {
            select: { primary_role: true },
          },
        },
      }),
    ]);

    let aiAutoApprovedMonth = 0;
    let managerApprovedMonth = 0;
    let hrApprovedMonth = 0;
    let totalApprovalHours = 0;
    let approvalSamples = 0;

    for (const row of monthlyApprovals) {
      const comment = (row.approver_comments || '').toLowerCase();
      if (comment.includes('auto-approved')) {
        aiAutoApprovedMonth += 1;
      } else {
        const role = row.approver?.primary_role || '';
        if (role === 'manager') managerApprovedMonth += 1;
        if (role === 'hr' || role === 'admin' || role === 'director') hrApprovedMonth += 1;
      }

      if (row.approved_at) {
        totalApprovalHours += (row.approved_at.getTime() - row.created_at.getTime()) / (1000 * 60 * 60);
        approvalSamples += 1;
      }
    }

    const attendanceRate = totalEmployees > 0 ? Number(((presentToday / totalEmployees) * 100).toFixed(1)) : 0;
    const avgProcessingTimeHrs = approvalSamples > 0 ? Number((totalApprovalHours / approvalSamples).toFixed(1)) : 0;

    const stats = {
      totalEmployees,
      onLeaveToday,
      presentToday,
      attendanceRate,
      aiAutoApprovedMonth,
      managerApprovedMonth,
      hrApprovedMonth,
      avgProcessingTimeHrs,
    };

    return NextResponse.json({
      attentionQueue: allItems,
      stats,
    });
  } catch (error) {
    console.error('Error fetching HR dashboard data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
