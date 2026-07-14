/**
 * lib/brand.ts — Single source of truth for all tenant-configurable brand tokens.
 *
 * Every value is read from environment variables at module load time.
 * To white-label Continuum for a reseller or SaaS customer, set these env vars:
 *
 *   NEXT_PUBLIC_PRODUCT_NAME=AcmeHR
 *   COOKIE_PREFIX=acmehr
 *   JWT_ISSUER=acmehr
 *   EMAIL_FROM_NAME=AcmeHR Platform
 *   SUPPORT_EMAIL=support@acmehr.com
 *
 * IMPORTANT: COOKIE_PREFIX changes break existing sessions. Only change it during
 * a fresh deployment or after explicitly clearing all cookies.
 *
 * @module lib/brand
 */

// ─── Product identity ─────────────────────────────────────────────────────────

/** Public-facing product name shown in UI, emails, and page titles. */
export const BRAND_PRODUCT_NAME =
  process.env.NEXT_PUBLIC_PRODUCT_NAME ?? 'Continuum';

/** Short tagline used in emails and footer. */
export const BRAND_TAGLINE =
  process.env.NEXT_PUBLIC_PRODUCT_TAGLINE ?? 'HR operations, finally done right.';

// ─── Authentication tokens ────────────────────────────────────────────────────

/**
 * Prefix for all cookie names.
 * Changing this value in production will invalidate all existing sessions.
 * All cookie names are derived from this prefix — never hardcoded individually.
 */
export const BRAND_COOKIE_PREFIX =
  process.env.COOKIE_PREFIX ?? 'continuum';

/**
 * JWT `iss` (issuer) claim value.
 * Must match the value used when the token was signed.
 * Changing this invalidates all outstanding JWTs.
 */
export const BRAND_JWT_ISSUER =
  process.env.JWT_ISSUER ?? 'continuum';

/**
 * JWT `aud` (audience) claims accepted by this deployment.
 * Multiple audiences are comma-separated in the env var.
 */
export const BRAND_JWT_AUDIENCES: string[] = (
  process.env.JWT_AUDIENCES ?? `${BRAND_COOKIE_PREFIX}-web,${BRAND_COOKIE_PREFIX}-api`
).split(',').map((a) => a.trim()).filter(Boolean);

// ─── Email sender ─────────────────────────────────────────────────────────────

/** Display name in the "From:" header of all outbound emails. */
export const BRAND_EMAIL_FROM_NAME =
  process.env.EMAIL_FROM_NAME ?? `${BRAND_PRODUCT_NAME} HR`;

/** Reply-to / support email address shown in email footers. */
export const BRAND_SUPPORT_EMAIL =
  process.env.SUPPORT_EMAIL ?? 'support@continuumhr.app';

// ─── Derived cookie names (assembled once, used everywhere) ──────────────────

/** Short-lived access token cookie. */
export const COOKIE_ACCESS = `${BRAND_COOKIE_PREFIX}-access`;

/** Session JWT cookie (httpOnly, SameSite=Lax). */
export const COOKIE_SESSION = `${BRAND_COOKIE_PREFIX}-session`;

/** Refresh token cookie (httpOnly, restricted to /api/auth path). */
export const COOKIE_REFRESH = `${BRAND_COOKIE_PREFIX}-refresh`;

/** Hint cookie: current user's primary role (readable by JS for UI routing). */
export const COOKIE_ROLE = `${BRAND_COOKIE_PREFIX}-role`;

/** Hint cookie: all roles as a JSON array (readable by JS for multi-role UI). */
export const COOKIE_ROLES = `${BRAND_COOKIE_PREFIX}-roles`;

/** Company-level onboarding completion flag cookie. */
export const COOKIE_ONBOARDING = `${BRAND_COOKIE_PREFIX}-onboarding-completed`;

/** Employee-level onboarding completion flag cookie. */
export const COOKIE_EMP_ONBOARDING = `${BRAND_COOKIE_PREFIX}-employee-onboarding-completed`;

/** Employee welcome screen pending flag cookie. */
export const COOKIE_EMP_WELCOME = `${BRAND_COOKIE_PREFIX}-employee-welcome-pending`;

/** Email verification status flag cookie — enforced server-side in middleware. */
export const COOKIE_EMAIL_VERIFIED = `${BRAND_COOKIE_PREFIX}-email-verified`;

/** Comma-separated enabled module slugs (middleware portal guards). */
export const COOKIE_ENABLED_MODULES = `${BRAND_COOKIE_PREFIX}-enabled-modules`;

/** Company setup complete for all roles (1 = onboarding_completed). */
export const COOKIE_COMPANY_SETUP = `${BRAND_COOKIE_PREFIX}-company-setup-complete`;
