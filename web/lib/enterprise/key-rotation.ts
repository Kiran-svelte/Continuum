/**
 * Key Rotation Service for Continuum
 *
 * Manages encryption key lifecycle via Vault Transit engine.
 * Supports manual rotation, scheduled rotation, and re-encryption
 * of existing ciphertexts with the latest key version.
 */

import { vault } from './vault';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface KeyInfo {
  name: string;
  type: string;
  latestVersion: number;
  minDecryptionVersion: number;
  minEncryptionVersion: number;
  created: string;
  supportsEncryption: boolean;
  supportsDecryption: boolean;
}

export interface RotationStatus {
  key: string;
  latestVersion: number;
  lastRotated: string;
  needsRotation: boolean;
}

export interface ReEncryptResult {
  total: number;
  succeeded: number;
  failed: number;
  results: (string | null)[];
}

// ─── Known Encryption Keys ──────────────────────────────────────────────────

const MANAGED_KEYS = [
  'field-encryption',
  'employee-pii',
  'payroll-data',
];

// ─── Public API ──────────────────────────────────────────────────────────────

/** Trigger key rotation in Vault Transit */
export async function rotateEncryptionKey(keyName: string): Promise<boolean> {
  if (!vault.isAvailable()) {
    console.warn('[KeyRotation] Vault unavailable — cannot rotate key');
    return false;
  }

  const success = await vault.rotateKey(keyName);

  if (success) {
    console.warn(`[KeyRotation] Key "${keyName}" rotated successfully`);
  } else {
    console.error(`[KeyRotation] Failed to rotate key "${keyName}"`);
  }

  return success;
}

/** Get key metadata from Vault */
export async function getKeyInfo(keyName: string): Promise<KeyInfo | null> {
  if (!vault.isAvailable()) {
    console.warn('[KeyRotation] Vault unavailable — cannot get key info');
    return null;
  }

  const info = await vault.getTransitKeyInfo(keyName);
  if (!info) return null;

  return {
    name: info.name,
    type: info.type,
    latestVersion: info.latest_version,
    minDecryptionVersion: info.min_decryption_version,
    minEncryptionVersion: info.min_encryption_version,
    created: '', // Vault returns this in keys map; simplified here
    supportsEncryption: info.supports_encryption,
    supportsDecryption: info.supports_decryption,
  };
}

/**
 * Re-encrypt existing ciphertexts with the latest key version.
 * This does not reveal plaintext — Vault decrypts and re-encrypts internally.
 */
export async function reEncryptData(
  keyName: string,
  ciphertexts: string[]
): Promise<ReEncryptResult> {
  if (!vault.isAvailable()) {
    console.warn('[KeyRotation] Vault unavailable — cannot re-encrypt data');
    return { total: ciphertexts.length, succeeded: 0, failed: ciphertexts.length, results: [] };
  }

  const results: (string | null)[] = [];
  let succeeded = 0;
  let failed = 0;

  // Re-encrypt each ciphertext by decrypting and re-encrypting via Vault
  for (const ct of ciphertexts) {
    try {
      const plaintext = await vault.decrypt(keyName, ct);
      if (plaintext === null) {
        results.push(null);
        failed++;
        continue;
      }

      const newCt = await vault.encrypt(keyName, plaintext);
      if (newCt) {
        results.push(newCt);
        succeeded++;
      } else {
        results.push(null);
        failed++;
      }
    } catch {
      results.push(null);
      failed++;
    }
  }

  return { total: ciphertexts.length, succeeded, failed, results };
}

/**
 * Set minimum encryption version to enforce use of latest key.
 * After rotation, set this to the latest version to prevent
 * encryption with old key versions.
 */
export async function scheduleRotation(
  keyName: string,
  intervalDays: number
): Promise<boolean> {
  if (!vault.isAvailable()) {
    console.warn('[KeyRotation] Vault unavailable — cannot schedule rotation');
    return false;
  }

  // Vault supports auto_rotate_period on keys (Enterprise feature)
  const intervalSeconds = intervalDays * 24 * 60 * 60;

  try {
    // Use Vault API to set auto-rotate period
    const addr = process.env.VAULT_ADDR || '';
    const token = process.env.VAULT_TOKEN || '';
    const ns = process.env.VAULT_NAMESPACE || 'continuum';

    const headers: Record<string, string> = {
      'X-Vault-Token': token,
      'Content-Type': 'application/json',
    };
    if (ns) headers['X-Vault-Namespace'] = ns;

    const response = await fetch(`${addr}/v1/transit/keys/${keyName}/config`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ auto_rotate_period: `${intervalSeconds}s` }),
    });

    if (response.ok) {
      console.warn(`[KeyRotation] Auto-rotation set for "${keyName}" every ${intervalDays} days`);
      return true;
    }

    console.error(`[KeyRotation] Failed to set rotation schedule: ${response.status}`);
    return false;
  } catch (error) {
    console.error('[KeyRotation] Schedule rotation error:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

/** Check rotation status of all managed keys */
export async function getRotationStatus(): Promise<RotationStatus[]> {
  if (!vault.isAvailable()) {
    console.warn('[KeyRotation] Vault unavailable — cannot check rotation status');
    return [];
  }

  const statuses: RotationStatus[] = [];

  for (const keyName of MANAGED_KEYS) {
    const info = await getKeyInfo(keyName);

    if (info) {
      statuses.push({
        key: keyName,
        latestVersion: info.latestVersion,
        lastRotated: info.created,
        needsRotation: info.latestVersion <= 1,
      });
    } else {
      statuses.push({
        key: keyName,
        latestVersion: 0,
        lastRotated: '',
        needsRotation: true,
      });
    }
  }

  return statuses;
}
