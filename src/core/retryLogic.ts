import type { RetryConfig } from '../types';

/**
 * Calculate delay for retry based on strategy
 */
export function calculateRetryDelay(
  attempt: number,
  config: RetryConfig
): number {
  const { strategy, baseDelay, maxDelay } = config;
  let delay = baseDelay;

  switch (strategy) {
    case 'fixed':
      delay = baseDelay;
      break;

    case 'exponential':
      delay = baseDelay * Math.pow(2, attempt - 1);
      break;

    case 'exponential-jitter':
      delay = baseDelay * Math.pow(2, attempt - 1);
      // Full jitter: random between 0 and calculated delay
      delay = Math.random() * delay;
      break;

    case 'exponential-partial-jitter':
      delay = baseDelay * Math.pow(2, attempt - 1);
      // Partial jitter: random between delay/2 and delay
      const minDelay = delay / 2;
      delay = minDelay + Math.random() * (delay - minDelay);
      break;

    default:
      delay = baseDelay;
  }

  // Apply max delay cap
  if (maxDelay !== undefined) {
    delay = Math.min(delay, maxDelay);
  }

  return Math.max(0, Math.floor(delay));
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any, config: RetryConfig): boolean {
  // Check retryable error types
  if (config.retryableErrors && config.retryableErrors.length > 0) {
    const errorType = error?.constructor?.name || error?.name || String(error);
    const errorMessage = error?.message || String(error);
    if (
      config.retryableErrors.some(
        (retryable) =>
          errorType.includes(retryable) || errorMessage.includes(retryable)
      )
    ) {
      return true;
    }
  }

  // Check network errors (common retryable errors)
  if (error instanceof TypeError) {
    const message = error.message || '';
    if (
      message.includes('fetch') ||
      message.includes('Network request failed') ||
      message.includes('network') ||
      message.includes('Failed to fetch')
    ) {
      return true;
    }
  }
  if (error?.name === 'NetworkError' || error?.name === 'AbortError') {
    return true;
  }
  if (error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT') {
    return true;
  }
  // Check for React Native specific network error messages
  if (
    error?.message?.includes('Network request failed') ||
    error?.message?.includes('Failed to fetch')
  ) {
    return true;
  }

  // Check HTTP status codes
  if (error?.response?.status) {
    const status = error.response.status;
    if (config.retryableStatuses && config.retryableStatuses.includes(status)) {
      return true;
    }
    // Default retryable statuses: 5xx, 408, 429
    if (status >= 500 || status === 408 || status === 429) {
      return true;
    }
  }

  return false;
}

/**
 * Execute retry with backoff
 */
export async function executeWithRetry<T>(
  fn: (attempt: number) => Promise<T>,
  config: RetryConfig,
  abortSignal?: AbortSignal
): Promise<T> {
  let lastError: any;
  const maxAttempts = config.maxAttempts;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Check if aborted
    if (abortSignal?.aborted) {
      throw new Error('Request aborted');
    }

    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      if (!isRetryableError(error, config)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt >= maxAttempts) {
        throw error;
      }

      // Calculate delay
      const delay = calculateRetryDelay(attempt, config);

      // Wait with abort support
      await sleep(delay, abortSignal);
    }
  }

  throw lastError;
}

/**
 * Sleep utility with abort support
 */
function sleep(ms: number, abortSignal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (abortSignal?.aborted) {
      reject(new Error('Aborted'));
      return;
    }

    const timeoutId = setTimeout(() => {
      resolve();
    }, ms);

    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        reject(new Error('Aborted'));
      });
    }
  });
}

/**
 * Default retry configuration
 */
export const defaultRetryConfig: RetryConfig = {
  maxAttempts: 3,
  strategy: 'exponential',
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  retryableErrors: [
    'NetworkError',
    'TimeoutError',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'Network request failed',
    'Failed to fetch',
  ],
};
