import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireRole, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const VALID_CATEGORIES = ['common', 'statutory', 'special', 'unpaid'] as const;
const VALID_GENDER_FILTERS = ['male', 'female', 'all'] as const;

/**
 * GET /api/company/leave-types
 *
 * Returns the active leave types configured for the authenticated employee's
 * company.  The system is fully config-driven: leave types MUST be set up
 * during onboarding.  If no company-specific types exist the response
 * returns an empty array — the UI should prompt the admin to complete
 * onboarding rather than falling back to a hardcoded catalog.
 *
 * Response shape:
 *   { leaveTypes: [{ code, name, defaultQuota, carryForward, paid, genderSpecific, category }], configured: boolean }
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

    const dbTypes = await prisma.leaveType.findMany({
      where: {
        company_id: employee.org_id!,
        is_active: true,
        deleted_at: null,
      },
      orderBy: { code: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        default_quota: true,
        carry_forward: true,
        max_carry_forward: true,
        encashment_enabled: true,
        encashment_max_days: true,
        paid: true,
        gender_specific: true,
        category: true,
        is_active: true,
      },
    });

    return NextResponse.json({
      leaveTypes: dbTypes.map((t) => ({
        id: t.id,
        code: t.code,
        name: t.name,
        defaultQuota: t.default_quota,
        carryForward: t.carry_forward,
        maxCarryForward: t.max_carry_forward,
        encashmentEnabled: t.encashment_enabled,
        encashmentMaxDays: t.encashment_max_days,
        paid: t.paid,
        genderSpecific: t.gender_specific ?? 'all',
        category: t.category,
        isActive: t.is_active,
      })),
      configured: dbTypes.length > 0,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/company/leave-types
 *
 * Creates a new leave type for the authenticated employee's company.
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
    const {
      code,
      name,
      category,
      defaultQuota,
      carryForward,
      maxCarryForward,
      encashmentEnabled,
      encashmentMaxDays,
      paid,
      genderSpecific,
    } = body;

    // Validate required fields
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return NextResponse.json(
        { error: 'code is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'name is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    const quota = typeof defaultQuota === 'number' ? defaultQuota : 0;
    if (quota < 0) {
      return NextResponse.json(
        { error: 'defaultQuota must be >= 0' },
        { status: 400 }
      );
    }

    // Validate optional gender_specific
    if (genderSpecific && !VALID_GENDER_FILTERS.includes(genderSpecific)) {
      return NextResponse.json(
        { error: `genderSpecific must be one of: ${VALID_GENDER_FILTERS.join(', ')}` },
        { status: 400 }
      );
    }

    // Check for duplicate code within the same company
    const existing = await prisma.leaveType.findUnique({
      where: {
        company_id_code: {
          company_id: employee.org_id!,
          code: code.trim().toUpperCase(),
        },
      },
      select: { id: true, deleted_at: true },
    });

    if (existing && !existing.deleted_at) {
      return NextResponse.json(
        { error: `A leave type with code '${code.trim().toUpperCase()}' already exists` },
        { status: 409 }
      );
    }

    // If a soft-deleted record exists with the same code, we can reactivate by creating fresh
    // or just create new. For simplicity, if soft-deleted exists, update it instead.
    let leaveType;
    if (existing && existing.deleted_at) {
      leaveType = await prisma.leaveType.update({
        where: { id: existing.id },
        data: {
          name: name.trim(),
          category,
          default_quota: quota,
          carry_forward: carryForward ?? false,
          max_carry_forward: typeof maxCarryForward === 'number' ? maxCarryForward : 0,
          encashment_enabled: encashmentEnabled ?? false,
          encashment_max_days: typeof encashmentMaxDays === 'number' ? encashmentMaxDays : 0,
          paid: paid ?? true,
          gender_specific: genderSpecific ?? null,
          is_active: true,
          deleted_at: null,
        },
      });
    } else {
      leaveType = await prisma.leaveType.create({
        data: {
          company_id: employee.org_id!,
          code: code.trim().toUpperCase(),
          name: name.trim(),
          category,
          default_quota: quota,
          carry_forward: carryForward ?? false,
          max_carry_forward: typeof maxCarryForward === 'number' ? maxCarryForward : 0,
          encashment_enabled: encashmentEnabled ?? false,
          encashment_max_days: typeof encashmentMaxDays === 'number' ? encashmentMaxDays : 0,
          paid: paid ?? true,
          gender_specific: genderSpecific ?? null,
          is_active: true,
        },
      });
    }

    await createAuditLog({
      companyId: employee.org_id!,
      actorId: employee.id,
      action: AUDIT_ACTIONS.COMPANY_POLICY_UPDATE,
      entityType: 'LeaveType',
      entityId: leaveType.id,
      newState: {
        code: leaveType.code,
        name: leaveType.name,
        category: leaveType.category,
        default_quota: leaveType.default_quota,
        carry_forward: leaveType.carry_forward,
        max_carry_forward: leaveType.max_carry_forward,
        encashment_enabled: leaveType.encashment_enabled,
        encashment_max_days: leaveType.encashment_max_days,
        paid: leaveType.paid,
        gender_specific: leaveType.gender_specific,
      },
    });

    return NextResponse.json(
      {
        id: leaveType.id,
        code: leaveType.code,
        name: leaveType.name,
        category: leaveType.category,
        defaultQuota: leaveType.default_quota,
        carryForward: leaveType.carry_forward,
        maxCarryForward: leaveType.max_carry_forward,
        encashmentEnabled: leaveType.encashment_enabled,
        encashmentMaxDays: leaveType.encashment_max_days,
        paid: leaveType.paid,
        genderSpecific: leaveType.gender_specific ?? 'all',
        isActive: leaveType.is_active,
      },
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

/**
 * PUT /api/company/leave-types
 *
 * Updates an existing leave type. Cannot change the code (unique identifier).
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
    const { id, ...fields } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    // Verify leave type belongs to the employee's company
    const existing = await prisma.leaveType.findUnique({
      where: { id },
    });

    if (!existing || existing.company_id !== employee.org_id!) {
      return NextResponse.json(
        { error: 'Leave type not found' },
        { status: 404 }
      );
    }

    if (existing.deleted_at) {
      return NextResponse.json(
        { error: 'Cannot update a deleted leave type' },
        { status: 400 }
      );
    }

    // Validate optional fields
    if (fields.category && !VALID_CATEGORIES.includes(fields.category)) {
      return NextResponse.json(
        { error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    if (fields.genderSpecific && !VALID_GENDER_FILTERS.includes(fields.genderSpecific)) {
      return NextResponse.json(
        { error: `genderSpecific must be one of: ${VALID_GENDER_FILTERS.join(', ')}` },
        { status: 400 }
      );
    }

    if (typeof fields.defaultQuota === 'number' && fields.defaultQuota < 0) {
      return NextResponse.json(
        { error: 'defaultQuota must be >= 0' },
        { status: 400 }
      );
    }

    // Build update data from provided fields (only update what's sent)
    const updateData: Record<string, unknown> = {};

    if (typeof fields.name === 'string' && fields.name.trim().length > 0) {
      updateData.name = fields.name.trim();
    }
    if (fields.category) {
      updateData.category = fields.category;
    }
    if (typeof fields.defaultQuota === 'number') {
      updateData.default_quota = fields.defaultQuota;
    }
    if (typeof fields.carryForward === 'boolean') {
      updateData.carry_forward = fields.carryForward;
    }
    if (typeof fields.maxCarryForward === 'number') {
      updateData.max_carry_forward = fields.maxCarryForward;
    }
    if (typeof fields.encashmentEnabled === 'boolean') {
      updateData.encashment_enabled = fields.encashmentEnabled;
    }
    if (typeof fields.encashmentMaxDays === 'number') {
      updateData.encashment_max_days = fields.encashmentMaxDays;
    }
    if (typeof fields.paid === 'boolean') {
      updateData.paid = fields.paid;
    }
    if (fields.genderSpecific !== undefined) {
      updateData.gender_specific = fields.genderSpecific === 'all' ? null : fields.genderSpecific;
    }

    const previousState = {
      name: existing.name,
      category: existing.category,
      default_quota: existing.default_quota,
      carry_forward: existing.carry_forward,
      max_carry_forward: existing.max_carry_forward,
      encashment_enabled: existing.encashment_enabled,
      encashment_max_days: existing.encashment_max_days,
      paid: existing.paid,
      gender_specific: existing.gender_specific,
    };

    const updated = await prisma.leaveType.update({
      where: { id },
      data: updateData,
    });

    await createAuditLog({
      companyId: employee.org_id!,
      actorId: employee.id,
      action: AUDIT_ACTIONS.COMPANY_POLICY_UPDATE,
      entityType: 'LeaveType',
      entityId: updated.id,
      previousState,
      newState: {
        name: updated.name,
        category: updated.category,
        default_quota: updated.default_quota,
        carry_forward: updated.carry_forward,
        max_carry_forward: updated.max_carry_forward,
        encashment_enabled: updated.encashment_enabled,
        encashment_max_days: updated.encashment_max_days,
        paid: updated.paid,
        gender_specific: updated.gender_specific,
      },
    });

    return NextResponse.json({
      id: updated.id,
      code: updated.code,
      name: updated.name,
      category: updated.category,
      defaultQuota: updated.default_quota,
      carryForward: updated.carry_forward,
      maxCarryForward: updated.max_carry_forward,
      encashmentEnabled: updated.encashment_enabled,
      encashmentMaxDays: updated.encashment_max_days,
      paid: updated.paid,
      genderSpecific: updated.gender_specific ?? 'all',
      isActive: updated.is_active,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/company/leave-types
 *
 * Soft-deletes a leave type (sets deleted_at and is_active = false).
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
        { error: 'id is required' },
        { status: 400 }
      );
    }

    // Verify leave type belongs to the employee's company
    const existing = await prisma.leaveType.findUnique({
      where: { id },
    });

    if (!existing || existing.company_id !== employee.org_id!) {
      return NextResponse.json(
        { error: 'Leave type not found' },
        { status: 404 }
      );
    }

    if (existing.deleted_at) {
      return NextResponse.json(
        { error: 'Leave type is already deleted' },
        { status: 400 }
      );
    }

    // Soft delete: set deleted_at and deactivate
    const deleted = await prisma.leaveType.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        is_active: false,
      },
    });

    await createAuditLog({
      companyId: employee.org_id!,
      actorId: employee.id,
      action: AUDIT_ACTIONS.COMPANY_POLICY_UPDATE,
      entityType: 'LeaveType',
      entityId: deleted.id,
      previousState: {
        is_active: existing.is_active,
        deleted_at: existing.deleted_at,
      },
      newState: {
        is_active: false,
        deleted_at: deleted.deleted_at,
        soft_deleted: true,
      },
    });

    return NextResponse.json({
      success: true,
      id: deleted.id,
      code: deleted.code,
      message: `Leave type '${deleted.name}' has been deactivated`,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
