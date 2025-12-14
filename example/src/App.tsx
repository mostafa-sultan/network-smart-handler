import { Text, View, StyleSheet } from 'react-native';
import {
  NetworkProvider,
  useNetworkStatus,
  useSmartFetch,
} from 'network-smart-handler';

function AppContent() {
  const { isOnline, quality, status } = useNetworkStatus();
  const { smartFetch } = useSmartFetch();

  const handleFetch = async () => {
    try {
      const response = await smartFetch(
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
      <Text>Online: {isOnline ? 'Yes' : 'No'}</Text>
      <Text>Quality: {quality}</Text>
      <Text>Latency: {status.latency ? `${status.latency}ms` : 'N/A'}</Text>
      <Text style={styles.button} onPress={handleFetch}>
        Test Fetch
      </Text>
    </View>
  );
}

export default function App() {
  return (
    <NetworkProvider showNotification={true}>
      <AppContent />
    </NetworkProvider>
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
  button: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#007AFF',
    color: '#fff',
    borderRadius: 5,
  },
});
