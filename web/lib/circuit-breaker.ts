type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: CircuitState = 'CLOSED';

  constructor(
    private threshold = 5,
    private timeout = 60_000,
    private retryTimeout = 5_000,
  ) {}

  async execute<T>(fn: () => Promise<T>, fallback: () => T): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        console.warn('[CIRCUIT BREAKER] Open, using fallback');
        return fallback();
      }
    }

    if (this.state === 'HALF_OPEN' && Date.now() - this.lastFailureTime < this.retryTimeout) {
      console.warn('[CIRCUIT BREAKER] Half-open retry window not reached, using fallback');
      return fallback();
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      return fallback();
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = 0;
  }

  private onFailure(error?: unknown) {
    this.failures += 1;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold || this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      console.error('[CIRCUIT BREAKER] Opened after', this.failures, 'failures', error);
    }
  }
}

export const constraintEngineBreaker = new CircuitBreaker();
export { CircuitBreaker };
