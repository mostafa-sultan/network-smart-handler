import type { NetworkHandler } from '../core/networkHandler';
import type { RetryConfig } from '../types';

/**
 * Create a fetch wrapper that uses NetworkHandler
 */
export function createFetchAdapter(handler: NetworkHandler) {
  return async function smartFetch(
    url: string,
    options?: RequestInit,
    retryConfig?: Partial<RetryConfig>
  ): Promise<Response> {
    return handler.smartFetch(url, options, retryConfig);
  };
}

/**
 * Replace global fetch with smart fetch
 */
export function replaceGlobalFetch(handler: NetworkHandler): () => void {
  const originalFetch = global.fetch;
  const smartFetch = createFetchAdapter(handler);

  global.fetch = smartFetch as typeof fetch;

  // Return restore function
  return () => {
    global.fetch = originalFetch;
  };
}
