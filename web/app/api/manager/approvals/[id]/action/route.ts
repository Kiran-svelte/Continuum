import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { LeaveRequestStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requirePermissionGuard, requireCompanyContext } from '@/lib/auth-guard';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const actionSchema = z.object({
  action: z.enum(['approve', 'reject', 'escalate']),
  reason: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const manager = await getAuthEmployee();
    requireCompanyContext(manager);
    requirePermissionGuard(manager, 'leave.approve_team');

    const body = await request.json();
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const { action, reason } = parsed.data;

    // Check if the request exists and if the manager has rights
    const leaveReq = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { employee: true }
    });

    if (!leaveReq) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    // In a full implementation, check if the request is actually pending and belongs to this manager's scope
    if (leaveReq.status !== 'pending' && leaveReq.status !== 'escalated') {
      return NextResponse.json({ error: 'Leave request is not in a pending state' }, { status: 400 });
    }

    // Process Action
    let newStatus: LeaveRequestStatus = leaveReq.status;
    let comments = leaveReq.approver_comments ? `${leaveReq.approver_comments}\n\n` : '';
    
    if (action === 'approve') {
      newStatus = 'approved';
      comments += `Manager Approved: ${reason || 'No comment'}`;
      
      // Update Balance 
      const balance = await prisma.leaveBalance.findUnique({
        where: {
          emp_id_leave_type_year: {
            emp_id: leaveReq.emp_id,
            leave_type: leaveReq.leave_type,
            year: new Date().getFullYear(),
          }
        }
      });
      if (balance) {
        await prisma.leaveBalance.update({
          where: { id: balance.id },
          data: {
            pending_days: { decrement: leaveReq.total_days },
            used_days: { increment: leaveReq.total_days },
          }
        });
      }
    } else if (action === 'reject') {
      newStatus = 'rejected';
      comments += `Manager Rejected: ${reason || 'No comment'}`;
      
      // Restore Balance
      const balance = await prisma.leaveBalance.findUnique({
        where: {
          emp_id_leave_type_year: {
            emp_id: leaveReq.emp_id,
            leave_type: leaveReq.leave_type,
            year: new Date().getFullYear(),
          }
        }
      });
      if (balance) {
        await prisma.leaveBalance.update({
          where: { id: balance.id },
          data: {
            pending_days: { decrement: leaveReq.total_days },
            remaining: { increment: leaveReq.total_days },
          }
        });
      }
    } else if (action === 'escalate') {
      newStatus = 'escalated';
      comments += `Escalated to HR: ${reason || 'No comment'}`;
      // Here you'd trigger a new notification/route but for now we just change status
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: newStatus,
        approver_comments: comments,
        approved_at: action === 'approve' ? new Date() : undefined,
      }
    });

    await createAuditLog({
      companyId: manager.org_id,
      actorId: manager.id,
      action: action === 'approve' ? AUDIT_ACTIONS.LEAVE_APPROVE : AUDIT_ACTIONS.LEAVE_REJECT,
      entityType: 'LeaveRequest',
      entityId: updated.id,
      newState: { status: newStatus, reason: comments },
    });

    return NextResponse.json({ success: true, updated });

  } catch (error) {
    console.error('Error escalating/approving request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

