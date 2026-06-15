/** Default timeout for API calls. Allows hosted database and serverless cold-start latency. */
export const DEFAULT_FETCH_TIMEOUT_MS = 45_000;

/** Extended timeout for onboarding wizard steps that initialize DB defaults on first run. */
export const ONBOARDING_FETCH_TIMEOUT_MS = 90_000;

export class FetchTimeoutError extends Error {
  constructor(message = 'Request timed out') {
    super(message);
    this.name = 'FetchTimeoutError';
  }
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs: number = DEFAULT_FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const originalSignal = init?.signal;

  if (originalSignal?.aborted) {
    controller.abort();
  }

  const abortListener = () => controller.abort();
  originalSignal?.addEventListener('abort', abortListener);

  const timeoutHandle =
    Number.isFinite(timeoutMs) && timeoutMs > 0
      ? setTimeout(() => controller.abort(), timeoutMs)
      : undefined;

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new FetchTimeoutError('Request timed out. Please check your connection and try again.');
    }
    throw error;
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
    originalSignal?.removeEventListener('abort', abortListener);
  }
}

export function mapFetchErrorMessage(
  error: unknown,
  fallbackMessage = 'Unable to complete the request right now. Please try again.'
): string {
  if (error instanceof FetchTimeoutError) {
    return error.message;
  }

  if (error instanceof TypeError) {
    return 'Network error. Please verify your internet connection and try again.';
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallbackMessage;
}
