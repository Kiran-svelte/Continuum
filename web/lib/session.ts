// ─── Session Management (Supabase Auth + Self-managed Sessions) ──────────────
//
// This module handles server-side session tokens. After Supabase authenticates a user,
// we create a signed JWT session cookie that middleware and API routes can verify
// without calling any external auth service.
//
// Flow:
//   1. Client signs in via Supabase → gets access token
//   2. Client POSTs access token to /api/auth/session
//   3. Server verifies Supabase access token via Admin API
//   4. Server creates a signed session JWT with { uid, email, role?, emp_id? }
//   5. Server sets session JWT as HTTP-only cookie
//   6. Middleware/API routes verify session JWT locally (no network call)
//

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { cookies } from 'next/headers';

// ─── Constants ──────────────────────────────────────────────────────────────

export const SESSION_COOKIE_NAME = 'continuum-session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SessionPayload extends JWTPayload {
  uid: string;       // Supabase User ID (= Employee.auth_id)
  email: string;
  emp_id?: string;   // Employee.id (set after first /api/auth/me lookup)
  role?: string;     // primary_role (set after first /api/auth/me lookup)
  roles?: string[];  // all roles [primary + secondary]
  org_id?: string;   // company id
}

// ─── Secret Key ─────────────────────────────────────────────────────────────

let _secret: Uint8Array | null = null;

function getSecret(): Uint8Array {
  if (_secret) return _secret;

  const raw = process.env.SESSION_SECRET || process.env.CSRF_SECRET;
  if (!raw) {
    throw new Error(
      'SESSION_SECRET (or CSRF_SECRET as fallback) environment variable is required for session signing. ' +
      'Generate one with: openssl rand -base64 32'
    );
  }

  _secret = new TextEncoder().encode(raw);
  return _secret;
}

// ─── Create Session Token ───────────────────────────────────────────────────

/**
 * Creates a signed JWT session token.
 * Called after Firebase ID token is verified server-side.
 */
export async function createSessionToken(payload: {
  uid: string;
  email: string;
  emp_id?: string;
  role?: string;
  roles?: string[];
  org_id?: string;
}): Promise<string> {
  const secret = getSecret();

  return new SignJWT({
    uid: payload.uid,
    email: payload.email,
    emp_id: payload.emp_id,
    role: payload.role,
    roles: payload.roles,
    org_id: payload.org_id,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .setIssuer('continuum')
    .setAudience('continuum-web')
    .sign(secret);
}

// ─── Verify Session Token ───────────────────────────────────────────────────

/**
 * Verifies a session JWT and returns the payload.
 * Works in both Node.js (API routes) and Edge (middleware) runtimes.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload> {
  const secret = getSecret();

  const { payload } = await jwtVerify(token, secret, {
    issuer: 'continuum',
    audience: 'continuum-web',
  });

  if (!payload.uid || !payload.email) {
    throw new Error('Invalid session token: missing uid or email');
  }

  return payload as SessionPayload;
}

// ─── Cookie Helpers ─────────────────────────────────────────────────────────

/**
 * Reads and verifies the session from cookies (Server Components / Route Handlers).
 * Returns null if no valid session exists.
 */
export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) return null;

    return await verifySessionToken(sessionCookie.value);
  } catch {
    return null;
  }
}

/**
 * Reads the session token from a raw cookie header string.
 * Used in middleware where we can't use next/headers cookies().
 */
export function getSessionTokenFromCookieHeader(cookieHeader: string): string | null {
  const match = cookieHeader
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith(`${SESSION_COOKIE_NAME}=`));

  if (!match) return null;
  return match.split('=').slice(1).join('=');
}

/**
 * Cookie options for setting/clearing the session cookie.
 */
export function getSessionCookieOptions(maxAge?: number) {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAge ?? SESSION_MAX_AGE,
  };
}
