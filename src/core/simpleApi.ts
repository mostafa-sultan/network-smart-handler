import type {
  NetworkStatus,
  NetworkHandlerConfig,
  NetworkStatistics,
  QueuedRequest,
  RetryConfig,
  StorageAdapter,
} from '../types';
import { NetworkHandler } from './networkHandler';

/**
 * Singleton instance for simple API
 */
let handlerInstance: NetworkHandler | null = null;
let defaultConfig: NetworkHandlerConfig = {};

/**
 * Network State Interface for simple API
 */
export interface NetworkState {
  status: NetworkStatus;
  statistics: NetworkStatistics;
  queuedRequests: QueuedRequest[];
  isOnline: boolean;
  quality: NetworkStatus['quality'];
  type: NetworkStatus['type'];
  latency?: number;
  throughput?: number;
}

/**
 * Initialize network handler with config
 * Call this once at app startup (optional - will use defaults if not called)
 */
export function initNetworkHandler(
  config?: NetworkHandlerConfig,
  storage?: StorageAdapter
): void {
  if (handlerInstance) {
    handlerInstance.destroy();
  }

  defaultConfig = config || {};
  handlerInstance = new NetworkHandler(config, storage);

  // Subscribe to updates to keep state in sync
  handlerInstance.subscribe(() => {
    // State is fetched on-demand, no need to store here
  });
}

/**
 * Get current network state - Simple API
 * Returns the current network state synchronously
 */
export function getNetworkState(): NetworkState {
  if (!handlerInstance) {
    // Auto-initialize with defaults if not initialized
    handlerInstance = new NetworkHandler(defaultConfig);
  }

  const status = handlerInstance.getStatus();
  const statistics = handlerInstance.getStatistics();
  const queuedRequests = handlerInstance.getQueuedRequests();

  return {
    status,
    statistics,
    queuedRequests,
    isOnline: status.isOnline,
    quality: status.quality,
    type: status.type,
    latency: status.latency,
    throughput: status.throughput,
  };
}

/**
 * Subscribe to network state changes
 * Returns unsubscribe function
 * Callback is called immediately with current state, then on every change
 */
export function subscribeToNetworkState(
  callback: (state: NetworkState) => void
): () => void {
  if (!handlerInstance) {
    handlerInstance = new NetworkHandler(defaultConfig);
  }

  // Call immediately with current state
  callback(getNetworkState());

  // Subscribe to future changes
  return handlerInstance.subscribe(() => {
    callback(getNetworkState());
  });
}

/**
 * Smart fetch - Simple API
 */
export async function smartFetch(
  url: string,
  options?: RequestInit,
  retryConfig?: Partial<RetryConfig>
): Promise<Response> {
  if (!handlerInstance) {
    handlerInstance = new NetworkHandler(defaultConfig);
  }

  return handlerInstance.smartFetch(url, options, retryConfig);
}

/**
 * Get network handler instance (for advanced usage)
 */
export function getNetworkHandler(): NetworkHandler {
  if (!handlerInstance) {
    handlerInstance = new NetworkHandler(defaultConfig);
  }
  return handlerInstance;
}

/**
 * Clear request queue
 */
export async function clearQueue(): Promise<void> {
  if (!handlerInstance) {
    return;
  }
  await handlerInstance.clearQueue();
}

/**
 * Destroy network handler (cleanup)
 */
export function destroyNetworkHandler(): void {
  if (handlerInstance) {
    handlerInstance.destroy();
    handlerInstance = null;
  }
}
