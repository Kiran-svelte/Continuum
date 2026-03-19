import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, validatePassword } from '@/lib/password-service';
import { generateTokenPair, getAccessCookieOptions, getRefreshCookieOptions, ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from '@/lib/jwt-service';
import { v4 as uuidv4 } from 'uuid';
import type { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * POST /api/invite/accept
 * 
 * Accepts an invitation and sets up the user's password.
 * If the user doesn't have an employee record yet, creates one.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password, confirmPassword } = body;

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.errors.join('. ') },
        { status: 400 }
      );
    }

    // Find the invitation
    const invite = await prisma.userInvite.findUnique({
      where: { token },
      include: {
        company: true,
      },
    });

    if (!invite) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 400 }
      );
    }

    if (invite.status !== 'pending') {
      return NextResponse.json(
        { error: 'This invitation has already been used' },
        { status: 400 }
      );
    }

    if (new Date() > invite.expires_at) {
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 400 }
      );
    }

    // Hash the password
    const passwordHash = await hashPassword(password);

    // Check if employee record already exists (created during invite in dev mode)
    let employee = await prisma.employee.findUnique({
      where: { email: invite.email.toLowerCase() },
    });

    if (employee) {
      // Update existing employee
      employee = await prisma.employee.update({
        where: { id: employee.id },
        data: {
          password_hash: passwordHash,
          invite_accepted_at: new Date(),
          must_change_password: false,
          status: 'onboarding',
        },
      });
    } else {
      // Create new employee
      employee = await prisma.employee.create({
        data: {
          email: invite.email.toLowerCase(),
          first_name: invite.first_name || '',
          last_name: invite.last_name || '',
          primary_role: invite.role,
          password_hash: passwordHash,
          invited_by_id: invite.invited_by_super_id || invite.invited_by_id,
          invited_by_type: invite.invited_by_super_id ? 'super_admin' : 'employee',
          invite_accepted_at: new Date(),
          org_id: invite.company_id,
          status: 'onboarding',
        },
      });
    }

    // Mark invitation as accepted
    await prisma.userInvite.update({
      where: { id: invite.id },
      data: {
        status: 'accepted',
        accepted_at: new Date(),
      },
    });

    // Generate tokens
    const tokenId = uuidv4();
    const secondaryRoles = (employee.secondary_roles as Role[]) || [];
    const allRoles = [employee.primary_role, ...secondaryRoles];

    const tokens = await generateTokenPair({
      employeeId: employee.id,
      email: employee.email,
      role: employee.primary_role,
      roles: allRoles,
      orgId: employee.org_id,
      tokenId,
    });

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        id: tokenId,
        token_hash: tokens.refreshToken,
        employee_id: employee.id,
        expires_at: tokens.refreshTokenExpiresAt,
      },
    });

    // Build response with cookies
    const response = NextResponse.json({
      success: true,
      user: {
        id: employee.id,
        email: employee.email,
        firstName: employee.first_name,
        lastName: employee.last_name,
        role: employee.primary_role,
        orgId: employee.org_id,
      },
      needsCompanySetup: !employee.org_id,
    });

    // Set auth cookies
    const accessOptions = getAccessCookieOptions();
    response.cookies.set(ACCESS_COOKIE_NAME, tokens.accessToken, {
      httpOnly: accessOptions.httpOnly,
      secure: accessOptions.secure,
      sameSite: accessOptions.sameSite,
      path: accessOptions.path,
      maxAge: accessOptions.maxAge,
    });

    const refreshOptions = getRefreshCookieOptions();
    response.cookies.set(REFRESH_COOKIE_NAME, tokens.refreshToken, {
      httpOnly: refreshOptions.httpOnly,
      secure: refreshOptions.secure,
      sameSite: refreshOptions.sameSite,
      path: refreshOptions.path,
      maxAge: refreshOptions.maxAge,
    });

    return response;
  } catch (error) {
    console.error('[INVITE ACCEPT] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to accept invitation', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/invite/accept?token=xxx
 * 
 * Validates an invitation token and returns invite details.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const invite = await prisma.userInvite.findUnique({
      where: { token },
      include: {
        company: { select: { name: true } },
      },
    });

    if (!invite) {
      return NextResponse.json(
        { valid: false, error: 'Invalid invitation token' },
        { status: 404 }
      );
    }

    if (invite.status !== 'pending') {
      return NextResponse.json(
        { valid: false, error: 'This invitation has already been used' },
        { status: 400 }
      );
    }

    if (new Date() > invite.expires_at) {
      return NextResponse.json(
        { valid: false, error: 'This invitation has expired' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      invite: {
        email: invite.email,
        role: invite.role,
        firstName: invite.first_name,
        lastName: invite.last_name,
        companyName: invite.company?.name,
        expiresAt: invite.expires_at,
      },
    });
  } catch (error) {
    console.error('[INVITE VALIDATE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to validate invitation' },
      { status: 500 }
    );
  }
}
