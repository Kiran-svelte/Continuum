import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-service';
import { generateTokenPair, getAccessCookieOptions, getRefreshCookieOptions, ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from '@/lib/jwt-service';
import { v4 as uuidv4 } from 'uuid';
import type { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * POST /api/company/create
 * 
 * Creates a new company. Called by invited admins who don't have a company yet.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins without a company can create one
    if (user.orgId) {
      return NextResponse.json(
        { error: 'You already belong to a company' },
        { status: 400 }
      );
    }

    if (!['admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Only admins can create companies' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      industry,
      size,
      countryCode = 'IN',
      timezone = 'Asia/Kolkata',
      // Dynamic role configuration
      enabledRoles = ['admin', 'hr', 'manager', 'team_lead', 'employee'],
      requiresHr = true,
      requiresManager = true,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      );
    }

    // Generate a unique join code
    const joinCode = generateJoinCode();

    // Create company
    const company = await prisma.company.create({
      data: {
        name,
        industry,
        size,
        country_code: countryCode,
        timezone,
        join_code: joinCode,
        enabled_roles: enabledRoles,
        requires_hr: requiresHr,
        requires_manager: requiresManager,
        onboarding_completed: false,
      },
    });

    // Update the employee to belong to this company
    const employee = await prisma.employee.update({
      where: { id: user.id },
      data: {
        org_id: company.id,
        status: 'active',
      },
    });

    // Generate new tokens with company ID
    const tokenId = uuidv4();
    const tokens = await generateTokenPair({
      employeeId: employee.id,
      email: employee.email,
      role: employee.primary_role,
      roles: [employee.primary_role],
      orgId: company.id,
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

    // Build response with new cookies
    const response = NextResponse.json({
      success: true,
      company: {
        id: company.id,
        name: company.name,
        joinCode: company.join_code,
      },
    });

    // Set new auth cookies with company ID
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
    console.error('[COMPANY CREATE] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create company', details: errorMessage },
      { status: 500 }
    );
  }
}

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
