// ─── Auth Service ─────────────────────────────────────────────────────────
//
// Main authentication service for Continuum.
// Handles sign-in, sign-out, token refresh, and session management.
//
// This replaces Supabase Auth with our own JWT-based system.
//

import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/lib/prisma';
import {
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  extractAccessToken,
  extractRefreshToken,
  getAccessCookieOptions,
  getRefreshCookieOptions,
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  type AccessTokenPayload,
  type TokenPair,
} from '@/lib/jwt-service';
import { verifyPassword, hashPassword } from '@/lib/password-service';
import type { Role, Employee } from '@prisma/client';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AuthResult {
  success: boolean;
  employee?: Employee;
  tokens?: TokenPair;
  error?: string;
  code?: 'INVALID_CREDENTIALS' | 'ACCOUNT_INACTIVE' | 'PASSWORD_REQUIRED' | 'NOT_FOUND';
  // Additional fields for API responses
  user?: {
    id: string;
    email: string;
    role: Role;
    roles: Role[];
    org_id: string | null;
    firstName: string;
    lastName: string;
    status: string;
    tutorialCompleted: boolean;
    mustChangePassword: boolean;
  };
  accessToken?: string;
  refreshToken?: string;
  requires_password_change?: boolean;
  tutorial_completed?: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  roles: Role[];
  orgId: string | null;
  firstName: string;
  lastName: string;
  status: string;
  tutorialCompleted: boolean;
  mustChangePassword: boolean;
}

// ─── Sign In ────────────────────────────────────────────────────────────────

/**
 * Authenticates a user with email and password.
 * Returns tokens if successful.
 */
export async function signIn(email: string, password: string): Promise<AuthResult> {
  // Find employee by email
  const employee = await prisma.employee.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!employee) {
    return {
      success: false,
      error: 'Invalid email or password',
      code: 'INVALID_CREDENTIALS',
    };
  }

  // Check if password is set
  if (!employee.password_hash) {
    return {
      success: false,
      error: 'Please set your password using the invitation link',
      code: 'PASSWORD_REQUIRED',
    };
  }

  // Verify password
  const isValid = await verifyPassword(password, employee.password_hash);
  if (!isValid) {
    return {
      success: false,
      error: 'Invalid email or password',
      code: 'INVALID_CREDENTIALS',
    };
  }

  // Check account status
  if (['terminated', 'exited', 'suspended'].includes(employee.status)) {
    return {
      success: false,
      error: 'Your account is no longer active',
      code: 'ACCOUNT_INACTIVE',
    };
  }

  // Generate tokens
  const tokenId = uuidv4();
  const secondaryRoles = (employee.secondary_roles as Role[]) || [];
  const allRoles = [employee.primary_role, ...secondaryRoles];

  const tokens = await generateTokenPair({
    employeeId: employee.id,
    email: employee.email,
    role: employee.primary_role,
    roles: allRoles,
    orgId: employee.org_id!,
    tokenId,
  });

  // Store refresh token in database
  await prisma.refreshToken.create({
    data: {
      id: tokenId,
      token_hash: tokens.refreshToken, // In production, hash this
      employee_id: employee.id,
      expires_at: tokens.refreshTokenExpiresAt,
    },
  });

  // Update last login
  await prisma.employee.update({
    where: { id: employee.id },
    data: { last_login_at: new Date() },
  });

  return {
    success: true,
    employee,
    tokens,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    requires_password_change: employee.must_change_password,
    tutorial_completed: employee.tutorial_completed,
    user: {
      id: employee.id,
      email: employee.email,
      role: employee.primary_role,
      roles: allRoles,
      org_id: employee.org_id!,
      firstName: employee.first_name,
      lastName: employee.last_name,
      status: employee.status,
      tutorialCompleted: employee.tutorial_completed,
      mustChangePassword: employee.must_change_password,
    },
  };
}

/**
 * Signs in a super admin.
 */
