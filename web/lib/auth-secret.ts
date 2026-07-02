export class AuthSecretError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthSecretError';
  }
}

type AuthSecretEnvKey = 'JWT_SECRET' | 'SESSION_SECRET' | 'CSRF_SECRET';

type EnvLike = {
  readonly [key: string]: string | undefined;
};

type ResolvedSecret = {
  key: AuthSecretEnvKey;
  value: string;
};

function sanitizeSecret(value: string | undefined): string | null {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readSecret(env: EnvLike, key: AuthSecretEnvKey): string | null {
  return sanitizeSecret(env[key]);
}

function resolveAuthSecretFromEnv(env: EnvLike): ResolvedSecret {
  // Use strict precedence: JWT_SECRET > SESSION_SECRET > CSRF_SECRET.
  // Do NOT throw when multiple are present with different values — each var
  // can legitimately serve a different purpose (CSRF ≠ JWT ≠ session signing).
  const jwtSecret = readSecret(env, 'JWT_SECRET');
  if (jwtSecret) {
    return { key: 'JWT_SECRET', value: jwtSecret };
  }

  const sessionSecret = readSecret(env, 'SESSION_SECRET');
  if (sessionSecret) {
    return { key: 'SESSION_SECRET', value: sessionSecret };
  }

  const csrfSecret = readSecret(env, 'CSRF_SECRET');
  if (csrfSecret) {
    return { key: 'CSRF_SECRET', value: csrfSecret };
  }

  throw new AuthSecretError(
    'Authentication signing secret is not configured. ' +
      'Set JWT_SECRET (preferred) or SESSION_SECRET or CSRF_SECRET. ' +
      'Generate one with: openssl rand -base64 32'
  );
}

let cachedProcessEnvValue: string | null = null;
let cachedProcessEnvKey: Uint8Array | null = null;

/**
 * Returns the shared HMAC key used to sign/verify Continuum auth JWTs.
 * - Reads from env (JWT_SECRET > SESSION_SECRET > CSRF_SECRET)
 * - Trims whitespace/CRLF to avoid Edge/Node divergence
 * - Throws AuthSecretError only when no usable signing secret is configured
 */
export function getAuthSecretKey(env: EnvLike = process.env): Uint8Array {
  const isProcessEnv = env === process.env;

  if (isProcessEnv && cachedProcessEnvKey && cachedProcessEnvValue) {
    return cachedProcessEnvKey;
  }

  const resolved = resolveAuthSecretFromEnv(env);
  const key = new TextEncoder().encode(resolved.value);

  if (isProcessEnv) {
    cachedProcessEnvValue = resolved.value;
    cachedProcessEnvKey = key;
  }

  return key;
}
