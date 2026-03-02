/**
 * Centralized Secrets Manager for Continuum
 *
 * Abstracts secret retrieval from Vault or env vars.
 * Provides type-safe access to all application secrets
 * with caching and validation.
 */

import { vault } from './vault';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AppSecrets {
  // Database
  DATABASE_URL: string;
  DIRECT_URL: string;

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;

  // Email
  SMTP_HOST: string;
  SMTP_PORT: string;
  GMAIL_USER: string;
  GMAIL_APP_PASSWORD: string;

  // Pusher
  PUSHER_APP_ID: string;
  PUSHER_KEY: string;
  PUSHER_SECRET: string;
  PUSHER_CLUSTER: string;

  // Payment
  RAZORPAY_KEY_ID: string;
  RAZORPAY_KEY_SECRET: string;
  RAZORPAY_WEBHOOK_SECRET: string;

  // Encryption
  ENCRYPTION_KEY: string;

  // App
  NEXT_PUBLIC_APP_URL: string;
}

export type SecretKey = keyof AppSecrets;

/** Secrets that must be present for the application to function */
const REQUIRED_SECRETS: SecretKey[] = [
  'DATABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

// ─── Vault Path Mapping ─────────────────────────────────────────────────────

const VAULT_PATH_MAP: Record<string, SecretKey[]> = {
  'database/credentials': ['DATABASE_URL', 'DIRECT_URL'],
  'supabase/config': [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ],
  'email/config': ['SMTP_HOST', 'SMTP_PORT', 'GMAIL_USER', 'GMAIL_APP_PASSWORD'],
  'pusher/config': ['PUSHER_APP_ID', 'PUSHER_KEY', 'PUSHER_SECRET', 'PUSHER_CLUSTER'],
  'payment/config': ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET'],
  'app/config': ['ENCRYPTION_KEY', 'NEXT_PUBLIC_APP_URL'],
};

// ─── Cache ───────────────────────────────────────────────────────────────────

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let secretsCache: { data: Partial<AppSecrets>; expiry: number } | null = null;
let cacheTtlMs = DEFAULT_CACHE_TTL_MS;

// ─── Internal Helpers ────────────────────────────────────────────────────────

/** Load a single secret from Vault, falling back to process.env */
async function loadSecret(key: SecretKey): Promise<string> {
  // Try Vault first
  if (vault.isAvailable()) {
    for (const [path, keys] of Object.entries(VAULT_PATH_MAP)) {
      if (keys.includes(key)) {
        try {
          const data = await vault.getSecret(path);
          if (data && data[key]) return data[key];
        } catch {
          // Fall through to env var
        }
      }
    }
  }

  // Fallback to env var
  return process.env[key] || '';
}

/** Load all secrets from Vault with env var fallback */
async function loadAllSecrets(): Promise<Partial<AppSecrets>> {
  const secrets: Partial<AppSecrets> = {};

  if (vault.isAvailable()) {
    // Batch load from Vault paths
    for (const [path, keys] of Object.entries(VAULT_PATH_MAP)) {
      try {
        const data = await vault.getSecret(path);
        if (data) {
          for (const key of keys) {
            if (data[key]) {
              secrets[key] = data[key];
            }
          }
        }
      } catch {
        console.warn(`[SecretsManager] Failed to load Vault path: ${path}`);
      }
    }
  }

  // Fill in missing values from env vars
  const allKeys: SecretKey[] = Object.values(VAULT_PATH_MAP).flat();
  for (const key of allKeys) {
    if (!secrets[key] && process.env[key]) {
      secrets[key] = process.env[key];
    }
  }

  return secrets;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** Get a single secret by key */
export async function getSecret(key: SecretKey): Promise<string> {
  // Check cache first
  if (secretsCache && Date.now() < secretsCache.expiry && secretsCache.data[key]) {
    return secretsCache.data[key]!;
  }

  return loadSecret(key);
}

/** Get all application secrets as a typed object */
export async function getAllSecrets(): Promise<Partial<AppSecrets>> {
  // Return cached if valid
  if (secretsCache && Date.now() < secretsCache.expiry) {
    return secretsCache.data;
  }

  const secrets = await loadAllSecrets();
  secretsCache = { data: secrets, expiry: Date.now() + cacheTtlMs };
  return secrets;
}

/** Force refresh all secrets from Vault / env vars */
export async function refreshSecrets(): Promise<Partial<AppSecrets>> {
  secretsCache = null;
  vault.clearCache();

  const secrets = await loadAllSecrets();
  secretsCache = { data: secrets, expiry: Date.now() + cacheTtlMs };
  return secrets;
}

/**
 * Validate that all required secrets are present.
 * Returns a list of missing secret keys (empty array = all good).
 */
export async function validateSecrets(): Promise<SecretKey[]> {
  const secrets = await getAllSecrets();
  const missing: SecretKey[] = [];

  for (const key of REQUIRED_SECRETS) {
    if (!secrets[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.warn(`[SecretsManager] Missing required secrets: ${missing.join(', ')}`);
  }

  return missing;
}

/** Set custom cache TTL (in milliseconds) */
export function setCacheTTL(ttlMs: number): void {
  cacheTtlMs = ttlMs;
}
