import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireRole, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { sanitizeInput } from '@/lib/security';

export const dynamic = 'force-dynamic';

const leaveTypeSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  days: z.number().int().min(0).max(365),
  carry_forward: z.boolean().optional().default(false),
});

const holidaySchema = z.object({
  name: z.string().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const onboardingSchema = z.object({
  company: z.object({
    name: z.string().min(1).max(200).optional(),
    industry: z.string().max(100).optional(),
    size: z.string().max(50).optional(),
    timezone: z.string().max(60).optional(),
  }).optional(),
  leave_types: z.array(leaveTypeSchema).optional(),
  holidays: z.array(holidaySchema).optional(),
  notifications: z.object({
    email_notifications: z.boolean().optional(),
    manager_alerts: z.boolean().optional(),
    daily_digest: z.boolean().optional(),
    sla_alerts: z.boolean().optional(),
  }).optional(),
});

/**
 * POST /api/onboarding/complete
 *
 * Saves the full onboarding wizard configuration to the database:
 * - Updates company details (name, industry, size, timezone)
 * - Upserts leave types selected/configured during onboarding
 * - Seeds public holidays for the company
 * - Saves notification preferences in CompanySettings
 * - Marks company.onboarding_completed = true
 *
 * Only callable by the company `admin` role.
 */
export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    requireRole(employee, 'admin');

    const body = await request.json();
    const parsed = onboardingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const companyId = employee.org_id;

    await prisma.$transaction(async (tx) => {
      // 1. Update company fields if provided
      if (data.company) {
        const companyUpdate: Record<string, unknown> = {};
        if (data.company.name) companyUpdate.name = sanitizeInput(data.company.name);
        if (data.company.industry) companyUpdate.industry = sanitizeInput(data.company.industry);
        if (data.company.size) companyUpdate.size = sanitizeInput(data.company.size);
        if (data.company.timezone) companyUpdate.timezone = sanitizeInput(data.company.timezone);

        if (Object.keys(companyUpdate).length > 0) {
          await tx.company.update({
            where: { id: companyId },
            data: companyUpdate,
          });
        }
      }

      // 2. Upsert leave types — skip types that already exist (from registration seeding)
      if (data.leave_types && data.leave_types.length > 0) {
        const existing = await tx.leaveType.findMany({
          where: { company_id: companyId },
          select: { code: true },
        });
        const existingCodes = new Set(existing.map((lt) => lt.code));

        const newTypes = data.leave_types.filter((lt) => !existingCodes.has(lt.code));
        if (newTypes.length > 0) {
          await tx.leaveType.createMany({
            data: newTypes.map((lt) => ({
              company_id: companyId,
              code: sanitizeInput(lt.code).toUpperCase(),
              name: sanitizeInput(lt.name),
              category: 'common' as const,
              default_quota: lt.days,
              carry_forward: lt.carry_forward,
            })),
          });
        }
      }

      // 3. Seed company-specific public holidays
      if (data.holidays && data.holidays.length > 0) {
        // Clear previous custom holidays for this company to avoid duplicates on re-run
        await tx.publicHoliday.deleteMany({
          where: { company_id: companyId, is_custom: true },
        });

        await tx.publicHoliday.createMany({
          data: data.holidays.map((h) => ({
            company_id: companyId,
            name: sanitizeInput(h.name),
            date: new Date(h.date),
            is_custom: true,
          })),
        });
      }

      // 4. Upsert notification / company settings
      if (data.notifications) {
        const emailNotifications = {
          email_enabled: data.notifications.email_notifications ?? true,
          manager_alerts: data.notifications.manager_alerts ?? true,
          daily_digest: data.notifications.daily_digest ?? true,
          sla_alerts: data.notifications.sla_alerts ?? true,
        };

        await tx.companySettings.upsert({
          where: { company_id: companyId },
          create: {
            company_id: companyId,
            email_notifications: emailNotifications,
          },
          update: {
            email_notifications: emailNotifications,
          },
        });
      }

      // 5. Mark onboarding as complete
      await tx.company.update({
        where: { id: companyId },
        data: { onboarding_completed: true },
      });
    });

    // Fetch join_code to return to the client
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { join_code: true },
    });

    // Audit log
    await createAuditLog({
      companyId,
      actorId: employee.id,
      action: AUDIT_ACTIONS.COMPANY_ONBOARDING_COMPLETE,
      entityType: 'Company',
      entityId: companyId,
      newState: { onboarding_completed: true },
    });

    return NextResponse.json({ success: true, join_code: company?.join_code ?? null });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : 'Onboarding save failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
