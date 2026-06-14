import { normalizeEmail } from '@/lib/email-normalization';

export type SignInIdentityRejectionCode =
  | 'NON_PRODUCTION_IDENTITY_IN_PRODUCTION'
  | 'MISSING_EMAIL';

export interface SignInIdentityAssessment {
  allowed: boolean;
  normalizedEmail: string;
  code?: SignInIdentityRejectionCode;
  message?: string;
  reason?: string;
}

const NON_PRODUCTION_EMAIL_PATTERNS: RegExp[] = [
  /@.*\.test$/i,
  /@demo\.continuum\.io$/i,
  /@continuum-test\.com$/i,
];

/**
 * Normalize email for sign-in identity assessment
 * Uses centralized email normalization utility
 */
export function normalizeSignInEmail(email: string): string {
  return normalizeEmail(email);
}

export function assessSignInIdentity(email: string): SignInIdentityAssessment {
  const normalizedEmail = normalizeSignInEmail(email);
  if (!normalizedEmail) {
    return {
      allowed: false,
      normalizedEmail,
      code: 'MISSING_EMAIL',
      message: 'Email and password are required',
      reason: 'missing-email',
    };
  }

  if (process.env.NODE_ENV !== 'production') {
    return { allowed: true, normalizedEmail };
  }

  const isNonProductionIdentity = NON_PRODUCTION_EMAIL_PATTERNS.some((pattern) =>
    pattern.test(normalizedEmail)
  );

  if (!isNonProductionIdentity) {
    return { allowed: true, normalizedEmail };
  }

  return {
    allowed: false,
    normalizedEmail,
    code: 'NON_PRODUCTION_IDENTITY_IN_PRODUCTION',
    message:
      'This account is a test/demo identity and cannot sign in to production. Use an invited production account.',
    reason: 'non-production-identity',
  };
}