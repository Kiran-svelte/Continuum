import { createHash, timingSafeEqual } from 'crypto';

export function extractCronSecret(headers: Headers): string | null {
  const directSecret = headers.get('x-cron-secret');
  if (directSecret) {
    return directSecret;
  }

  const authHeader = headers.get('authorization');
  if (!authHeader) {
    return null;
  }

  const [scheme, token] = authHeader.split(' ');
  if (!scheme || !token) {
    return null;
  }

  if (scheme.toLowerCase() !== 'bearer') {
    return null;
  }

  return token;
}

export function isValidCronRequest(headers: Headers): boolean {
  const configuredSecret = process.env.CRON_SECRET;
  if (!configuredSecret) {
    return false;
  }

  const providedSecret = extractCronSecret(headers);
  if (!providedSecret) {
    return false;
  }

  const configuredHash = createHash('sha256').update(configuredSecret, 'utf8').digest();
  const providedHash = createHash('sha256').update(providedSecret, 'utf8').digest();

  return timingSafeEqual(configuredHash, providedHash);
}
