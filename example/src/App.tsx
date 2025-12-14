import { Text, View, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import {
  getNetworkState,
  subscribeToNetworkState,
  simpleSmartFetch,
  initNetworkHandler,
  type NetworkState,
} from 'network-smart-handler';

export default function App() {
  const [networkState, setNetworkState] = useState<NetworkState>(() =>
    getNetworkState()
  );

  useEffect(() => {
    initNetworkHandler({
      retry: {
        maxAttempts: 3,
        strategy: 'exponential',
      },
    });

    const unsubscribe = subscribeToNetworkState((state) => {
      setNetworkState(state);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleFetch = async () => {
    try {
      const response = await simpleSmartFetch(
        'https://jsonplaceholder.typicode.com/posts/1'
      );
      const data = await response.json();
      console.log('Data:', data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Network Status Smart Handler</Text>
      <Text style={styles.label}>
        Online: {networkState.isOnline ? 'Yes' : 'No'}
      </Text>
      <Text style={styles.label}>Quality: {networkState.quality}</Text>
      <Text style={styles.label}>Type: {networkState.type}</Text>
      <Text style={styles.label}>
        Latency: {networkState.latency ? `${networkState.latency}ms` : 'N/A'}
      </Text>
      <Text style={styles.label}>
        Queued Requests: {networkState.queuedRequests.length}
      </Text>
      <Text style={styles.button} onPress={handleFetch}>
        Test Fetch
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginVertical: 5,
  },
  button: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#007AFF',
    color: '#fff',
    borderRadius: 5,
  },
});
