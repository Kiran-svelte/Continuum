import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee, AuthError, requireCompanyContext } from '@/lib/auth-guard';
import { buildContextFromSession } from '@/lib/channel/context-from-session';
import { approveLeaveService } from '@/lib/services/leave-approve';
import { serviceResultToLegacyResponse } from '@/lib/services/service-response';
import prisma from '@/lib/prisma';
import { canActOnLeaveRequest } from '@/lib/leave-approval-routing';
import { canProcessLeaveApproval } from '@/lib/leave-workflow';
import { requireModuleForOrg } from '@/lib/core-functions/guard-handler';

export const dynamic = 'force-dynamic';

/**
 * POST /api/leaves/approve/[requestId] — thin wrapper over approveLeaveService.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const employee = await getAuthEmployee();
    requireCompanyContext(employee);
    const moduleGuardPost = await requireModuleForOrg(employee.org_id, 'leave');
    if (moduleGuardPost) return moduleGuardPost;

    const { requestId } = await params;
    const body = await request.json();

    const ctx = buildContextFromSession(employee, {
      channel: 'web',
      idempotencyKey: request.headers.get('Idempotency-Key') ?? undefined,
    });

    const result = await approveLeaveService(ctx, {
      requestId,
      action: body.action,
      reason: body.reason,
    });

    if (result.ok) {
      return NextResponse.json({
        success: true,
        message:
          body.action === 'approve' ? 'Leave request approved' : 'Leave request rejected',
        status: result.data.status,
        is_final: result.data.is_final,
      });
    }

    return serviceResultToLegacyResponse(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/leaves/approve/[requestId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    void request;
    const employee = await getAuthEmployee();
    requireCompanyContext(employee);
    const moduleGuardGet = await requireModuleForOrg(employee.org_id, 'leave');
    if (moduleGuardGet) return moduleGuardGet;
    const { requestId } = await params;

    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: {
        employee: {
          select: { id: true, first_name: true, last_name: true, department: true, email: true },
        },
        approver: {
          select: { id: true, first_name: true, last_name: true },
        },
      },
    });

    if (!leaveRequest) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    if (leaveRequest.company_id !== employee.org_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({
      leaveRequest: {
        ...leaveRequest,
        employee: leaveRequest.employee,
        approver: leaveRequest.approver,
      },
      canApprove:
        canProcessLeaveApproval(leaveRequest.status) &&
        leaveRequest.emp_id !== employee.id &&
        (await canActOnLeaveRequest({
          requesterId: leaveRequest.emp_id,
          approverId: employee.id,
          companyId: employee.org_id,
          approverRole: employee.primary_role,
        })),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to fetch approval information' }, { status: 500 });
  }
}
