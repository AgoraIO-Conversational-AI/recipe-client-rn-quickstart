/**
 * Agora Voice Agent — React Native quickstart.
 *
 * @format
 */

import React, { useEffect, useRef } from 'react';
import { StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useCallStore } from './src/CallState';
import { LandingScreen } from './src/ui/LandingScreen';
import { CallScreen } from './src/ui/CallScreen';
import { AUTO_CONNECT } from './src/config';

function AppContent() {
  const store = useCallStore();
  const autoConnected = useRef(false);

  // AUTO_CONNECT drives the live logcat gate (no manual tap needed).
  useEffect(() => {
    if (AUTO_CONNECT && !autoConnected.current && store.phase === 'idle') {
      autoConnected.current = true;
      store.connect();
    }
  }, [store]);

  const inCall = store.phase === 'inCall';

  return (
    <SafeAreaView style={styles.container}>
      {inCall ? (
        <CallScreen
          agentState={store.agentState}
          micMuted={store.micMuted}
          turns={store.turns}
          onToggleMic={store.toggleMic}
          onEnd={store.end}
        />
      ) : (
        <LandingScreen
          connecting={store.phase === 'connecting'}
          error={store.error}
          onConnect={store.connect}
        />
      )}
    </SafeAreaView>
  );
}

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <View style={styles.container}>
        <AppContent />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});

export default App;
