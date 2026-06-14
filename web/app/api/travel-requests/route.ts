/**
 * Travel Requests API
 *
 * GET  /api/travel-requests       — List travel requests (own or all)
 * POST /api/travel-requests       — Submit new travel request
 * PATCH /api/travel-requests?id=  — Approve/reject/cancel
 *
 * @module api/travel-requests
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireCompanyContext, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import { hasPermission } from '@/lib/rbac';
import { randomUUID } from 'crypto';
import type { TravelRequestStatus } from '@prisma/client';
import { assertModule } from '@/lib/core-functions/assert-module';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    const moduleGuard = await assertModule(employee.org_id!, 'expenses');
    if (moduleGuard) return moduleGuard;

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const empId = url.searchParams.get('empId');

    const isViewAll = hasPermission(employee.permissions, 'travel.view_all');
    const where: Record<string, unknown> = { company_id: employee.org_id, deleted_at: null };

    if (!isViewAll) {
      where.emp_id = employee.id;
    } else if (empId) {
      where.emp_id = empId;
    }

    if (status) where.status = status;

    const requests = await prisma.travelRequest.findMany({
      where,
      include: {
        Employee: { select: { first_name: true, last_name: true, department: true } },
        Approver: { select: { first_name: true, last_name: true } },
        _count: { select: { expenses: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ requests });
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
      purpose?: string;
      destination?: string;
      departureDate?: string;
      returnDate?: string;
      estimatedCost?: number;
      currency?: string;
    };

    if (!body.purpose || !body.destination || !body.departureDate || !body.returnDate) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'purpose, destination, departureDate, and returnDate are required' } },
        { status: 400 }
      );
    }

    const departure = new Date(body.departureDate);
    const returnDate = new Date(body.returnDate);

    if (returnDate < departure) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'returnDate must be on or after departureDate' } },
        { status: 400 }
      );
    }

    const request_ = await prisma.travelRequest.create({
      data: {
        id: randomUUID(),
        emp_id: employee.id,
        company_id: employee.org_id,
        purpose: body.purpose.trim(),
        destination: body.destination.trim(),
        departure_date: departure,
        return_date: returnDate,
        estimated_cost: body.estimatedCost ?? null,
        currency: body.currency ?? 'INR',
        status: 'pending',
      },
    });

    return NextResponse.json({ request: request_ }, { status: 201 });
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

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'id is required' } }, { status: 400 });
    }

    const existing = await prisma.travelRequest.findFirst({ where: { id, company_id: employee.org_id } });
    if (!existing) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Travel request not found' } }, { status: 404 });
    }

    const body = await request.json() as {
      action: 'approve' | 'reject' | 'cancel';
      rejectionNote?: string;
    };

    const isSelf = existing.emp_id === employee.id;

    if (body.action === 'cancel') {
      if (!isSelf) {
        return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Only the employee can cancel their request' } }, { status: 403 });
      }
      if (!['pending', 'approved'].includes(existing.status)) {
        return NextResponse.json({ error: { code: 'CONFLICT', message: `Cannot cancel request in status: ${existing.status}` } }, { status: 409 });
      }
      await prisma.travelRequest.update({ where: { id }, data: { status: 'cancelled' } });
      return NextResponse.json({ success: true });
    }

    requirePermissionGuard(employee, 'travel.approve');

    const data: Record<string, unknown> = {};
    if (body.action === 'approve') {
      data.status = 'approved';
      data.approved_by = employee.id;
      data.approved_at = new Date();
    } else if (body.action === 'reject') {
      data.status = 'rejected';
      data.approved_by = employee.id;
      data.approved_at = new Date();
      data.rejection_note = body.rejectionNote ?? null;
    } else {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid action' } }, { status: 400 });
    }

    await prisma.travelRequest.update({ where: { id }, data });
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
