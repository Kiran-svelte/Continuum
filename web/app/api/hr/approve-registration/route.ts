import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getAuthUserFromRequest, getAuthEmployee } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { sendRegistrationApprovedEmail, sendRegistrationRejectedEmail } from '@/lib/email-service';

export const dynamic = 'force-dynamic';

const approveSchema = z.object({
  employee_id: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
  new_status: z.enum(['probation', 'active']).optional(),
  rejection_reason: z.string().max(500).optional(),
});

/**
 * POST /api/hr/approve-registration
 * 
 * HR/Admin approves or rejects an employee registration.
 * - On approve: status changes from 'onboarding' to 'probation' or 'active'
 * - On reject: employee record is soft-deleted or marked as rejected
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
    const { user, error: authError } = await getAuthUserFromRequest(request);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get the authenticated employee
    const employee = await prisma.employee.findUnique({
      where: { auth_id: user.uid },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 });
    }

    // Only HR and admin can approve registrations
    const allowedRoles = ['admin', 'hr'];
    if (!allowedRoles.includes(employee.primary_role)) {
      return NextResponse.json({ error: 'Forbidden: requires admin or hr role' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = approveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { employee_id, action, new_status, rejection_reason } = parsed.data;

    // Find the employee to approve
    const targetEmployee = await prisma.employee.findUnique({
      where: { id: employee_id },
      include: { company: true },
    });

    if (!targetEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Ensure they're in the same company
    if (targetEmployee.org_id !== employee.org_id) {
      return NextResponse.json({ error: 'Employee not in your organization' }, { status: 403 });
    }

    // Ensure employee is in 'onboarding' status (pending approval)
    if (targetEmployee.status !== 'onboarding') {
      return NextResponse.json(
        { error: `Cannot ${action} employee with status '${targetEmployee.status}'` },
        { status: 400 }
      );
    }

    if (action === 'approve') {
      const statusToSet = new_status || 'active';
      
      await prisma.$transaction(async (tx) => {
        // Update employee status
        await tx.employee.update({
          where: { id: employee_id },
          data: { status: statusToSet },
        });

        // Create status history record
        await tx.employeeStatusHistory.create({
          data: {
            emp_id: employee_id,
            company_id: employee.org_id,
            from_status: 'onboarding',
            to_status: statusToSet,
            changed_by: employee.id,
            reason: 'Registration approved by HR',
          },
        });
      });

      // Audit log
      await createAuditLog({
        companyId: employee.org_id,
        actorId: employee.id,
        action: AUDIT_ACTIONS.EMPLOYEE_STATUS_CHANGE,
        entityType: 'Employee',
        entityId: employee_id,
        previousState: { status: 'onboarding' },
        newState: { status: statusToSet, approved_by: employee.id },
      });

      // Send approval email (non-blocking)
      void sendRegistrationApprovedEmail(
        targetEmployee.email,
        `${targetEmployee.first_name} ${targetEmployee.last_name}`,
        targetEmployee.company.name
      ).catch((err) => console.error('[ApproveReg] Email failed:', err));

      return NextResponse.json({
        success: true,
        message: `Employee ${targetEmployee.first_name} ${targetEmployee.last_name} approved`,
        new_status: statusToSet,
      });
    } else {
      // Reject: Mark as 'terminated' with reason (or could delete)
      await prisma.$transaction(async (tx) => {
        await tx.employee.update({
          where: { id: employee_id },
          data: { status: 'terminated' },
        });

        await tx.employeeStatusHistory.create({
          data: {
            emp_id: employee_id,
            company_id: employee.org_id,
            from_status: 'onboarding',
            to_status: 'terminated',
            changed_by: employee.id,
            reason: rejection_reason || 'Registration rejected by HR',
          },
        });
      });

      // Audit log
      await createAuditLog({
        companyId: employee.org_id,
        actorId: employee.id,
        action: AUDIT_ACTIONS.EMPLOYEE_STATUS_CHANGE,
        entityType: 'Employee',
        entityId: employee_id,
        previousState: { status: 'onboarding' },
        newState: { status: 'terminated', rejected_by: employee.id, reason: rejection_reason },
      });

      // Send rejection email (non-blocking)
      void sendRegistrationRejectedEmail(
        targetEmployee.email,
        `${targetEmployee.first_name} ${targetEmployee.last_name}`,
        rejection_reason || 'Your registration was not approved'
      ).catch((err) => console.error('[RejectReg] Email failed:', err));

      return NextResponse.json({
        success: true,
        message: `Employee ${targetEmployee.first_name} ${targetEmployee.last_name} rejected`,
      });
    }
  } catch (error) {
    console.error('[ApproveRegistration] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/hr/approve-registration
 * 
 * Returns list of employees pending approval (status = 'onboarding')
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
    const { user, error: authError } = await getAuthUserFromRequest(request);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get the authenticated employee
    const employee = await prisma.employee.findUnique({
      where: { auth_id: user.uid },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 });
    }

    // Only HR and admin can view pending registrations
    const allowedRoles = ['admin', 'hr'];
    if (!allowedRoles.includes(employee.primary_role)) {
      return NextResponse.json({ error: 'Forbidden: requires admin or hr role' }, { status: 403 });
    }

    const pending = await prisma.employee.findMany({
      where: {
        org_id: employee.org_id,
        status: 'onboarding',
        // Exclude the admin user themselves (who is also in onboarding during company setup)
        id: { not: employee.id },
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        primary_role: true,
        department: true,
        date_of_joining: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({
      pending_registrations: pending,
      count: pending.length,
    });
  } catch (error) {
    console.error('[GetPendingRegistrations] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
