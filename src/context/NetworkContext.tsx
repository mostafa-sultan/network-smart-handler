import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from 'react';
import type { ReactNode } from 'react';
import type {
  NetworkStatus,
  NetworkHandlerConfig,
  NetworkStatistics,
  QueuedRequest,
  RetryConfig,
  TelemetryCallback,
  StorageAdapter,
} from '../types';
import { NetworkHandler } from '../core/networkHandler';
import { NetworkNotification } from '../components/NetworkNotification';

export interface NetworkContextValue {
  status: NetworkStatus;
  statistics: NetworkStatistics;
  queuedRequests: QueuedRequest[];
  isOnline: boolean;
  quality: NetworkStatus['quality'];
  smartFetch: (
    url: string,
    options?: RequestInit,
    retryConfig?: Partial<RetryConfig>
  ) => Promise<Response>;
  clearQueue: () => Promise<void>;
  onTelemetry: (callback: TelemetryCallback) => () => void;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

interface NetworkProviderProps {
  children: ReactNode;
  config?: NetworkHandlerConfig;
  storage?: StorageAdapter;
  showNotification?: boolean;
}

/**
 * Network Provider Component
 */
export function NetworkProvider({
  children,
  config,
  storage,
  showNotification = false,
}: NetworkProviderProps) {
  const handlerRef = useRef<NetworkHandler | null>(null);
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: false,
    quality: 'medium',
    type: 'unknown',
    lastUpdated: Date.now(),
  });
  const [statistics, setStatistics] = useState<NetworkStatistics>({
    queuedRequests: 0,
    retrySuccessRate: 0,
    averageLatency: 0,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    retryAttempts: 0,
  });
  const [queuedRequests, setQueuedRequests] = useState<QueuedRequest[]>([]);
  const configRef = useRef(config);
  const storageRef = useRef(storage);

  // Update refs when props change
  useEffect(() => {
    configRef.current = config;
    storageRef.current = storage;
  }, [config, storage]);

  useEffect(() => {
    // Initialize handler
    const handler = new NetworkHandler(configRef.current, storageRef.current);
    handlerRef.current = handler;

    // Subscribe to status changes
    const unsubscribe = handler.subscribe((newStatus) => {
      setStatus(newStatus);
      setStatistics(handler.getStatistics());
      setQueuedRequests(handler.getQueuedRequests());
    });

    // Initial status
    setStatus(handler.getStatus());
    setStatistics(handler.getStatistics());
    setQueuedRequests(handler.getQueuedRequests());

    // Update statistics periodically
    const statsInterval = setInterval(() => {
      if (handlerRef.current) {
        setStatistics(handlerRef.current.getStatistics());
        setQueuedRequests(handlerRef.current.getQueuedRequests());
      }
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(statsInterval);
      handler.destroy();
    };
    // Config and storage are handled via refs to avoid re-initialization
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const smartFetch = useCallback(
    async (
      url: string,
      options?: RequestInit,
      retryConfig?: Partial<RetryConfig>
    ) => {
      if (!handlerRef.current) {
        throw new Error('NetworkHandler not initialized');
      }
      const response = await handlerRef.current.smartFetch(
        url,
        options,
        retryConfig
      );
      // Update state after fetch
      if (handlerRef.current) {
        setStatistics(handlerRef.current.getStatistics());
        setQueuedRequests(handlerRef.current.getQueuedRequests());
      }
      return response;
    },
    []
  );

  const clearQueue = useCallback(async () => {
    if (!handlerRef.current) {
      return;
    }
    await handlerRef.current.clearQueue();
    setStatistics(handlerRef.current.getStatistics());
    setQueuedRequests(handlerRef.current.getQueuedRequests());
  }, []);

  const onTelemetry = useCallback((callback: TelemetryCallback) => {
    if (!handlerRef.current) {
      return () => {};
    }
    return handlerRef.current.onTelemetry(callback);
  }, []);

  const value: NetworkContextValue = {
    status,
    statistics,
    queuedRequests,
    isOnline: status.isOnline,
    quality: status.quality,
    smartFetch,
    clearQueue,
    onTelemetry,
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
      {showNotification && <NetworkNotificationWrapper />}
    </NetworkContext.Provider>
  );
}

/**
 * Network Notification Wrapper
 */
function NetworkNotificationWrapper() {
  const { status, queuedRequests } = useNetworkContext();
  const [dismissed, setDismissed] = useState(false);

  // Show notification when offline or weak network
  const shouldShow =
    !dismissed &&
    (!status.isOnline ||
      status.quality === 'weak' ||
      queuedRequests.length > 0);

  if (!shouldShow) {
    return null;
  }

  return (
    <NetworkNotification
      status={status}
      queuedCount={queuedRequests.length}
      onRetry={async () => {
        // Trigger queue processing
        if (status.isOnline) {
          // The handler will automatically process queue when online
          setDismissed(true);
        }
      }}
      onDismiss={() => setDismissed(true)}
    />
  );
}

/**
 * Hook to access network context (internal use)
 */
function useNetworkContext(): NetworkContextValue {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetworkStatus must be used within NetworkProvider');
  }
  return context;
}

/**
 * Hook to access network context (exported)
 */
export function useNetworkStatus(): NetworkContextValue {
  return useNetworkContext();
}
