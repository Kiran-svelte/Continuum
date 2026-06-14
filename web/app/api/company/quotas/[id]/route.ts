import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-service';
import { validateTenantAccess } from '@/lib/tenant-service';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/company/quotas/[id]
 * Delete a leave quota
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: leaveTypeId } = await params;
  try {
    const user = await getCurrentUser();
    
    if (!user || !user.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['admin', 'hr', 'super_admin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const companyId = user.orgId;
    await validateTenantAccess(companyId);

    // Verify leave type exists
    const leaveType = await prisma.leaveType.findFirst({
      where: {
        id: leaveTypeId,
        company_id: companyId,
        deleted_at: null,
      },
      select: { id: true, name: true, default_quota: true },
    });

    if (!leaveType) {
      return NextResponse.json(
        { error: 'Quota not found' },
        { status: 404 }
      );
    }

    // "Delete quota" => reset leave type quota configuration to safe defaults
    await prisma.leaveType.update({
      where: { id: leaveTypeId },
      data: {
        default_quota: 0,
        carry_forward: false,
        max_carry_forward: 0,
      },
    });

    await createAuditLog({
      companyId,
      actorId: user.id,
      action: 'quota_deleted',
      entityType: 'leave_type',
      entityId: leaveTypeId,
      newState: {
        leave_type: leaveType.name,
        annual_quota: 0,
        carry_forward_enabled: false,
        max_carry_forward: 0,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      message: 'Quota deleted successfully',
    });
  } catch (error) {
    console.error('[DELETE QUOTA] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete quota' },
      { status: 500 }
    );
  }
}
