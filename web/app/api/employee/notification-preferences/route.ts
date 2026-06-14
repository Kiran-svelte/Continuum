/**
 * GET/PUT /api/employee/notification-preferences
 * Employee self-service notification preferences.
 * Allows employees to toggle which notifications they receive
 * (email on leave approval, push on payslip, etc.).
 *
 * @module api/employee/notification-preferences
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';

export const dynamic = 'force-dynamic';

/** Available notification event types. */
const NOTIFICATION_EVENTS = [
  'leave_approved',
  'leave_rejected',
  'leave_reminder',
  'payslip_generated',
  'reimbursement_approved',
  'reimbursement_rejected',
  'attendance_reminder',
  'shift_change',
  'announcement',
  'policy_update',
] as const;

/** Available notification channels. */
const NOTIFICATION_CHANNELS = ['email', 'push', 'in_app'] as const;

const preferencesSchema = z.object({
  preferences: z.record(
    z.enum(NOTIFICATION_EVENTS),
    z.object({
      email: z.boolean().default(true),
      push: z.boolean().default(true),
      in_app: z.boolean().default(true),
    })
  ),
});

/**
 * GET handler: Fetch current notification preferences for the employee.
 */
export async function GET(request: NextRequest) {
  try {
    void request;
    const employee = await getAuthEmployee();

    const settings = await prisma.employee.findUnique({
      where: { id: employee.id },
      select: { notification_preferences: true },
    });

    const stored = parsePreferences(settings?.notification_preferences);

    // Build full preferences with defaults for any missing events
    const preferences: Record<string, Record<string, boolean>> = {};
    for (const event of NOTIFICATION_EVENTS) {
      preferences[event] = {
        email: stored[event]?.email ?? true,
        push: stored[event]?.push ?? true,
        in_app: stored[event]?.in_app ?? true,
      };
    }

    return NextResponse.json({
      preferences,
      availableEvents: NOTIFICATION_EVENTS,
      availableChannels: NOTIFICATION_CHANNELS,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[NOTIFICATION PREFS GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT handler: Update notification preferences.
 */
export async function PUT(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();

    const body = await request.json();
    const parsed = preferencesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { preferences } = parsed.data;

    await prisma.employee.update({
      where: { id: employee.id },
      data: {
        notification_preferences: JSON.parse(JSON.stringify(preferences)),
        updated_at: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      preferences,
      message: 'Notification preferences updated',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[NOTIFICATION PREFS PUT] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Parse stored notification preferences from the database.
 */
function parsePreferences(
  raw: unknown
): Record<string, Record<string, boolean>> {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, Record<string, boolean>>;
  }
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
