import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/me
 *
 * Returns the authenticated employee's basic profile, role, and company info.
 * Used by the client to perform role-based dashboard redirect after sign-in.
 * Includes onboarding_completed flag to gate access.
 * Logs successful sign-in to audit trail.
 */
export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();

    // Fetch designation (not included in getAuthEmployee)
    const employeeDetails = await prisma.employee.findUnique({
      where: { id: employee.id },
      select: { designation: true },
    });

    // Fetch company to get onboarding status and timezone
    const company = await prisma.company.findUnique({
      where: { id: employee.org_id! },
      select: {
        id: true,
        name: true,
        onboarding_completed: true,
        join_code: true,
        timezone: true,
      },
    });

    // Build list of all roles (primary + secondary)
    const allRoles: string[] = [employee.primary_role];
    if (employee.secondary_roles && Array.isArray(employee.secondary_roles)) {
      for (const r of employee.secondary_roles) {
        if (typeof r === 'string' && !allRoles.includes(r)) {
          allRoles.push(r);
        }
      }
    }

    const response = NextResponse.json({
      id: employee.id,
      email: employee.email,
      first_name: employee.first_name,
      last_name: employee.last_name,
      primary_role: employee.primary_role,
      secondary_roles: employee.secondary_roles,
      department: employee.department,
      designation: employeeDetails?.designation || null,
      org_id: employee.org_id!,
      status: employee.status,
      timezone: company?.timezone || 'Asia/Kolkata',
      company: company ? {
        id: company.id,
        name: company.name,
        onboarding_completed: company.onboarding_completed,
        join_code: company.join_code,
        timezone: company.timezone,
      } : null,
    });

    // Set role cookies for middleware portal enforcement (HttpOnly for security)
    const cookieOpts = {
      path: '/',
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 24 hours
      httpOnly: true, // Secure: middleware reads server-side, client uses /api/auth/me
    };

    response.cookies.set('continuum-role', employee.primary_role, cookieOpts);
    response.cookies.set('continuum-roles', allRoles.join(','), cookieOpts);

    // Log successful sign-in to audit trail (best effort, non-blocking)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;
    const referrer = request.headers.get('referer') || undefined;

    // Only log if coming from sign-in page (avoid logging on page refreshes)
    if (referrer && (referrer.includes('/sign-in') || referrer.includes('/sign-up'))) {
      void createAuditLog({
        companyId: employee.org_id!,
        actorId: employee.id,
        action: AUDIT_ACTIONS.LOGIN,
        entityType: 'Employee',
        entityId: employee.id,
        ipAddress: ip,
        userAgent,
        newState: {
          email: employee.email,
          primary_role: employee.primary_role,
          signed_in_at: new Date().toISOString(),
        },
      }).catch(() => {
        // Ignore audit failures - login should still succeed
      });
    }

    return response;
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
