import type {
  NetworkStatus,
  NetworkHandlerConfig,
  QueuedRequest,
  RetryConfig,
  QueueConfig,
  NetworkEvent,
  NetworkStatistics,
  TelemetryCallback,
  StorageAdapter,
} from '../types';
import { createNetworkDetector, type NetworkDetector } from './networkDetector';
import { RequestQueue } from './requestQueue';
import {
  executeWithRetry,
  defaultRetryConfig,
  isRetryableError,
} from './retryLogic';
import { WebStorageAdapter } from '../utils/storage';

/**
 * Main Network Handler Class
 */
export class NetworkHandler {
  private detector: NetworkDetector;
  private config: NetworkHandlerConfig;
  private queue: RequestQueue;
  private currentStatus: NetworkStatus;
  private statusListeners: Set<(status: NetworkStatus) => void> = new Set();
  private telemetryCallbacks: Set<TelemetryCallback> = new Set();
  private statistics: NetworkStatistics;
  private unsubscribe?: () => void;
  private processingQueue = false;

  constructor(config: NetworkHandlerConfig = {}, storage?: StorageAdapter) {
    this.config = config;
    this.detector = createNetworkDetector(config);

    const queueConfig: QueueConfig = {
      policy: config.queue?.policy || 'drop-oldest',
      maxSize: config.queue?.maxSize,
      persistToStorage: config.queue?.persistToStorage || false,
      storageKey: config.queue?.storageKey,
      priority: config.queue?.priority || false,
    };

    const storageAdapter =
      storage ||
      (typeof window !== 'undefined' ? new WebStorageAdapter() : undefined);
    this.queue = new RequestQueue(queueConfig, storageAdapter);

    this.currentStatus = {
      isOnline: false,
      quality: 'medium',
      type: 'unknown',
      lastUpdated: Date.now(),
    };

    this.statistics = {
      queuedRequests: 0,
      retrySuccessRate: 0,
      averageLatency: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      retryAttempts: 0,
    };

    this.initialize();
  }

  private async initialize() {
    // Get initial status
    this.currentStatus = await this.detector.getStatus();
    if (this.currentStatus.isOnline) {
      this.statistics.lastNetworkReturn = Date.now();
    }

    // Start monitoring
    this.unsubscribe = this.detector.startMonitoring((status) => {
      const wasOffline = !this.currentStatus.isOnline;
      this.currentStatus = status;

      if (wasOffline && status.isOnline) {
        this.statistics.lastNetworkReturn = Date.now();
        this.emitEvent('online', { status });
        this.processQueue();
      } else if (!wasOffline && !status.isOnline) {
        this.emitEvent('offline', { status });
      }

      if (this.currentStatus.quality !== status.quality) {
        this.emitEvent('quality-changed', {
          status,
          previousQuality: this.currentStatus.quality,
        });
      }

      if (this.currentStatus.type !== status.type) {
        this.emitEvent('type-changed', {
          status,
          previousType: this.currentStatus.type,
        });
      }

      this.notifyStatusListeners();
    });

    // Process queue if online
    if (this.currentStatus.isOnline) {
      this.processQueue();
    }
  }

  /**
   * Get current network status
   */
  getStatus(): NetworkStatus {
    return { ...this.currentStatus };
  }

  /**
   * Subscribe to status changes
   */
  subscribe(callback: (status: NetworkStatus) => void): () => void {
    this.statusListeners.add(callback);
    callback(this.currentStatus); // Immediate callback with current status

    return () => {
      this.statusListeners.delete(callback);
    };
  }

  /**
   * Add telemetry callback
   */
  onTelemetry(callback: TelemetryCallback): () => void {
    this.telemetryCallbacks.add(callback);
    return () => {
      this.telemetryCallbacks.delete(callback);
    };
  }

  /**
   * Get statistics
   */
  getStatistics(): NetworkStatistics {
    return {
      ...this.statistics,
      queuedRequests: this.queue.size(),
      averageLatency: this.currentStatus.latency || 0,
    };
  }

  /**
   * Smart fetch with retry and queue
   */
  async smartFetch(
    url: string,
    options: RequestInit = {},
    retryConfig?: Partial<RetryConfig>
  ): Promise<Response> {
    this.statistics.totalRequests++;

    const mergedRetryConfig: RetryConfig = {
      ...defaultRetryConfig,
      ...this.config.retry,
      ...retryConfig,
    };

    const shouldQueue =
      !this.currentStatus.isOnline ||
      (this.config.queue && this.currentStatus.quality === 'weak');

    if (shouldQueue) {
      const requestId = await this.queue.enqueue({
        url,
        method: options.method || 'GET',
        headers: options.headers as Record<string, string>,
        body: options.body,
        retryConfig: mergedRetryConfig,
        abortController: options.signal ? undefined : new AbortController(),
      });

      this.emitEvent('request-queued', { requestId, url });
      this.statistics.queuedRequests = this.queue.size();

      // Wait for network to come back
      return new Promise((resolve, reject) => {
        const unsubscribe = this.subscribe((status) => {
          if (status.isOnline && status.quality !== 'weak') {
            unsubscribe();
            this.processQueuedRequest(requestId).then(resolve).catch(reject);
          }
        });
      });
    }

    // Execute with retry
    return this.executeFetch(url, options, mergedRetryConfig);
  }