export async function signInSuperAdmin(email: string, password: string): Promise<AuthResult> {
  const superAdmin = await prisma.superAdmin.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!superAdmin) {
    return {
      success: false,
      error: 'Invalid email or password',
      code: 'INVALID_CREDENTIALS',
    };
  }

  if (!superAdmin.is_active) {
    return {
      success: false,
      error: 'Your account is no longer active',
      code: 'ACCOUNT_INACTIVE',
    };
  }

  const isValid = await verifyPassword(password, superAdmin.password_hash);
  if (!isValid) {
    return {
      success: false,
      error: 'Invalid email or password',
      code: 'INVALID_CREDENTIALS',
    };
  }

  // For super admin, we create an employee-like object
  // Super admin uses special role and null org_id
  const tokenId = uuidv4();
  const tokens = await generateTokenPair({
    employeeId: superAdmin.id,
    email: superAdmin.email,
    role: 'super_admin' as Role,
    roles: ['super_admin' as Role],
    orgId: null,
    tokenId,
  });

  // Update last login
  await prisma.superAdmin.update({
    where: { id: superAdmin.id },
    data: { last_login_at: new Date() },
  });

  return {
    success: true,
    tokens,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    requires_password_change: false,
    tutorial_completed: true,
    user: {
      id: superAdmin.id,
      email: superAdmin.email,
      role: 'super_admin' as Role,
      roles: ['super_admin' as Role],
      org_id: null,
      firstName: superAdmin.name.split(' ')[0] || superAdmin.name,
      lastName: superAdmin.name.split(' ').slice(1).join(' ') || '',
      status: 'active',
      tutorialCompleted: true,
      mustChangePassword: false,
    },
  };
}

// ─── Token Refresh ──────────────────────────────────────────────────────────

/**
 * Refreshes tokens using a valid refresh token.
 */
export async function refreshTokens(refreshToken: string): Promise<AuthResult> {
  try {
    // Verify the refresh token
    const payload = await verifyRefreshToken(refreshToken);

    // Check if token exists in database and isn't revoked
    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        id: payload.jti,
        revoked_at: null,
        expires_at: { gt: new Date() },
      },
      include: {
        employee: true,
      },
    });

    if (!storedToken) {
      return {
        success: false,
        error: 'Invalid or expired refresh token',
      };
    }

    const employee = storedToken.employee;

    // Check account status
    if (['terminated', 'exited', 'suspended'].includes(employee.status)) {
      // Revoke the token
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revoked_at: new Date() },
      });

      return {
        success: false,
        error: 'Your account is no longer active',
        code: 'ACCOUNT_INACTIVE',
      };
    }

    // Rotate refresh token (revoke old, create new)
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked_at: new Date() },
    });

    // Generate new tokens
    const newTokenId = uuidv4();
    const secondaryRoles = (employee.secondary_roles as Role[]) || [];
    const allRoles = [employee.primary_role, ...secondaryRoles];

    const tokens = await generateTokenPair({
      employeeId: employee.id,
      email: employee.email,
      role: employee.primary_role,
      roles: allRoles,
      orgId: employee.org_id!,
      tokenId: newTokenId,
    });

    // Store new refresh token
    await prisma.refreshToken.create({
      data: {
        id: newTokenId,
        token_hash: tokens.refreshToken,
        employee_id: employee.id,
        expires_at: tokens.refreshTokenExpiresAt,
      },
    });

    return {
      success: true,
      employee,
      tokens,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: employee.id,
        email: employee.email,
        role: employee.primary_role,
        roles: allRoles,
        org_id: employee.org_id!,
        firstName: employee.first_name,
        lastName: employee.last_name,
        status: employee.status,
        tutorialCompleted: employee.tutorial_completed,
        mustChangePassword: employee.must_change_password,
      },
    };
  } catch {
    return {
      success: false,
      error: 'Invalid refresh token',
    };
  }
}

// ─── Sign Out ───────────────────────────────────────────────────────────────

/**
 * Signs out a user by revoking their refresh token.
 */
