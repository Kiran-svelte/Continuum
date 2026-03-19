// ─── Password Service ─────────────────────────────────────────────────────
//
// Handles password hashing and verification using bcrypt.
// Also includes password strength validation.
//

import bcrypt from 'bcrypt';

// ─── Constants ──────────────────────────────────────────────────────────────

const SALT_ROUNDS = 12; // Higher = more secure, but slower

// ─── Password Strength Rules ────────────────────────────────────────────────

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'good' | 'strong';
}

const MIN_LENGTH = 8;
const MAX_LENGTH = 128;

/**
 * Validates password strength.
 * Rules:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character (optional for 'good', required for 'strong')
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;

  // Length check
  if (password.length < MIN_LENGTH) {
    errors.push(`Password must be at least ${MIN_LENGTH} characters`);
  } else {
    score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;
  }

  if (password.length > MAX_LENGTH) {
    errors.push(`Password must be less than ${MAX_LENGTH} characters`);
  }

  // Character type checks
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else {
    score += 1;
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else {
    score += 1;
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  } else {
    score += 1;
  }

  // Special characters (recommended but not always required)
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  if (hasSpecial) {
    score += 2;
  }

  // Determine strength
  let strength: 'weak' | 'fair' | 'good' | 'strong';
  if (score <= 3) {
    strength = 'weak';
  } else if (score <= 5) {
    strength = 'fair';
  } else if (score <= 7) {
    strength = 'good';
  } else {
    strength = 'strong';
  }

  return {
    valid: errors.length === 0,
    errors,
    strength,
  };
}

// ─── Password Hashing ───────────────────────────────────────────────────────

/**
 * Hashes a password using bcrypt.
 * Uses 12 salt rounds by default (secure, ~300ms per hash).
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verifies a password against a hash.
 * Returns true if the password matches.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── Password Generation ────────────────────────────────────────────────────

const CHARS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  numbers: '0123456789',
  special: '!@#$%^&*',
};

/**
 * Generates a random secure password.
 * Used for initial account creation when inviting users.
 */
export function generateSecurePassword(length: number = 16): string {
  const allChars = CHARS.lower + CHARS.upper + CHARS.numbers + CHARS.special;
  
  // Ensure at least one of each required character type
  const password: string[] = [
    CHARS.lower[Math.floor(Math.random() * CHARS.lower.length)],
    CHARS.upper[Math.floor(Math.random() * CHARS.upper.length)],
    CHARS.numbers[Math.floor(Math.random() * CHARS.numbers.length)],
    CHARS.special[Math.floor(Math.random() * CHARS.special.length)],
  ];

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password.push(allChars[Math.floor(Math.random() * allChars.length)]);
  }

  // Shuffle the password
  for (let i = password.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [password[i], password[j]] = [password[j], password[i]];
  }

  return password.join('');
}

/**
 * Generates a temporary password for invite emails.
 * Shorter and easier to type, user must change after first login.
 */
export function generateTemporaryPassword(): string {
  return generateSecurePassword(12);
}

// ─── Common Password Check ──────────────────────────────────────────────────

const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123',
  '123456', '12345678', '123456789',
  'qwerty', 'qwerty123',
  'admin', 'admin123',
  'letmein', 'welcome',
  'monkey', 'dragon',
  'master', 'login',
  'abc123', 'starwars',
  'passw0rd', 'shadow',
]);

/**
 * Checks if a password is commonly used (weak).
 */
export function isCommonPassword(password: string): boolean {
  return COMMON_PASSWORDS.has(password.toLowerCase());
}

/**
 * Full password validation with common password check.
 */
export function validatePassword(password: string): PasswordValidationResult {
  const result = validatePasswordStrength(password);

  if (isCommonPassword(password)) {
    result.valid = false;
    result.errors.push('This password is too common. Please choose a more unique password.');
    result.strength = 'weak';
  }

  return result;
}
