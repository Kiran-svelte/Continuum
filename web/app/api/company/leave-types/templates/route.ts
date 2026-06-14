import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-service';
import { validateTenantAccess } from '@/lib/tenant-service';
import { randomUUID } from 'crypto';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const VALID_CATEGORIES = ['common', 'statutory', 'special', 'unpaid'] as const;
const VALID_GENDER_FILTERS = ['male', 'female', 'all'] as const;

type LeaveCategory = (typeof VALID_CATEGORIES)[number];
type GenderFilter = (typeof VALID_GENDER_FILTERS)[number];

/**
 * Leave Type Templates
 * Pre-configured leave types for quick setup
 */

const LEAVE_TYPE_TEMPLATES = {
  india_standard: {
    name: 'India - Standard Package',
    description: 'Common leave types for Indian companies',
    leaveTypes: [
      {
        code: 'CL',
        name: 'Casual Leave',
        description: 'Short-term planned absences',
        category: 'common',
        defaultQuota: 12,
        paid: true,
        carryForward: true,
        maxCarryForward: 3,
        encashmentEnabled: false,
        minNotice: 1,
        maxConsecutive: 3,
        requiresDocument: false,
        canBeHalfDay: true,
        genderSpecific: 'all',
        confidential: false,
        color: '#3B82F6',
      },
      {
        code: 'SL',
        name: 'Sick Leave',
        description: 'Medical/health-related absences',
        category: 'common',
        defaultQuota: 10,
        paid: true,
        carryForward: false,
        maxCarryForward: 0,
        encashmentEnabled: false,
        minNotice: 0,
        maxConsecutive: 5,
        requiresDocument: true,
        documentMandatoryAfter: 3,
        canBeHalfDay: true,
        genderSpecific: 'all',
        confidential: false,
        color: '#EF4444',
      },
      {
        code: 'EL',
        name: 'Earned Leave / Privilege Leave',
        description: 'Accrued paid time off',
        category: 'common',
        defaultQuota: 15,
        paid: true,
        carryForward: true,
        maxCarryForward: 30,
        encashmentEnabled: true,
        encashmentMaxDays: 15,
        minNotice: 7,
        maxConsecutive: 15,
        requiresDocument: false,
        canBeHalfDay: false,
        genderSpecific: 'all',
        confidential: false,
        color: '#10B981',
      },
      {
        code: 'ML',
        name: 'Maternity Leave',
        description: 'Statutory maternity leave (26 weeks)',
        category: 'statutory',
        defaultQuota: 182, // 26 weeks * 7 days
        paid: true,
        carryForward: false,
        maxCarryForward: 0,
        encashmentEnabled: false,
        minNotice: 30,
        maxConsecutive: 182,
        requiresDocument: true,
        documentMandatoryAfter: 0,
        canBeHalfDay: false,
        genderSpecific: 'female',
        confidential: true,
        color: '#F472B6',
      },
      {
        code: 'PL',
        name: 'Paternity Leave',
        description: 'Paternity leave (15 days)',
        category: 'statutory',
        defaultQuota: 15,
        paid: true,
        carryForward: false,
        maxCarryForward: 0,
        encashmentEnabled: false,
        minNotice: 7,
        maxConsecutive: 15,
        requiresDocument: true,
        documentMandatoryAfter: 0,
        canBeHalfDay: false,
        genderSpecific: 'male',
        confidential: true,
        color: '#60A5FA',
      },
      {
        code: 'BL',
        name: 'Bereavement Leave',
        description: 'Leave for family emergencies',
        category: 'special',
        defaultQuota: 5,
        paid: true,
        carryForward: false,
        maxCarryForward: 0,
        encashmentEnabled: false,
        minNotice: 0,
        maxConsecutive: 5,
        requiresDocument: true,
        documentMandatoryAfter: 3,
        canBeHalfDay: false,
        genderSpecific: 'all',
        confidential: true,
        color: '#6B7280',
      },
      {
        code: 'CO',
        name: 'Compensatory Off',
        description: 'Time off for working on holidays/weekends',
        category: 'special',
        defaultQuota: 0, // Earned, not allocated
        paid: true,
        carryForward: true,
        maxCarryForward: 5,
        encashmentEnabled: false,
        minNotice: 1,
        maxConsecutive: 3,
        requiresDocument: false,
        canBeHalfDay: false,
        genderSpecific: 'all',
        confidential: false,
        color: '#F59E0B',
      },
      {
        code: 'LWP',
        name: 'Leave Without Pay',
        description: 'Unpaid leave',
        category: 'unpaid',
        defaultQuota: 30, // Configurable max
        paid: false,
        carryForward: false,
        maxCarryForward: 0,
        encashmentEnabled: false,
        minNotice: 3,
        maxConsecutive: 30,
        requiresDocument: false,
        canBeHalfDay: false,
        genderSpecific: 'all',
        confidential: false,
        color: '#9CA3AF',
      },
    ],
  },

  us_standard: {
    name: 'USA - Standard Package',
    description: 'Common leave types for US companies',
    leaveTypes: [
      {
        code: 'PTO',
        name: 'Paid Time Off',
        description: 'Combined vacation/sick time',
        category: 'common',
        defaultQuota: 15,
        paid: true,
        carryForward: true,
        maxCarryForward: 5,
        encashmentEnabled: true,
        encashmentMaxDays: 10,
        minNotice: 3,
        maxConsecutive: 10,
        requiresDocument: false,
        canBeHalfDay: true,
        genderSpecific: 'all',
        confidential: false,
        color: '#3B82F6',
      },
      {
        code: 'SL',
        name: 'Sick Leave',
        description: 'Medical leave',
        category: 'common',
        defaultQuota: 10,
        paid: true,
        carryForward: false,
        maxCarryForward: 0,
        encashmentEnabled: false,
        minNotice: 0,
        maxConsecutive: 10,
        requiresDocument: true,
        documentMandatoryAfter: 3,
        canBeHalfDay: true,
        genderSpecific: 'all',
        confidential: false,
        color: '#EF4444',
      },
      {
        code: 'FMLA',
        name: 'Family & Medical Leave',
        description: 'FMLA protected leave (12 weeks)',
        category: 'statutory',
        defaultQuota: 84, // 12 weeks
        paid: false,
        carryForward: false,
        maxCarryForward: 0,
        encashmentEnabled: false,
        minNotice: 30,
        maxConsecutive: 84,
        requiresDocument: true,
        documentMandatoryAfter: 0,
        canBeHalfDay: false,
        genderSpecific: 'all',
        confidential: true,
        color: '#8B5CF6',
      },
      {
        code: 'BL',
        name: 'Bereavement Leave',
        description: 'Leave for family emergencies',
        category: 'special',
        defaultQuota: 5,
        paid: true,
        carryForward: false,
        maxCarryForward: 0,
        encashmentEnabled: false,
        minNotice: 0,
        maxConsecutive: 5,
        requiresDocument: false,
        canBeHalfDay: false,
        genderSpecific: 'all',
        confidential: true,
        color: '#6B7280',
      },
    ],
  },

  minimal: {
    name: 'Minimal Package',
    description: 'Basic leave types for small teams',
    leaveTypes: [
      {
        code: 'PTO',
        name: 'Paid Time Off',
        description: 'All-purpose paid leave',
        category: 'common',
        defaultQuota: 20,
        paid: true,
        carryForward: true,
        maxCarryForward: 5,
        encashmentEnabled: false,
        minNotice: 2,
        maxConsecutive: 10,
        requiresDocument: false,
        canBeHalfDay: true,
        genderSpecific: 'all',
        confidential: false,
        color: '#3B82F6',
      },
      {
        code: 'UL',
        name: 'Unpaid Leave',
        description: 'Leave without pay',
        category: 'unpaid',
        defaultQuota: 15,
        paid: false,
        carryForward: false,
        maxCarryForward: 0,
        encashmentEnabled: false,
        minNotice: 5,
        maxConsecutive: 15,
        requiresDocument: false,
        canBeHalfDay: false,
        genderSpecific: 'all',
        confidential: false,
        color: '#9CA3AF',
      },
    ],
  },
};

