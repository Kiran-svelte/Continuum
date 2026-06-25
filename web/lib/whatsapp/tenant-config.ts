/**
 * WhatsAppTenantConfig loader.
 *
 * Fetches per-tenant WhatsApp configuration from the DB and decrypts the access token
 * in-memory using AES-256-GCM. The plaintext token is never persisted or logged.
 *
 * Implements G6 Zero UI outbound security gate (L5-03-002).
 */
import prisma from '@/lib/prisma';
import { decryptToken } from '@/lib/whatsapp/crypto';

export interface WhatsAppTenantConfigResolved {
  companyId: string;
  /** Meta phone_number_id — used in Cloud API URLs. */
  phoneNumberId: string;
  /** WABA ID (optional metadata). */
  wabaId: string | null;
  /** Decrypted plaintext access token — use immediately, do not persist. */
  accessToken: string;
  /** Whether messaging is enabled for this tenant. */
  messagingEnabled: boolean;
}

/**
 * Loads and decrypts WhatsApp tenant configuration for the given company.
 *
 * @param companyId - UUID of the tenant company.
 * @returns Resolved config (with decrypted token) or null if not configured / disabled.
 */
export async function getWhatsAppTenantConfig(
  companyId: string
): Promise<WhatsAppTenantConfigResolved | null> {
  return getWhatsAppTenantConfigByUniqueWhere({ company_id: companyId });
}

export async function getWhatsAppTenantConfigByPhoneNumberId(
  phoneNumberId: string
): Promise<WhatsAppTenantConfigResolved | null> {
  return getWhatsAppTenantConfigByUniqueWhere({ phone_number_id: phoneNumberId });
}

async function getWhatsAppTenantConfigByUniqueWhere(
  where: { company_id: string } | { phone_number_id: string }
): Promise<WhatsAppTenantConfigResolved | null> {
  const encKey = process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY;
  if (!encKey) {
    // Silently return null — callers treat this as "not configured"
    return null;
  }

  const config = await prisma.whatsAppTenantConfig.findUnique({
    where,
    select: {
      company_id: true,
      phone_number_id: true,
      waba_id: true,
      access_token_enc: true,
      messaging_enabled: true,
    },
  });

  if (!config || !config.messaging_enabled) {
    return null;
  }

  let accessToken: string;
  try {
    accessToken = decryptToken(config.access_token_enc, encKey);
  } catch {
    // Decryption failure = misconfigured key or corrupted DB value; treat as "not configured"
    return null;
  }

  return {
    companyId: config.company_id,
    phoneNumberId: config.phone_number_id,
    wabaId: config.waba_id,
    accessToken,
    messagingEnabled: config.messaging_enabled,
  };
}
