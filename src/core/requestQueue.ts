import type { QueuedRequest, QueueConfig, StorageAdapter } from '../types';

/**
 * Request Queue Manager
 */
export class RequestQueue {
  private queue: QueuedRequest[] = [];
  private config: QueueConfig;
  private storage?: StorageAdapter;
  private storageKey: string;

  constructor(config: QueueConfig, storage?: StorageAdapter) {
    this.config = config;
    this.storage = storage;
    this.storageKey = config.storageKey || 'network-smart-handler-queue';

    if (config.persistToStorage && storage) {
      this.loadFromStorage();
    }
  }

  /**
   * Add request to queue
   */
  async enqueue(
    request: Omit<QueuedRequest, 'id' | 'timestamp'>
  ): Promise<string> {
    const queuedRequest: QueuedRequest = {
      ...request,
      id: this.generateId(),
      timestamp: Date.now(),
    };

    // Check queue size limit
    if (this.config.maxSize && this.queue.length >= this.config.maxSize) {
      switch (this.config.policy) {
        case 'drop-oldest':
          this.queue.shift(); // Remove oldest
          break;
        case 'drop-newest':
          return queuedRequest.id; // Don't add new one
        case 'reject':
          throw new Error('Queue is full');
        case 'persist':
          // Continue to add (will be persisted)
          break;
      }
    }

    // Add to queue with priority support
    if (this.config.priority && queuedRequest.priority !== undefined) {
      // Insert based on priority (higher priority first)
      const insertIndex = this.queue.findIndex(
        (req) => (req.priority || 0) < queuedRequest.priority!
      );
      if (insertIndex === -1) {
        this.queue.push(queuedRequest);
      } else {
        this.queue.splice(insertIndex, 0, queuedRequest);
      }
    } else {
      // FIFO
      this.queue.push(queuedRequest);
    }

    // Persist if enabled
    if (this.config.persistToStorage && this.storage) {
      await this.saveToStorage();
    }

    return queuedRequest.id;
  }

  /**
   * Remove and return next request
   */
  dequeue(): QueuedRequest | undefined {
    const request = this.queue.shift();
    if (request && this.config.persistToStorage && this.storage) {
      this.saveToStorage();
    }
    return request;
  }

  /**
   * Peek at next request without removing
   */
  peek(): QueuedRequest | undefined {
    return this.queue[0];
  }

  /**
   * Get all queued requests
   */
  getAll(): QueuedRequest[] {
    return [...this.queue];
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Clear queue
   */
  async clear(): Promise<void> {
    this.queue = [];
    if (this.config.persistToStorage && this.storage) {
      await this.storage.removeItem(this.storageKey);
    }
  }

  /**
   * Remove specific request by ID
   */
  async remove(id: string): Promise<boolean> {
    const index = this.queue.findIndex((req) => req.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      if (this.config.persistToStorage && this.storage) {
        await this.saveToStorage();
      }
      return true;
    }
    return false;
  }

  /**
   * Load queue from storage
   */
  private async loadFromStorage(): Promise<void> {
    if (!this.storage) return;

    try {
      const data = await this.storage.getItem(this.storageKey);
      if (data) {
        const parsed = JSON.parse(data);
        this.queue = parsed.map((req: any) => ({
          ...req,
          // Recreate abort controller if needed
          abortController: req.abortController
            ? new AbortController()
            : undefined,
        }));
      }
    } catch (error) {
      console.warn('Failed to load queue from storage:', error);
    }
  }

  /**
   * Save queue to storage
   */
  private async saveToStorage(): Promise<void> {
    if (!this.storage) return;

    try {
      // Don't persist abort controllers
      const serializable = this.queue.map((req) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { abortController, ...rest } = req;
        return rest;
      });
      await this.storage.setItem(this.storageKey, JSON.stringify(serializable));
    } catch (error) {
      console.warn('Failed to save queue to storage:', error);
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
