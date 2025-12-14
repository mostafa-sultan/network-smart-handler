# Network Status Smart Handler

حزمة ذكية لإدارة حالة الشبكة لتطبيقات React و React Native. توفر كشف ذكي لحالة الشبكة (Weak/Medium/Strong)، منطق إعادة المحاولة القابل للتخصيص، صف تلقائي للطلبات، وإشعارات جاهزة للاستخدام.

A smart network handler package for React and React Native applications. Provides intelligent network status detection (Weak/Medium/Strong), customizable retry logic, automatic request queuing, and ready-to-use notifications.

## المميزات / Features

- ✅ **استخدام بسيط جداً** - `getNetworkState()` يعطيك state مباشرة بدون Provider
- ✅ **كشف ذكي لحالة الشبكة** - ليس فقط online/offline بل Weak/Medium/Strong
- ✅ **منطق إعادة المحاولة** - استراتيجيات متعددة (fixed, exponential, exponential-jitter)
- ✅ **صف تلقائي للطلبات** - يحفظ الطلبات عند انقطاع الشبكة ويعيد إرسالها تلقائياً
- ✅ **إشعارات جاهزة** - مكونات Banner/Toast قابلة للتخصيص
- ✅ **Hooks سهلة** - `useNetworkStatus()`, `useSmartFetch()`, `useQueuedRequests()`
- ✅ **Cross-platform** - يعمل على Web و React Native (Android/iOS)
- ✅ **Observability** - إحصائيات و telemetry callbacks
- ✅ **Adapters** - دعم fetch و axios

## التثبيت / Installation

```bash
npm install network-smart-handler
# or
yarn add network-smart-handler
```

### React Native

لـ React Native، تحتاج أيضاً إلى تثبيت `@react-native-community/netinfo`:

For React Native, you also need to install `@react-native-community/netinfo`:

```bash
npm install @react-native-community/netinfo
# or
yarn add @react-native-community/netinfo
```

## الاستخدام الأساسي / Basic Usage

### 🚀 الاستخدام البسيط (Simple API) - بدون Provider

أسهل طريقة للاستخدام! فقط استدعي الدالة واحصل على state مباشرة:

```typescript
import { getNetworkState, initNetworkHandler, simpleSmartFetch } from 'network-smart-handler';

// تهيئة (اختيارية - يمكن استخدام defaults)
initNetworkHandler({
  retry: {
    maxAttempts: 3,
    strategy: 'exponential',
  },
});

// الحصول على state مباشرة - في أي مكان في الكود
const state = getNetworkState();
console.log(state.isOnline);    // true/false
console.log(state.quality);     // 'weak' | 'medium' | 'strong'
console.log(state.type);        // 'wifi' | 'cellular' | 'ethernet' | 'unknown'
console.log(state.latency);     // عدد milliseconds
console.log(state.statistics);   // إحصائيات الشبكة
console.log(state.queuedRequests); // الطلبات في الانتظار

// استخدام smart fetch
const response = await simpleSmartFetch('https://api.example.com/data');
const data = await response.json();
```

#### مثال كامل:

```typescript
import { getNetworkState, simpleSmartFetch, subscribeToNetworkState } from 'network-smart-handler';

// في أي component أو function
function checkNetwork() {
  const state = getNetworkState();
  
  if (!state.isOnline) {
    console.log('الشبكة غير متصلة');
    return;
  }
  
  if (state.quality === 'weak') {
    console.log('الشبكة ضعيفة، قد يكون هناك تأخير');
  }
  
  console.log(`نوع الشبكة: ${state.type}`);
  console.log(`السرعة: ${state.latency}ms`);
}

// الاشتراك في التحديثات
const unsubscribe = subscribeToNetworkState((state) => {
  console.log('تغيرت حالة الشبكة:', state.isOnline, state.quality);
});

// إلغاء الاشتراك لاحقاً
// unsubscribe();
```

#### في React Component:

```tsx
import { useEffect, useState } from 'react';
import { getNetworkState, subscribeToNetworkState } from 'network-smart-handler';

function MyComponent() {
  const [networkState, setNetworkState] = useState(getNetworkState());

  useEffect(() => {
    const unsubscribe = subscribeToNetworkState((state) => {
      setNetworkState(state);
    });
    return unsubscribe;
  }, []);

  return (
    <div>
      <p>الشبكة: {networkState.isOnline ? 'متصل' : 'غير متصل'}</p>
      <p>الجودة: {networkState.quality}</p>
      <p>النوع: {networkState.type}</p>
    </div>
  );
}
```

