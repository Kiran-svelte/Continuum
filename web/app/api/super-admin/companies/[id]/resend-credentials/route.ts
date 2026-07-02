import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-service';
import { hashPassword, generateTemporaryPassword } from '@/lib/password-service';
import { sendCompanyOwnerCredentialsEmail } from '@/lib/email-service';
import { buildAppUrl } from '@/lib/url-origin';
import { createSuperAdminAuditLog } from '@/lib/super-admin-audit';

export const dynamic = 'force-dynamic';

/**
 * POST /api/super-admin/companies/[id]/resend-credentials
 * 
 * Resend login credentials to the company owner.
 * Generates a new temporary password and sends via email.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: companyId } = await params;

    // Find the company owner
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        employees: {
          where: {
            OR: [
              { invited_by_type: 'super_admin' },
              { primary_role: 'admin' },
            ],
          },
          orderBy: { created_at: 'asc' },
          take: 1,
        },
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const owner = company.employees[0];
    if (!owner) {
      return NextResponse.json({ error: 'No owner found for this company' }, { status: 404 });
    }

    // Generate new temporary password
    const tempPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(tempPassword);

    // Update the owner's password
    await prisma.employee.update({
      where: { id: owner.id },
      data: {
        password_hash: passwordHash,
        must_change_password: true,
        password_changed_at: null,
      },
    });

    // Audit log
    const audit = await createSuperAdminAuditLog({
      companyId,
      actor: currentUser,
      action: 'credentials_resent',
      entityType: 'employee',
      entityId: owner.id,
      newState: {
        owner_email: owner.email,
        resent_by: 'super_admin',
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    });

    const loginUrl = buildAppUrl('/sign-in', { request });
    const ownerName = `${owner.first_name} ${owner.last_name}`.trim();

    const emailResult = await sendCompanyOwnerCredentialsEmail(
      owner.email,
      ownerName,
      company.name,
      tempPassword,
      loginUrl
    );

    if (!emailResult.success) {
      console.error('[SUPER ADMIN RESEND CREDENTIALS] Email delivery failed:', emailResult.error);
    }

    const exposeCredentials = process.env.NODE_ENV !== 'production' || !emailResult.success;

    return NextResponse.json({
      success: true,
      message: emailResult.success
        ? 'Credentials regenerated and emailed successfully'
        : 'Credentials regenerated, but email delivery failed',
      owner: {
        email: owner.email,
        firstName: owner.first_name,
        lastName: owner.last_name,
      },
      email: {
        sent: emailResult.success,
        transport: emailResult.transport,
        error: emailResult.error,
      },
      audit,
      ...(exposeCredentials
        ? {
            credentials: {
              email: owner.email,
              temporaryPassword: tempPassword,
              loginUrl,
              mustChangePassword: true,
            },
          }
        : {}),
      instructions: emailResult.success
        ? 'The owner received credentials by email and must change password at sign-in.'
        : 'Email delivery failed. Share credentials via a secure channel and ask the owner to change password immediately.',
    });
  } catch (error) {
    console.error('[SUPER ADMIN RESEND CREDENTIALS] Error:', error);
    return NextResponse.json(
      { error: 'Failed to resend credentials' },
      { status: 500 }
    );
  }
}
