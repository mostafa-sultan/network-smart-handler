# Usage Examples

## Example 1: Basic Setup with Auto-Notification

```tsx
import React from 'react';
import { NetworkProvider, useSmartFetch } from 'network-smart-handler';

function App() {
  return (
    <NetworkProvider
      config={{
        enableQualityTesting: true,
        qualityThresholds: {
          weak: 1000,
          medium: 300,
        },
      }}
      showNotification={true}
    >
      <DataComponent />
    </NetworkProvider>
  );
}

function DataComponent() {
  const { smartFetch } = useSmartFetch();
  const [data, setData] = React.useState(null);

  React.useEffect(() => {
    smartFetch('https://jsonplaceholder.typicode.com/posts/1')
      .then((res) => res.json())
      .then(setData)
      .catch(console.error);
  }, []);

  return <div>{data ? JSON.stringify(data, null, 2) : 'Loading...'}</div>;
}
```

## Example 2: Custom Retry Configuration

```tsx
import { NetworkProvider, useSmartFetch } from 'network-smart-handler';

function App() {
  return (
    <NetworkProvider
      config={{
        retry: {
          maxAttempts: 5,
          strategy: 'exponential-jitter',
          baseDelay: 2000,
          maxDelay: 60000,
          retryableStatuses: [500, 502, 503, 504, 429],
        },
      }}
    >
      <ApiComponent />
    </NetworkProvider>
  );
}

function ApiComponent() {
  const { smartFetch } = useSmartFetch();

  const handleSubmit = async (formData: any) => {
    try {
      // Per-request retry override
      const response = await smartFetch(
        'https://api.example.com/submit',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        },
        {
          maxAttempts: 10, // Override global config
          strategy: 'exponential',
        }
      );

      if (response.ok) {
        console.log('Success!');
      }
    } catch (error) {
      console.error('Failed after retries:', error);
    }
  };

  return <button onClick={() => handleSubmit({ data: 'test' })}>Submit</button>;
}
```

## Example 3: Queue with Persistence

```tsx
import { NetworkProvider, useSmartFetch, useQueuedRequests } from 'network-smart-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RNStorageAdapter } from 'network-smart-handler';

function App() {
  const storage = new RNStorageAdapter(AsyncStorage);

  return (
    <NetworkProvider
      config={{
        queue: {
          policy: 'persist',
          persistToStorage: true,
          storageKey: 'my-app-queue',
          maxSize: 100,
        },
      }}
      storage={storage}
    >
      <OfflineComponent />
    </NetworkProvider>
  );
}

function OfflineComponent() {
  const { smartFetch } = useSmartFetch();
  const queuedRequests = useQueuedRequests();

  return (
    <div>
      <p>Queued requests: {queuedRequests.length}</p>
      <button
        onClick={() => {
          smartFetch('https://api.example.com/data').catch(console.error);
        }}
      >
        Make Request
      </button>
    </div>
  );
}
```

## Example 4: Custom Notification Component

```tsx
import { NetworkProvider, NetworkNotification, useNetworkStatus, useQueuedRequests } from 'network-smart-handler';

function App() {
  return (
    <NetworkProvider showNotification={false}>
      <CustomNotificationApp />
    </NetworkProvider>
  );
}

function CustomNotificationApp() {
  const { status } = useNetworkStatus();
  const queuedRequests = useQueuedRequests();

  return (
    <div>
      <NetworkNotification
        status={status}
        queuedCount={queuedRequests.length}
        variant="toast"
        position="bottom"
        style={{
          backgroundColor: status.isOnline ? '#4caf50' : '#f44336',
          textColor: '#ffffff',
          borderRadius: 12,
          padding: 16,
        }}
        onRetry={() => {
          console.log('Manual retry triggered');
        }}
      />
      <YourAppContent />
    </div>
  );
}
```

## Example 5: Telemetry and Statistics

