/**
 * Resolve client IP behind Cloudflare / reverse proxies.
 */
import type { NextRequest } from 'next/server';

export function getClientIpFromRequest(request: NextRequest | Request): string {
  const headers = request.headers;

  const cfConnectingIp = headers.get('cf-connecting-ip')?.trim();
  if (cfConnectingIp) return cfConnectingIp;

  const trueClientIp = headers.get('true-client-ip')?.trim();
  if (trueClientIp) return trueClientIp;

  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwarded) return forwarded;

  const realIp = headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  return 'unknown';
}
