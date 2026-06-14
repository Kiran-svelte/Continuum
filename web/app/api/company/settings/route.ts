/**
 * Company Settings API
 * 
 * GET  /api/company/settings - Get company settings
 * PUT  /api/company/settings - Update company settings
 * 
 * All settings are tenant-scoped via the authenticated user's org_id.
 * Only admin/hr roles can modify settings.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requirePermissionGuard, requireCompanyContext, AuthError } from '@/lib/auth-guard';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

// ─── Validation Schemas ─────────────────────────────────────────────────────

const aiSettingsSchema = z.object({
  ai_enabled: z.boolean().optional(),
  ai_confidence_threshold: z.number().min(0).max(1).optional(),
  ai_auto_approve_max_days: z.number().min(0).max(365).optional(),
  ai_require_team_coverage: z.boolean().optional(),
  ai_min_team_coverage: z.number().min(0).max(100).optional(),
  ai_require_notice_days: z.boolean().optional(),
  ai_auto_escalate_timeout: z.number().min(1).max(168).optional(), // 1-168 hours
});

const escalationRuleSchema = z.object({
  condition: z.string().min(1).max(200),
  escalate_to: z.enum(['direct_manager', 'hr', 'admin', 'company_owner']).or(z.string().uuid()),
  priority: z.number().int().min(1).max(100).optional(),
});

const geoFenceLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radius_meters: z.number().min(10).max(10000),
  name: z.string().min(1).max(100),
});

const attendanceSettingsSchema = z.object({
  attendance_enabled: z.boolean().optional(),
  work_hours_per_day: z.number().min(1).max(24).optional(),
  check_in_window_start: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  check_in_window_end: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  check_out_window_start: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  check_out_window_end: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  grace_period_minutes: z.number().min(0).max(120).optional(),
  late_marks_to_half_day: z.number().min(1).max(10).optional(),
  wfh_allowed: z.boolean().optional(),
  wfh_requires_approval: z.boolean().optional(),
  geo_fencing_enabled: z.boolean().optional(),
  geo_fence_locations: z.array(geoFenceLocationSchema).optional(),
  photo_verification_enabled: z.boolean().optional(),
  working_days: z.array(z.number().min(0).max(6)).optional(),
});

const leavePolicySchema = z.object({
  negative_balance_allowed: z.boolean().optional(),
  negative_balance_max_days: z.number().min(0).max(30).optional(),
  balance_reset_type: z.enum(['calendar_year', 'fiscal_year', 'anniversary']).optional(),
  fiscal_year_start_month: z.number().min(1).max(12).optional(),
  pro_rata_for_new_joiners: z.boolean().optional(),
  allow_past_date_leave: z.boolean().optional(),
  past_date_leave_max_days: z.number().min(0).max(30).optional(),
  allow_cancel_approved: z.boolean().optional(),
  cancel_before_start_days: z.number().min(0).max(30).optional(),
});

const notificationSettingsSchema = z.object({
  notify_email_enabled: z.boolean().optional(),
  notify_in_app_enabled: z.boolean().optional(),
  notify_sms_enabled: z.boolean().optional(),
  notify_slack_enabled: z.boolean().optional(),
  notify_teams_enabled: z.boolean().optional(),
  slack_webhook_url: z.string().url().optional().nullable(),
  teams_webhook_url: z.string().url().optional().nullable(),
  notification_events: z.record(z.boolean()).optional(),
});

const holidaySettingsSchema = z.object({
  country_code: z.string().length(2).optional(),
  auto_load_national_holidays: z.boolean().optional(),
  optional_holiday_quota: z.number().min(0).max(10).optional(),
});

const hierarchySettingsSchema = z.object({}).passthrough();

const updateSettingsSchema = z.object({
  ai: aiSettingsSchema.optional(),
  escalation_rules: z.array(escalationRuleSchema).optional(),
  attendance: attendanceSettingsSchema.optional(),
  leave_policy: leavePolicySchema.optional(),
  notifications: notificationSettingsSchema.optional(),
  holidays: holidaySettingsSchema.optional(),
  hierarchy: hierarchySettingsSchema.optional(),
  portal: hierarchySettingsSchema.optional(),
});

// ─── GET: Fetch Company Settings ────────────────────────────────────────────

export async function GET() {
  try {
    const employee = await getAuthEmployee();
    requireCompanyContext(employee);
    
    // Any authenticated user can view settings (but only modify with permissions)
    const settings = await prisma.companySettings.findUnique({
      where: { company_id: employee.org_id },
    });

    if (!settings) {
      // Return defaults if no settings exist yet
      return NextResponse.json({
        exists: false,
        settings: getDefaultSettings(),
      });
    }

    return NextResponse.json({
      exists: true,
      settings: formatSettingsForResponse(settings),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[CompanySettings GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── PUT: Update Company Settings ───────────────────────────────────────────

export async function PUT(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();
    requireCompanyContext(employee);
    
    // Require admin or hr role to modify settings
    requirePermissionGuard(employee, 'company.edit_settings');

    const body = await request.json();
    const parsed = updateSettingsSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const updatePayload: Record<string, unknown> = {};

    // Map AI settings
    if (data.ai) {
      Object.assign(updatePayload, {
        ai_enabled: data.ai.ai_enabled,
        ai_confidence_threshold: data.ai.ai_confidence_threshold,
        ai_auto_approve_max_days: data.ai.ai_auto_approve_max_days,
        ai_require_team_coverage: data.ai.ai_require_team_coverage,
        ai_min_team_coverage: data.ai.ai_min_team_coverage,
        ai_require_notice_days: data.ai.ai_require_notice_days,
        ai_auto_escalate_timeout: data.ai.ai_auto_escalate_timeout,
      });
    }

    // Map escalation rules
    if (data.escalation_rules) {
      updatePayload.escalation_rules = data.escalation_rules;
    }

    // Map attendance settings
    if (data.attendance) {
      Object.assign(updatePayload, {
        attendance_enabled: data.attendance.attendance_enabled,
        work_hours_per_day: data.attendance.work_hours_per_day,
        check_in_window_start: data.attendance.check_in_window_start,
        check_in_window_end: data.attendance.check_in_window_end,
        check_out_window_start: data.attendance.check_out_window_start,
        check_out_window_end: data.attendance.check_out_window_end,
        grace_period_minutes: data.attendance.grace_period_minutes,
        late_marks_to_half_day: data.attendance.late_marks_to_half_day,
        wfh_allowed: data.attendance.wfh_allowed,
        wfh_requires_approval: data.attendance.wfh_requires_approval,
        geo_fencing_enabled: data.attendance.geo_fencing_enabled,
        geo_fence_locations: data.attendance.geo_fence_locations,
        photo_verification_enabled: data.attendance.photo_verification_enabled,
        working_days: data.attendance.working_days,
      });
    }

    // Map leave policy settings
    if (data.leave_policy) {
      Object.assign(updatePayload, {
        negative_balance_allowed: data.leave_policy.negative_balance_allowed,
        negative_balance_max_days: data.leave_policy.negative_balance_max_days,
        balance_reset_type: data.leave_policy.balance_reset_type,
        fiscal_year_start_month: data.leave_policy.fiscal_year_start_month,
        pro_rata_for_new_joiners: data.leave_policy.pro_rata_for_new_joiners,
        allow_past_date_leave: data.leave_policy.allow_past_date_leave,
        past_date_leave_max_days: data.leave_policy.past_date_leave_max_days,
        allow_cancel_approved: data.leave_policy.allow_cancel_approved,
        cancel_before_start_days: data.leave_policy.cancel_before_start_days,
      });
    }

    // Map notification settings
    if (data.notifications) {
      Object.assign(updatePayload, {
        notify_email_enabled: data.notifications.notify_email_enabled,
        notify_in_app_enabled: data.notifications.notify_in_app_enabled,
        notify_sms_enabled: data.notifications.notify_sms_enabled,
        notify_slack_enabled: data.notifications.notify_slack_enabled,
        notify_teams_enabled: data.notifications.notify_teams_enabled,
        slack_webhook_url: data.notifications.slack_webhook_url,
        teams_webhook_url: data.notifications.teams_webhook_url,
        notification_events: data.notifications.notification_events,
      });
    }

    // Map holiday settings
    if (data.holidays) {
      Object.assign(updatePayload, {
        country_code: data.holidays.country_code,
        auto_load_national_holidays: data.holidays.auto_load_national_holidays,
        optional_holiday_quota: data.holidays.optional_holiday_quota,
      });
    }

    if (data.hierarchy) {
      updatePayload.hierarchy_policy = data.hierarchy;
    }

    if (data.portal) {
      updatePayload.portal_policy = data.portal;
    }

    // Remove undefined values
    Object.keys(updatePayload).forEach(key => {
      if (updatePayload[key] === undefined) {
        delete updatePayload[key];
      }
    });

    // Get current settings for audit
    const currentSettings = await prisma.companySettings.findUnique({
      where: { company_id: employee.org_id },
    });

    // Upsert settings
    const settings = await prisma.companySettings.upsert({
      where: { company_id: employee.org_id },
      create: {
        id: randomUUID(),
        company_id: employee.org_id,
        updated_at: new Date(),
        ...updatePayload,
      },
      update: updatePayload,
    });

    // Audit log
    await createAuditLog({
      companyId: employee.org_id,
      actorId: employee.id,
      action: AUDIT_ACTIONS.COMPANY_SETTINGS_UPDATE,
      entityType: 'CompanySettings',
      entityId: settings.id,
      previousState: currentSettings ? formatSettingsForAudit(currentSettings) : null,
      newState: formatSettingsForAudit(settings),
    });

    return NextResponse.json({
      success: true,
      settings: formatSettingsForResponse(settings),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[CompanySettings PUT]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── Helper Functions ───────────────────────────────────────────────────────

function getDefaultSettings() {
  return {
    ai: {
      enabled: true,
      confidence_threshold: 0.8,
      auto_approve_max_days: 3,
      require_team_coverage: true,
      min_team_coverage: 50,
      require_notice_days: true,
      auto_escalate_timeout: 24,
    },
    escalation_rules: [],
    attendance: {
      enabled: true,
      work_hours_per_day: 8,
      check_in_window_start: '08:00',
      check_in_window_end: '10:00',
      check_out_window_start: '17:00',
      check_out_window_end: '21:00',
      grace_period_minutes: 15,
      late_marks_to_half_day: 3,
      wfh_allowed: true,
      wfh_requires_approval: false,
      geo_fencing_enabled: false,
      geo_fence_locations: [],
      photo_verification_enabled: false,
      working_days: [1, 2, 3, 4, 5],
    },
    leave_policy: {
      negative_balance_allowed: false,
      negative_balance_max_days: 0,
      balance_reset_type: 'calendar_year',
      fiscal_year_start_month: 1,
      pro_rata_for_new_joiners: true,
      allow_past_date_leave: false,
      past_date_leave_max_days: 7,
      allow_cancel_approved: true,
      cancel_before_start_days: 1,
    },
    notifications: {
      email_enabled: true,
      in_app_enabled: true,
      sms_enabled: false,
      slack_enabled: false,
      teams_enabled: false,
      slack_webhook_url: null,
      teams_webhook_url: null,
      events: {
        leave_requested: true,
        leave_approved: true,
        leave_rejected: true,
        leave_cancelled: true,
        escalation: true,
        reminder: true,
        low_balance: true,
      },
    },
    holidays: {
      country_code: 'IN',
      auto_load_national_holidays: true,
      optional_holiday_quota: 2,
    },
    hierarchy: {
      role_ladder: ['admin', 'hr', 'manager', 'employee'],
      creation_targets_by_role: {
        admin: ['hr', 'manager', 'employee'],
        hr: ['manager', 'employee'],
        manager: ['employee'],
      },
    },
    portal: {
      visible_portals: ['admin', 'hr', 'manager', 'employee'],
    },
  };
}

function formatSettingsForResponse(settings: Record<string, unknown>) {
  return {
    ai: {
      enabled: settings.ai_enabled,
      confidence_threshold: settings.ai_confidence_threshold,
      auto_approve_max_days: settings.ai_auto_approve_max_days,
      require_team_coverage: settings.ai_require_team_coverage,
      min_team_coverage: settings.ai_min_team_coverage,
      require_notice_days: settings.ai_require_notice_days,
      auto_escalate_timeout: settings.ai_auto_escalate_timeout,
    },
    escalation_rules: settings.escalation_rules || [],
    attendance: {
      enabled: settings.attendance_enabled,
      work_hours_per_day: settings.work_hours_per_day,
      check_in_window_start: settings.check_in_window_start,
      check_in_window_end: settings.check_in_window_end,
      check_out_window_start: settings.check_out_window_start,
      check_out_window_end: settings.check_out_window_end,
      grace_period_minutes: settings.grace_period_minutes,
      late_marks_to_half_day: settings.late_marks_to_half_day,
      wfh_allowed: settings.wfh_allowed,
      wfh_requires_approval: settings.wfh_requires_approval,
      geo_fencing_enabled: settings.geo_fencing_enabled,
      geo_fence_locations: settings.geo_fence_locations || [],
      photo_verification_enabled: settings.photo_verification_enabled,
      working_days: settings.working_days || [1, 2, 3, 4, 5],
    },
    leave_policy: {
      negative_balance_allowed: settings.negative_balance_allowed,
      negative_balance_max_days: settings.negative_balance_max_days,
      balance_reset_type: settings.balance_reset_type,
      fiscal_year_start_month: settings.fiscal_year_start_month,
      pro_rata_for_new_joiners: settings.pro_rata_for_new_joiners,
      allow_past_date_leave: settings.allow_past_date_leave,
      past_date_leave_max_days: settings.past_date_leave_max_days,
      allow_cancel_approved: settings.allow_cancel_approved,
      cancel_before_start_days: settings.cancel_before_start_days,
    },
    notifications: {
      email_enabled: settings.notify_email_enabled,
      in_app_enabled: settings.notify_in_app_enabled,
      sms_enabled: settings.notify_sms_enabled,
      slack_enabled: settings.notify_slack_enabled,
      teams_enabled: settings.notify_teams_enabled,
      slack_webhook_url: settings.slack_webhook_url,
      teams_webhook_url: settings.teams_webhook_url,
      events: settings.notification_events || {},
    },
    holidays: {
      country_code: settings.country_code,
      auto_load_national_holidays: settings.auto_load_national_holidays,
      optional_holiday_quota: settings.optional_holiday_quota,
    },
      hierarchy: settings.hierarchy_policy || null,
      portal: settings.portal_policy || null,
  };
}

function formatSettingsForAudit(settings: Record<string, unknown>) {
  // Exclude sensitive webhook URLs from detailed audit
  const { slack_webhook_url, teams_webhook_url, ...rest } = settings;
  return {
    ...rest,
    slack_webhook_configured: !!slack_webhook_url,
    teams_webhook_configured: !!teams_webhook_url,
  };
}
