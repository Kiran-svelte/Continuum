/**
 * HashiCorp Vault Integration for Continuum
 *
 * Provides:
 * 1. Secrets management (KV v2) — store/retrieve application secrets
 * 2. Transit encryption (field-level encryption) — encrypt/decrypt sensitive data
 * 3. Key rotation — automatic key rotation support
 * 4. Dynamic database credentials — short-lived DB credentials
 * 5. Token management — token renewal and health checks
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface VaultConfig {
  addr: string;
  token: string;
  namespace?: string;
}

export interface VaultHealth {
  initialized: boolean;
  sealed: boolean;
  version: string;
  cluster_name: string;
}

export interface VaultSecretData {
  data: Record<string, string>;
  metadata?: {
    created_time: string;
    version: number;
    destroyed: boolean;
  };
}

export interface TransitKeyInfo {
  name: string;
  type: string;
  latest_version: number;
  min_decryption_version: number;
  min_encryption_version: number;
  deletion_allowed: boolean;
  supports_encryption: boolean;
  supports_decryption: boolean;
}

export interface EncryptedEmployeeData {
  phone?: string;
  email?: string;
  salary?: string;
}

export interface EncryptedPayrollData {
  basic_salary?: string;
  gross_salary?: string;
  net_salary?: string;
  tax_deducted?: string;
}

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const REQUEST_TIMEOUT_MS = 5000;

// ─── Vault Client ────────────────────────────────────────────────────────────

export class VaultClient {
  private addr: string;
  private token: string;
  private namespace: string;
  private available: boolean = false;
  private cache: Map<string, CacheEntry<unknown>> = new Map();

  constructor(config?: Partial<VaultConfig>) {
    this.addr = config?.addr || process.env.VAULT_ADDR || '';
    this.token = config?.token || process.env.VAULT_TOKEN || '';
    this.namespace = config?.namespace || process.env.VAULT_NAMESPACE || 'continuum';

    if (!this.addr || !this.token) {
      console.warn('[Vault] VAULT_ADDR or VAULT_TOKEN not configured — running in fallback mode');
      this.available = false;
    } else {
      this.available = true;
    }
  }

  // ─── HTTP Helper ─────────────────────────────────────────────────────────

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T | null> {
    if (!this.available) return null;

    const url = `${this.addr}/v1/${path}`;
    const headers: Record<string, string> = {
      'X-Vault-Token': this.token,
      'Content-Type': 'application/json',
    };

    if (this.namespace) {
      headers['X-Vault-Namespace'] = this.namespace;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.error(`[Vault] Request failed: ${method} ${path} — ${response.status}`);
        return null;
      }

      if (response.status === 204) return null;

      const json = await response.json();
      return json as T;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('[Vault] Request timed out');
      } else {
        console.error('[Vault] Request error:', error instanceof Error ? error.message : 'Unknown error');
      }
      return null;
    }
  }

  // ─── Cache Helper ────────────────────────────────────────────────────────

  private getCached<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.data as T;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, expiry: Date.now() + CACHE_TTL_MS });
  }

  /** Clear all cached secrets */
  public clearCache(): void {
    this.cache.clear();
  }

  // ─── Health & Token ──────────────────────────────────────────────────────

  /** Check Vault server health */
  async healthCheck(): Promise<VaultHealth | null> {
    if (!this.available) return null;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const response = await fetch(`${this.addr}/v1/sys/health`, {
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) return null;
      return (await response.json()) as VaultHealth;
    } catch {
      console.warn('[Vault] Health check failed — Vault may be unreachable');
      return null;
    }
  }

  /** Renew the current authentication token */
  async renewToken(): Promise<boolean> {
    const result = await this.request<{ auth: { client_token: string } }>(
      'POST',
      'auth/token/renew-self'
    );
    return result !== null;
  }

  /** Check if Vault is available */
  isAvailable(): boolean {
    return this.available;
  }

  // ─── KV v2 Secrets Management ────────────────────────────────────────────

  /** Read a secret from KV v2 */
  async getSecret(path: string): Promise<Record<string, string> | null> {
    const cacheKey = `kv:${path}`;
    const cached = this.getCached<Record<string, string>>(cacheKey);
    if (cached) return cached;

    const result = await this.request<{ data: VaultSecretData }>(
      'GET',
      `kv/data/${this.namespace}/${path}`
    );

    if (!result?.data?.data) return null;

    this.setCache(cacheKey, result.data.data);
    return result.data.data;
  }

  /** Write a secret to KV v2 */
  async setSecret(path: string, data: Record<string, string>): Promise<boolean> {
    const result = await this.request(
      'POST',
      `kv/data/${this.namespace}/${path}`,
      { data }
    );

    if (result !== null) {
      this.cache.delete(`kv:${path}`);
    }

    return result !== null;
  }

  /** Soft-delete a secret (preserves metadata) */
  async deleteSecret(path: string): Promise<boolean> {
    const result = await this.request(
      'DELETE',
      `kv/data/${this.namespace}/${path}`
    );

    this.cache.delete(`kv:${path}`);
    return result !== null || !this.available;
  }

  /** List secret keys at a path */
  async listSecrets(path: string): Promise<string[]> {
    const result = await this.request<{ data: { keys: string[] } }>(
      'LIST',
      `kv/metadata/${this.namespace}/${path}`
    );

    return result?.data?.keys ?? [];
  }

  // ─── Transit Encryption ──────────────────────────────────────────────────

  /** Encrypt plaintext using Transit engine */
  async encrypt(keyName: string, plaintext: string): Promise<string | null> {
    const encoded = Buffer.from(plaintext).toString('base64');

    const result = await this.request<{ data: { ciphertext: string } }>(
      'POST',
      `transit/encrypt/${keyName}`,
      { plaintext: encoded }
    );

    return result?.data?.ciphertext ?? null;
  }

  /** Decrypt ciphertext using Transit engine */
  async decrypt(keyName: string, ciphertext: string): Promise<string | null> {
    const result = await this.request<{ data: { plaintext: string } }>(
      'POST',
      `transit/decrypt/${keyName}`,
      { ciphertext }
    );

    if (!result?.data?.plaintext) return null;

    return Buffer.from(result.data.plaintext, 'base64').toString('utf-8');
  }

  /** Batch encrypt multiple items */
  async encryptBatch(keyName: string, items: string[]): Promise<(string | null)[]> {
    const batchInput = items.map((item) => ({
      plaintext: Buffer.from(item).toString('base64'),
    }));

    const result = await this.request<{
      data: { batch_results: Array<{ ciphertext?: string; error?: string }> };
    }>('POST', `transit/encrypt/${keyName}`, { batch_input: batchInput });

    if (!result?.data?.batch_results) {
      return items.map(() => null);
    }

    return result.data.batch_results.map((r) => r.ciphertext ?? null);
  }

  /** Batch decrypt multiple items */
  async decryptBatch(keyName: string, items: string[]): Promise<(string | null)[]> {
    const batchInput = items.map((item) => ({ ciphertext: item }));

    const result = await this.request<{
      data: { batch_results: Array<{ plaintext?: string; error?: string }> };
    }>('POST', `transit/decrypt/${keyName}`, { batch_input: batchInput });

    if (!result?.data?.batch_results) {
      return items.map(() => null);
    }

    return result.data.batch_results.map((r) =>
      r.plaintext ? Buffer.from(r.plaintext, 'base64').toString('utf-8') : null
    );
  }

  /** Rotate a transit encryption key */
  async rotateKey(keyName: string): Promise<boolean> {
    const result = await this.request('POST', `transit/keys/${keyName}/rotate`);
    return result !== null;
  }

  /** Create a new transit encryption key */
  async createTransitKey(keyName: string, type: string = 'aes256-gcm96'): Promise<boolean> {
    const result = await this.request('POST', `transit/keys/${keyName}`, { type });
    return result !== null;
  }

  /** Get transit key info */
  async getTransitKeyInfo(keyName: string): Promise<TransitKeyInfo | null> {
    const result = await this.request<{ data: TransitKeyInfo }>(
      'GET',
      `transit/keys/${keyName}`
    );
    return result?.data ?? null;
  }

  // ─── Application Secrets Helpers ─────────────────────────────────────────

  /** Fetch all application secrets */
  async getAppSecrets(): Promise<Record<string, string> | null> {
    return this.getSecret('app/config');
  }

  /** Get dynamic database credentials */
  async getDatabaseCredentials(): Promise<{
    username: string;
    password: string;
    connection_url?: string;
  } | null> {
    // Try dynamic credentials first
    const dynamic = await this.request<{
      data: { username: string; password: string };
    }>('GET', 'database/creds/app-role');

    if (dynamic?.data) {
      return dynamic.data;
    }

    // Fall back to static credentials in KV
    const creds = await this.getSecret('database/credentials');
    if (!creds) {
      // Final fallback to env vars
      const url = process.env.DATABASE_URL;
      if (!url) return null;
      return { username: '', password: '', connection_url: url };
    }

    return {
      username: creds.username || '',
      password: creds.password || '',
      connection_url: creds.connection_url,
    };
  }

  /** Get email service credentials */
  async getEmailCredentials(): Promise<Record<string, string> | null> {
    const creds = await this.getSecret('email/config');
    if (creds) return creds;

    // Fallback to env vars
    return {
      smtp_host: process.env.SMTP_HOST || '',
      smtp_port: process.env.SMTP_PORT || '587',
      smtp_user: process.env.GMAIL_USER || '',
      smtp_pass: process.env.GMAIL_APP_PASSWORD || '',
    };
  }

  /** Get payment gateway secrets */
  async getPaymentSecrets(): Promise<Record<string, string> | null> {
    const secrets = await this.getSecret('payment/config');
    if (secrets) return secrets;

    // Fallback to env vars
    return {
      razorpay_key_id: process.env.RAZORPAY_KEY_ID || '',
      razorpay_key_secret: process.env.RAZORPAY_KEY_SECRET || '',
      razorpay_webhook_secret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
    };
  }

  // ─── Field-Level Encryption for Sensitive Data ───────────────────────────

  /** Encrypt employee PII fields */
  async encryptEmployeeData(data: {
    phone?: string;
    email?: string;
    salary?: string;
  }): Promise<EncryptedEmployeeData> {
    const result: EncryptedEmployeeData = {};
    const keyName = 'employee-pii';

    if (data.phone) {
      result.phone = (await this.encrypt(keyName, data.phone)) ?? data.phone;
    }
    if (data.email) {
      result.email = (await this.encrypt(keyName, data.email)) ?? data.email;
    }
    if (data.salary) {
      result.salary = (await this.encrypt(keyName, data.salary)) ?? data.salary;
    }

    return result;
  }

  /** Decrypt employee PII fields */
  async decryptEmployeeData(data: EncryptedEmployeeData): Promise<{
    phone?: string;
    email?: string;
    salary?: string;
  }> {
    const result: { phone?: string; email?: string; salary?: string } = {};
    const keyName = 'employee-pii';

    if (data.phone) {
      result.phone = (await this.decrypt(keyName, data.phone)) ?? data.phone;
    }
    if (data.email) {
      result.email = (await this.decrypt(keyName, data.email)) ?? data.email;
    }
    if (data.salary) {
      result.salary = (await this.decrypt(keyName, data.salary)) ?? data.salary;
    }

    return result;
  }

  /** Encrypt payroll amounts */
  async encryptPayrollData(data: {
    basic_salary?: string;
    gross_salary?: string;
    net_salary?: string;
    tax_deducted?: string;
  }): Promise<EncryptedPayrollData> {
    const result: EncryptedPayrollData = {};
    const keyName = 'payroll-data';

    if (data.basic_salary) {
      result.basic_salary = (await this.encrypt(keyName, data.basic_salary)) ?? data.basic_salary;
    }
    if (data.gross_salary) {
      result.gross_salary = (await this.encrypt(keyName, data.gross_salary)) ?? data.gross_salary;
    }
    if (data.net_salary) {
      result.net_salary = (await this.encrypt(keyName, data.net_salary)) ?? data.net_salary;
    }
    if (data.tax_deducted) {
      result.tax_deducted = (await this.encrypt(keyName, data.tax_deducted)) ?? data.tax_deducted;
    }

    return result;
  }

  /** Decrypt payroll amounts */
  async decryptPayrollData(data: EncryptedPayrollData): Promise<{
    basic_salary?: string;
    gross_salary?: string;
    net_salary?: string;
    tax_deducted?: string;
  }> {
    const result: {
      basic_salary?: string;
      gross_salary?: string;
      net_salary?: string;
      tax_deducted?: string;
    } = {};
    const keyName = 'payroll-data';

    if (data.basic_salary) {
      result.basic_salary = (await this.decrypt(keyName, data.basic_salary)) ?? data.basic_salary;
    }
    if (data.gross_salary) {
      result.gross_salary = (await this.decrypt(keyName, data.gross_salary)) ?? data.gross_salary;
    }
    if (data.net_salary) {
      result.net_salary = (await this.decrypt(keyName, data.net_salary)) ?? data.net_salary;
    }
    if (data.tax_deducted) {
      result.tax_deducted = (await this.decrypt(keyName, data.tax_deducted)) ?? data.tax_deducted;
    }

    return result;
  }
}

// ─── Singleton ─────────────────────────────────────────────────────────────

export const vault = new VaultClient();
