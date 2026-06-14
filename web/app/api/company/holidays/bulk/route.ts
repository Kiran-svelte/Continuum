import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-service';
import { validateTenantAccess } from '@/lib/tenant-service';
import { randomUUID } from 'crypto';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * POST /api/company/holidays/bulk
 * Bulk import holidays (from country template or CSV)
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

    await validateTenantAccess(user.orgId);

    const body = await request.json();
    const { holidays, overwrite = false } = body;

    if (!Array.isArray(holidays) || holidays.length === 0) {
      return NextResponse.json(
        { error: 'holidays array is required' },
        { status: 400 }
      );
    }

    // Delete existing if overwrite
    if (overwrite) {
      await prisma.publicHoliday.deleteMany({
        where: {
          company_id: user.orgId,

        },
      });
    }

    // Create holidays
    // Note: PublicHoliday schema only has: id, company_id, name, date, country_code, is_custom, created_at
    const created = await prisma.publicHoliday.createMany({
      data: holidays.map(h => ({
        id: randomUUID(),
        company_id: user.orgId,
        name: h.name,
        date: new Date(h.date),
        country_code: h.countryCode || 'IN',
        is_custom: h.isCustom !== undefined ? h.isCustom : true,
      })),
      skipDuplicates: !overwrite,
    });

    await createAuditLog({
      companyId: user.orgId,
      actorId: user.id,
      action: 'holidays_bulk_imported',
      entityType: 'public_holiday',
      entityId: user.orgId,
      newState: {
        count: created.count,
        overwrite,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      message: `${created.count} holidays imported`,
      count: created.count,
    }, { status: 201 });
  } catch (error) {
    console.error('[BULK IMPORT HOLIDAYS] Error:', error);
    return NextResponse.json(
      { error: 'Failed to import holidays' },
      { status: 500 }
    );
  }
}



