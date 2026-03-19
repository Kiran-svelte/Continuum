import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireRole, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// ─── GET ────────────────────────────────────────────────────────────────────

/**
 * GET /api/job-levels
 *
 * Returns all job levels for the authenticated user's company, ordered by rank.
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

    const jobLevels = await prisma.jobLevel.findMany({
      where: { company_id: employee.org_id! },
      orderBy: { rank: 'asc' },
    });

    return NextResponse.json({ jobLevels });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── POST ───────────────────────────────────────────────────────────────────

/**
 * POST /api/job-levels
 *
 * Creates a new job level.
 * Only accessible by admin and hr roles.
 *
 * Body:
 *   name        - level name (required)
 *   rank        - numeric rank/order (required)
 *   description - optional description
 */
export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    requireRole(employee, 'admin', 'hr');

    const body = await request.json();
    const { name, rank, description } = body;

    // ── Validation ──────────────────────────────────────────────────────
    const errors: string[] = [];

    if (!name || typeof name !== 'string' || !name.trim()) {
      errors.push('Name is required.');
    }

    if (rank === undefined || rank === null || typeof rank !== 'number') {
      errors.push('Rank must be a number.');
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(' ') }, { status: 400 });
    }

    // Check for duplicate name within the company
    const existing = await prisma.jobLevel.findFirst({
      where: {
        company_id: employee.org_id!,
        name: { equals: name.trim(), mode: 'insensitive' },
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A job level with this name already exists.' },
        { status: 409 }
      );
    }

    // ── Create ──────────────────────────────────────────────────────────
    const jobLevel = await prisma.jobLevel.create({
      data: {
        company_id: employee.org_id!,
        name: name.trim(),
        rank,
        description: description?.trim() || null,
      },
    });

    // ── Audit log ───────────────────────────────────────────────────────
    await createAuditLog({
      companyId: employee.org_id!,
      actorId: employee.id,
      action: 'JOB_LEVEL_CREATE',
      entityType: 'JobLevel',
      entityId: jobLevel.id,
      newState: {
        name: jobLevel.name,
        rank: jobLevel.rank,
        description: jobLevel.description,
      },
    });

    return NextResponse.json(
      { message: 'Job level created successfully.', jobLevel },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── PATCH ──────────────────────────────────────────────────────────────────

/**
 * PATCH /api/job-levels
 *
 * Updates an existing job level.
 * Only accessible by admin and hr roles.
 *
 * Body:
 *   id          - job level id (required)
 *   name        - level name (optional)
 *   rank        - numeric rank/order (optional)
 *   description - description (optional)
 */
export async function PATCH(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    requireRole(employee, 'admin', 'hr');

    const body = await request.json();
    const { id, name, rank, description } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Job level ID is required.' }, { status: 400 });
    }

    // Verify the entry exists and belongs to the same company
    const existing = await prisma.jobLevel.findFirst({
      where: { id, company_id: employee.org_id! },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Job level not found.' }, { status: 404 });
    }

    const previousState = {
      name: existing.name,
      rank: existing.rank,
      description: existing.description,
    };

    // Build update data — only include fields present in the body
    const updateData: Record<string, unknown> = {};
    if ('name' in body && name) updateData.name = name.trim();
    if ('rank' in body && typeof rank === 'number') updateData.rank = rank;
    if ('description' in body) updateData.description = description?.trim() || null;

    // If renaming, check for duplicate
    if (updateData.name && (updateData.name as string).toLowerCase() !== existing.name.toLowerCase()) {
      const duplicate = await prisma.jobLevel.findFirst({
        where: {
          company_id: employee.org_id!,
          name: { equals: updateData.name as string, mode: 'insensitive' },
          id: { not: id },
        },
        select: { id: true },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: 'A job level with this name already exists.' },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.jobLevel.update({
      where: { id },
      data: updateData,
    });

    // ── Audit log ───────────────────────────────────────────────────────
    await createAuditLog({
      companyId: employee.org_id!,
      actorId: employee.id,
      action: 'JOB_LEVEL_UPDATE',
      entityType: 'JobLevel',
      entityId: id,
      previousState,
      newState: updateData,
    });

    return NextResponse.json({ message: 'Job level updated.', jobLevel: updated });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── DELETE ─────────────────────────────────────────────────────────────────

/**
 * DELETE /api/job-levels
 *
 * Deletes a job level, only if it is not referenced by any employees.
 * Only accessible by admin and hr roles.
 *
 * Body:
 *   id - job level id (required)
 */
export async function DELETE(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    requireRole(employee, 'admin', 'hr');

    const body = await request.json();
    const { id } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Job level ID is required.' }, { status: 400 });
    }

    // Verify the entry exists and belongs to the same company
    const existing = await prisma.jobLevel.findFirst({
      where: { id, company_id: employee.org_id! },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Job level not found.' }, { status: 404 });
    }

    await prisma.jobLevel.delete({ where: { id } });

    // ── Audit log ───────────────────────────────────────────────────────
    await createAuditLog({
      companyId: employee.org_id!,
      actorId: employee.id,
      action: 'JOB_LEVEL_DELETE',
      entityType: 'JobLevel',
      entityId: id,
      previousState: {
        name: existing.name,
        rank: existing.rank,
        description: existing.description,
      },
    });

    return NextResponse.json({ message: 'Job level deleted.' });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
