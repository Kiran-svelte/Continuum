import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireRole } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { sendInviteEmail } from '@/lib/email-service';

export const dynamic = 'force-dynamic';

const inviteSchema = z.object({
  email: z.string().email().max(255),
  role: z.enum(['employee', 'team_lead', 'manager', 'director', 'hr', 'admin']).default('employee'),
  department: z.string().max(100).optional(),
});

/**
 * POST /api/hr/invites
 * HR/Admin creates an email invite for a new employee
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
    const employee = await getAuthEmployee();
    requireRole(employee, 'admin', 'hr');

    const body = await request.json();
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, role, department } = parsed.data;

    // Check if employee already exists
    const existingEmployee = await prisma.employee.findFirst({
      where: { email, org_id: employee.org_id!, deleted_at: null },
    });
    if (existingEmployee) {
      return NextResponse.json(
        { error: 'An employee with this email already exists' },
        { status: 409 }
      );
    }

    // Check for existing unused invite
    const existingInvite = await prisma.employeeInvite.findFirst({
      where: {
        email,
        company_id: employee.org_id!,
        used_at: null,
        expires_at: { gt: new Date() },
      },
    });
    if (existingInvite) {
      return NextResponse.json(
        { error: 'An active invite already exists for this email' },
        { status: 409 }
      );
    }

    // Generate secure token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invite = await prisma.employeeInvite.create({
      data: {
        company_id: employee.org_id!,
        email,
        token,
        role: role as 'employee' | 'team_lead' | 'manager' | 'director' | 'hr' | 'admin',
        department: department || null,
        invited_by: employee.id,
        expires_at: expiresAt,
      },
    });

    // Get company name for the email
    const company = await prisma.company.findUnique({
      where: { id: employee.org_id! },
      select: { name: true },
    });

    // Audit log
    await createAuditLog({
      companyId: employee.org_id!,
      actorId: employee.id,
      action: AUDIT_ACTIONS.EMPLOYEE_STATUS_CHANGE,
      entityType: 'EmployeeInvite',
      entityId: invite.id,
      newState: { email, role, department, expires_at: expiresAt.toISOString() },
    });

    // Send invite email (non-blocking)
    void sendInviteEmail(
      email,
      company?.name || 'Your Company',
      `${employee.first_name} ${employee.last_name}`,
      token,
      role,
      department || undefined
    ).catch((err) => console.error('[Invite] Email failed:', err));

    return NextResponse.json({
      success: true,
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        department: invite.department,
        expires_at: invite.expires_at,
      },
    });
  } catch (error) {
    console.error('[CreateInvite] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/hr/invites
 * Returns all invites for the company
 */
export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const rateLimit = checkApiRateLimit(ip, 'general');
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const employee = await getAuthEmployee();
    requireRole(employee, 'admin', 'hr');

    const invites = await prisma.employeeInvite.findMany({
      where: { company_id: employee.org_id! },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      invites: invites.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        department: inv.department,
        expires_at: inv.expires_at,
        used_at: inv.used_at,
        created_at: inv.created_at,
        is_expired: new Date() > inv.expires_at && !inv.used_at,
        is_used: !!inv.used_at,
      })),
    });
  } catch (error) {
    console.error('[GetInvites] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