export async function signOut(refreshToken: string): Promise<void> {
  try {
    const payload = await verifyRefreshToken(refreshToken);
    
    await prisma.refreshToken.updateMany({
      where: { id: payload.jti },
      data: { revoked_at: new Date() },
    });
  } catch {
    // Token invalid, nothing to revoke
  }
}

/**
 * Signs out from all devices by revoking all refresh tokens.
 */
export async function signOutAll(employeeId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { employee_id: employeeId, revoked_at: null },
    data: { revoked_at: new Date() },
  });
}

// ─── Get Current User ───────────────────────────────────────────────────────

/**
 * Gets the current authenticated user from the access token.
 * For use in Server Components and Route Handlers.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  if (!accessToken) {
    return null;
  }

  try {
    const payload = await verifyAccessToken(accessToken);

    // For super admin
    if (payload.role === 'super_admin') {
      const superAdmin = await prisma.superAdmin.findUnique({
        where: { id: payload.sub },
      });

      if (!superAdmin || !superAdmin.is_active) {
        return null;
      }

      return {
        id: superAdmin.id,
        email: superAdmin.email,
        role: 'super_admin' as Role,
        roles: ['super_admin' as Role],
        orgId: null,
        firstName: superAdmin.name.split(' ')[0] || superAdmin.name,
        lastName: superAdmin.name.split(' ').slice(1).join(' ') || '',
        status: 'active',
        tutorialCompleted: true,
        mustChangePassword: false,
      };
    }

    // For regular employees
    const employee = await prisma.employee.findUnique({
      where: { id: payload.sub },
    });

    if (!employee) {
      return null;
    }

    if (['terminated', 'exited', 'suspended'].includes(employee.status)) {
      return null;
    }

    const secondaryRoles = (employee.secondary_roles as Role[]) || [];

    return {
      id: employee.id,
      email: employee.email,
      role: employee.primary_role,
      roles: [employee.primary_role, ...secondaryRoles],
      orgId: employee.org_id!,
      firstName: employee.first_name,
      lastName: employee.last_name,
      status: employee.status,
      tutorialCompleted: employee.tutorial_completed,
      mustChangePassword: employee.must_change_password,
    };
  } catch {
    return null;
  }
}

/**
 * Gets the current user from a request (for API routes).
 */
export async function getCurrentUserFromRequest(request: Request): Promise<AuthUser | null> {
  const accessToken = extractAccessToken(request);

  if (!accessToken) {
    return null;
  }

  try {
    const payload = await verifyAccessToken(accessToken);

    // Handle super admin
    if (payload.role === 'super_admin') {
      const superAdmin = await prisma.superAdmin.findUnique({
        where: { id: payload.sub },
      });

      if (!superAdmin || !superAdmin.is_active) {
        return null;
      }

      return {
        id: superAdmin.id,
        email: superAdmin.email,
        role: 'super_admin' as Role,
        roles: ['super_admin' as Role],
        orgId: null,
        firstName: superAdmin.name.split(' ')[0] || superAdmin.name,
        lastName: superAdmin.name.split(' ').slice(1).join(' ') || '',
        status: 'active',
        tutorialCompleted: true,
        mustChangePassword: false,
      };
    }

    // Handle regular employees
    const employee = await prisma.employee.findUnique({
      where: { id: payload.sub },
    });

    if (!employee || ['terminated', 'exited', 'suspended'].includes(employee.status)) {
      return null;
    }

    const secondaryRoles = (employee.secondary_roles as Role[]) || [];

    return {
      id: employee.id,
      email: employee.email,
      role: employee.primary_role,
      roles: [employee.primary_role, ...secondaryRoles],
      orgId: employee.org_id!,
      firstName: employee.first_name,
      lastName: employee.last_name,
      status: employee.status,
      tutorialCompleted: employee.tutorial_completed,
      mustChangePassword: employee.must_change_password,
    };
  } catch {
    return null;
  }
}

// ─── Cookie Helpers ─────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';

/**
 * Sets auth cookies on a NextResponse (for API routes).
 */
