/**
 * Network Quality Levels
 */
export type NetworkQuality = 'weak' | 'medium' | 'strong';

/**
 * Network Type
 */
export type NetworkType = 'wifi' | 'cellular' | 'ethernet' | 'unknown' | 'none';

/**
 * Network Status
 */
export interface NetworkStatus {
  isOnline: boolean;
  quality: NetworkQuality;
  type: NetworkType;
  latency?: number; // in milliseconds
  throughput?: number; // in bytes per second
  lastUpdated: number; // timestamp
}

/**
 * Retry Strategy Types
 */
export type RetryStrategy =
  | 'fixed'
  | 'exponential'
  | 'exponential-jitter'
  | 'exponential-partial-jitter';

/**
 * Retry Configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  strategy: RetryStrategy;
  baseDelay: number; // in milliseconds
  maxDelay?: number; // in milliseconds
  jitter?: boolean;
  retryableStatuses?: number[]; // HTTP status codes to retry
  retryableErrors?: string[]; // Error types to retry
}

/**
 * Queue Policy
 */
export type QueuePolicy = 'drop-oldest' | 'drop-newest' | 'persist' | 'reject';

/**
 * Queue Configuration
 */
export interface QueueConfig {
  policy: QueuePolicy;
  maxSize?: number;
  persistToStorage?: boolean;
  storageKey?: string;
  priority?: boolean; // Enable priority queue
}

/**
 * Queued Request
 */
export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: any;
  priority?: number; // Higher number = higher priority
  timestamp: number;
  retryConfig?: Partial<RetryConfig>;
  abortController?: AbortController;
}

/**
 * Network Handler Configuration
 */
export interface NetworkHandlerConfig {
  retry?: Partial<RetryConfig>;
  queue?: Partial<QueueConfig>;
  qualityThresholds?: {
    weak: number; // latency threshold in ms
    medium: number; // latency threshold in ms
  };
  testEndpoint?: string; // Endpoint for network quality testing
  enableQualityTesting?: boolean;
  qualityTestInterval?: number; // in milliseconds
  respectDataSaver?: boolean; // Respect user's data saver settings
}

/**
 * Network Statistics
 */
export interface NetworkStatistics {
  queuedRequests: number;
  retrySuccessRate: number; // 0-1
  averageLatency: number;
  lastNetworkReturn?: number; // timestamp
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  retryAttempts: number;
}

/**
 * Network Event Types
 */
export type NetworkEventType =
  | 'online'
  | 'offline'
  | 'quality-changed'
  | 'type-changed'
  | 'request-queued'
  | 'request-dequeued'
  | 'request-retried'
  | 'request-succeeded'
  | 'request-failed';

/**
 * Network Event
 */
export interface NetworkEvent {
  type: NetworkEventType;
  timestamp: number;
  data?: any;
}

/**
 * Notification UI Props
 */
export interface NotificationProps {
  status: NetworkStatus;
  queuedCount?: number;
  onRetry?: () => void;
  onDismiss?: () => void;
  style?: NotificationStyle;
  position?: 'top' | 'bottom';
  variant?: 'banner' | 'toast';
}

/**
 * Notification Style Configuration
 */
export interface NotificationStyle {
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderRadius?: number;
  padding?: number;
  fontSize?: number;
  fontFamily?: string;
}

/**
 * Telemetry Callback
 */
export type TelemetryCallback = (event: NetworkEvent) => void;

/**
 * Storage Adapter Interface
 */
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}
