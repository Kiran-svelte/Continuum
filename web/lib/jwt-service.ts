// ─── JWT Service ──────────────────────────────────────────────────────────
//
// Custom JWT handling for Continuum authentication.
// Replaces Supabase/Firebase authentication with our own JWT system.
//
// Token Types:
// - Access Token: Short-lived (15min), used for API requests
// - Refresh Token: Long-lived (7 days), used to get new access tokens
//
// Flow:
// 1. User signs in with email/password
// 2. Server verifies password, generates access + refresh tokens
// 3. Access token in memory, refresh token in httpOnly cookie
// 4. Access token expires → use refresh token to get new pair
// 5. Refresh token expires → user must sign in again
//

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import type { Role } from '@prisma/client';

// ─── Constants ──────────────────────────────────────────────────────────────

export const ACCESS_TOKEN_EXPIRY = '15m';   // 15 minutes
export const REFRESH_TOKEN_EXPIRY = '7d';   // 7 days
export const REFRESH_COOKIE_NAME = 'continuum-refresh';
export const ACCESS_COOKIE_NAME = 'continuum-access';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AccessTokenPayload extends JWTPayload {
  sub: string;          // Employee ID
  email: string;
  role: Role;           // Primary role
  roles: Role[];        // All roles (primary + secondary)
  org_id: string | null; // Company ID (null for super_admin)
  type: 'access';
}

export interface RefreshTokenPayload extends JWTPayload {
  sub: string;          // Employee ID
  jti: string;          // Token ID for revocation
  type: 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

// ─── Secret Key ─────────────────────────────────────────────────────────────

let _secret: Uint8Array | null = null;

function getSecret(): Uint8Array {
  if (_secret) return _secret;

  const raw = process.env.JWT_SECRET || process.env.SESSION_SECRET || process.env.CSRF_SECRET;
  if (!raw) {
    throw new Error(
      'JWT_SECRET environment variable is required for JWT signing. ' +
      'Generate one with: openssl rand -base64 32'
    );
  }

  _secret = new TextEncoder().encode(raw);
  return _secret;
}

// ─── Access Token ───────────────────────────────────────────────────────────

/**
 * Creates a signed JWT access token.
 * Short-lived token for API authentication.
 */
export async function createAccessToken(payload: {
  employeeId: string;
  email: string;
  role: Role;
  roles: Role[];
  orgId: string | null;
}): Promise<{ token: string; expiresAt: Date }> {
  const secret = getSecret();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  const token = await new SignJWT({
    sub: payload.employeeId,
    email: payload.email,
    role: payload.role,
    roles: payload.roles,
    org_id: payload.orgId,
    type: 'access',
  } as AccessTokenPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .setIssuer('continuum')
    .setAudience('continuum-api')
    .sign(secret);

  return { token, expiresAt };
}

/**
 * Verifies an access token and returns the payload.
 */
export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const secret = getSecret();

  const { payload } = await jwtVerify(token, secret, {
    issuer: 'continuum',
    audience: 'continuum-api',
  });

  if (!payload.sub || payload.type !== 'access') {
    throw new Error('Invalid access token');
  }

  return payload as AccessTokenPayload;
}

// ─── Refresh Token ──────────────────────────────────────────────────────────

/**
 * Creates a signed JWT refresh token.
 * Long-lived token stored in httpOnly cookie.
 */
export async function createRefreshToken(payload: {
  employeeId: string;
  tokenId: string; // Unique ID for revocation tracking
}): Promise<{ token: string; expiresAt: Date }> {
  const secret = getSecret();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const token = await new SignJWT({
    sub: payload.employeeId,
    jti: payload.tokenId,
    type: 'refresh',
  } as RefreshTokenPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .setIssuer('continuum')
    .setAudience('continuum-refresh')
    .sign(secret);

  return { token, expiresAt };
}

/**
 * Verifies a refresh token and returns the payload.
 */
export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
  const secret = getSecret();

  const { payload } = await jwtVerify(token, secret, {
    issuer: 'continuum',
    audience: 'continuum-refresh',
  });

  if (!payload.sub || !payload.jti || payload.type !== 'refresh') {
    throw new Error('Invalid refresh token');
  }

  return payload as RefreshTokenPayload;
}

// ─── Token Pair Generation ──────────────────────────────────────────────────

/**
 * Generates both access and refresh tokens for a user.
 * Used after successful login or token refresh.
 */
export async function generateTokenPair(payload: {
  employeeId: string;
  email: string;
  role: Role;
  roles: Role[];
  orgId: string | null;
  tokenId: string;
}): Promise<TokenPair> {
  const [accessResult, refreshResult] = await Promise.all([
    createAccessToken({
      employeeId: payload.employeeId,
      email: payload.email,
      role: payload.role,
      roles: payload.roles,
      orgId: payload.orgId,
    }),
    createRefreshToken({
      employeeId: payload.employeeId,
      tokenId: payload.tokenId,
    }),
  ]);

  return {
    accessToken: accessResult.token,
    refreshToken: refreshResult.token,
    accessTokenExpiresAt: accessResult.expiresAt,
    refreshTokenExpiresAt: refreshResult.expiresAt,
  };
}

// ─── Cookie Helpers ─────────────────────────────────────────────────────────

/**
 * Cookie options for access token.
 * Short expiry, httpOnly, secure in production.
 */
export function getAccessCookieOptions() {
  return {
    name: ACCESS_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 15 * 60, // 15 minutes
  };
}

/**
 * Cookie options for refresh token.
 * Long expiry, httpOnly, secure, strict sameSite.
 */
export function getRefreshCookieOptions() {
  return {
    name: REFRESH_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/api/auth', // Only sent to auth endpoints
    maxAge: 7 * 24 * 60 * 60, // 7 days
  };
}

/**
 * Extract access token from Authorization header or cookie.
 */
export function extractAccessToken(request: Request): string | null {
  // Check Authorization header first
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Check cookie
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const match = cookieHeader
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith(`${ACCESS_COOKIE_NAME}=`));
    
    if (match) {
      return match.split('=').slice(1).join('=');
    }
  }

  return null;
}

/**
 * Extract refresh token from cookie.
 */
export function extractRefreshToken(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const match = cookieHeader
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith(`${REFRESH_COOKIE_NAME}=`));

  if (!match) return null;
  return match.split('=').slice(1).join('=');
}

// ─── Next.js Cookie Helpers ─────────────────────────────────────────────────

import { cookies } from 'next/headers';

/**
 * Get access token from Next.js cookies (server-side).
 */
export async function getAccessTokenFromCookies(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(ACCESS_COOKIE_NAME)?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * Get refresh token from Next.js cookies (server-side).
 */
export async function getRefreshTokenFromCookies(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(REFRESH_COOKIE_NAME)?.value ?? null;
  } catch {
    return null;
  }
}
