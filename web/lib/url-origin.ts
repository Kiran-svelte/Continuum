import type { NextRequest } from 'next/server';

type OriginRequestLike = Pick<NextRequest, 'nextUrl' | 'headers'>;

interface ResolveAppOriginOptions {
  request?: OriginRequestLike;
  allowLocalhostInProduction?: boolean;
}

const LOCAL_DEV_ORIGIN = 'http://localhost:3000';

function normalizeOrigin(value: string | null | undefined): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
}

function buildOriginFromForwardedHeaders(request?: OriginRequestLike): string | null {
  if (!request) return null;

  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');

  if (!forwardedHost || !forwardedProto) return null;
  return normalizeOrigin(`${forwardedProto}://${forwardedHost}`);
}

function isLocalOrigin(origin: string): boolean {
  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1'
    );
  } catch {
    return false;
  }
}

/**
 * Resolves the canonical application origin.
 * - Priority: NEXT_PUBLIC_APP_URL / APP_URL -> forwarded headers -> request origin.
 * - Production: refuses localhost-style origins unless explicitly allowed.
 * - Non-production: falls back to localhost for local developer workflows.
 */
export function resolveAppOrigin(options: ResolveAppOriginOptions = {}): string {
  const { request, allowLocalhostInProduction = false } = options;
  const isProduction = process.env.NODE_ENV === 'production';

  const envOrigin =
    normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL) ||
    normalizeOrigin(process.env.APP_URL);
  const forwardedOrigin = buildOriginFromForwardedHeaders(request);
  const requestOrigin = normalizeOrigin(request?.nextUrl?.origin);

  const resolvedOrigin = envOrigin || forwardedOrigin || requestOrigin;

  if (!resolvedOrigin) {
    if (isProduction) {
      throw new Error(
        'Unable to resolve application origin in production. Set NEXT_PUBLIC_APP_URL or APP_URL.'
      );
    }

    return LOCAL_DEV_ORIGIN;
  }

  if (isProduction && !allowLocalhostInProduction && isLocalOrigin(resolvedOrigin)) {
    throw new Error(
      `Resolved application origin "${resolvedOrigin}" is not allowed in production.`
    );
  }

  return resolvedOrigin;
}

export function buildAppUrl(pathname: string, options: ResolveAppOriginOptions = {}): string {
  const origin = resolveAppOrigin(options);
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${origin}${normalizedPath}`;
}
