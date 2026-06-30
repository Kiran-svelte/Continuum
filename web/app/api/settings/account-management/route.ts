import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  getAuthEmployee,
  requireCompanyContext,
  requirePermissionGuard,
  AuthError,
} from '@/lib/auth-guard';
import { toPrismaJson } from '@/lib/portal-policy-backfill';

export const dynamic = 'force-dynamic';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export async function GET() {
  try {
    const employee = await getAuthEmployee();
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'company.view_settings');
    const [company, members, settings] = await Promise.all([
      prisma.company.findUnique({
        where: { id: employee.org_id },
        select: { id: true, name: true, legalName: true, industry: true, timezone: true, size: true, join_code: true },
      }),
      prisma.employee.count({ where: { org_id: employee.org_id, deleted_at: null } }),
      prisma.companySettings.findUnique({ where: { company_id: employee.org_id }, select: { portal_policy: true } }),
    ]);
    const policy = asRecord(settings?.portal_policy);
    return NextResponse.json({
      company,
      members,
      billingContact: policy.billingContact || null,
      security: policy.accountSecurity || { ownershipTransferEnabled: false, workspaceDeactivationGuard: true },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'company.edit_settings');
    const body = await request.json().catch(() => ({}));
    const settings = await prisma.companySettings.findUnique({ where: { company_id: employee.org_id } });
    const policy = asRecord(settings?.portal_policy);
    if (body.billingContact) policy.billingContact = body.billingContact;
    if (body.security) policy.accountSecurity = body.security;
    await prisma.companySettings.upsert({
      where: { company_id: employee.org_id },
      create: { id: crypto.randomUUID(), company_id: employee.org_id, updated_at: new Date(), portal_policy: toPrismaJson(policy) },
      update: { portal_policy: toPrismaJson(policy), updated_at: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