/**
 * GET /api/company/leave-types/templates
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user || !user.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      templates: Object.entries(LEAVE_TYPE_TEMPLATES).map(([key, template]) => ({
        id: key,
        name: template.name,
        description: template.description,
        leaveTypeCount: template.leaveTypes.length,
        preview: template.leaveTypes.map(lt => ({
          code: lt.code,
          name: lt.name,
          category: lt.category,
          defaultQuota: lt.defaultQuota,
          paid: lt.paid,
        })),
      })),
    });
  } catch (error) {
    console.error('[GET LEAVE TYPE TEMPLATES] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/company/leave-types/templates
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || !user.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['admin', 'hr', 'super_admin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const companyId = user.orgId;
    await validateTenantAccess(companyId);

    const body = await request.json();
    const { templateId, overwrite = false } = body;

    if (!templateId || !LEAVE_TYPE_TEMPLATES[templateId as keyof typeof LEAVE_TYPE_TEMPLATES]) {
      return NextResponse.json(
        { error: 'Invalid template ID' },
        { status: 400 }
      );
    }

    // Check existing
    const existingTypes = await prisma.leaveType.findMany({
      where: { company_id: companyId, deleted_at: null },
    });

    if (existingTypes.length > 0 && !overwrite) {
      return NextResponse.json(
        { 
          error: 'Leave types already exist. Set overwrite=true to replace.',
          existingCount: existingTypes.length,
        },
        { status: 400 }
      );
    }

    const template = LEAVE_TYPE_TEMPLATES[templateId as keyof typeof LEAVE_TYPE_TEMPLATES];

    // Apply template
    const result = await prisma.$transaction(async (tx) => {
      if (overwrite && existingTypes.length > 0) {
        await tx.leaveType.updateMany({
          where: { company_id: companyId },
          data: { deleted_at: new Date() },
        });
      }

      const created = await Promise.all(
        template.leaveTypes.map(lt => {
          const category = VALID_CATEGORIES.includes(lt.category as LeaveCategory)
            ? (lt.category as LeaveCategory)
            : 'common';
          const genderSpecific = VALID_GENDER_FILTERS.includes(lt.genderSpecific as GenderFilter)
            ? (lt.genderSpecific as GenderFilter)
            : 'all';

          return tx.leaveType.create({
            data: {
              id: randomUUID(),
              company_id: companyId,
              code: lt.code,
              name: lt.name,
              category,
              default_quota: lt.defaultQuota,
              paid: lt.paid,
              carry_forward: lt.carryForward,
              max_carry_forward: lt.maxCarryForward,
              encashment_enabled: lt.encashmentEnabled,
              encashment_max_days: 'encashmentMaxDays' in lt ? (lt.encashmentMaxDays ?? 0) : 0,
              gender_specific: genderSpecific,
              is_active: true,
            },
          })
        })
      );

      return created;
    });

    await createAuditLog({
      companyId,
      actorId: user.id,
      action: 'leave_type_template_applied',
      entityType: 'leave_type',
      entityId: companyId,
      newState: {
        template_id: templateId,
        template_name: template.name,
        types_created: result.length,
        overwrite,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      message: `${template.name} applied successfully`,
      leaveTypesCreated: result.length,
      leaveTypes: result.map(lt => ({
        id: lt.id,
        code: lt.code,
        name: lt.name,
        category: lt.category,
      })),
    }, { status: 201 });
  } catch (error) {
    console.error('[APPLY LEAVE TYPE TEMPLATE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to apply template' },
      { status: 500 }
    );
  }
}


