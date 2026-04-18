/**
 * RiteDoc Mobile App — Root Component
 *
 * Activation gate: checks local storage on startup.
 * - If activated → show Home dashboard with stack navigation
 * - If not activated → show CodeEntryScreen (needs internet for one call)
 *
 * After activation, the user lands on the Home dashboard and can navigate
 * to Write Note, Saved Notes, and Settings screens via the stack navigator.
 *
 * This mirrors the desktop app's offline licence activation model.
 */

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { isActivated } from './services/activation';
import CodeEntryScreen from './screens/CodeEntryScreen';
import HomeScreen from './screens/HomeScreen';
import WriteNoteScreen from './screens/WriteNoteScreen';
import SavedNotesScreen from './screens/SavedNotesScreen';
import SettingsScreen from './screens/SettingsScreen';

// ─── Navigation types ────────────────────────────────────────────────
export type MainStackParamList = {
  Home: undefined;
  WriteNote: undefined;
  SavedNotes: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<MainStackParamList>();

// ─── App state ───────────────────────────────────────────────────────
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

  // ── Loading splash ──────────────────────────────────────────────────
  if (appState === 'loading') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  // ── Not activated → code entry ──────────────────────────────────────
  if (appState === 'not_activated') {
    return (
      <SafeAreaProvider>
        <CodeEntryScreen onActivated={() => setAppState('activated')} />
      </SafeAreaProvider>
    );
  }

  // ── Activated → main app with navigation ────────────────────────────
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="Home">
            {({ navigation }) => (
              <HomeScreen
                onNavigate={(screen) => navigation.navigate(screen)}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="WriteNote">
            {({ navigation }) => (
              <WriteNoteScreen onGoBack={() => navigation.goBack()} />
            )}
          </Stack.Screen>

          <Stack.Screen name="SavedNotes">
            {({ navigation }) => (
              <SavedNotesScreen onGoBack={() => navigation.goBack()} />
            )}
          </Stack.Screen>

          <Stack.Screen name="Settings">
            {({ navigation }) => (
              <SettingsScreen
                onGoBack={() => navigation.goBack()}
                onDeactivated={() => setAppState('not_activated')}
              />
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F4FF',
  },
});
