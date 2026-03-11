/**
 * Enterprise password validation utilities.
 * Enforces strong password requirements for security compliance.
 */

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'good' | 'strong';
}

// Common passwords (top 100 most common)
const COMMON_PASSWORDS = new Set([
  'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', 'master',
  'dragon', '111111', 'baseball', 'iloveyou', 'trustno1', 'sunshine', 'princess',
  'welcome', 'shadow', 'superman', 'michael', 'football', 'password1', 'password123',
  'ashley', 'bailey', 'passw0rd', 'admin', 'letmein', 'login', 'qwerty123',
  '1q2w3e4r', 'admin123', 'root', 'toor', 'pass', '1234', '12345', '123456789',
  '1234567', '1234567890', 'password!', 'p@ssword', 'p@ssw0rd', 'changeme',
  'secret', 'default', 'temp', 'test', 'test123', 'guest', 'user', 'demo',
]);

/**
 * Validates a password against enterprise security requirements.
 *
 * Requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character (!@#$%^&*()_+-=[]{}|;:,.<>?)
 * - Not a common password
 *
 * @param password The password to validate
 * @returns Validation result with errors and strength assessment
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  // Length check
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  // Uppercase check
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least 1 uppercase letter');
  }

  // Lowercase check
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least 1 lowercase letter');
  }

  // Number check
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least 1 number');
  }

  // Special character check
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    errors.push('Password must contain at least 1 special character');
  }

  // Common password check
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push('Password is too common. Please choose a different password');
  }

  // Calculate strength
  let strengthScore = 0;
  if (password.length >= 8) strengthScore++;
  if (password.length >= 12) strengthScore++;
  if (/[A-Z]/.test(password)) strengthScore++;
  if (/[a-z]/.test(password)) strengthScore++;
  if (/[0-9]/.test(password)) strengthScore++;
  if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) strengthScore++;
  if (password.length >= 16) strengthScore++;

  let strength: 'weak' | 'fair' | 'good' | 'strong';
  if (strengthScore <= 2) strength = 'weak';
  else if (strengthScore <= 4) strength = 'fair';
  else if (strengthScore <= 5) strength = 'good';
  else strength = 'strong';

  return {
    valid: errors.length === 0,
    errors,
    strength,
  };
}

/**
 * Returns a user-friendly description of password requirements.
 */
export function getPasswordRequirements(): string[] {
  return [
    'At least 8 characters',
    'At least 1 uppercase letter (A-Z)',
    'At least 1 lowercase letter (a-z)',
    'At least 1 number (0-9)',
    'At least 1 special character (!@#$%^&*)',
  ];
}

/**
 * Returns the color class for a password strength indicator.
 */
export function getStrengthColor(strength: 'weak' | 'fair' | 'good' | 'strong'): string {
  switch (strength) {
    case 'weak': return 'bg-red-500';
    case 'fair': return 'bg-yellow-500';
    case 'good': return 'bg-blue-500';
    case 'strong': return 'bg-green-500';
  }
}
