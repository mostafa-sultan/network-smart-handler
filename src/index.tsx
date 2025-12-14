// Types
export * from './types';

// Core
export { NetworkHandler } from './core/networkHandler';
export {
  createNetworkDetector,
  WebNetworkDetector,
  RNNetworkDetector,
} from './core/networkDetector';
export { RequestQueue } from './core/requestQueue';
export {
  executeWithRetry,
  calculateRetryDelay,
  isRetryableError,
  defaultRetryConfig,
} from './core/retryLogic';

// Simple API - Easy to use, no Provider needed
export {
  initNetworkHandler,
  getNetworkState,
  subscribeToNetworkState,
  smartFetch as simpleSmartFetch,
  getNetworkHandler,
  clearQueue as clearNetworkQueue,
  destroyNetworkHandler,
  type NetworkState,
} from './core/simpleApi';

// Context & Hooks
export { NetworkProvider, useNetworkStatus } from './context/NetworkContext';
export {
  useNetworkStatusOnly,
  useNetworkStatistics,
  useQueuedRequests,
} from './hooks/useNetworkStatus';
export { useSmartFetch } from './hooks/useSmartFetch';
export { withNetworkHandler } from './hooks/withNetworkHandler';

// Components
export { NetworkNotification } from './components/NetworkNotification';

// Adapters
export {
  createFetchAdapter,
  replaceGlobalFetch,
} from './adapters/fetchAdapter';
export {
  applyAxiosInterceptor,
  withRetryConfig,
} from './adapters/axiosAdapter';

// Storage
export { WebStorageAdapter, RNStorageAdapter } from './utils/storage';
