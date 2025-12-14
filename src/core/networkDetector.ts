import type {
  NetworkStatus,
  NetworkQuality,
  NetworkType,
  NetworkHandlerConfig,
} from '../types';

/**
 * Network Detector Interface
 */
export interface NetworkDetector {
  getStatus(): Promise<NetworkStatus>;
  startMonitoring(callback: (status: NetworkStatus) => void): () => void; // Returns unsubscribe function
  stopMonitoring(): void;
}

/**
 * Web Network Detector
 */
export class WebNetworkDetector implements NetworkDetector {
  private config: NetworkHandlerConfig;
  private listeners: Set<(status: NetworkStatus) => void> = new Set();
  private qualityTestInterval?: NodeJS.Timeout;
  private currentStatus: NetworkStatus;

  constructor(config: NetworkHandlerConfig = {}) {
    this.config = config;
    this.currentStatus = this.getInitialStatus();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  private getInitialStatus(): NetworkStatus {
    const isOnline =
      typeof navigator !== 'undefined' ? navigator.onLine : false;
    return {
      isOnline,
      quality: 'medium',
      type: this.detectNetworkType(),
      lastUpdated: Date.now(),
    };
  }

  private handleOnline = () => {
    this.updateStatus({ isOnline: true });
  };

  private handleOffline = () => {
    this.updateStatus({ isOnline: false, quality: 'weak' });
  };

  private detectNetworkType(): NetworkType {
    if (typeof navigator === 'undefined' || !('connection' in navigator)) {
      return 'unknown';
    }

    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;
    if (!connection) {
      return 'unknown';
    }

    const type = connection.type || connection.effectiveType;
    if (type === 'wifi' || type === 'ethernet') {
      return type;
    }
    if (
      type === 'cellular' ||
      type === '2g' ||
      type === '3g' ||
      type === '4g' ||
      type === '5g'
    ) {
      return 'cellular';
    }
    return 'unknown';
  }

  private async measureLatency(testUrl?: string): Promise<number> {
    const url =
      testUrl ||
      this.config.testEndpoint ||
      'https://www.google.com/favicon.ico';
    const startTime = performance.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      await fetch(url, {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal,
        cache: 'no-cache',
      });

      clearTimeout(timeoutId);
      return performance.now() - startTime;
    } catch {
      return Infinity;
    }
  }

  private async measureThroughput(testUrl?: string): Promise<number> {
    if (this.config.respectDataSaver) {
      return 0;
    }

    const url =
      testUrl ||
      this.config.testEndpoint ||
      'https://www.google.com/favicon.ico';
    const startTime = performance.now();
    let bytesReceived = 0;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(url, {
        method: 'GET',
        mode: 'no-cors',
        signal: controller.signal,
        cache: 'no-cache',
      });

      clearTimeout(timeoutId);
      const endTime = performance.now();
      const duration = (endTime - startTime) / 1000; // in seconds

      // Estimate bytes (approximate)
      if (response.headers) {
        const contentLength = response.headers.get('content-length');
        if (contentLength) {
          bytesReceived = parseInt(contentLength, 10);
        }
      }

      return duration > 0 ? bytesReceived / duration : 0;
    } catch {
      return 0;
    }
  }

  private determineQuality(latency: number): NetworkQuality {
    const weakThreshold = this.config.qualityThresholds?.weak ?? 1000;
    const mediumThreshold = this.config.qualityThresholds?.medium ?? 300;

    if (latency >= weakThreshold || !isFinite(latency)) {
      return 'weak';
    }
    if (latency >= mediumThreshold) {
      return 'medium';
    }
    return 'strong';
  }

  private async updateStatus(updates: Partial<NetworkStatus>) {
    let latency: number | undefined;
    let throughput: number | undefined;

    if (this.config.enableQualityTesting && updates.isOnline !== false) {
      latency = await this.measureLatency();
      if (!this.config.respectDataSaver) {
        throughput = await this.measureThroughput();
      }
    }

    const quality =
      latency !== undefined
        ? this.determineQuality(latency)
        : updates.quality || this.currentStatus.quality;

    this.currentStatus = {
      ...this.currentStatus,
      ...updates,
      quality,
      latency,
      throughput,
      lastUpdated: Date.now(),
    };

    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentStatus);
      } catch (error) {
        console.error('Error in network status listener:', error);
      }
    });
  }

  async getStatus(): Promise<NetworkStatus> {
    if (this.config.enableQualityTesting) {
      await this.updateStatus({});
    }
    return { ...this.currentStatus };
  }

  startMonitoring(callback: (status: NetworkStatus) => void): () => void {
    this.listeners.add(callback);
    callback(this.currentStatus);

    if (this.config.enableQualityTesting && !this.qualityTestInterval) {
      const interval = this.config.qualityTestInterval || 30000; // Default 30 seconds
      this.qualityTestInterval = setInterval(() => {
        this.updateStatus({});
      }, interval);
    }

    return () => {
      this.listeners.delete(callback);
      if (this.listeners.size === 0 && this.qualityTestInterval) {
        clearInterval(this.qualityTestInterval);
        this.qualityTestInterval = undefined;
      }
    };
  }

  stopMonitoring() {
    this.listeners.clear();
    if (this.qualityTestInterval) {
      clearInterval(this.qualityTestInterval);
      this.qualityTestInterval = undefined;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
  }
}

