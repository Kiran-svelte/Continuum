import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getAuthEmployee, requireCompanyContext, AuthError, requirePermissionGuard} from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

const searchFiltersSchema = z.object({
  employeeRole: z.string().optional().default(''),
  employeeStatus: z.string().optional().default(''),
  department: z.string().optional().default(''),
  leaveStatus: z.string().optional().default(''),
  dateFrom: z.string().optional().default(''),
  dateTo: z.string().optional().default(''),
});

const searchViewSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(60),
  query: z.string().min(2).max(200),
  domains: z.array(z.enum(['employees', 'leaves', 'policies', 'audit'])).min(1).max(4),
  filters: searchFiltersSchema,
});

type SharedSearchView = z.infer<typeof searchViewSchema> & {
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
};

function readViews(settings: Record<string, unknown> | null | undefined): SharedSearchView[] {
  const hrAlerts = settings && typeof settings === 'object' && !Array.isArray(settings)
    ? (settings as Record<string, unknown>)
    : {};
  const raw = hrAlerts.search_views;
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is SharedSearchView => {
    return !!item && typeof item === 'object' && typeof (item as Record<string, unknown>).name === 'string';
  });
}

function writeViews(existing: Record<string, unknown> | null | undefined, views: SharedSearchView[]) {
  const hrAlerts = existing && typeof existing === 'object' && !Array.isArray(existing)
    ? { ...(existing as Record<string, unknown>) }
    : {};
  hrAlerts.search_views = views;
  return hrAlerts;
}

export async function GET() {
  try {
    const employee = await getAuthEmployee();
    requireCompanyContext(employee);

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const settings = await prisma.companySettings.findUnique({
      where: { company_id: employee.org_id },
      select: { hr_alerts: true },
    });

    return NextResponse.json({
      sharedViews: readViews(settings?.hr_alerts as Record<string, unknown> | null),
    }, { headers: getRateLimitHeaders(rateLimit) });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'company.edit_settings');

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = searchViewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const current = await prisma.companySettings.findUnique({
      where: { company_id: employee.org_id },
      select: { hr_alerts: true },
    });
    const views = readViews(current?.hr_alerts as Record<string, unknown> | null);
    const now = new Date().toISOString();
    const newView: SharedSearchView = {
      ...parsed.data,
      id: parsed.data.id ?? randomUUID(),
      createdAt: now,
      updatedAt: now,
      createdBy: employee.id,
    };

    const nextViews = [newView, ...views.filter((view) => view.id !== newView.id)].slice(0, 25);
    const hrAlerts = writeViews(current?.hr_alerts as Record<string, unknown> | null, nextViews);
    const hrAlertsJson = hrAlerts as Prisma.InputJsonValue;

    await prisma.companySettings.upsert({
      where: { company_id: employee.org_id },
      create: {
        id: randomUUID(),
        company_id: employee.org_id,
        hr_alerts: hrAlertsJson,
        updated_at: new Date(),
      },
      update: { hr_alerts: hrAlertsJson },
    });

    await createAuditLog({
      companyId: employee.org_id,
      actorId: employee.id,
      action: AUDIT_ACTIONS.COMPANY_SETTINGS_UPDATE,
      entityType: 'CompanySettings',
      entityId: employee.org_id,
      previousState: { shared_views_count: views.length },
      newState: { shared_views_count: nextViews.length, saved_view_name: newView.name },
    });

    return NextResponse.json({ sharedView: newView }, { headers: getRateLimitHeaders(rateLimit) });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'company.edit_settings');

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const body = await request.json().catch(() => ({}));
    const id = typeof body?.id === 'string' ? body.id : '';
    if (!id) {
      return NextResponse.json({ error: 'View id is required.' }, { status: 400 });
    }

    const current = await prisma.companySettings.findUnique({
      where: { company_id: employee.org_id },
      select: { hr_alerts: true },
    });
    const views = readViews(current?.hr_alerts as Record<string, unknown> | null);
    const nextViews = views.filter((view) => view.id !== id);
    const hrAlerts = writeViews(current?.hr_alerts as Record<string, unknown> | null, nextViews);
    const hrAlertsJson = hrAlerts as Prisma.InputJsonValue;

    await prisma.companySettings.upsert({
      where: { company_id: employee.org_id },
      create: {
        id: randomUUID(),
        company_id: employee.org_id,
        hr_alerts: hrAlertsJson,
        updated_at: new Date(),
      },
      update: { hr_alerts: hrAlertsJson },
    });

    await createAuditLog({
      companyId: employee.org_id,
      actorId: employee.id,
      action: AUDIT_ACTIONS.COMPANY_SETTINGS_UPDATE,
      entityType: 'CompanySettings',
      entityId: employee.org_id,
      previousState: { shared_views_count: views.length },
      newState: { shared_views_count: nextViews.length, deleted_view_id: id },
    });

    return NextResponse.json({ success: true }, { headers: getRateLimitHeaders(rateLimit) });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
