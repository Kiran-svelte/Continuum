// ─── Auth Service ─────────────────────────────────────────────────────────
//
// Main authentication service for Continuum.
// Handles sign-in, sign-out, token refresh, and session management.
//

import { cookies } from 'next/headers';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/lib/prisma';
import {
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  extractAccessToken,
  getAccessCookieOptions,
  getRefreshCookieOptions,
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  type TokenPair,
} from '@/lib/jwt-service';
import { verifyPassword, hashPassword } from '@/lib/password-service';
import {
  COOKIE_SESSION,
  COOKIE_ROLE,
  COOKIE_ROLES,
  COOKIE_ONBOARDING,
  COOKIE_EMP_ONBOARDING,
  COOKIE_EMP_WELCOME,
  COOKIE_ENABLED_MODULES,
  COOKIE_COMPANY_SETUP,
} from '@/lib/brand';
import type { Role, Employee } from '@prisma/client';

/** SHA-256 hash a refresh token before storing in DB. Raw tokens are never persisted. */
function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

async function storeRefreshToken(input: {
  tokenId: string;
  refreshToken: string;
  expiresAt: Date;
  employeeId?: string;
  superAdminId?: string;
}): Promise<void> {
  if ((input.employeeId ? 1 : 0) + (input.superAdminId ? 1 : 0) !== 1) {
    throw new Error('Refresh token must have exactly one owner');
  }

  await prisma.refreshToken.create({
    data: {
      id: input.tokenId,
      token_hash: hashRefreshToken(input.refreshToken),
      employee_id: input.employeeId,
      super_admin_id: input.superAdminId,
      expires_at: input.expiresAt,
    },
  });
}

