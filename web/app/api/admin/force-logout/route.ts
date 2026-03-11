import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireRole } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { sendNotification } from '@/lib/notification-service';

export const dynamic = 'force-dynamic';

const forceLogoutSchema = z.object({
  employee_id: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

/**
 * POST /api/admin/force-logout
 *
 * Admin force-logs out an employee by:
 * 1. Invalidating all Supabase refresh tokens (signOut via admin API)
 * 2. Creating an audit log entry
 * 3. Sending a notification to the employee
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const rateLimit = checkApiRateLimit(ip, 'hr');
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const admin = await getAuthEmployee();
    requireRole(admin, 'admin');

    const body = await request.json();
    const parsed = forceLogoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { employee_id, reason } = parsed.data;

    // Find the target employee
    const target = await prisma.employee.findUnique({
      where: { id: employee_id },
      select: {
        id: true,
        auth_id: true,
        email: true,
        first_name: true,
        last_name: true,
        org_id: true,
      },
    });

    if (!target) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Ensure same company
    if (target.org_id !== admin.org_id) {
      return NextResponse.json({ error: 'Employee not in your organization' }, { status: 403 });
    }

    // Cannot force-logout yourself
    if (target.id === admin.id) {
      return NextResponse.json({ error: 'Cannot force-logout yourself' }, { status: 400 });
    }

    // Use Supabase admin API to invalidate sessions
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceRoleKey) {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      // Sign out the user from all sessions
      await supabaseAdmin.auth.admin.signOut(target.auth_id, 'global').catch((err) => {
        console.error('[ForceLogout] Supabase signOut failed:', err);
      });
    }

    // Audit log
    await createAuditLog({
      companyId: admin.org_id,
      actorId: admin.id,
      action: AUDIT_ACTIONS.LOGOUT,
      entityType: 'Employee',
      entityId: target.id,
      ipAddress: ip,
      newState: {
        forced_by: admin.id,
        forced_by_email: admin.email,
        reason: reason || 'Admin-initiated force logout',
        target_email: target.email,
      },
    });

    // Notify the employee
    void sendNotification(
      target.id,
      target.org_id,
      'system',
      'Session Terminated',
      `Your session was terminated by an administrator.${reason ? ` Reason: ${reason}` : ''}`
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `${target.first_name} ${target.last_name} has been signed out from all sessions`,
    });
  } catch (error) {
    console.error('[ForceLogout] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
