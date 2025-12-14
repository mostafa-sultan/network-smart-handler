import { useNetworkStatus as useNetworkStatusContext } from '../context/NetworkContext';
import type { NetworkStatus, NetworkStatistics, QueuedRequest } from '../types';

/**
 * Hook to get current network status and all context values
 * @deprecated Use useNetworkStatus from context directly, or use specific hooks below
 */
export function useNetworkStatus() {
  return useNetworkStatusContext();
}

/**
 * Hook to get only network status (simplified)
 */
export function useNetworkStatusOnly(): NetworkStatus {
  const { status } = useNetworkStatusContext();
  return status;
}

/**
 * Hook to get network statistics
 */
export function useNetworkStatistics(): NetworkStatistics {
  const { statistics } = useNetworkStatusContext();
  return statistics;
}

/**
 * Hook to get queued requests
 */
export function useQueuedRequests(): QueuedRequest[] {
  const { queuedRequests } = useNetworkStatusContext();
  return queuedRequests;
}
