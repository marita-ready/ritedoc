/**
 * RiteDoc Mobile App — Root Component
 *
 * Activation gate: checks local storage on startup.
 * - If activated → show HomeScreen (works offline)
 * - If not activated → show CodeEntryScreen (needs internet for one call)
 *
 * This mirrors the desktop app's offline licence activation model.
 */

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { isActivated } from './services/activation';
import CodeEntryScreen from './screens/CodeEntryScreen';
import HomeScreen from './screens/HomeScreen';

type AppState = 'loading' | 'not_activated' | 'activated';

export default function App() {
  const [appState, setAppState] = useState<AppState>('loading');

  useEffect(() => {
    checkActivation();
  }, []);

  const checkActivation = async () => {
    const activated = await isActivated();
    setAppState(activated ? 'activated' : 'not_activated');
  };

  if (appState === 'loading') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a56db" />
      </View>
    );
  }

  if (appState === 'not_activated') {
    return (
      <CodeEntryScreen
        onActivated={() => setAppState('activated')}
      />
    );
  }

  return (
    <HomeScreen
      onDeactivated={() => setAppState('not_activated')}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f4ff',
  },
});
