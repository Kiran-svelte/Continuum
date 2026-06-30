/**
 * Announcements API — RALPH-20260630-008
 *
 * GET  /api/announcements — List visible announcements for user
 * POST /api/announcements — Create announcement (HR/Admin only)
 *
 * Propagated to: app/hr/(main)/announcements/, employee portal dashboard
 *
 * @module api/announcements
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireCompanyContext, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import { hasPermission } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const url = new URL(request.url);
    const includeExpired = url.searchParams.get('includeExpired') === 'true';
    const canManage = hasPermission(employee.permissions, 'employee.edit_any');

    const now = new Date();

    const where: Record<string, unknown> = {
      company_id: employee.org_id,
      deleted_at: null,
    };

    if (!canManage) {
      where.published_at = { lte: now };
    }
    if (!includeExpired) {
      where.OR = [{ expires_at: null }, { expires_at: { gte: now } }];
    }

    const announcements = await prisma.announcement.findMany({
      where,
      orderBy: [{ pinned: 'desc' }, { published_at: 'desc' }, { created_at: 'desc' }],
      take: 50,
    });

    return NextResponse.json({ announcements });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'employee.edit_any');

    const body = await request.json() as {
      title: string;
      content: string;
      type?: string;
      pinned?: boolean;
      targetDept?: string;
      targetRole?: string;
      publishedAt?: string;
      expiresAt?: string;
    };

    if (!body.title?.trim() || !body.content?.trim()) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Title and content are required' } }, { status: 400 });
    }

    const announcement = await prisma.announcement.create({
      data: {
        id: crypto.randomUUID(),
        company_id: employee.org_id!,
        title: body.title.trim(),
        content: body.content.trim(),
        type: body.type ?? 'info',
        pinned: body.pinned ?? false,
        target_dept: body.targetDept ?? null,
        target_role: body.targetRole ?? null,
        published_at: body.publishedAt ? new Date(body.publishedAt) : new Date(),
        expires_at: body.expiresAt ? new Date(body.expiresAt) : null,
        created_by: employee.id,
      },
    });

    return NextResponse.json({ announcement }, { status: 201 });
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
