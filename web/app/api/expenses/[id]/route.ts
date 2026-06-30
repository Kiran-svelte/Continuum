/**
 * Expense Detail API — RALPH-20260630-004
 *
 * GET    /api/expenses/[id] — Get expense claim details
 * PATCH  /api/expenses/[id] — Approve, reject, or update expense
 * DELETE /api/expenses/[id] — Withdraw pending expense (own only)
 *
 * Propagated to: app/hr/(main)/expenses/, app/hr/(main)/travel/
 *
 * @module api/expenses/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireCompanyContext, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import { hasPermission } from '@/lib/rbac';
import { assertModule } from '@/lib/core-functions/assert-module';

export const dynamic = 'force-dynamic';

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const moduleGuard = await assertModule(employee.org_id!, 'expenses');
    if (moduleGuard) return moduleGuard;

    const { id } = await params;

    const expense = await prisma.expense.findFirst({
      where: { id, company_id: employee.org_id!, deleted_at: null },
      include: {
        Employee: { select: { id: true, first_name: true, last_name: true, department: true } },
        Approver: { select: { id: true, first_name: true, last_name: true } },
      },
    });

    if (!expense) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Expense not found' } }, { status: 404 });
    }

    const isOwn = expense.emp_id === employee.id;
    const canViewAll = hasPermission(employee.permissions, 'expenses.view_all');

    if (!isOwn && !canViewAll) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Access denied' } }, { status: 403 });
    }

    return NextResponse.json({ expense });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const moduleGuard = await assertModule(employee.org_id!, 'expenses');
    if (moduleGuard) return moduleGuard;

    const { id } = await params;

    const existing = await prisma.expense.findFirst({
      where: { id, company_id: employee.org_id!, deleted_at: null },
    });
    if (!existing) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Expense not found' } }, { status: 404 });
    }

    const body = await request.json() as {
      action?: 'approve' | 'reject';
      approverNote?: string;
      category?: string;
      amount?: number;
      description?: string;
      receiptUrl?: string;
    };

    const canApprove = hasPermission(employee.permissions, 'expenses.approve');
    const isOwn = existing.emp_id === employee.id;

    if (body.action === 'approve' || body.action === 'reject') {
      if (!canApprove) {
        return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'No permission to approve expenses' } }, { status: 403 });
      }
      if (existing.status !== 'pending') {
        return NextResponse.json({ error: { code: 'INVALID_STATE', message: `Expense is already ${existing.status}` } }, { status: 409 });
      }

      const updated = await prisma.expense.update({
        where: { id },
        data: {
          status: body.action === 'approve' ? 'approved' : 'rejected',
          approved_by: employee.id,
          approved_at: new Date(),
          ...(body.approverNote !== undefined && { approver_note: body.approverNote }),
        },
      });
      return NextResponse.json({ expense: updated });
    }

    if (!isOwn) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Access denied' } }, { status: 403 });
    }
    if (existing.status !== 'pending') {
      return NextResponse.json({ error: { code: 'INVALID_STATE', message: 'Can only edit pending expenses' } }, { status: 409 });
    }

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        ...(body.category && { category: body.category as never }),
        ...(body.amount !== undefined && { amount: body.amount }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.receiptUrl !== undefined && { receipt_url: body.receiptUrl }),
      },
    });

    return NextResponse.json({ expense: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const { id } = await params;

    const existing = await prisma.expense.findFirst({
      where: { id, company_id: employee.org_id!, deleted_at: null, emp_id: employee.id },
    });
    if (!existing) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Expense not found' } }, { status: 404 });
    }

    if (existing.status !== 'pending') {
      return NextResponse.json({ error: { code: 'INVALID_STATE', message: 'Can only withdraw pending expenses' } }, { status: 409 });
    }

    await prisma.expense.update({
      where: { id },
      data: { deleted_at: new Date(), status: 'rejected' },
    });

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
