/**
 * Payroll Advances API
 *
 * GET   /api/payroll-advances       — List payroll advance requests
 * POST  /api/payroll-advances       — Submit a payroll advance request
 * PATCH /api/payroll-advances?id=   — Approve/reject/cancel
 *
 * @module api/payroll-advances
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireCompanyContext, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import { hasPermission } from '@/lib/rbac';
import { assertModule } from '@/lib/core-functions/assert-module';
import { canActOnWorkflowRequest } from '@/lib/workflow-approval-routing';
import { applyWorkflowSubmitRouting } from '@/lib/workflow-submit-routing';

export const dynamic = 'force-dynamic';

function formatPendingApproverFromInclude(
  approver: {
    id: string;
    first_name: string;
    last_name: string;
    primary_role: string;
    department: string | null;
    designation: string | null;
  } | null
) {
  if (!approver) return null;
  return {
    id: approver.id,
    name: `${approver.first_name} ${approver.last_name}`.trim(),
    role: approver.designation || approver.primary_role,
    department: approver.department,
  };
}

export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    const moduleGuard = await assertModule(employee.org_id!, 'payroll');
    if (moduleGuard) return moduleGuard;

    const url = new URL(request.url);
    const status = url.searchParams.get('status');

    const isViewAll = hasPermission(employee.permissions, 'payroll.view_all');
    const canApproveRun = hasPermission(employee.permissions, 'payroll.approve');
    const canApproveTeam = hasPermission(employee.permissions, 'leave.approve_team');
    const where: Record<string, unknown> = { company_id: employee.org_id, deleted_at: null };

    if (!isViewAll) {
      if (status === 'pending' && (canApproveRun || canApproveTeam)) {
        where.OR = [{ emp_id: employee.id }, { current_approver_id: employee.id }];
      } else {
        where.emp_id = employee.id;
      }
    }
    if (status) where.status = status;

    const advances = await prisma.payrollAdvance.findMany({
      where,
      include: {
        Employee: { select: { first_name: true, last_name: true, department: true } },
        Approver: { select: { first_name: true, last_name: true } },
        CurrentApprover: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            primary_role: true,
            department: true,
            designation: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({
      advances: advances.map((row) => ({
        ...row,
        pendingApprover: formatPendingApproverFromInclude(row.CurrentApprover),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    const moduleGuard = await assertModule(employee.org_id!, 'payroll');
    if (moduleGuard) return moduleGuard;

    const body = (await request.json()) as {
      amount?: number;
      currency?: string;
      reason?: string;
      repaymentMonths?: number;
    };

    if (body.amount === undefined || body.amount <= 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'amount must be a positive number' } },
        { status: 400 }
      );
    }

    const repaymentMonths = body.repaymentMonths ?? 1;
    if (!Number.isInteger(repaymentMonths) || repaymentMonths < 1 || repaymentMonths > 24) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'repaymentMonths must be between 1 and 24' } },
        { status: 400 }
      );
    }

    const { approverRouting, pendingApprover } = await applyWorkflowSubmitRouting({
      workflowType: 'payroll_advance',
      companyId: employee.org_id,
      requesterId: employee.id,
      requesterName: `${employee.first_name} ${employee.last_name}`,
      entityLabel: 'payroll advance',
      notificationType: 'payroll_advance',
      notificationTitle: 'New Payroll Advance Request',
      notificationBody: `${employee.first_name} ${employee.last_name} requested a payroll advance of ${body.currency ?? 'INR'} ${body.amount}.`,
    });

    const advance = await prisma.payrollAdvance.create({
      data: {
        id: randomUUID(),
        emp_id: employee.id,
        company_id: employee.org_id,
        amount: body.amount,
        currency: body.currency ?? 'INR',
        reason: body.reason?.trim() || null,
        repayment_months: repaymentMonths,
        status: 'pending',
        current_approver_id: approverRouting.approverId,
      },
    });

    return NextResponse.json(
      {
        advance,
        pendingApprover,
        approverChainLength: approverRouting.allApproverIds.length,
        approverRoutingReason: approverRouting.reason,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    const moduleGuard = await assertModule(employee.org_id!, 'payroll');
    if (moduleGuard) return moduleGuard;

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'id is required' } }, { status: 400 });
    }

    const existing = await prisma.payrollAdvance.findFirst({
      where: { id, company_id: employee.org_id, deleted_at: null },
    });
    if (!existing) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Payroll advance not found' } }, { status: 404 });
    }

    const body = (await request.json()) as {
      action: 'approve' | 'reject' | 'cancel' | 'process';
      rejectionNote?: string;
    };

    const isSelf = existing.emp_id === employee.id;

    if (body.action === 'cancel') {
      if (!isSelf) {
        return NextResponse.json(
          { error: { code: 'FORBIDDEN', message: 'Only the requester can cancel their payroll advance' } },
          { status: 403 }
        );
      }
      if (!['pending', 'approved'].includes(existing.status)) {
        return NextResponse.json(
          { error: { code: 'CONFLICT', message: `Cannot cancel request in status: ${existing.status}` } },
          { status: 409 }
        );
      }
      await prisma.payrollAdvance.update({
        where: { id },
        data: { status: 'cancelled', current_approver_id: null },
      });
      return NextResponse.json({ success: true });
    }

    if (body.action === 'process') {
      requirePermissionGuard(employee, 'payroll.process');
      if (existing.status !== 'approved') {
        return NextResponse.json(
          { error: { code: 'CONFLICT', message: 'Only approved advances can be processed' } },
          { status: 409 }
        );
      }
      await prisma.payrollAdvance.update({
        where: { id },
        data: { status: 'processed', current_approver_id: null },
      });
      return NextResponse.json({ success: true });
    }

    if (isSelf) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Cannot approve your own payroll advance' } },
        { status: 403 }
      );
    }

    if (existing.status !== 'pending') {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: `Payroll advance is already ${existing.status}` } },
        { status: 409 }
      );
    }

    const isAuthorized =
      hasPermission(employee.permissions, 'payroll.view_all') ||
      hasPermission(employee.permissions, 'payroll.approve') ||
      (await canActOnWorkflowRequest({
        workflowType: 'payroll_advance',
        requesterId: existing.emp_id,
        approverId: employee.id,
        companyId: employee.org_id,
        approverRole: employee.primary_role,
      }));

    if (!isAuthorized) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'You are not authorized to approve this payroll advance' } },
        { status: 403 }
      );
    }

    const data: Record<string, unknown> = {
      approved_by: employee.id,
      approved_at: new Date(),
      current_approver_id: null,
    };

    if (body.action === 'approve') {
      data.status = 'approved';
    } else if (body.action === 'reject') {
      data.status = 'rejected';
      data.rejection_note = body.rejectionNote ?? null;
    } else {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid action' } }, { status: 400 });
    }

    await prisma.payrollAdvance.update({ where: { id }, data });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

function handleApiError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: { code: 'AUTH_ERROR', message: error.message } }, { status: error.status });
  }
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
  return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
}
