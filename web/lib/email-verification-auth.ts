import type { NextRequest } from 'next/server';
import { normalizeEmail } from '@/lib/email-normalization';
import { getCurrentUserFromRequest, signIn, type AuthUser } from '@/lib/auth-service';

export type VerificationAuthResult =
  | { user: AuthUser; accessToken?: string; refreshToken?: string }
  | { error: string; status: number };

type CredentialBody = {
  identifier?: string;
  email?: string;
  password?: string;
};

/**
 * Resolves the actor for email verification APIs.
 * 1) Access cookie / Authorization on the request
 * 2) identifier + password in JSON body (sign-in page before cookies stick)
 */
export async function resolveVerificationActor(
  request: NextRequest
): Promise<VerificationAuthResult> {
  const sessionUser = await getCurrentUserFromRequest(request);
  if (sessionUser) {
    return { user: sessionUser };
  }

  let body: CredentialBody = {};
  try {
    body = (await request.clone().json()) as CredentialBody;
  } catch {
    body = {};
  }

  const loginIdentifier = String(body.identifier || body.email || '').trim();
  const password = String(body.password || '');

  if (!loginIdentifier || !password) {
    return {
      error: 'Sign in first, or enter your email and password and try Verify now again.',
      status: 401,
    };
  }

  let authIdentifier = loginIdentifier;
  if (loginIdentifier.includes('@')) {
    authIdentifier = normalizeEmail(loginIdentifier);
  }

  const result = await signIn(authIdentifier, password);
  if (!result.success || !result.user?.id) {
    return {
      error: result.error || 'Invalid email or password',
      status: 401,
    };
  }

  const user: AuthUser = {
    id: result.user.id,
    email: result.user.email,
    role: result.user.role,
    roles: result.user.roles ?? [result.user.role],
    orgId: result.user.org_id,
    firstName: result.user.firstName,
    lastName: result.user.lastName,
    status: result.user.status,
    tutorialCompleted: result.user.tutorialCompleted ?? false,
    mustChangePassword: result.user.mustChangePassword ?? false,
  };

  return {
    user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  };
}
