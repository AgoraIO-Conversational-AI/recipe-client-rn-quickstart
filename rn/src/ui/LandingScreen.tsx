import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  PermissionsAndroid,
  Platform,
  ActivityIndicator,
} from 'react-native';

interface Props {
  connecting: boolean;
  error: string | null;
  onConnect: () => void;
}

async function ensureMicPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    {
      title: 'Microphone permission',
      message: 'This app needs microphone access to talk to the voice agent.',
      buttonPositive: 'OK',
    },
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export function LandingScreen({ connecting, error, onConnect }: Props) {
  const handlePress = useCallback(async () => {
    const granted = await ensureMicPermission();
    if (granted) {
      onConnect();
    }
  }, [onConnect]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Agora Voice Agent</Text>
      <Text style={styles.subtitle}>React Native quickstart</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.button, connecting && styles.buttonDisabled]}
        onPress={handlePress}
        disabled={connecting}>
        {connecting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Connect</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#666', marginBottom: 32 },
  error: { color: '#c0392b', marginBottom: 16, textAlign: 'center' },
  button: {
    backgroundColor: '#2d6cdf',
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 28,
    minWidth: 180,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
