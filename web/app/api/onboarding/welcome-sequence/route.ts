import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/email-service';
import { getCurrentUser } from '@/lib/auth-service';

export const dynamic = 'force-dynamic';

/** Days on which welcome-sequence emails are sent. */
const ALLOWED_DAYS = [0, 3, 7] as const;
type AllowedDay = typeof ALLOWED_DAYS[number];

/** Email subjects keyed by day index. */
const SUBJECT_MAP: Record<AllowedDay, string> = {
  0: 'Welcome to Continuum - start here',
  3: 'Day 3: complete your onboarding checklist',
  7: 'Day 7: activate your team and workflows',
};

/** Email body keyed by day index. */
const BODY_MAP: Record<AllowedDay, string> = {
  0: 'Finish workspace setup, add teammates, and configure approvals.',
  3: 'You are close. Connect CRM and complete required go-live tasks.',
  7: 'You are one step away from full value. Invite managers and run your first cycle.',
};

/**
 * POST /api/onboarding/welcome-sequence
 *
 * Triggers a welcome-sequence email for all non-terminated, non-deleted admins
 * in the specified company on the given day (0, 3, or 7).
 *
 * @param request - Must contain JSON body with { companyId: string, day: 0 | 3 | 7 }.
 * @returns JSON with success, recipients count, and day.
 * @throws Returns 400 if companyId or day is invalid; 401/403 for auth failures; 500 on internal error.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'hr', 'super_admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const companyId = String(body.companyId || '');
    const day = Number(body.day ?? -1) as AllowedDay;

    if (!companyId || !ALLOWED_DAYS.includes(day)) {
      return NextResponse.json({ error: 'companyId and day(0/3/7) are required' }, { status: 400 });
    }
    if (companyId !== user.orgId && user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Exclude soft-deleted and terminated admins to prevent sending emails to stale accounts.
    const admins = await prisma.employee.findMany({
      where: {
        org_id: companyId,
        primary_role: 'admin',
        status: { not: 'terminated' },
        deleted_at: null,
      },
      select: { email: true, first_name: true },
      take: 5,
    });

    void Promise.all(
      admins.map((admin) =>
        sendEmail(
          admin.email,
          SUBJECT_MAP[day],
          `<p>Hi ${admin.first_name || 'there'},</p><p>${BODY_MAP[day]}</p>`,
          { category: 'welcome-sequence' }
        ).catch((emailError: unknown) => {
          console.error(
            '[onboarding/welcome-sequence] Failed to send email to',
            admin.email,
            emailError instanceof Error ? emailError.message : String(emailError)
          );
        })
      )
    );

    return NextResponse.json({ success: true, recipients: admins.length, day });
  } catch (error) {
    console.error('[POST /api/onboarding/welcome-sequence] Error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
