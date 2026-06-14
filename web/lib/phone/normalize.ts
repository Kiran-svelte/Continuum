/**
 * Phone number normalization to E.164 format using libphonenumber-js.
 * All phone numbers in the system must be stored in E.164 format.
 * WhatsApp wa_id = E.164 with + stripped.
 * Implements L5-02-003.
 */
import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/core';
import metadata from 'libphonenumber-js/metadata.full.json';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Error code for invalid phone input. */
export const INVALID_PHONE_CODE = 'INVALID_PHONE' as const;

/** User-facing error message for invalid phone. */
export const INVALID_PHONE_MESSAGE =
  'Enter a valid mobile number with country code.' as const;

/**
 * Minimum digit count for a bare-digit string to be treated as an
 * international number and have '+' prepended before parsing.
 */
const MIN_DIGITS_FOR_PLUS_PREFIX = 11;

/**
 * Maximum digit count allowed before prepending '+'.
 * E.164 max is 15 digits (without the +).
 */
const MAX_DIGITS_FOR_PLUS_PREFIX = 15;

// ─── Types ───────────────────────────────────────────────────────────────────

/** Successful normalization result. */
export type NormalizePhoneOk = {
  ok: true;
  e164: string;
  countryCallingCode: string;
  nationalNumber: string;
};

/** Failed normalization result. */
export type NormalizePhoneError = {
  ok: false;
  code: typeof INVALID_PHONE_CODE;
  message: typeof INVALID_PHONE_MESSAGE;
};

/** Discriminated union returned by normalizePhone. */
export type NormalizePhoneResult = NormalizePhoneOk | NormalizePhoneError;

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Normalizes a phone number string to E.164 format.
 * Handles local formats (10-digit Indian), international (+91), and full
 * international. Returns a discriminated-union result — never throws.
 *
 * @param input - Raw phone number string from user input.
 * @param defaultRegion - ISO 3166-1 alpha-2 country code for local numbers (default: 'IN').
 * @returns NormalizePhoneResult — ok=true with e164 or ok=false with error code.
 *
 * @example
 * normalizePhone('9876543210', 'IN') // → { ok: true, e164: '+919876543210', ... }
 * normalizePhone('+1 415 555 0100', 'US') // → { ok: true, e164: '+14155550100', ... }
 * normalizePhone('abc', 'IN') // → { ok: false, code: 'INVALID_PHONE', ... }
 */
export function normalizePhone(
  input: string,
  defaultRegion: string = 'IN'
): NormalizePhoneResult {
  const cleaned = input.trim();

  if (!cleaned) {
    return buildError();
  }

  try {
    const inputWithPlus = maybeAddPlus(cleaned);
    const parsed = parsePhoneNumberFromString(
      inputWithPlus,
      defaultRegion as CountryCode,
      metadata
    );

    if (!parsed || !parsed.isValid()) {
      return buildError();
    }

    return {
      ok: true,
      e164: parsed.format('E.164'),
      countryCallingCode: parsed.countryCallingCode,
      nationalNumber: parsed.nationalNumber,
    };
  } catch {
    return buildError();
  }
}

/**
 * Converts a WhatsApp wa_id (digits only, no +) to E.164 format.
 * Meta sends wa_id without the + prefix.
 *
 * @param waId - WhatsApp ID from Meta webhook (e.g. '919876543210').
 * @returns E.164 string (e.g. '+919876543210').
 */
export function waIdToE164(waId: string): string {
  return waId.startsWith('+') ? waId : `+${waId}`;
}

/**
 * Strips + from E.164 to produce a Meta-compatible wa_id.
 *
 * @param e164 - E.164 phone number (e.g. '+919876543210').
 * @returns wa_id string without + (e.g. '919876543210').
 */
export function e164ToWaId(e164: string): string {
  return e164.startsWith('+') ? e164.slice(1) : e164;
}

// ─── Private Helpers ─────────────────────────────────────────────────────────

/**
 * Heuristic: if string is all digits within the E.164 length range
 * (11–15 digits), prepend + so libphonenumber-js parses it as international.
 */
function maybeAddPlus(input: string): string {
  const isDigitsOnly = /^\d+$/.test(input);
  const isInRange =
    input.length >= MIN_DIGITS_FOR_PLUS_PREFIX &&
    input.length <= MAX_DIGITS_FOR_PLUS_PREFIX;

  if (isDigitsOnly && isInRange) {
    return `+${input}`;
  }
  return input;
}

/** Constructs the canonical error result. */
function buildError(): NormalizePhoneError {
  return { ok: false, code: INVALID_PHONE_CODE, message: INVALID_PHONE_MESSAGE };
}
