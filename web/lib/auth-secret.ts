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
  const jwtSecret = readSecret(env, 'JWT_SECRET');
  const sessionSecret = readSecret(env, 'SESSION_SECRET');
  const csrfSecret = readSecret(env, 'CSRF_SECRET');

  const present = [
    jwtSecret ? ({ key: 'JWT_SECRET', value: jwtSecret } as const) : null,
    sessionSecret ? ({ key: 'SESSION_SECRET', value: sessionSecret } as const) : null,
    csrfSecret ? ({ key: 'CSRF_SECRET', value: csrfSecret } as const) : null,
  ].filter((entry): entry is ResolvedSecret => Boolean(entry));

  if (present.length === 0) {
    throw new AuthSecretError(
      'Authentication signing secret is not configured. ' +
        'Set JWT_SECRET (preferred) or SESSION_SECRET or CSRF_SECRET. ' +
        'Generate one with: openssl rand -base64 32'
    );
  }

  const uniqueValues = new Set(present.map((entry) => entry.value));
  if (uniqueValues.size > 1) {
    const keys = present.map((entry) => entry.key).join(', ');
    throw new AuthSecretError(
      'Authentication signing secrets are inconsistent. ' +
        `${keys} are set but do not match after trimming whitespace/newlines. ` +
        'To prevent redirect loops and token verification failures, set them to the same value (recommended) ' +
        'or set only one of them.'
    );
  }

  // Precedence order must be stable across Edge middleware and Node runtimes.
  if (jwtSecret) {
    return { key: 'JWT_SECRET', value: jwtSecret };
  }

  if (sessionSecret) {
    return { key: 'SESSION_SECRET', value: sessionSecret };
  }

  return { key: 'CSRF_SECRET', value: csrfSecret! };
}

let cachedProcessEnvValue: string | null = null;
let cachedProcessEnvKey: Uint8Array | null = null;

/**
 * Returns the shared HMAC key used to sign/verify Continuum auth JWTs.
 * - Reads from env (JWT_SECRET > SESSION_SECRET > CSRF_SECRET)
 * - Trims whitespace/CRLF to avoid Edge/Node divergence
 * - Throws AuthSecretError when missing or inconsistent
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
