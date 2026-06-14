/**
 * Have I Been Pwned (HIBP) k-anonymity password range API.
 * @see https://haveibeenpwned.com/API/v3#PwnedPasswords
 */
import { createHash } from 'crypto';

export interface BreachCheckResult {
  breached: boolean;
  count: number;
}

const HIBP_RANGE_URL = 'https://api.pwnedpasswords.com/range/';
const DEFAULT_TIMEOUT_MS = 4000;

/**
 * Returns whether the password appears in known breaches (k-anonymity).
 * Fails open (not breached) when API is disabled or unreachable.
 */
export async function isPasswordBreached(password: string): Promise<BreachCheckResult> {
  if (process.env.HIBP_PASSWORD_CHECK_ENABLED === 'false') {
    return { breached: false, count: 0 };
  }

  if (!password) return { breached: false, count: 0 };

  try {
    const hash = createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase();
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    const response = await fetch(`${HIBP_RANGE_URL}${prefix}`, {
      headers: { 'Add-Padding': 'true' },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      return { breached: false, count: 0 };
    }

    const body = await response.text();
    for (const line of body.split('\n')) {
      const [hashSuffix, countStr] = line.trim().split(':');
      if (hashSuffix?.toUpperCase() === suffix) {
        const count = Number.parseInt(countStr || '0', 10);
        return { breached: true, count: Number.isFinite(count) ? count : 1 };
      }
    }

    return { breached: false, count: 0 };
  } catch {
    return { breached: false, count: 0 };
  }
}
