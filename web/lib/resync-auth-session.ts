import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import type { Role } from '@prisma/client';
import prisma from '@/lib/prisma';
import { createRefreshTokenRecord } from '@/lib/refresh-token';
import {
  extractAccessToken,
  generateTokenPair,
  getAccessCookieOptions,
  getRefreshCookieOptions,
  verifyAccessToken,
  REFRESH_COOKIE_NAME,
} from '@/lib/jwt-service';
import { COOKIE_ROLE, COOKIE_ROLES } from '@/lib/brand';

const ROLE_COOKIE_OPTS = {
  path: '/',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 24,
  httpOnly: true,
};

/**
 * When JWT role claim drifts from DB primary_role (e.g. after role change),
 * rotate tokens and role cookies so middleware and portals stay aligned.
 */
export async function resyncAuthSessionIfRoleMismatch(
  request: Request,
  response: NextResponse,
  employeeId: string,
  email: string,
  primaryRole: Role,
  orgId: string | null
): Promise<void> {
  const accessToken = extractAccessToken(request);
  if (!accessToken) return;

  try {
    const payload = await verifyAccessToken(accessToken);
    if (payload.role === primaryRole) return;

    const tokenId = uuidv4();
    const tokens = await generateTokenPair({
      employeeId,
      email,
      role: primaryRole,
      roles: [primaryRole],
      orgId,
      tokenId,
    });

    await createRefreshTokenRecord(prisma, {
      tokenId,
      refreshToken: tokens.refreshToken,
      employeeId,
      expiresAt: tokens.refreshTokenExpiresAt,
    });

    const accessOptions = getAccessCookieOptions();
    response.cookies.set(accessOptions.name, tokens.accessToken, {
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

    response.cookies.set(COOKIE_ROLE, primaryRole, ROLE_COOKIE_OPTS);
    response.cookies.set(COOKIE_ROLES, primaryRole, ROLE_COOKIE_OPTS);
  } catch {
    // Stale or invalid token — caller may still return profile; sign-in will recover.
  }
}
