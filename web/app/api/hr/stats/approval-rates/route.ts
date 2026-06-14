import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requirePermissionGuard, requireCompanyContext } from '@/lib/auth-guard';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const hrAdmin = await getAuthEmployee();
    requirePermissionGuard(hrAdmin, 'company.view_settings');
    requireCompanyContext(hrAdmin);

    // Compute basic stats
    const [totalApproved, aiApproved, activeLeaves] = await Promise.all([
      prisma.leaveRequest.count({
        where: { company_id: hrAdmin.org_id, status: 'approved' }
      }),
      prisma.leaveRequest.count({
        where: { 
          company_id: hrAdmin.org_id, 
          status: 'approved',
          approver_comments: { contains: 'Auto-approved by constraint engine' } 
        }
      }),
      prisma.leaveRequest.count({
        where: {
          company_id: hrAdmin.org_id,
          status: 'approved',
          start_date: { lte: new Date() },
          end_date: { gte: new Date() }
        }
      })
    ]);

    const aiRate = totalApproved > 0 ? ((aiApproved / totalApproved) * 100).toFixed(1) : 0;

    return NextResponse.json({ 
      success: true, 
      aiRate,
      activeLeaves,
      totalApproved
    });
  } catch (error) {
    console.error('[HR Stats]', error);
    return NextResponse.json({ error: 'Failed to fetch HR stats' }, { status: 500 });
  }
}