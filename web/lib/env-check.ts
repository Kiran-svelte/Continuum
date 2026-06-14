/**
 * Environment Variable Validation & Feature Flag Check
 * 
 * This module validates that required environment variables are set
 * and provides safe access to feature flags with defaults.
 * 
 * CRITICAL: Any errors here should cause startup failure if in production
 */

interface EnvValidationResult {
  isValid: boolean;
  critical: {
    status: 'ok' | 'error';
    missing: string[];
    errors: string[];
  };
  warnings: {
    status: 'ok' | 'warning';
    missingOptional: string[];
    suggestions: string[];
  };
  featureFlags: Record<string, boolean>;
}

/**
 * Critical environment variables required for app startup
 */
const CRITICAL_VARS = [
  'DATABASE_URL',
  'DIRECT_URL',
  'SESSION_SECRET',
  'CSRF_SECRET',
  'CONSTRAINT_ENGINE_URL',
  'NEXT_PUBLIC_APP_URL',
];

/**
 * Optional but recommended variables
 */
const RECOMMENDED_VARS = [
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'SENDGRID_API_KEY',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASS',
];

/**
 * Feature flags with defaults
 */
const FEATURE_FLAGS = {
  FEATURE_REALTIME: { default: false, env: 'FEATURE_REALTIME' },
  FEATURE_PAYMENTS_RAZORPAY: { default: false, env: 'FEATURE_PAYMENTS_RAZORPAY' },
  FEATURE_PAYMENTS_STRIPE: { default: false, env: 'FEATURE_PAYMENTS_STRIPE' },
  FEATURE_RATE_LIMITING: { default: false, env: 'FEATURE_RATE_LIMITING' },
} as const;

/**
 * Validate environment variables and return detailed report
 */
export function validateEnv(): EnvValidationResult {
  const critical = {
    status: 'ok' as 'ok' | 'error',
    missing: [] as string[],
    errors: [] as string[],
  };

  const warnings = {
    status: 'ok' as 'ok' | 'warning',
    missingOptional: [] as string[],
    suggestions: [] as string[],
  };

  const featureFlags = {} as Record<string, boolean>;

  // Check critical variables
  for (const varName of CRITICAL_VARS) {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      critical.missing.push(varName);
      critical.status = 'error';
    }
  }

  // Check recommended variables
  for (const varName of RECOMMENDED_VARS) {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      warnings.missingOptional.push(varName);
    }
  }

  // Load feature flags with defaults
  for (const [flagName, config] of Object.entries(FEATURE_FLAGS)) {
    const value = process.env[config.env];
    featureFlags[flagName] = value === 'true' || value === '1' ? true : config.default;
  }

  // Add specific suggestions for missing optional vars
  if (warnings.missingOptional.includes('UPSTASH_REDIS_REST_URL')) {
    warnings.suggestions.push(
      'UPSTASH_REDIS: Not configured. Rate limiting disabled. Sign up at https://upstash.com'
    );
  }

  if (warnings.missingOptional.includes('SENDGRID_API_KEY')) {
    warnings.suggestions.push(
      'SENDGRID: Not configured. Using SMTP fallback. Create account at https://sendgrid.com'
    );
  }

  if (warnings.missingOptional.length > 0) {
    warnings.status = 'warning';
  }

  return {
    isValid: critical.status === 'ok',
    critical,
    warnings,
    featureFlags,
  };
}

/**
 * Get a feature flag value with default
 */
export function getFeatureFlag(flagName: keyof typeof FEATURE_FLAGS): boolean {
  const config = FEATURE_FLAGS[flagName];
  if (!config) {
    console.warn(`[EnvCheck] Unknown feature flag: ${flagName}`);
    return false;
  }

  const value = process.env[config.env];
  return value === 'true' || value === '1' ? true : config.default;
}

/**
 * Check if a feature is enabled
 */
export const features = {
  isRealtimeEnabled: () => getFeatureFlag('FEATURE_REALTIME'),
  isRazorpayEnabled: () => getFeatureFlag('FEATURE_PAYMENTS_RAZORPAY'),
  isStripeEnabled: () => getFeatureFlag('FEATURE_PAYMENTS_STRIPE'),
  isRateLimitingEnabled: () => getFeatureFlag('FEATURE_RATE_LIMITING'),
} as const;

/**
 * Log validation results (for debugging)
 */
export function logEnvValidation(result: EnvValidationResult): void {
  const prefix = '[EnvValidation]';

  // Critical validation
  if (result.critical.status === 'ok') {
    console.log(`${prefix} ✅ All critical environment variables configured`);
  } else {
    console.error(`${prefix} ❌ Missing critical variables:`);
    result.critical.missing.forEach((v) => console.error(`  - ${v}`));
  }

  // Warnings
  if (result.warnings.status === 'warning') {
    console.warn(`${prefix} ⚠️ Optional variables missing:`);
    result.warnings.missingOptional.forEach((v) => console.warn(`  - ${v}`));
    result.warnings.suggestions.forEach((s) => console.warn(`  💡 ${s}`));
  }

  // Feature flags
  console.log(`${prefix} Feature flags:`);
  Object.entries(result.featureFlags).forEach(([flag, enabled]) => {
    const status = enabled ? '✅' : '⏸️';
    console.log(`  ${status} ${flag}=${enabled}`);
  });
}

/**
 * Throw error if critical validation fails (call during app startup)
 */
export function requireValidEnv(): void {
  const result = validateEnv();
  
  if (!result.isValid) {
    logEnvValidation(result);
    throw new Error(
      `[EnvValidation] Missing critical environment variables:\n${result.critical.missing.join(', ')}\n` +
      `See ENV_CONFIGURATION_GUIDE.md for setup instructions`
    );
  }

  // In production, warn about missing recommended vars
  if (process.env.NODE_ENV === 'production' && result.warnings.missingOptional.length > 0) {
    console.warn(
      `[EnvValidation] ⚠️ Production deployment with missing recommended variables. ` +
      `See ENV_CONFIGURATION_GUIDE.md for details`
    );
  }

  logEnvValidation(result);
}

/**
 * Safely get environment variable with fallback
 */
export function getEnvVar(
  varName: string,
  fallback?: string,
  required: boolean = false
): string | undefined {
  const value = process.env[varName];

  if (!value || value.trim() === '') {
    if (required && !fallback) {
      throw new Error(
        `Missing required environment variable: ${varName}. ` +
        `See ENV_CONFIGURATION_GUIDE.md for setup instructions`
      );
    }
    return fallback;
  }

  return value;
}

/**
 * Get optional environment variable
 */
export function getOptionalEnvVar(varName: string, fallback?: string): string | undefined {
  return getEnvVar(varName, fallback, false);
}

/**
 * Get required environment variable (throws if missing)
 */
export function getRequiredEnvVar(varName: string): string {
  const value = getEnvVar(varName, undefined, true);
  if (!value) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
  return value;
}

/**
 * Check if app is in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if app is in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined;
}

/**
 * Get app URL (with fallback)
 */
export function getAppUrl(): string {
  return getEnvVar('NEXT_PUBLIC_APP_URL', 'http://localhost:3000') || 'http://localhost:3000';
}

/**
 * Get constraint engine URL
 */
export function getConstraintEngineUrl(): string {
  return getEnvVar('CONSTRAINT_ENGINE_URL', 'http://localhost:8001') || 'http://localhost:8001';
}