  /**
   * Execute fetch with retry logic
   */
  private async executeFetch(
    url: string,
    options: RequestInit,
    retryConfig: RetryConfig
  ): Promise<Response> {
    let retryCount = 0;

    try {
      const response = (await executeWithRetry(
        async (attempt) => {
          retryCount = attempt;
          if (retryCount > 1) {
            this.statistics.retryAttempts++;
            this.emitEvent('request-retried', { url, attempt });
          }

          const signal = options.signal || new AbortController().signal;
          const fetchResponse = await fetch(url, {
            ...options,
            signal,
          });

          if (
            !fetchResponse.ok &&
            isRetryableError({ response: fetchResponse }, retryConfig)
          ) {
            throw new Error(
              `HTTP ${fetchResponse.status}: ${fetchResponse.statusText}`
            );
          }

          return fetchResponse;
        },
        retryConfig,
        options.signal || undefined
      )) as Response;

      this.statistics.successfulRequests++;
      this.emitEvent('request-succeeded', { url });
      return response;
    } catch (error) {
      this.statistics.failedRequests++;
      this.emitEvent('request-failed', { url, error });
      throw error;
    } finally {
      // Update retry success rate
      if (this.statistics.totalRequests > 0) {
        this.statistics.retrySuccessRate =
          this.statistics.successfulRequests / this.statistics.totalRequests;
      }
    }
  }

  /**
   * Process queued request
   */
  private async processQueuedRequest(requestId: string): Promise<Response> {
    const requests = this.queue.getAll();
    const request = requests.find((req) => req.id === requestId);

    if (!request) {
      throw new Error(`Request ${requestId} not found in queue`);
    }

    await this.queue.remove(requestId);
    this.emitEvent('request-dequeued', { requestId });

    const options: RequestInit = {
      method: request.method,
      headers: request.headers,
      body: request.body,
      signal: request.abortController?.signal || undefined,
    };

    const retryConfig: RetryConfig = {
      ...defaultRetryConfig,
      ...this.config.retry,
      ...request.retryConfig,
    };

    return this.executeFetch(request.url, options, retryConfig);
  }

  /**
   * Process all queued requests
   */
  private async processQueue(): Promise<void> {
    if (this.processingQueue || !this.currentStatus.isOnline) {
      return;
    }

    this.processingQueue = true;

    try {
      while (this.queue.size() > 0 && this.currentStatus.isOnline) {
        const request = this.queue.dequeue();
        if (!request) break;

        this.emitEvent('request-dequeued', { requestId: request.id });

        try {
          const options: RequestInit = {
            method: request.method,
            headers: request.headers,
            body: request.body,
            signal: request.abortController?.signal || undefined,
          };

          const retryConfig: RetryConfig = {
            ...defaultRetryConfig,
            ...this.config.retry,
            ...request.retryConfig,
          };

          await this.executeFetch(request.url, options, retryConfig);
        } catch (error) {
          // Request failed, but we continue processing other queued requests
          console.warn('Failed to process queued request:', error);
        }
      }
    } finally {
      this.processingQueue = false;
      this.statistics.queuedRequests = this.queue.size();
    }
  }

  /**
   * Get queued requests
   */
  getQueuedRequests(): QueuedRequest[] {
    return this.queue.getAll();
  }

  /**
   * Clear queue
   */
  async clearQueue(): Promise<void> {
    await this.queue.clear();
    this.statistics.queuedRequests = 0;
  }

  /**
   * Emit event to telemetry callbacks
   */
  private emitEvent(type: NetworkEvent['type'], data?: any): void {
    const event: NetworkEvent = {
      type,
      timestamp: Date.now(),
      data,
    };

    this.telemetryCallbacks.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in telemetry callback:', error);
      }
    });
  }

  /**
   * Notify status listeners
   */
  private notifyStatusListeners(): void {
    this.statusListeners.forEach((listener) => {
      try {
        listener(this.currentStatus);
      } catch (error) {
        console.error('Error in status listener:', error);
      }
    });
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    this.detector.stopMonitoring();
    this.statusListeners.clear();
    this.telemetryCallbacks.clear();
  }
}
