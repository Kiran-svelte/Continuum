/**
 * Centralized email normalization utility
 * Ensures consistent email handling across the entire application
 * 
 * Rule: All emails must be trimmed AND lowercased
 * This prevents case-sensitivity and whitespace issues with database lookups
 */

/**
 * Normalize an email address to canonical form
 * - Trims leading/trailing whitespace
 * - Converts to lowercase
 * 
 * @param email - Raw email input
 * @returns Normalized email (trimmed + lowercase)
 */
export function normalizeEmail(email: string | null | undefined): string {
  return String(email || '').trim().toLowerCase();
}

/**
 * Safely normalize and validate an email for uniqueness operations
 * Use this before database operations (create, update, query by email)
 * 
 * @param email - Email to normalize
 * @returns Normalized email, or throws if result is empty
 */
export function normalizeEmailStrict(email: string | null | undefined): string {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    throw new Error('Email is required and cannot be empty');
  }
  return normalized;
}

/**
 * Validate that two emails are the same (case-insensitive)
 * Use this for email comparison operations
 * 
 * @param email1 - First email
 * @param email2 - Second email
 * @returns true if both normalize to the same value
 */
export function emailsMatch(email1: string | null | undefined, email2: string | null | undefined): boolean {
  return normalizeEmail(email1) === normalizeEmail(email2);
}

/**
 * Extract domain from normalized email
 * 
 * @param email - Email address
 * @returns Domain part (after @) or empty string
 */
export function getEmailDomain(email: string | null | undefined): string {
  const normalized = normalizeEmail(email);
  const atIndex = normalized.indexOf('@');
  return atIndex >= 0 ? normalized.substring(atIndex + 1) : '';
}

/**
 * Extract local part from normalized email
 * 
 * @param email - Email address
 * @returns Local part (before @) or full email if no @
 */
export function getEmailLocalPart(email: string | null | undefined): string {
  const normalized = normalizeEmail(email);
  const atIndex = normalized.indexOf('@');
  return atIndex >= 0 ? normalized.substring(0, atIndex) : normalized;
}