---

### 1. إعداد Provider (للاستخدام المتقدم)

```tsx
import { NetworkProvider } from 'network-smart-handler';
import { App } from './App';

export default function Root() {
  return (
    <NetworkProvider
      config={{
        retry: {
          maxAttempts: 3,
          strategy: 'exponential',
          baseDelay: 1000,
        },
        queue: {
          policy: 'drop-oldest',
          maxSize: 100,
          persistToStorage: true,
        },
        enableQualityTesting: true,
        qualityThresholds: {
          weak: 1000,   // latency > 1000ms = weak
          medium: 300, // latency > 300ms = medium
        },
      }}
      showNotification={true} // Show built-in notification
    >
      <App />
    </NetworkProvider>
  );
}
```

### 2. استخدام Hooks

```tsx
import { useNetworkStatus, useSmartFetch } from 'network-smart-handler';

function MyComponent() {
  const { isOnline, quality, status } = useNetworkStatus();
  const { smartFetch } = useSmartFetch();

  const handleFetch = async () => {
    try {
      const response = await smartFetch('https://api.example.com/data', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }, {
        maxAttempts: 5, // Override per-request
        strategy: 'exponential-jitter',
      });
      
      const data = await response.json();
      console.log(data);
    } catch (error) {
      console.error('Request failed:', error);
    }
  };

  return (
    <div>
      <p>Network: {isOnline ? 'Online' : 'Offline'}</p>
      <p>Quality: {quality}</p>
      <p>Latency: {status.latency}ms</p>
      <button onClick={handleFetch}>Fetch Data</button>
    </div>
  );
}
```

### 3. استخدام Notification مخصص

```tsx
import { NetworkNotification, useNetworkStatus, useQueuedRequests } from 'network-smart-handler';

function CustomNotification() {
  const { status } = useNetworkStatus();
  const queuedRequests = useQueuedRequests();

  return (
    <NetworkNotification
      status={status}
      queuedCount={queuedRequests.length}
      variant="toast"
      position="bottom"
      style={{
        backgroundColor: '#333',
        textColor: '#fff',
        borderRadius: 12,
      }}
      onRetry={() => {
        // Manual retry logic
      }}
      onDismiss={() => {
        // Handle dismiss
      }}
    />
  );
}
```

## API Reference

### NetworkProvider

```tsx
<NetworkProvider
  config?: NetworkHandlerConfig
  storage?: StorageAdapter
  showNotification?: boolean
>
  {children}
</NetworkProvider>
```

#### NetworkHandlerConfig

```typescript
interface NetworkHandlerConfig {
  retry?: {
    maxAttempts?: number;        // Default: 3
    strategy?: 'fixed' | 'exponential' | 'exponential-jitter' | 'exponential-partial-jitter';
    baseDelay?: number;           // Default: 1000ms
    maxDelay?: number;            // Default: 30000ms
    retryableStatuses?: number[]; // HTTP status codes to retry
    retryableErrors?: string[];   // Error types to retry
  };
  queue?: {
    policy?: 'drop-oldest' | 'drop-newest' | 'persist' | 'reject';
    maxSize?: number;
    persistToStorage?: boolean;
    storageKey?: string;
    priority?: boolean;
  };
  qualityThresholds?: {
    weak: number;    // latency threshold in ms
    medium: number;  // latency threshold in ms
  };
  testEndpoint?: string;
  enableQualityTesting?: boolean;
  qualityTestInterval?: number;
  respectDataSaver?: boolean;
}
```

### Hooks

#### `useNetworkStatus()`

```typescript
const {
  status: NetworkStatus,      // Current network status
  statistics: NetworkStatistics, // Network statistics
  queuedRequests: QueuedRequest[], // Queued requests
  isOnline: boolean,
  quality: 'weak' | 'medium' | 'strong',
  smartFetch: (url, options?, retryConfig?) => Promise<Response>,
  clearQueue: () => Promise<void>,
  onTelemetry: (callback) => () => void,
} = useNetworkStatus();
```

#### `useSmartFetch()`

```typescript
const { smartFetch } = useSmartFetch();

const response = await smartFetch(
  'https://api.example.com/data',
  { method: 'GET' },
  { maxAttempts: 5 } // Optional retry config
);
```

