import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireRole, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { sanitizeInput } from '@/lib/security';
import type { Prisma } from '@prisma/client';
import { generateConstraintRules } from '@/lib/constraint-rules-config';
import type { LeaveTypeConfig } from '@/lib/leave-types-config';
import { DEFAULT_NOTIFICATION_TEMPLATES } from '@/lib/notification-templates-config';
import { sendWelcomeEmail } from '@/lib/email-service';

export const dynamic = 'force-dynamic';

const leaveTypeSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  days: z.number().int().min(0).max(365),
  carry_forward: z.boolean().optional().default(false),
  max_carry_forward: z.number().int().min(0).max(365).optional().default(0),
  encashment_enabled: z.boolean().optional().default(false),
  encashment_max_days: z.number().int().min(0).max(365).optional().default(0),
  paid: z.boolean().optional().default(true),
});

const holidaySchema = z.object({
  name: z.string().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const blackoutDateSchema = z.object({
  name: z.string().min(1).max(200),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const onboardingSchema = z.object({
  company: z.object({
    name: z.string().min(1).max(200).optional(),
    industry: z.string().max(100).optional(),
    size: z.string().max(50).optional(),
    timezone: z.string().max(60).optional(),
    sla_hours: z.number().int().min(1).max(336).optional(),
    negative_balance: z.boolean().optional(),
    probation_period_days: z.number().int().min(0).max(730).optional(),
    work_days: z.array(z.number().int().min(0).max(6)).optional(),
  }).optional(),
  leave_types: z.array(leaveTypeSchema).optional(),
  holidays: z.array(holidaySchema).optional(),
  notifications: z.object({
    email_notifications: z.boolean().optional(),
    manager_alerts: z.boolean().optional(),
    daily_digest: z.boolean().optional(),
    sla_alerts: z.boolean().optional(),
  }).optional(),
  constraint_config: z.object({
    min_coverage_percent: z.number().min(0).max(100).optional(),
    max_concurrent: z.number().int().min(1).max(50).optional(),
    blackout_dates: z.array(blackoutDateSchema).optional(),
    auto_approve: z.boolean().optional(),
    auto_approve_threshold: z.number().min(0).max(1).optional(),
  }).optional(),
  work_start: z.string().optional(),
  work_end: z.string().optional(),
  grace_period_minutes: z.number().int().min(0).max(120).optional(),
  half_day_hours: z.number().min(1).max(12).optional(),
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

    // Allow admin or hr to complete onboarding (HR users are typically the ones setting up companies)
    requireRole(employee, 'admin', 'hr');

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
        if (data.company.sla_hours !== undefined) companyUpdate.sla_hours = data.company.sla_hours;
        if (data.company.negative_balance !== undefined) companyUpdate.negative_balance = data.company.negative_balance;
        if (data.company.probation_period_days !== undefined) companyUpdate.probation_period_days = data.company.probation_period_days;
        if (data.company.work_days !== undefined) companyUpdate.work_days = data.company.work_days;

        if (Object.keys(companyUpdate).length > 0) {
          await tx.company.update({
            where: { id: companyId },
            data: companyUpdate,
          });
        }
      }

      // 1b. Update work schedule fields (top-level in payload)
      {
        const workScheduleUpdate: Record<string, unknown> = {};
        if (data.work_start) workScheduleUpdate.work_start = data.work_start;
        if (data.work_end) workScheduleUpdate.work_end = data.work_end;
        if (data.grace_period_minutes !== undefined) workScheduleUpdate.grace_period_minutes = data.grace_period_minutes;
        if (data.half_day_hours !== undefined) workScheduleUpdate.half_day_hours = data.half_day_hours;

        if (Object.keys(workScheduleUpdate).length > 0) {
          await tx.company.update({
            where: { id: companyId },
            data: workScheduleUpdate,
          });
        }
      }

      // 2. Upsert leave types from onboarding payload.
      //    This keeps quotas/rules fully company-specific and editable.
      if (data.leave_types && data.leave_types.length > 0) {
        const selectedCodes = new Set(
          data.leave_types.map((lt) => sanitizeInput(lt.code).toUpperCase())
        );

        for (const lt of data.leave_types) {
          const code = sanitizeInput(lt.code).toUpperCase();
          await tx.leaveType.upsert({
            where: { company_id_code: { company_id: companyId, code } },
            create: {
              company_id: companyId,
              code,
              name: sanitizeInput(lt.name),
              category: 'common' as const,
              default_quota: lt.days,
              carry_forward: lt.carry_forward,
              max_carry_forward: lt.max_carry_forward ?? 0,
              encashment_enabled: lt.encashment_enabled ?? false,
              encashment_max_days: lt.encashment_max_days ?? 0,
              paid: lt.paid ?? true,
              is_active: true,
              deleted_at: null,
            },
            update: {
              name: sanitizeInput(lt.name),
              default_quota: lt.days,
              carry_forward: lt.carry_forward,
              max_carry_forward: lt.max_carry_forward ?? 0,
              encashment_enabled: lt.encashment_enabled ?? false,
              encashment_max_days: lt.encashment_max_days ?? 0,
              paid: lt.paid ?? true,
              is_active: true,
              deleted_at: null,
            },
          });
        }

        // Soft-disable leave types removed in onboarding selection.
        await tx.leaveType.updateMany({
          where: {
            company_id: companyId,
            code: { notIn: Array.from(selectedCodes) },
            deleted_at: null,
          },
          data: {
            is_active: false,
            deleted_at: new Date(),
          },
        });
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
      const emailNotificationsJson = data.notifications ? {
        email_enabled: data.notifications.email_notifications ?? true,
        manager_alerts: data.notifications.manager_alerts ?? true,
        daily_digest: data.notifications.daily_digest ?? true,
        sla_alerts: data.notifications.sla_alerts ?? true,
      } as Prisma.InputJsonValue : undefined;

      const hrAlertsJson = data.constraint_config ? {
        auto_approve: data.constraint_config.auto_approve ?? false,
        auto_approve_threshold: data.constraint_config.auto_approve_threshold ?? 0.9,
      } as Prisma.InputJsonValue : undefined;

      if (emailNotificationsJson !== undefined || hrAlertsJson !== undefined) {
        const settingsCreate: Record<string, unknown> = { company_id: companyId };
        const settingsUpdate: Record<string, unknown> = {};
        if (emailNotificationsJson !== undefined) {
          settingsCreate.email_notifications = emailNotificationsJson;
          settingsUpdate.email_notifications = emailNotificationsJson;
        }
        if (hrAlertsJson !== undefined) {
          settingsCreate.hr_alerts = hrAlertsJson;
          settingsUpdate.hr_alerts = hrAlertsJson;
        }
        await tx.companySettings.upsert({
          where: { company_id: companyId },
          create: settingsCreate as Parameters<typeof tx.companySettings.upsert>[0]['create'],
          update: settingsUpdate as Parameters<typeof tx.companySettings.upsert>[0]['update'],
        });
      }

      // 4b. Seed default notification templates (skip if already seeded).
      //     Templates can be customised via the HR notification-templates page.
      const existingTemplateCount = await tx.notificationTemplate.count({
        where: { company_id: companyId },
      });

      if (existingTemplateCount === 0) {
        await tx.notificationTemplate.createMany({
          data: DEFAULT_NOTIFICATION_TEMPLATES.map((t) => ({
            company_id: companyId,
            event: t.event,
            channel: t.channel as 'email' | 'push' | 'in_app',
            subject: t.subject,
            body: t.body,
            is_active: true,
          })),
          skipDuplicates: true,
        });
      }

      // 5. Generate and save constraint rules based on selected leave types + config
      const allActiveLeaveTypes = await tx.leaveType.findMany({
        where: { company_id: companyId, is_active: true, deleted_at: null },
        select: {
          code: true, name: true, category: true,
          default_quota: true, carry_forward: true,
          max_carry_forward: true, encashment_enabled: true,
          encashment_max_days: true, paid: true,
        },
      });

      if (allActiveLeaveTypes.length > 0) {
        const fetchedCompany = await tx.company.findUnique({
          where: { id: companyId },
          select: { probation_period_days: true, sla_hours: true, negative_balance: true },
        });

        const leaveTypeConfigs: LeaveTypeConfig[] = allActiveLeaveTypes.map((lt) => ({
          code: lt.code,
          name: lt.name,
          defaultQuota: lt.default_quota,
          carryForward: lt.carry_forward,
          maxCarryForward: lt.max_carry_forward,
          encashmentEnabled: lt.encashment_enabled,
          encashmentMaxDays: lt.encashment_max_days,
          paid: lt.paid,
          genderSpecific: 'all' as const,
          category: lt.category as LeaveTypeConfig['category'],
          description: '',
        }));

        const constraintRules = generateConstraintRules(leaveTypeConfigs, {
          probation_period_days: fetchedCompany?.probation_period_days ?? undefined,
          sla_hours: fetchedCompany?.sla_hours ?? undefined,
          negative_balance: fetchedCompany?.negative_balance ?? false,
          work_days: data.company?.work_days as number[] | undefined,
        });

        for (const rule of constraintRules) {
          let ruleConfig = { ...rule.config } as Record<string, unknown>;

          // Override with user-provided constraint config
          if (data.constraint_config) {
            if (rule.rule_id === 'RULE003' && data.constraint_config.min_coverage_percent !== undefined) {
              ruleConfig = { ...ruleConfig, min_coverage_percent: data.constraint_config.min_coverage_percent };
            }
            if (rule.rule_id === 'RULE004' && data.constraint_config.max_concurrent !== undefined) {
              ruleConfig = { ...ruleConfig, max_concurrent: data.constraint_config.max_concurrent };
            }
            if (rule.rule_id === 'RULE005' && data.constraint_config.blackout_dates !== undefined) {
              const formatted = data.constraint_config.blackout_dates.map((bd) => ({
                name: sanitizeInput(bd.name),
                start: bd.start,
                end: bd.end,
              }));
              ruleConfig = { ...ruleConfig, blackout_dates: formatted };
            }
          }

          await tx.leaveRule.upsert({
            where: { company_id_rule_id: { company_id: companyId, rule_id: rule.rule_id } },
            create: {
              company_id: companyId,
              rule_id: rule.rule_id,
              rule_type: rule.category,
              name: rule.name,
              description: rule.description,
              category: rule.category as 'validation' | 'business' | 'compliance',
              is_blocking: rule.is_blocking,
              is_active: true,
              priority: rule.priority,
              config: ruleConfig as Prisma.InputJsonValue,
            },
            update: {
              config: ruleConfig as Prisma.InputJsonValue,
              is_active: true,
              is_blocking: rule.is_blocking,
              priority: rule.priority,
            },
          });
        }

        // Create initial ConstraintPolicy snapshot
        await tx.constraintPolicy.updateMany({
          where: { company_id: companyId, is_active: true },
          data: { is_active: false },
        });

        const savedRules = await tx.leaveRule.findMany({
          where: { company_id: companyId, is_active: true, deleted_at: null },
        });

        await tx.constraintPolicy.create({
          data: {
            company_id: companyId,
            version: 1,
            is_active: true,
            rules: savedRules as unknown as import('@prisma/client').Prisma.InputJsonValue,
          },
        });
      }

      // 6. Mark onboarding as complete
      await tx.company.update({
        where: { id: companyId },
        data: { onboarding_completed: true },
      });

      // 7. Set the admin employee (the one completing onboarding) to 'active'
      // Other 'onboarding' employees remain in 'onboarding' status for HR approval
      await tx.employee.update({
        where: { id: employee.id },
        data: { status: 'active' },
      });
    });

    // Fetch join_code and company name to return to the client
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { join_code: true, name: true },
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

    // Send welcome email (fire-and-forget)
    const empName = `${employee.first_name} ${employee.last_name}`.trim() || employee.email;
    const companyName = company?.name || 'your company';
    sendWelcomeEmail(employee.email, empName, companyName).catch((err) => {
      console.error('[ONBOARDING COMPLETE] Failed to send welcome email:', err);
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
