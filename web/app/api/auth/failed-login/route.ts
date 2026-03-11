import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const schema = z.object({
  email: z.string().email(),
  reason: z.string().optional(),
});

/**
 * POST /api/auth/failed-login
 *
 * Logs a failed login attempt to the audit trail.
 * Used by the sign-in page when authentication fails.
 * This helps detect brute force attacks and security issues.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, reason } = schema.parse(body);

    // Get IP and user agent
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    // Try to find the employee by email to get their company for the audit log
    const employee = await prisma.employee.findFirst({
      where: { email: email.toLowerCase() },
      select: { id: true, org_id: true },
    });

    if (employee) {
      // Employee exists - log to their company's audit trail
      await createAuditLog({
        companyId: employee.org_id,
        actorId: null, // No authenticated actor since login failed
        action: AUDIT_ACTIONS.LOGIN_FAILED,
        entityType: 'Employee',
        entityId: employee.id,
        ipAddress: ip,
        userAgent,
        newState: {
          email,
          reason: reason || 'Invalid credentials',
          attempted_at: new Date().toISOString(),
        },
      });
    }
    // If employee doesn't exist, we don't log (no company to log to)
    // This is intentional to avoid leaking user existence info

    return NextResponse.json({ logged: true });
  } catch (err) {
    // Always return success to avoid timing attacks
    // Don't expose whether the log succeeded or failed
    return NextResponse.json({ logged: true });
  }
}