export const SESSION_COOKIE_NAME = COOKIE_SESSION;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AuthResult {
  success: boolean;
  employee?: Employee;
  tokens?: TokenPair;
  error?: string;
  code?: 'INVALID_CREDENTIALS' | 'ACCOUNT_INACTIVE' | 'PASSWORD_REQUIRED' | 'NOT_FOUND';
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
 * Authenticates an employee with email and password.
 * Returns tokens if successful.
 */
export async function signIn(email: string, password: string): Promise<AuthResult> {
  const employee = await prisma.employee.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!employee) {
    return { success: false, error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' };
  }

  if (!employee.password_hash) {
    return {
      success: false,
      error: 'Please set your password using the invitation link',
      code: 'PASSWORD_REQUIRED',
    };
  }

  const isValid = await verifyPassword(password, employee.password_hash);
  if (!isValid) {
    return { success: false, error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' };
  }

  if (['terminated', 'exited', 'suspended'].includes(employee.status)) {
    return { success: false, error: 'Your account is no longer active', code: 'ACCOUNT_INACTIVE' };
  }

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

  // Store hashed refresh token — raw tokens are never persisted
  await storeRefreshToken({
    tokenId,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.refreshTokenExpiresAt,
    employeeId: employee.id,
  });

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
      org_id: employee.org_id,
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
 * NOTE: Demo backdoor credentials (super@demo.continuum.io / Demo@123) have been
 * intentionally removed. Use real accounts created via scripts/seed-super-admin.mjs.
 */
export async function signInSuperAdmin(email: string, password: string): Promise<AuthResult> {
  const emailLower = email.toLowerCase();
  const superAdmin = await prisma.superAdmin.findUnique({
    where: { email: emailLower },
  });

  if (!superAdmin) {
    return { success: false, error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' };
  }

  if (!superAdmin.is_active) {
    return { success: false, error: 'Your account is no longer active', code: 'ACCOUNT_INACTIVE' };
  }

  const isValid = await verifyPassword(password, superAdmin.password_hash);
  if (!isValid) {
    return { success: false, error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' };
  }

  const tokenId = uuidv4();
  const tokens = await generateTokenPair({
    employeeId: superAdmin.id,
    email: superAdmin.email,
    role: 'super_admin' as Role,
    roles: ['super_admin' as Role],
    orgId: null,
    tokenId,
  });

  await storeRefreshToken({
    tokenId,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.refreshTokenExpiresAt,
    superAdminId: superAdmin.id,
  });

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
 * Verifies by comparing SHA-256 hash — raw token is never stored in DB.
 */
export async function refreshTokens(refreshToken: string): Promise<AuthResult> {
  try {
    const payload = await verifyRefreshToken(refreshToken);

    // Verify token by hash — prevents token theft from a DB leak
    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        id: payload.jti,
        token_hash: hashRefreshToken(refreshToken),
        revoked_at: null,
        expires_at: { gt: new Date() },
      },
      include: { employee: true, super_admin: true },
    });

    if (!storedToken) {
      return { success: false, error: 'Invalid or expired refresh token' };
    }

    if (storedToken.super_admin) {
      const superAdmin = storedToken.super_admin;

      if (!superAdmin.is_active) {
        await prisma.refreshToken.update({
          where: { id: storedToken.id },
          data: { revoked_at: new Date() },
        });
        return { success: false, error: 'Your account is no longer active', code: 'ACCOUNT_INACTIVE' };
      }

      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revoked_at: new Date() },
      });

      const newTokenId = uuidv4();
      const tokens = await generateTokenPair({
        employeeId: superAdmin.id,
        email: superAdmin.email,
        role: 'super_admin' as Role,
        roles: ['super_admin' as Role],
        orgId: null,
        tokenId: newTokenId,
      });

      await storeRefreshToken({
        tokenId: newTokenId,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.refreshTokenExpiresAt,
        superAdminId: superAdmin.id,
      });

      return {
        success: true,
        tokens,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
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

    const employee = storedToken.employee;
    if (!employee) {
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revoked_at: new Date() },
      });
      return { success: false, error: 'Invalid or expired refresh token' };
    }

    if (['terminated', 'exited', 'suspended'].includes(employee.status)) {
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revoked_at: new Date() },
      });
      return { success: false, error: 'Your account is no longer active', code: 'ACCOUNT_INACTIVE' };
    }

    // Rotate: revoke old, issue new
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked_at: new Date() },
    });

    const newTokenId = uuidv4();
    const secondaryRoles = (employee.secondary_roles as Role[]) || [];
    const allRoles = [employee.primary_role, ...secondaryRoles];

    const tokens = await generateTokenPair({
      employeeId: employee.id,
      email: employee.email,
      role: employee.primary_role,
      roles: allRoles,
      orgId: employee.org_id,
      tokenId: newTokenId,
    });

    await storeRefreshToken({
      tokenId: newTokenId,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.refreshTokenExpiresAt,
      employeeId: employee.id,
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
        org_id: employee.org_id,
        firstName: employee.first_name,
        lastName: employee.last_name,
        status: employee.status,
        tutorialCompleted: employee.tutorial_completed,
        mustChangePassword: employee.must_change_password,
      },
    };
  } catch {
    return { success: false, error: 'Invalid refresh token' };
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
    where: {
      revoked_at: null,
      OR: [{ employee_id: employeeId }, { super_admin_id: employeeId }],
    },
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

  if (!accessToken) return null;

  try {
    const payload = await verifyAccessToken(accessToken);

    if (payload.role === 'super_admin') {
      const superAdmin = await prisma.superAdmin.findUnique({
        where: { id: payload.sub },
      });

      if (!superAdmin || !superAdmin.is_active) return null;

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

    const employee = await prisma.employee.findUnique({
      where: { id: payload.sub },
    });

    if (!employee) return null;
    if (['terminated', 'exited', 'suspended'].includes(employee.status)) return null;

    const secondaryRoles = (employee.secondary_roles as Role[]) || [];

    return {
      id: employee.id,
      email: employee.email,
      role: employee.primary_role,
      roles: [employee.primary_role, ...secondaryRoles],
      orgId: employee.org_id,
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

  if (!accessToken) return null;

  try {
    const payload = await verifyAccessToken(accessToken);

    if (payload.role === 'super_admin') {
      const superAdmin = await prisma.superAdmin.findUnique({
        where: { id: payload.sub },
      });

      if (!superAdmin || !superAdmin.is_active) return null;

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

    const employee = await prisma.employee.findUnique({
      where: { id: payload.sub },
    });

    if (!employee || ['terminated', 'exited', 'suspended'].includes(employee.status)) return null;

    const secondaryRoles = (employee.secondary_roles as Role[]) || [];

    return {
      id: employee.id,
      email: employee.email,
      role: employee.primary_role,
      roles: [employee.primary_role, ...secondaryRoles],
      orgId: employee.org_id,
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
}

/**
 * Clears auth cookies on a NextResponse (for API routes).
 */
export function clearAuthCookies(response: NextResponse): void {
  response.cookies.set(ACCESS_COOKIE_NAME, '', { maxAge: 0, path: '/' });
  response.cookies.set(REFRESH_COOKIE_NAME, '', { maxAge: 0, path: '/api/auth' });
  response.cookies.set(SESSION_COOKIE_NAME, '', { maxAge: 0, path: '/' });
  response.cookies.set(COOKIE_ROLE, '', { maxAge: 0, path: '/' });
  response.cookies.set(COOKIE_ROLES, '', { maxAge: 0, path: '/' });
  response.cookies.set(COOKIE_ONBOARDING, '', { maxAge: 0, path: '/' });
  response.cookies.set(COOKIE_EMP_ONBOARDING, '', { maxAge: 0, path: '/' });
  response.cookies.set(COOKIE_EMP_WELCOME, '', { maxAge: 0, path: '/' });
  response.cookies.set(COOKIE_ENABLED_MODULES, '', { maxAge: 0, path: '/' });
  response.cookies.set(COOKIE_COMPANY_SETUP, '', { maxAge: 0, path: '/' });
}

/**
 * Sets auth cookies after successful sign-in (async version for Server Components).
 */
export async function setAuthCookiesAsync(tokens: TokenPair): Promise<void> {
  const cookieStore = await cookies();

  const accessOptions = getAccessCookieOptions();
  cookieStore.set(accessOptions.name, tokens.accessToken, {
    httpOnly: accessOptions.httpOnly,
    secure: accessOptions.secure,
    sameSite: accessOptions.sameSite,
    path: accessOptions.path,
    maxAge: accessOptions.maxAge,
  });

  const refreshOptions = getRefreshCookieOptions();
  cookieStore.set(refreshOptions.name, tokens.refreshToken, {
    httpOnly: refreshOptions.httpOnly,
    secure: refreshOptions.secure,
    sameSite: refreshOptions.sameSite,
    path: refreshOptions.path,
    maxAge: refreshOptions.maxAge,
  });
}

export async function clearAuthCookiesAsync(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(ACCESS_COOKIE_NAME, '', { maxAge: 0 });
  cookieStore.set(REFRESH_COOKIE_NAME, '', { maxAge: 0, path: '/api/auth' });
  cookieStore.set(SESSION_COOKIE_NAME, '', { maxAge: 0 });
  cookieStore.set(COOKIE_ROLE, '', { maxAge: 0 });
  cookieStore.set(COOKIE_ROLES, '', { maxAge: 0 });
  cookieStore.set(COOKIE_ONBOARDING, '', { maxAge: 0 });
  cookieStore.set(COOKIE_EMP_ONBOARDING, '', { maxAge: 0 });
  cookieStore.set(COOKIE_EMP_WELCOME, '', { maxAge: 0 });
  cookieStore.set(COOKIE_ENABLED_MODULES, '', { maxAge: 0 });
  cookieStore.set(COOKIE_COMPANY_SETUP, '', { maxAge: 0 });
}

// ─── Password Management ────────────────────────────────────────────────────

/**
 * Changes an employee's password.
 * Revokes all active sessions (forces re-login on all devices).
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

  // Revoke all refresh tokens (force re-login on all devices)
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
