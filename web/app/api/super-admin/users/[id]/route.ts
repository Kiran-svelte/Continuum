import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { normalizeEmail } from '@/lib/email-normalization';
import { getCurrentUser } from '@/lib/auth-service';
import { hashPassword } from '@/lib/password-service';
import { validatePassword } from '@/lib/password-validation';

export const dynamic = 'force-dynamic';

const updateCredentialsSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const parsed = updateCredentialsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    if (!email && !password) {
      return NextResponse.json(
        { error: 'At least one field (email or password) is required' },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.findFirst({
      where: {
        id,
        invited_by_type: 'super_admin',
      },
      select: { id: true, email: true },
    });

    if (!employee) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date(),
    };

    if (email) {
      // Use centralized email normalization (trim + lowercase)
      const normalizedEmail = normalizeEmail(email);
      if (!normalizedEmail) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
      }

      const existingEmployee = await prisma.employee.findFirst({
        where: {
          email: normalizedEmail,
          id: { not: employee.id },
        },
        select: { id: true },
      });

      if (existingEmployee) {
        return NextResponse.json(
          { error: 'Another user already uses this email' },
          { status: 409 }
        );
      }

      const pendingInvite = await prisma.userInvite.findFirst({
        where: {
          email: normalizedEmail,
          status: 'pending',
        },
        select: { id: true },
      });

      if (pendingInvite) {
        return NextResponse.json(
          { error: 'A pending invite already exists for this email' },
          { status: 409 }
        );
      }

      updateData.email = normalizedEmail;
    }

    if (password) {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return NextResponse.json(
          { error: passwordValidation.errors[0] || 'Invalid password' },
          { status: 400 }
        );
      }

      updateData.password_hash = await hashPassword(password);
      updateData.password_changed_at = new Date();
      updateData.must_change_password = true;
    }

    const updatedEmployee = await prisma.employee.update({
      where: { id: employee.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        primary_role: true,
        status: true,
        updated_at: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedEmployee,
      password_updated: Boolean(password),
    });
  } catch (error) {
    console.error('[SUPER ADMIN USER PATCH] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to update user', details: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const employee = await prisma.employee.findFirst({
      where: {
        id,
        invited_by_type: 'super_admin',
        deleted_at: null,
      },
      select: { id: true, status: true },
    });

    if (!employee) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (employee.status === 'terminated' || employee.status === 'exited') {
      return NextResponse.json({ error: 'User already deactivated' }, { status: 400 });
    }

    await prisma.employee.update({
      where: { id: employee.id },
      data: {
        status: 'terminated',
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[SUPER ADMIN USER DELETE] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to delete user', details: message }, { status: 500 });
  }
}
