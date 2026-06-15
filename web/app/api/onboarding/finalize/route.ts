import { NextResponse } from 'next/server';
import { prismaDirect } from '@/lib/prisma';
import { getAuthEmployee, requireCompanyContext, AuthError, requirePermissionGuard} from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { sendWelcomeEmail } from '@/lib/email-service';
import { completeOnboardingState } from '@/lib/onboarding/server';
import { resolveCompanyEmailNotificationSettings, shouldSendCompanyEmail } from '@/lib/company-email-notifications';
import { hydrateAuthResponseCookies } from '@/lib/auth-state-cookies';
import {
  ONBOARDING_COMPLETE_RETRY_MESSAGE,
  logOnboardingApiError,
  onboardingSafeErrorBody,
} from '@/lib/onboarding/api-errors';

export const dynamic = 'force-dynamic';

/**
 * POST /api/onboarding/finalize
 *
 * Lightweight endpoint for the final invite-team step.
 * It avoids compiling/executing the full onboarding configuration pipeline.
 */
export async function POST() {
  let employeeIdForLog: string | undefined;
  let companyIdForLog: string | undefined;

  try {
    const employee = await getAuthEmployee();
    employeeIdForLog = employee.id;
    requireCompanyContext(employee);

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    requirePermissionGuard(employee, 'employee.onboard');

    const companyId = employee.org_id;
    companyIdForLog = companyId;
    const companySnapshot = await prismaDirect.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    });

    if (!companySnapshot) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const employeeProfile = await prismaDirect.employee.findUnique({
      where: { id: employee.id },
      select: {
        id: true,
        department: true,
        designation: true,
        date_of_joining: true,
        manager_id: true,
        primary_role: true,
      },
    });

    if (!employeeProfile) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    const missingFields = [
      !employeeProfile.department ? 'employee.department' : null,
      !employeeProfile.designation ? 'employee.designation' : null,
      !employeeProfile.date_of_joining ? 'employee.date_of_joining' : null,
      !employeeProfile.manager_id ? 'employee.manager_id' : null,
    ].filter((field): field is string => Boolean(field));

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot finalize onboarding - missing required fields',
          missing_fields: missingFields,
        },
        { status: 400 }
      );
    }

    const didComplete = await prismaDirect.$transaction(async (tx) => {
      return completeOnboardingState(tx, companyId, employee.id);
    }, { maxWait: 30000, timeout: 90000 });

    if (didComplete) {
      await createAuditLog({
        companyId,
        actorId: employee.id,
        action: AUDIT_ACTIONS.COMPANY_ONBOARDING_COMPLETE,
        entityType: 'Company',
        entityId: companyId,
        newState: { onboarding_completed: true, completion_mode: 'finalize_only' },
      });

      const empName = `${employee.first_name} ${employee.last_name}`.trim() || employee.email;
      const companyName = companySnapshot.name || 'your company';
      const companySettings = await prismaDirect.companySettings.findUnique({
        where: { company_id: companyId },
        select: { email_notifications: true },
      });
      const emailNotificationSettings = resolveCompanyEmailNotificationSettings(
        companySettings?.email_notifications
      );

      if (shouldSendCompanyEmail(emailNotificationSettings, 'general')) {
        sendWelcomeEmail(employee.email, empName, companyName).catch((err) => {
          console.error('[ONBOARDING FINALIZE] Failed to send welcome email:', err);
        });
      }
    }

    const response = NextResponse.json({ success: true });

    await hydrateAuthResponseCookies(response, {
      employeeId: employee.id,
      primaryRole: employee.primary_role,
      secondaryRoles: employee.secondary_roles,
      orgId: employee.org_id,
    });

    return response;
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    logOnboardingApiError('finalize', error, {
      companyId: companyIdForLog,
      userId: employeeIdForLog,
    });

    return NextResponse.json(
      onboardingSafeErrorBody('ONBOARDING_FINALIZE_FAILED', ONBOARDING_COMPLETE_RETRY_MESSAGE),
      { status: 500 }
    );
  }
}