#### `useQueuedRequests()`

```typescript
const queuedRequests = useQueuedRequests();
```

#### `useNetworkStatistics()`

```typescript
const statistics = useNetworkStatistics();
// {
//   queuedRequests: number,
//   retrySuccessRate: number,
//   averageLatency: number,
//   lastNetworkReturn?: number,
//   totalRequests: number,
//   successfulRequests: number,
//   failedRequests: number,
//   retryAttempts: number,
// }
```

### Adapters

#### Fetch Adapter

```typescript
import { NetworkHandler, replaceGlobalFetch } from 'network-smart-handler';

const handler = new NetworkHandler(config);
const restore = replaceGlobalFetch(handler);

// Now all fetch() calls use smart fetch
fetch('https://api.example.com/data');

// Restore original fetch
restore();
```

#### Axios Adapter

```typescript
import axios from 'axios';
import { NetworkHandler, applyAxiosInterceptor, withRetryConfig } from 'network-smart-handler';

const handler = new NetworkHandler(config);
const cleanup = applyAxiosInterceptor(axios, handler);

// Use with retry config
axios.get('https://api.example.com/data', withRetryConfig({}, {
  maxAttempts: 5,
  strategy: 'exponential-jitter',
}));

// Cleanup
cleanup();
```

### HOC

```typescript
import { withNetworkHandler } from 'network-smart-handler';

const MyComponent = ({ status, smartFetch, isOnline }) => {
  // Component logic
};

export default withNetworkHandler(MyComponent);
```

## Retry Strategies

1. **fixed**: Fixed delay between retries
2. **exponential**: Exponential backoff (2^n * baseDelay)
3. **exponential-jitter**: Exponential with full jitter (random 0 to calculated delay)
4. **exponential-partial-jitter**: Exponential with partial jitter (random between delay/2 and delay)

## Queue Policies

1. **drop-oldest**: Remove oldest request when queue is full
2. **drop-newest**: Reject new requests when queue is full
3. **persist**: Persist queue to storage (AsyncStorage/IndexedDB)
4. **reject**: Throw error when queue is full

## Telemetry

```typescript
const { onTelemetry } = useNetworkStatus();

useEffect(() => {
  const unsubscribe = onTelemetry((event) => {
    console.log('Network event:', event.type, event.data);
    // Send to analytics, logging service, etc.
  });

  return unsubscribe;
}, []);
```

## Storage Adapters

### Web (LocalStorage/IndexedDB)

```typescript
import { WebStorageAdapter } from 'network-smart-handler';

const storage = new WebStorageAdapter(useIndexedDB: boolean);
```

### React Native (AsyncStorage)

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RNStorageAdapter } from 'network-smart-handler';

const storage = new RNStorageAdapter(AsyncStorage);
```

## Examples

### Example 1: Basic Usage with Notification

```tsx
import { NetworkProvider, useSmartFetch } from 'network-smart-handler';

function App() {
  return (
    <NetworkProvider showNotification={true}>
      <DataFetcher />
    </NetworkProvider>
  );
}

function DataFetcher() {
  const { smartFetch } = useSmartFetch();
  const [data, setData] = useState(null);

  useEffect(() => {
    smartFetch('https://api.example.com/data')
      .then(res => res.json())
      .then(setData);
  }, []);

  return <div>{data && JSON.stringify(data)}</div>;
}
```

### Example 2: Custom Retry Configuration

```tsx
const { smartFetch } = useSmartFetch();

const response = await smartFetch(
  'https://api.example.com/data',
  { method: 'POST', body: JSON.stringify({ data: 'test' }) },
  {
    maxAttempts: 5,
    strategy: 'exponential-jitter',
    baseDelay: 2000,
    maxDelay: 60000,
    retryableStatuses: [500, 502, 503, 504, 429],
  }
);
```

### Example 3: Priority Queue

```tsx
<NetworkProvider
  config={{
    queue: {
      policy: 'drop-oldest',
      priority: true, // Enable priority queue
      maxSize: 50,
    },
  }}
>
  <App />
</NetworkProvider>

// Later in your code
const { smartFetch } = useSmartFetch();

// High priority request
await smartFetch('https://api.example.com/important', {
  method: 'POST',
  body: JSON.stringify({ priority: 10 }), // Higher number = higher priority
});
```

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines.

---

Made with ❤️ for better network handling in React and React Native apps.
