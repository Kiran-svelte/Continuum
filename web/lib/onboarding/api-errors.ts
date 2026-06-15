import { logger } from '@/lib/logger';

export const ONBOARDING_SETUP_RETRY_MESSAGE =
  'We could not save setup right now. Your progress is saved. Please retry in a moment.';

export const ONBOARDING_COMPLETE_RETRY_MESSAGE =
  'We could not finish setup right now. Your progress is saved. Please retry in a moment.';

export function onboardingSafeErrorBody(code: string, message = ONBOARDING_SETUP_RETRY_MESSAGE) {
  return { error: message, code };
}

export function logOnboardingApiError(
  route: string,
  error: unknown,
  context: Record<string, unknown> = {}
): void {
  logger.error(`Onboarding API failed: ${route}`, {
    ...context,
    error: error instanceof Error ? error.message : String(error),
    errorName: error instanceof Error ? error.name : typeof error,
  });
}