/**
 * React Native Network Detector
 */
export class RNNetworkDetector implements NetworkDetector {
  private listeners: Set<(status: NetworkStatus) => void> = new Set();
  private unsubscribe?: () => void;
  private NetInfo: any;
  private currentStatus: NetworkStatus;

  constructor(NetInfo: any, _config: NetworkHandlerConfig = {}) {
    this.NetInfo = NetInfo;
    this.currentStatus = {
      isOnline: false,
      quality: 'medium',
      type: 'unknown',
      lastUpdated: Date.now(),
    };

    this.initialize();
  }

  private async initialize() {
    try {
      const state = await this.NetInfo.fetch();
      this.updateFromNetInfoState(state);
    } catch (error) {
      console.warn('Failed to initialize NetInfo:', error);
    }
  }

  private updateFromNetInfoState(state: any) {
    const isOnline = state.isConnected && state.isInternetReachable !== false;
    const type = this.mapNetInfoType(state.type);
    const quality = this.estimateQualityFromNetInfo(state);

    this.currentStatus = {
      ...this.currentStatus,
      isOnline,
      type,
      quality,
      lastUpdated: Date.now(),
    };

    this.notifyListeners();
  }

  private mapNetInfoType(type: string): NetworkType {
    switch (type?.toLowerCase()) {
      case 'wifi':
        return 'wifi';
      case 'cellular':
      case '2g':
      case '3g':
      case '4g':
      case '5g':
        return 'cellular';
      case 'ethernet':
        return 'ethernet';
      case 'none':
      case 'unknown':
        return 'none';
      default:
        return 'unknown';
    }
  }

  private estimateQualityFromNetInfo(state: any): NetworkQuality {
    if (!state.isConnected) {
      return 'weak';
    }

    // Use NetInfo details if available
    if (state.details) {
      const details = state.details;

      // For cellular, use generation
      if (state.type === 'cellular' && details.cellularGeneration) {
        const gen = details.cellularGeneration.toLowerCase();
        if (gen === '5g' || gen === '4g') {
          return 'strong';
        }
        if (gen === '3g') {
          return 'medium';
        }
        return 'weak';
      }

      // For WiFi, check signal strength if available
      if (state.type === 'wifi' && details.strength !== undefined) {
        if (details.strength >= -50) {
          return 'strong';
        }
        if (details.strength >= -70) {
          return 'medium';
        }
        return 'weak';
      }
    }

    // Default based on connection type
    if (state.type === 'wifi' || state.type === 'ethernet') {
      return 'strong';
    }
    if (state.type === 'cellular') {
      return 'medium';
    }

    return 'medium';
  }

  async getStatus(): Promise<NetworkStatus> {
    const state = await this.NetInfo.fetch();
    this.updateFromNetInfoState(state);
    return { ...this.currentStatus };
  }

  startMonitoring(callback: (status: NetworkStatus) => void): () => void {
    this.listeners.add(callback);
    callback(this.currentStatus);

    if (!this.unsubscribe) {
      this.unsubscribe = this.NetInfo.addEventListener((state: any) => {
        this.updateFromNetInfoState(state);
      });
    }

    return () => {
      this.listeners.delete(callback);
      if (this.listeners.size === 0 && this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = undefined;
      }
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentStatus);
      } catch (error) {
        console.error('Error in network status listener:', error);
      }
    });
  }

  stopMonitoring() {
    this.listeners.clear();
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
  }
}

/**
 * Create appropriate network detector based on platform
 */
export function createNetworkDetector(
  config: NetworkHandlerConfig = {}
): NetworkDetector {
  // Check if we're in React Native
  // React Native has navigator.product === 'ReactNative'
  // or we can check for React Native specific globals
  const isReactNative =
    (typeof navigator !== 'undefined' &&
      (navigator as any).product === 'ReactNative') ||
    (typeof window !== 'undefined' &&
      (window as any).ReactNativeWeb !== undefined) ||
    (typeof global !== 'undefined' &&
      (global as any).__fbBatchedBridge !== undefined);

  if (isReactNative) {
    // Try to require NetInfo
    try {
      const NetInfo = require('@react-native-community/netinfo');
      // NetInfo might be default export or named export
      const NetInfoDefault = NetInfo.default || NetInfo;
      return new RNNetworkDetector(NetInfoDefault, config);
    } catch {
      console.warn(
        'NetInfo not available. Please install @react-native-community/netinfo for React Native support. Falling back to Web detector.'
      );
    }
  }

  return new WebNetworkDetector(config);
}