```tsx
import { NetworkProvider, useNetworkStatus, useNetworkStatistics } from 'network-smart-handler';

function App() {
  return (
    <NetworkProvider>
      <AnalyticsComponent />
    </NetworkProvider>
  );
}

function AnalyticsComponent() {
  const { onTelemetry } = useNetworkStatus();
  const statistics = useNetworkStatistics();

  React.useEffect(() => {
    const unsubscribe = onTelemetry((event) => {
      // Send to analytics service
      console.log('Network event:', {
        type: event.type,
        timestamp: event.timestamp,
        data: event.data,
      });

      // Example: Send to analytics
      // analytics.track('network_event', {
      //   event_type: event.type,
      //   ...event.data,
      // });
    });

    return unsubscribe;
  }, [onTelemetry]);

  return (
    <div>
      <h3>Network Statistics</h3>
      <p>Total Requests: {statistics.totalRequests}</p>
      <p>Success Rate: {(statistics.retrySuccessRate * 100).toFixed(2)}%</p>
      <p>Queued: {statistics.queuedRequests}</p>
      <p>Average Latency: {statistics.averageLatency.toFixed(2)}ms</p>
    </div>
  );
}
```

## Example 6: Replace Global Fetch

```tsx
import { NetworkHandler, replaceGlobalFetch } from 'network-smart-handler';

// Initialize handler
const handler = new NetworkHandler({
  retry: {
    maxAttempts: 3,
    strategy: 'exponential',
  },
});

// Replace global fetch
const restore = replaceGlobalFetch(handler);

// Now all fetch() calls use smart fetch automatically
fetch('https://api.example.com/data')
  .then((res) => res.json())
  .then(console.log);

// Restore original fetch when needed
// restore();
```

## Example 7: Axios Integration

```tsx
import axios from 'axios';
import { NetworkHandler, applyAxiosInterceptor, withRetryConfig } from 'network-smart-handler';

// Initialize handler
const handler = new NetworkHandler({
  retry: {
    maxAttempts: 3,
    strategy: 'exponential-jitter',
  },
});

// Apply interceptor
const cleanup = applyAxiosInterceptor(axios, handler);

// Use axios with retry config
axios
  .get('https://api.example.com/data', withRetryConfig({}, { maxAttempts: 5 }))
  .then((response) => console.log(response.data));

// Cleanup when done
// cleanup();
```

## Example 8: HOC Usage

```tsx
import { withNetworkHandler } from 'network-smart-handler';

interface MyComponentProps {
  // Your component props
  title: string;
  // Network props injected by HOC
  status: NetworkStatus;
  smartFetch: (url: string, options?: RequestInit) => Promise<Response>;
  isOnline: boolean;
}

function MyComponent({ title, status, smartFetch, isOnline }: MyComponentProps) {
  const handleFetch = async () => {
    if (!isOnline) {
      alert('You are offline!');
      return;
    }

    const response = await smartFetch('https://api.example.com/data');
    const data = await response.json();
    console.log(data);
  };

  return (
    <div>
      <h1>{title}</h1>
      <p>Network: {isOnline ? 'Online' : 'Offline'}</p>
      <p>Quality: {status.quality}</p>
      <button onClick={handleFetch}>Fetch Data</button>
    </div>
  );
}

export default withNetworkHandler(MyComponent);
```

## Example 9: React Native with NetInfo

```tsx
// App.tsx
import React from 'react';
import { NetworkProvider } from 'network-smart-handler';
import { AppContent } from './AppContent';

export default function App() {
  return (
    <NetworkProvider
      config={{
        enableQualityTesting: true,
        qualityThresholds: {
          weak: 1000,
          medium: 300,
        },
      }}
      showNotification={true}
    >
      <AppContent />
    </NetworkProvider>
  );
}

// AppContent.tsx
import React from 'react';
import { View, Text, Button } from 'react-native';
import { useNetworkStatus, useSmartFetch } from 'network-smart-handler';

export function AppContent() {
  const { isOnline, quality, status } = useNetworkStatus();
  const { smartFetch } = useSmartFetch();

  const handleFetch = async () => {
    try {
      const response = await smartFetch('https://api.example.com/data');
      const data = await response.json();
      console.log('Data:', data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>Online: {isOnline ? 'Yes' : 'No'}</Text>
      <Text>Quality: {quality}</Text>
      <Text>Latency: {status.latency || 'N/A'}ms</Text>
      <Button title="Fetch Data" onPress={handleFetch} />
    </View>
  );
}
```

