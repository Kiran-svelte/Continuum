import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireRole, requireCompanyMembership, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// ─── Employee select fragment ───────────────────────────────────────────────

const employeeNameSelect = { select: { id: true, first_name: true, last_name: true, email: true } } as const;

// ─── GET ────────────────────────────────────────────────────────────────────

/**
 * GET /api/approval-hierarchy
 *
 * Returns all approval hierarchy entries for the authenticated user's company.
 * Includes employee and approver names for each level.
 */
export async function GET() {
  try {
    const authEmployee = await getAuthEmployee();
    const employee = requireCompanyMembership(authEmployee);

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const hierarchies = await prisma.approvalHierarchy.findMany({
      where: { company_id: employee.org_id! },
      include: {
        employee: employeeNameSelect,
        level1: employeeNameSelect,
        level2: employeeNameSelect,
        level3: employeeNameSelect,
        level4: employeeNameSelect,
        hr: employeeNameSelect,
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ hierarchies });
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
 * POST /api/approval-hierarchy
 *
 * Creates a new approval hierarchy entry.
 * Only accessible by admin and hr roles.
 *
 * Body:
 *   emp_id            - employee id (required, must be unique)
 *   level1_approver   - level 1 approver employee id (optional)
 *   level2_approver   - level 2 approver employee id (optional)
 *   level3_approver   - level 3 approver employee id (optional)
 *   level4_approver   - level 4 approver employee id (optional)
 *   hr_partner        - HR partner employee id (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const authEmployee = await getAuthEmployee();
    const employee = requireCompanyMembership(authEmployee);

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    requireRole(employee, 'admin', 'hr');

    const body = await request.json();
    const {
      emp_id,
      level1_approver,
      level2_approver,
      level3_approver,
      level4_approver,
      hr_partner,
    } = body;

    // ── Validation ──────────────────────────────────────────────────────
    if (!emp_id || typeof emp_id !== 'string') {
      return NextResponse.json({ error: 'Employee ID (emp_id) is required.' }, { status: 400 });
    }

    // Verify the target employee belongs to the same company
    const targetEmployee = await prisma.employee.findFirst({
      where: { id: emp_id, org_id: employee.org_id!, deleted_at: null },
      select: { id: true },
    });

    if (!targetEmployee) {
      return NextResponse.json(
        { error: 'Employee not found in your company.' },
        { status: 404 }
      );
    }

    // Check for existing hierarchy entry (emp_id is @unique)
    const existing = await prisma.approvalHierarchy.findUnique({
      where: { emp_id },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'An approval hierarchy already exists for this employee. Use PATCH to update.' },
        { status: 409 }
      );
    }

    // ── Create ──────────────────────────────────────────────────────────
    const hierarchy = await prisma.approvalHierarchy.create({
      data: {
        emp_id,
        company_id: employee.org_id!,
        level1_approver: level1_approver || null,
        level2_approver: level2_approver || null,
        level3_approver: level3_approver || null,
        level4_approver: level4_approver || null,
        hr_partner: hr_partner || null,
      },
      include: {
        employee: employeeNameSelect,
        level1: employeeNameSelect,
        level2: employeeNameSelect,
        level3: employeeNameSelect,
        level4: employeeNameSelect,
        hr: employeeNameSelect,
      },
    });

    // ── Audit log ───────────────────────────────────────────────────────
    await createAuditLog({
      companyId: employee.org_id!,
      actorId: employee.id,
      action: 'APPROVAL_HIERARCHY_CREATE',
      entityType: 'ApprovalHierarchy',
      entityId: hierarchy.id,
      newState: {
        emp_id,
        level1_approver: level1_approver || null,
        level2_approver: level2_approver || null,
        level3_approver: level3_approver || null,
        level4_approver: level4_approver || null,
        hr_partner: hr_partner || null,
      },
    });

    return NextResponse.json(
      { message: 'Approval hierarchy created successfully.', hierarchy },
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
 * PATCH /api/approval-hierarchy
 *
 * Updates an existing approval hierarchy entry.
 * Only accessible by admin and hr roles.
 *
 * Body:
 *   id                - hierarchy id (required)
 *   level1_approver   - level 1 approver employee id (optional)
 *   level2_approver   - level 2 approver employee id (optional)
 *   level3_approver   - level 3 approver employee id (optional)
 *   level4_approver   - level 4 approver employee id (optional)
 *   hr_partner        - HR partner employee id (optional)
 */
export async function PATCH(request: NextRequest) {
  try {
    const authEmployee = await getAuthEmployee();
    const employee = requireCompanyMembership(authEmployee);

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    requireRole(employee, 'admin', 'hr');

    const body = await request.json();
    const {
      id,
      level1_approver,
      level2_approver,
      level3_approver,
      level4_approver,
      hr_partner,
    } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Hierarchy ID is required.' }, { status: 400 });
    }

    // Verify the entry exists and belongs to the same company
    const existing = await prisma.approvalHierarchy.findFirst({
      where: { id, company_id: employee.org_id! },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Approval hierarchy entry not found.' },
        { status: 404 }
      );
    }

    const previousState = {
      level1_approver: existing.level1_approver,
      level2_approver: existing.level2_approver,
      level3_approver: existing.level3_approver,
      level4_approver: existing.level4_approver,
      hr_partner: existing.hr_partner,
    };

    // Build update data — only include fields that are present in the body
    const updateData: Record<string, string | null> = {};
    if ('level1_approver' in body) updateData.level1_approver = level1_approver || null;
    if ('level2_approver' in body) updateData.level2_approver = level2_approver || null;
    if ('level3_approver' in body) updateData.level3_approver = level3_approver || null;
    if ('level4_approver' in body) updateData.level4_approver = level4_approver || null;
    if ('hr_partner' in body) updateData.hr_partner = hr_partner || null;

    const updated = await prisma.approvalHierarchy.update({
      where: { id },
      data: updateData,
      include: {
        employee: employeeNameSelect,
        level1: employeeNameSelect,
        level2: employeeNameSelect,
        level3: employeeNameSelect,
        level4: employeeNameSelect,
        hr: employeeNameSelect,
      },
    });

    // ── Audit log ───────────────────────────────────────────────────────
    await createAuditLog({
      companyId: employee.org_id!,
      actorId: employee.id,
      action: 'APPROVAL_HIERARCHY_UPDATE',
      entityType: 'ApprovalHierarchy',
      entityId: id,
      previousState,
      newState: updateData,
    });

    return NextResponse.json({ message: 'Approval hierarchy updated.', hierarchy: updated });
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
 * DELETE /api/approval-hierarchy
 *
 * Removes an approval hierarchy entry.
 * Only accessible by admin and hr roles.
 *
 * Body:
 *   id - hierarchy id (required)
 */
export async function DELETE(request: NextRequest) {
  try {
    const authEmployee = await getAuthEmployee();
    const employee = requireCompanyMembership(authEmployee);

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
      return NextResponse.json({ error: 'Hierarchy ID is required.' }, { status: 400 });
    }

    // Verify the entry exists and belongs to the same company
    const existing = await prisma.approvalHierarchy.findFirst({
      where: { id, company_id: employee.org_id! },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Approval hierarchy entry not found.' },
        { status: 404 }
      );
    }

    await prisma.approvalHierarchy.delete({ where: { id } });

    // ── Audit log ───────────────────────────────────────────────────────
    await createAuditLog({
      companyId: employee.org_id!,
      actorId: employee.id,
      action: 'APPROVAL_HIERARCHY_DELETE',
      entityType: 'ApprovalHierarchy',
      entityId: id,
      previousState: {
        emp_id: existing.emp_id,
        level1_approver: existing.level1_approver,
        level2_approver: existing.level2_approver,
        level3_approver: existing.level3_approver,
        level4_approver: existing.level4_approver,
        hr_partner: existing.hr_partner,
      },
    });

    return NextResponse.json({ message: 'Approval hierarchy deleted.' });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

