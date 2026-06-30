/**
 * Announcement Detail API — RALPH-20260630-008
 *
 * GET    /api/announcements/[id] — Get announcement
 * PATCH  /api/announcements/[id] — Update/pin/unpin
 * DELETE /api/announcements/[id] — Archive announcement
 *
 * @module api/announcements/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireCompanyContext, requirePermissionGuard, AuthError } from '@/lib/auth-guard';

export const dynamic = 'force-dynamic';

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const { id } = await params;

    const announcement = await prisma.announcement.findFirst({
      where: { id, company_id: employee.org_id!, deleted_at: null },
    });

    if (!announcement) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Announcement not found' } }, { status: 404 });
    }

    return NextResponse.json({ announcement });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'employee.edit_any');

    const { id } = await params;

    const existing = await prisma.announcement.findFirst({
      where: { id, company_id: employee.org_id!, deleted_at: null },
    });
    if (!existing) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Announcement not found' } }, { status: 404 });
    }

    const body = await request.json() as {
      title?: string;
      content?: string;
      type?: string;
      pinned?: boolean;
      targetDept?: string;
      publishedAt?: string;
      expiresAt?: string;
    };

    const updated = await prisma.announcement.update({
      where: { id },
      data: {
        ...(body.title && { title: body.title }),
        ...(body.content && { content: body.content }),
        ...(body.type && { type: body.type }),
        ...(body.pinned !== undefined && { pinned: body.pinned }),
        ...(body.targetDept !== undefined && { target_dept: body.targetDept }),
        ...(body.publishedAt !== undefined && { published_at: body.publishedAt ? new Date(body.publishedAt) : null }),
        ...(body.expiresAt !== undefined && { expires_at: body.expiresAt ? new Date(body.expiresAt) : null }),
      },
    });

    return NextResponse.json({ announcement: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'employee.edit_any');

    const { id } = await params;

    await prisma.announcement.update({
      where: { id },
      data: { deleted_at: new Date() },
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
