import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireRole, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/company/holidays
 *
 * Returns upcoming public holidays for the authenticated user's company.
 * Includes both company-specific and national holidays (country_code=IN).
 */
export async function GET() {
  try {
    const employee = await getAuthEmployee();

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const holidays = await prisma.publicHoliday.findMany({
      where: {
        OR: [
          { company_id: employee.org_id! },
          { company_id: null, country_code: 'IN' },
        ],
        date: { gte: today },
      },
      orderBy: { date: 'asc' },
      take: 20,
      select: {
        id: true,
        name: true,
        date: true,
        country_code: true,
        is_custom: true,
      },
    });

    return NextResponse.json({ holidays });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/company/holidays
 *
 * Creates a new custom holiday for the authenticated user's company.
 * Requires admin or hr role.
 */
export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();
    requireRole(employee, 'admin', 'hr');

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const body = await request.json();
    const { name, date, is_custom } = body;

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Holiday name is required and must be a non-empty string.' },
        { status: 400 }
      );
    }

    // Validate date
    if (!date || typeof date !== 'string') {
      return NextResponse.json(
        { error: 'A valid date is required.' },
        { status: 400 }
      );
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format.' },
        { status: 400 }
      );
    }

    const holiday = await prisma.publicHoliday.create({
      data: {
        name: name.trim(),
        date: parsedDate,
        company_id: employee.org_id!,
        is_custom: is_custom !== undefined ? Boolean(is_custom) : true,
        country_code: 'IN',
      },
      select: {
        id: true,
        name: true,
        date: true,
        country_code: true,
        is_custom: true,
      },
    });

    await createAuditLog({
      companyId: employee.org_id!,
      actorId: employee.id,
      action: AUDIT_ACTIONS.COMPANY_POLICY_UPDATE,
      entityType: 'PublicHoliday',
      entityId: holiday.id,
      newState: { name: holiday.name, date: holiday.date, is_custom: holiday.is_custom },
    });

    return NextResponse.json({ holiday }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/company/holidays
 *
 * Updates an existing custom holiday. Cannot edit national (non-custom) holidays.
 * Requires admin or hr role.
 */
export async function PUT(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();
    requireRole(employee, 'admin', 'hr');

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const body = await request.json();
    const { id, name, date } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Holiday id is required.' },
        { status: 400 }
      );
    }

    // Verify the holiday exists, belongs to this company, and is custom
    const existing = await prisma.publicHoliday.findFirst({
      where: {
        id,
        company_id: employee.org_id!,
        is_custom: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Holiday not found or cannot be edited. Only custom holidays can be modified.' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: { name?: string; date?: Date } = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Holiday name must be a non-empty string.' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (date !== undefined) {
      if (typeof date !== 'string') {
        return NextResponse.json(
          { error: 'A valid date is required.' },
          { status: 400 }
        );
      }
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format.' },
          { status: 400 }
        );
      }
      updateData.date = parsedDate;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'At least one field (name or date) must be provided for update.' },
        { status: 400 }
      );
    }

    const holiday = await prisma.publicHoliday.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        date: true,
        country_code: true,
        is_custom: true,
      },
    });

    await createAuditLog({
      companyId: employee.org_id!,
      actorId: employee.id,
      action: AUDIT_ACTIONS.COMPANY_POLICY_UPDATE,
      entityType: 'PublicHoliday',
      entityId: holiday.id,
      previousState: { name: existing.name, date: existing.date },
      newState: { name: holiday.name, date: holiday.date },
    });

    return NextResponse.json({ holiday });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/company/holidays
 *
 * Deletes a custom holiday. Cannot delete national (non-custom) holidays.
 * Requires admin or hr role.
 */
export async function DELETE(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();
    requireRole(employee, 'admin', 'hr');

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const body = await request.json();
    const { id } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Holiday id is required.' },
        { status: 400 }
      );
    }

    // Verify the holiday exists, belongs to this company, and is custom
    const existing = await prisma.publicHoliday.findFirst({
      where: {
        id,
        company_id: employee.org_id!,
        is_custom: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Holiday not found or cannot be deleted. Only custom holidays can be removed.' },
        { status: 404 }
      );
    }

    // PublicHoliday model has no deleted_at column (simple config data).
    // Hard delete is acceptable here; the audit log preserves the history.
    await prisma.publicHoliday.delete({
      where: { id },
    });

    await createAuditLog({
      companyId: employee.org_id!,
      actorId: employee.id,
      action: AUDIT_ACTIONS.COMPANY_POLICY_UPDATE,
      entityType: 'PublicHoliday',
      entityId: id,
      previousState: { name: existing.name, date: existing.date, is_custom: existing.is_custom },
    });

    return NextResponse.json({ success: true, message: 'Holiday deleted successfully.' });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