export function setAuthCookies(response: NextResponse, accessToken: string, refreshToken: string): void {
  const accessOptions = getAccessCookieOptions();
  response.cookies.set(accessOptions.name, accessToken, {
    httpOnly: accessOptions.httpOnly,
    secure: accessOptions.secure,
    sameSite: accessOptions.sameSite,
    path: accessOptions.path,
    maxAge: accessOptions.maxAge,
  });

  const refreshOptions = getRefreshCookieOptions();
  response.cookies.set(refreshOptions.name, refreshToken, {
    httpOnly: refreshOptions.httpOnly,
    secure: refreshOptions.secure,
    sameSite: refreshOptions.sameSite,
    path: refreshOptions.path,
    maxAge: refreshOptions.maxAge,
  });

  // Also set role cookies for middleware
  // These are set based on what's in the token
}

/**
 * Clears auth cookies on a NextResponse (for API routes).
 */
export function clearAuthCookies(response: NextResponse): void {
  response.cookies.set(ACCESS_COOKIE_NAME, '', { maxAge: 0, path: '/' });
  response.cookies.set(REFRESH_COOKIE_NAME, '', { maxAge: 0, path: '/api/auth' });
  response.cookies.set('continuum-role', '', { maxAge: 0, path: '/' });
  response.cookies.set('continuum-roles', '', { maxAge: 0, path: '/' });
}

/**
 * Sets auth cookies after successful sign-in (async version for Server Components).
 * Call this from API route handlers.
 */
export async function setAuthCookiesAsync(tokens: TokenPair): Promise<void> {
  const cookieStore = await cookies();

  // Set access token cookie
  const accessOptions = getAccessCookieOptions();
  cookieStore.set(accessOptions.name, tokens.accessToken, {
    httpOnly: accessOptions.httpOnly,
    secure: accessOptions.secure,
    sameSite: accessOptions.sameSite,
    path: accessOptions.path,
    maxAge: accessOptions.maxAge,
  });

  // Set refresh token cookie
  const refreshOptions = getRefreshCookieOptions();
  cookieStore.set(refreshOptions.name, tokens.refreshToken, {
    httpOnly: refreshOptions.httpOnly,
    secure: refreshOptions.secure,
    sameSite: refreshOptions.sameSite,
    path: refreshOptions.path,
    maxAge: refreshOptions.maxAge,
  });
}

/**
 * Clears auth cookies on sign-out (async version).
 */
export async function clearAuthCookiesAsync(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(ACCESS_COOKIE_NAME, '', { maxAge: 0 });
  cookieStore.set(REFRESH_COOKIE_NAME, '', { maxAge: 0, path: '/api/auth' });
}

// ─── Password Management ────────────────────────────────────────────────────

/**
 * Changes an employee's password.
 */
export async function changePassword(
  employeeId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });

  if (!employee || !employee.password_hash) {
    return { success: false, error: 'Invalid employee' };
  }

  const isValid = await verifyPassword(currentPassword, employee.password_hash);
  if (!isValid) {
    return { success: false, error: 'Current password is incorrect' };
  }

  const newHash = await hashPassword(newPassword);

  await prisma.employee.update({
    where: { id: employeeId },
    data: {
      password_hash: newHash,
      password_changed_at: new Date(),
      must_change_password: false,
    },
  });

  // Revoke all refresh tokens (force re-login)
  await signOutAll(employeeId);

  return { success: true };
}

/**
 * Sets password for first-time user (invite acceptance).
 */
export async function setInitialPassword(
  employeeId: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });

  if (!employee) {
    return { success: false, error: 'Invalid employee' };
  }

  if (employee.password_hash) {
    return { success: false, error: 'Password already set' };
  }

  const hash = await hashPassword(password);

  await prisma.employee.update({
    where: { id: employeeId },
    data: {
      password_hash: hash,
      password_changed_at: new Date(),
      invite_accepted_at: new Date(),
      status: 'active',
    },
  });

  return { success: true };
}

