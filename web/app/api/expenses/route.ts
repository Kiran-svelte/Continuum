/**
 * Expenses API
 *
 * GET   /api/expenses       — List expenses (own or all)
 * POST  /api/expenses       — Submit an expense claim
 * PATCH /api/expenses?id=   — Approve/reject expense
 *
 * @module api/expenses
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireCompanyContext, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import { hasPermission } from '@/lib/rbac';
import { randomUUID } from 'crypto';
import { assertModule } from '@/lib/core-functions/assert-module';


export const dynamic = 'force-dynamic';

/** Allowlist for expense categories. */
const VALID_EXPENSE_CATEGORIES = ['food', 'transport', 'accommodation', 'communication', 'supplies', 'training', 'entertainment', 'medical', 'other'] as const;

export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    const moduleGuard = await assertModule(employee.org_id!, 'expenses');
    if (moduleGuard) return moduleGuard;

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const travelRequestId = url.searchParams.get('travelRequestId');

    const isViewAll = hasPermission(employee.permissions, 'expenses.view_all');
    const where: Record<string, unknown> = { company_id: employee.org_id, deleted_at: null };

    if (!isViewAll) where.emp_id = employee.id;
    if (status) where.status = status;
    if (travelRequestId) where.travel_request_id = travelRequestId;

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        Employee: { select: { first_name: true, last_name: true } },
        Approver: { select: { first_name: true, last_name: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ expenses });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    const moduleGuard = await assertModule(employee.org_id!, 'expenses');
    if (moduleGuard) return moduleGuard;

    const body = await request.json() as {
      category?: string;
      amount?: number;
      currency?: string;
      description?: string;
      receiptUrl?: string;
      travelRequestId?: string;
    };

    if (!body.category || body.amount === undefined) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'category and amount are required' } },
        { status: 400 }
      );
    }

    if (!VALID_EXPENSE_CATEGORIES.includes(body.category as typeof VALID_EXPENSE_CATEGORIES[number])) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: `category must be one of: ${VALID_EXPENSE_CATEGORIES.join(', ')}` } },
        { status: 400 }
      );
    }

    if (body.amount <= 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'amount must be positive' } },
        { status: 400 }
      );
    }

    const expense = await prisma.expense.create({
      data: {
        id: randomUUID(),
        emp_id: employee.id,
        company_id: employee.org_id,
        category: body.category,
        amount: body.amount,
        currency: body.currency ?? 'INR',
        description: body.description ?? null,
        receipt_url: body.receiptUrl ?? null,
        travel_request_id: body.travelRequestId ?? null,
        status: 'pending',
      },
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    const moduleGuard = await assertModule(employee.org_id!, 'expenses');
    if (moduleGuard) return moduleGuard;
    requirePermissionGuard(employee, 'expenses.approve');

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'id is required' } }, { status: 400 });
    }

    const existing = await prisma.expense.findFirst({ where: { id, company_id: employee.org_id } });
    if (!existing) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Expense not found' } }, { status: 404 });
    }

    if (existing.status !== 'pending') {
      return NextResponse.json({ error: { code: 'CONFLICT', message: `Expense is already ${existing.status}` } }, { status: 409 });
    }

    const body = await request.json() as { action: 'approve' | 'reject'; rejectionNote?: string };
    const data: Record<string, unknown> = { approved_by: employee.id, approved_at: new Date() };

    if (body.action === 'approve') {
      data.status = 'approved';
    } else if (body.action === 'reject') {
      data.status = 'rejected';
      data.rejection_note = body.rejectionNote ?? null;
    } else {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'action must be approve or reject' } }, { status: 400 });
    }

    await prisma.expense.update({ where: { id }, data });
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
