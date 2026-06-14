/**
 * Canonical production hostname for Continuum (continuum.support).
 * Set NEXT_PUBLIC_APP_URL / APP_URL to this origin in production deployments.
 */

export const CANONICAL_PRODUCTION_ORIGIN = 'https://continuum.support';
export const CANONICAL_PRODUCTION_HOST = 'continuum.support';
export const CANONICAL_PRODUCTION_WWW_ORIGIN = 'https://www.continuum.support';

export const CANONICAL_PRODUCTION_ORIGINS = [
  CANONICAL_PRODUCTION_ORIGIN,
  CANONICAL_PRODUCTION_WWW_ORIGIN,
] as const;
