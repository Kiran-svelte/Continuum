/**
 * Travel Request Detail API — RALPH-20260630-005
 *
 * GET    /api/travel-requests/[id] — Get request details with expenses
 * PATCH  /api/travel-requests/[id] — Approve, reject, cancel, or update
 * DELETE /api/travel-requests/[id] — Withdraw pending request (own only)
 *
 * Propagated to: app/hr/(main)/travel/, employee/travel
 *
 * @module api/travel-requests/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireCompanyContext, AuthError } from '@/lib/auth-guard';
import { hasPermission } from '@/lib/rbac';
import { assertModule } from '@/lib/core-functions/assert-module';
import type { TravelRequestStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const moduleGuard = await assertModule(employee.org_id!, 'expenses');
    if (moduleGuard) return moduleGuard;

    const { id } = await params;

    const request_ = await prisma.travelRequest.findFirst({
      where: { id, company_id: employee.org_id! },
      include: {
        Employee: { select: { id: true, first_name: true, last_name: true, department: true } },
        Approver: { select: { id: true, first_name: true, last_name: true } },
        expenses: {
          where: { deleted_at: null },
          select: { id: true, category: true, amount: true, currency: true, status: true, description: true },
        },
      },
    });

    if (!request_) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Travel request not found' } }, { status: 404 });
    }

    const isOwn = request_.emp_id === employee.id;
    const canViewAll = hasPermission(employee.permissions, 'expenses.view_all');

    if (!isOwn && !canViewAll) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Access denied' } }, { status: 403 });
    }

    return NextResponse.json({ travelRequest: request_ });
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

    const existing = await prisma.travelRequest.findFirst({
      where: { id, company_id: employee.org_id! },
    });
    if (!existing) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Travel request not found' } }, { status: 404 });
    }

    const body = await request.json() as {
      action?: 'approve' | 'reject' | 'cancel';
      approverNote?: string;
      purpose?: string;
      destination?: string;
      departureDate?: string;
      returnDate?: string;
      estimatedCost?: number;
      notes?: string;
    };

    const canApprove = hasPermission(employee.permissions, 'expenses.approve');
    const isOwn = existing.emp_id === employee.id;

    if (body.action === 'approve' || body.action === 'reject') {
      if (!canApprove) {
        return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'No permission to approve travel requests' } }, { status: 403 });
      }
      if (existing.status !== 'pending') {
        return NextResponse.json({ error: { code: 'INVALID_STATE', message: `Request is already ${existing.status}` } }, { status: 409 });
      }

      const updated = await prisma.travelRequest.update({
        where: { id },
        data: {
          status: body.action === 'approve' ? 'approved' : 'rejected',
          approved_by: employee.id,
          approved_at: new Date(),
          ...(body.approverNote !== undefined && { approver_note: body.approverNote }),
        },
      });
      return NextResponse.json({ travelRequest: updated });
    }

    if (body.action === 'cancel') {
      if (!isOwn && !canApprove) {
        return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Access denied' } }, { status: 403 });
      }
      const updated = await prisma.travelRequest.update({
        where: { id },
        data: { status: 'cancelled' },
      });
      return NextResponse.json({ travelRequest: updated });
    }

    if (!isOwn) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Access denied' } }, { status: 403 });
    }
    if (existing.status !== 'pending') {
      return NextResponse.json({ error: { code: 'INVALID_STATE', message: 'Can only edit pending requests' } }, { status: 409 });
    }

    const updated = await prisma.travelRequest.update({
      where: { id },
      data: {
        ...(body.purpose !== undefined && { purpose: body.purpose }),
        ...(body.destination !== undefined && { destination: body.destination }),
        ...(body.departureDate && { departure_date: new Date(body.departureDate) }),
        ...(body.returnDate && { return_date: new Date(body.returnDate) }),
        ...(body.estimatedCost !== undefined && { estimated_cost: body.estimatedCost }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
    });

    return NextResponse.json({ travelRequest: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const { id } = await params;

    const existing = await prisma.travelRequest.findFirst({
      where: { id, company_id: employee.org_id!, emp_id: employee.id },
    });
    if (!existing) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Travel request not found' } }, { status: 404 });
    }

    if (existing.status !== 'pending') {
      return NextResponse.json({ error: { code: 'INVALID_STATE', message: 'Can only withdraw pending requests' } }, { status: 409 });
    }

    await prisma.travelRequest.update({
      where: { id },
      data: { status: 'cancelled' },
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
