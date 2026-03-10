import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/** Zod schema for PUT body validation. */
const preferencesPutSchema = z.object({
  emailEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  reminderTiming: z
    .record(z.unknown())
    .nullable()
    .optional(),
});

/**
 * Converts a Prisma NotificationPreference record to the API response shape.
 */
function toApiShape(record: {
  email_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  reminder_timing: unknown;
}) {
  return {
    emailEnabled: record.email_enabled,
    pushEnabled: record.push_enabled,
    inAppEnabled: record.in_app_enabled,
    reminderTiming: record.reminder_timing ?? null,
  };
}

/** Default preferences returned when no DB record exists. */
const DEFAULT_PREFERENCES = {
  emailEnabled: true,
  pushEnabled: true,
  inAppEnabled: true,
  reminderTiming: null,
};

/**
 * GET /api/notifications/preferences
 *
 * Returns the authenticated employee's notification preferences.
 * If no record exists yet, returns sensible defaults.
 *
 * Response: { preferences: { emailEnabled, pushEnabled, inAppEnabled, reminderTiming } }
 */
export async function GET() {
  try {
    const employee = await getAuthEmployee();

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) },
      );
    }

    const pref = await prisma.notificationPreference.findUnique({
      where: {
        emp_id_company_id: {
          emp_id: employee.id,
          company_id: employee.org_id,
        },
      },
    });

    if (!pref) {
      return NextResponse.json({ preferences: DEFAULT_PREFERENCES });
    }

    return NextResponse.json({ preferences: toApiShape(pref) });
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
 * PUT /api/notifications/preferences
 *
 * Upserts the NotificationPreference record for the authenticated employee.
 * Body: { emailEnabled?, pushEnabled?, inAppEnabled?, reminderTiming? }
 *
 * Uses Prisma upsert on the emp_id_company_id unique constraint.
 * Creates an audit log entry on every successful change.
 *
 * Response 200: { preferences: { emailEnabled, pushEnabled, inAppEnabled, reminderTiming } }
 */
export async function PUT(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) },
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = preferencesPutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { emailEnabled, pushEnabled, inAppEnabled, reminderTiming } = parsed.data;

    // Fetch existing record for audit trail (previous state)
    const existing = await prisma.notificationPreference.findUnique({
      where: {
        emp_id_company_id: {
          emp_id: employee.id,
          company_id: employee.org_id,
        },
      },
    });

    const previousState = existing ? toApiShape(existing) : null;

    // Prisma requires special handling for nullable Json fields:
    // - null must be Prisma.DbNull (not plain null)
    // - objects must be cast to Prisma.InputJsonValue
    const toJsonValue = (
      val: Record<string, unknown> | null | undefined
    ): Prisma.InputJsonValue | typeof Prisma.DbNull | undefined => {
      if (val === undefined) return undefined;
      if (val === null) return Prisma.DbNull;
      return val as Prisma.InputJsonValue;
    };

    const upserted = await prisma.notificationPreference.upsert({
      where: {
        emp_id_company_id: {
          emp_id: employee.id,
          company_id: employee.org_id,
        },
      },
      create: {
        emp_id: employee.id,
        company_id: employee.org_id,
        email_enabled: emailEnabled ?? true,
        push_enabled: pushEnabled ?? true,
        in_app_enabled: inAppEnabled ?? true,
        reminder_timing: toJsonValue(reminderTiming),
      },
      update: {
        ...(emailEnabled !== undefined && { email_enabled: emailEnabled }),
        ...(pushEnabled !== undefined && { push_enabled: pushEnabled }),
        ...(inAppEnabled !== undefined && { in_app_enabled: inAppEnabled }),
        ...(reminderTiming !== undefined && { reminder_timing: toJsonValue(reminderTiming) }),
      },
    });

    const newState = toApiShape(upserted);

    // Audit log
    await createAuditLog({
      companyId: employee.org_id,
      actorId: employee.id,
      action: AUDIT_ACTIONS.NOTIFICATION_PREFERENCES_UPDATE,
      entityType: 'NotificationPreference',
      entityId: upserted.id,
      previousState,
      newState,
    });

    return NextResponse.json({ preferences: newState });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
