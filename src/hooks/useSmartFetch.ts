import { useCallback } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import type { RetryConfig } from '../types';

/**
 * Hook for smart fetch with automatic retry and queue
 */
export function useSmartFetch() {
  const { smartFetch } = useNetworkStatus();

  const fetch = useCallback(
    async (
      url: string,
      options?: RequestInit,
      retryConfig?: Partial<RetryConfig>
    ) => {
      return smartFetch(url, options, retryConfig);
    },
    [smartFetch]
  );

  return { fetch, smartFetch: fetch };
}
