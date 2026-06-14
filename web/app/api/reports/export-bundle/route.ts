import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireCompanyContext, AuthError, requirePermissionGuard} from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { parseBoundedInt } from '@/lib/api-guards';

export const dynamic = 'force-dynamic';

function roleScope(role: string) {
  if (role === 'admin' || role === 'hr' || role === 'director') return 'company';
  if (role === 'manager' || role === 'team_lead') return 'team';
  return 'self';
}

export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const rateLimit = checkApiRateLimit(employee.id, 'export');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const { searchParams } = new URL(request.url);
    const year = parseBoundedInt(searchParams.get('year'), {
      defaultValue: new Date().getUTCFullYear(),
      min: 2000,
      max: 2100,
    });
    const scope = roleScope(employee.primary_role);

    if (scope === 'company') {
      requirePermissionGuard(employee, 'reports.export');
    }

    const yearStart = new Date(`${year}-01-01`);
    const yearEnd = new Date(`${year + 1}-01-01`);

    const companyId = employee.org_id;
    const sharedViews = await prisma.companySettings.findUnique({
      where: { company_id: companyId },
      select: { hr_alerts: true },
    });

    const bundle: Record<string, unknown> = {
      metadata: {
        exported_at: new Date().toISOString(),
        exported_by: employee.email,
        role: employee.primary_role,
        scope,
        year,
      },
      shared_search_views:
        sharedViews && typeof sharedViews.hr_alerts === 'object' && sharedViews.hr_alerts !== null
          ? (sharedViews.hr_alerts as Record<string, unknown>).search_views ?? []
          : [],
    };

    if (scope === 'company') {
      const [employees, leaveRequests, auditLogs, reports, settings] = await Promise.all([
        prisma.employee.findMany({
          where: { org_id: companyId, deleted_at: null },
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            primary_role: true,
            department: true,
            designation: true,
            status: true,
            created_at: true,
          },
        }),
        prisma.leaveRequest.findMany({
          where: { company_id: companyId, start_date: { gte: yearStart, lt: yearEnd } },
          select: {
            id: true,
            emp_id: true,
            leave_type: true,
            start_date: true,
            end_date: true,
            total_days: true,
            status: true,
            created_at: true,
          },
          orderBy: { created_at: 'desc' },
          take: 1000,
        }),
        prisma.auditLog.findMany({
          where: { company_id: companyId, created_at: { gte: yearStart, lt: yearEnd } },
          select: {
            id: true,
            action: true,
            entity_type: true,
            entity_id: true,
            created_at: true,
          },
          orderBy: { created_at: 'desc' },
          take: 2000,
        }),
        prisma.leaveRequest.groupBy({
          by: ['status'],
          where: { company_id: companyId, start_date: { gte: yearStart, lt: yearEnd } },
          _count: { id: true },
        }),
        prisma.companySettings.findUnique({ where: { company_id: companyId } }),
      ]);

      bundle.company = await prisma.company.findUnique({
        where: { id: companyId },
        select: {
          id: true,
          name: true,
          industry: true,
          size: true,
          country_code: true,
          timezone: true,
          work_start: true,
          work_end: true,
          work_days: true,
          grace_period_minutes: true,
          half_day_hours: true,
          leave_year_start: true,
          probation_period_days: true,
          notice_period_days: true,
          sla_hours: true,
          created_at: true,
        },
      });

      bundle.employees = employees;
      bundle.leave_requests = leaveRequests;
      bundle.audit_logs = auditLogs;
      bundle.leave_status_breakdown = reports.map((item) => ({ status: item.status, count: item._count.id }));
      bundle.company_settings = settings
        ? {
            ...settings,
            hr_alerts:
              settings.hr_alerts && typeof settings.hr_alerts === 'object' && !Array.isArray(settings.hr_alerts)
                ? {
                    ...(settings.hr_alerts as Record<string, unknown>),
                    search_views: (settings.hr_alerts as Record<string, unknown>).search_views ?? [],
                  }
                : settings.hr_alerts,
          }
        : null;
    } else if (scope === 'team') {
      const teamIds = await prisma.employee.findMany({
        where: { org_id: companyId, manager_id: employee.id, deleted_at: null },
        select: { id: true },
      }).then((rows) => [employee.id, ...rows.map((row) => row.id)]);

      bundle.team_employees = await prisma.employee.findMany({
        where: { id: { in: teamIds } },
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          primary_role: true,
          department: true,
          designation: true,
          status: true,
          created_at: true,
        },
      });

      bundle.team_leave_requests = await prisma.leaveRequest.findMany({
        where: { company_id: companyId, emp_id: { in: teamIds }, start_date: { gte: yearStart, lt: yearEnd } },
        select: {
          id: true,
          emp_id: true,
          leave_type: true,
          start_date: true,
          end_date: true,
          total_days: true,
          status: true,
          created_at: true,
        },
        orderBy: { created_at: 'desc' },
        take: 1000,
      });
    } else {
      bundle.self_requests = await prisma.leaveRequest.findMany({
        where: { company_id: companyId, emp_id: employee.id, start_date: { gte: yearStart, lt: yearEnd } },
        select: {
          id: true,
          leave_type: true,
          start_date: true,
          end_date: true,
          total_days: true,
          status: true,
          created_at: true,
        },
        orderBy: { created_at: 'desc' },
        take: 200,
      });
    }

    void createAuditLog({
      companyId,
      actorId: employee.id,
      action: AUDIT_ACTIONS.DATA_EXPORT,
      entityType: 'Company',
      entityId: companyId,
      newState: {
        type: 'role_bundle',
        role: employee.primary_role,
        scope,
        year,
      },
    }).catch((err) => console.error('[FireAndForget]', err instanceof Error ? err.message : err));

    const filename = `continuum-${scope}-bundle-${companyId.slice(0, 8)}-${year}.json`;

    return new NextResponse(JSON.stringify(bundle, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}