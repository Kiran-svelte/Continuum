// ─── JWT Auth Client (Browser) ─────────────────────────────────────────────

import { forceClientSignOut } from './client-auth';

/**
 * Sign up with email and password via JWT Auth API.
 */
export async function jwtSignUp(email: string, password: string, firstName?: string, lastName?: string) {
  const response = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, firstName, lastName }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Sign up failed');
  }

  return response.json();
}

/**
 * Sign in with email and password via JWT Auth API.
 */
export async function jwtSignIn(email: string, password: string) {
  const response = await fetch('/api/auth/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Sign in failed');
  }

  return response.json();
}

/**
 * Sign out via JWT Auth API (clears session cookie).
 */
export async function jwtSignOut() {
  await forceClientSignOut();
}

/**
 * Send password reset email via JWT Auth API.
 */
export async function jwtSendPasswordResetEmail(email: string) {
  const response = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send reset email');
  }

  return response.json();
}

/**
 * Update password (used during password reset flow).
 */
export async function jwtUpdatePassword(token: string, newPassword: string) {
  const response = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password: newPassword }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update password');
  }

  return response.json();
}

/**
 * Get current authenticated user from session API.
 */
export async function jwtGetUser() {
  const response = await fetch('/api/auth/me');

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.user;
}
