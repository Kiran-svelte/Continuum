/**
 * Password policy: local strength rules + optional HIBP breach check.
 */
import { validatePassword, type PasswordValidationResult } from '@/lib/password-validation';
import { isPasswordBreached } from '@/lib/production-security/hibp';
import { logSecurityEvent } from '@/lib/security-events';

export interface FullPasswordValidationResult extends PasswordValidationResult {
  breached?: boolean;
}

export async function validatePasswordForRegistration(
  password: string,
  context?: { ip?: string; source?: string },
): Promise<FullPasswordValidationResult> {
  const result = validatePassword(password);
  if (!result.valid) return result;

  const breach = await isPasswordBreached(password);
  if (breach.breached) {
    logSecurityEvent({
      type: 'password.breached_rejected',
      message: 'Registration rejected: password found in breach database',
      severity: 'medium',
      ip: context?.ip,
      metadata: { source: context?.source, exposureCount: breach.count },
    });
    return {
      valid: false,
      errors: [
        'This password has appeared in a known data breach. Choose a different password.',
      ],
      strength: 'weak',
      breached: true,
    };
  }

  return result;
}
