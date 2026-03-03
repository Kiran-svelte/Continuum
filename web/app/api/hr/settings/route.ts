import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireRole, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { sanitizeInput } from '@/lib/security';

export const dynamic = 'force-dynamic';

const settingsPatchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  industry: z.string().max(100).optional(),
  size: z.string().max(50).optional(),
  timezone: z.string().max(60).optional(),
  sla_hours: z.number().int().min(1).max(336).optional(),
  negative_balance: z.boolean().optional(),
  probation_period_days: z.number().int().min(0).max(730).optional(),
  notice_period_days: z.number().int().min(0).max(365).optional(),
  work_days: z.array(z.number().int().min(0).max(6)).min(1).max(7).optional(),
  leave_year_start: z.string().regex(/^\d{2}-\d{2}$/).optional(),
  auto_approve: z.boolean().optional(),
  auto_approve_threshold: z.number().min(0).max(1).optional(),
  email_notifications: z.boolean().optional(),
  manager_alerts: z.boolean().optional(),
  daily_digest: z.boolean().optional(),
  sla_alerts: z.boolean().optional(),
});

/**
 * GET /api/hr/settings
 * Returns company information, leave policy settings, and notification preferences.
 * Accessible by admin, hr, and director roles.
 */
export async function GET() {
  try {
    const employee = await getAuthEmployee();

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    requireRole(employee, 'admin', 'hr', 'director');

    const company = await prisma.company.findUnique({
      where: { id: employee.org_id },
      select: {
        id: true,
        name: true,
        industry: true,
        size: true,
        timezone: true,
        country_code: true,
        join_code: true,
        sla_hours: true,
        negative_balance: true,
        probation_period_days: true,
        notice_period_days: true,
        work_days: true,
        leave_year_start: true,
        onboarding_completed: true,
        settings: {
          select: {
            email_notifications: true,
            hr_alerts: true,
          },
        },
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Extract notification and auto-approve settings from stored JSON
    const emailNotifRaw = company.settings?.email_notifications as Record<string, unknown> | null;
    const hrAlertsRaw = company.settings?.hr_alerts as Record<string, unknown> | null;

    return NextResponse.json({
      company: {
        id: company.id,
        name: company.name,
        industry: company.industry,
        size: company.size,
        timezone: company.timezone,
        country_code: company.country_code,
        join_code: company.join_code,
        sla_hours: company.sla_hours,
        negative_balance: company.negative_balance,
        probation_period_days: company.probation_period_days,
        notice_period_days: company.notice_period_days,
        work_days: company.work_days,
        leave_year_start: company.leave_year_start,
        onboarding_completed: company.onboarding_completed,
      },
      notifications: {
        email_notifications: emailNotifRaw?.email_enabled ?? true,
        manager_alerts: emailNotifRaw?.manager_alerts ?? true,
        daily_digest: emailNotifRaw?.daily_digest ?? true,
        sla_alerts: emailNotifRaw?.sla_alerts ?? true,
      },
      auto_approve: {
        enabled: hrAlertsRaw?.auto_approve ?? false,
        threshold: hrAlertsRaw?.auto_approve_threshold ?? 0.9,
      },
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
 * PATCH /api/hr/settings
 * Updates company information, leave policy settings, and notification preferences.
 * Creates a SettingsAuditLog entry for every change.
 * Only callable by admin role.
 */
export async function PATCH(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    requireRole(employee, 'admin', 'hr');

    const body = await request.json();
    const parsed = settingsPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const companyId = employee.org_id;

    // Fetch current state for audit
    const current = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        name: true,
        industry: true,
        size: true,
        timezone: true,
        sla_hours: true,
        negative_balance: true,
        probation_period_days: true,
        notice_period_days: true,
        work_days: true,
        leave_year_start: true,
        settings: { select: { email_notifications: true, hr_alerts: true } },
      },
    });

    await prisma.$transaction(async (tx) => {
      // Update company core fields
      const companyUpdate: Record<string, unknown> = {};
      if (data.name !== undefined) companyUpdate.name = sanitizeInput(data.name);
      if (data.industry !== undefined) companyUpdate.industry = sanitizeInput(data.industry);
      if (data.size !== undefined) companyUpdate.size = sanitizeInput(data.size);
      if (data.timezone !== undefined) companyUpdate.timezone = sanitizeInput(data.timezone);
      if (data.sla_hours !== undefined) companyUpdate.sla_hours = data.sla_hours;
      if (data.negative_balance !== undefined) companyUpdate.negative_balance = data.negative_balance;
      if (data.probation_period_days !== undefined) companyUpdate.probation_period_days = data.probation_period_days;
      if (data.notice_period_days !== undefined) companyUpdate.notice_period_days = data.notice_period_days;
      if (data.work_days !== undefined) companyUpdate.work_days = data.work_days;
      if (data.leave_year_start !== undefined) companyUpdate.leave_year_start = data.leave_year_start;

      if (Object.keys(companyUpdate).length > 0) {
        await tx.company.update({ where: { id: companyId }, data: companyUpdate });
      }

      // Update notification / auto-approve settings
      let emailNotifJson: Prisma.InputJsonValue | undefined;
      let hrAlertsJson: Prisma.InputJsonValue | undefined;

      if (
        data.email_notifications !== undefined ||
        data.manager_alerts !== undefined ||
        data.daily_digest !== undefined ||
        data.sla_alerts !== undefined
      ) {
        const existing = (current?.settings?.email_notifications ?? {}) as Record<string, unknown>;
        emailNotifJson = {
          email_enabled: data.email_notifications ?? existing.email_enabled ?? true,
          manager_alerts: data.manager_alerts ?? existing.manager_alerts ?? true,
          daily_digest: data.daily_digest ?? existing.daily_digest ?? true,
          sla_alerts: data.sla_alerts ?? existing.sla_alerts ?? true,
        } as Prisma.InputJsonValue;
      }

      if (data.auto_approve !== undefined || data.auto_approve_threshold !== undefined) {
        const existing = (current?.settings?.hr_alerts ?? {}) as Record<string, unknown>;
        hrAlertsJson = {
          ...existing,
          auto_approve: data.auto_approve ?? existing.auto_approve ?? false,
          auto_approve_threshold: data.auto_approve_threshold ?? existing.auto_approve_threshold ?? 0.9,
        } as Prisma.InputJsonValue;
      }

      if (emailNotifJson !== undefined || hrAlertsJson !== undefined) {
        const createData: Record<string, unknown> = { company_id: companyId };
        const updateData: Record<string, unknown> = {};
        if (emailNotifJson !== undefined) {
          createData.email_notifications = emailNotifJson;
          updateData.email_notifications = emailNotifJson;
        }
        if (hrAlertsJson !== undefined) {
          createData.hr_alerts = hrAlertsJson;
          updateData.hr_alerts = hrAlertsJson;
        }
        await tx.companySettings.upsert({
          where: { company_id: companyId },
          create: createData as Parameters<typeof tx.companySettings.upsert>[0]['create'],
          update: updateData as Parameters<typeof tx.companySettings.upsert>[0]['update'],
        });
      }
    });

    await createAuditLog({
      companyId,
      actorId: employee.id,
      action: AUDIT_ACTIONS.COMPANY_SETTINGS_UPDATE,
      entityType: 'Company',
      entityId: companyId,
      previousState: current,
      newState: data,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
