/**
 * When true, /sign-up shows the credential-first workspace form (dev/demo).
 * Production defaults to invitation-only gate.
 */
export function isPublicSignupEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ALLOW_PUBLIC_SIGNUP === 'true';
}
