/**
 * RiteDoc Mobile App — Root Component
 *
 * Activation gate: checks local storage on startup.
 * - If activated → show Home dashboard with stack navigation
 * - If not activated → show CodeEntryScreen (needs internet for one call)
 *
 * After activation, the user lands on the Home dashboard and can navigate
 * to Write Note, Rewrite Result, Saved Notes, and Settings screens via
 * the stack navigator.
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
import OfflineBanner from './components/OfflineBanner';
import HomeScreen from './screens/HomeScreen';
import WriteNoteScreen from './screens/WriteNoteScreen';
import RewriteResultScreen from './screens/RewriteResultScreen';
import SavedNotesScreen from './screens/SavedNotesScreen';
import SettingsScreen from './screens/SettingsScreen';

// ─── Navigation types ────────────────────────────────────────────────
export type MainStackParamList = {
  Home: undefined;
  /**
   * WriteNote can optionally receive an existing note ID and its original
   * text when launched in "edit" mode from a saved note. When editNoteId
   * is present, saving the rewrite will update the existing note instead
   * of creating a new one.
   */
  WriteNote:
    | undefined
    | {
        editNoteId: string;
        initialText: string;
      };
  RewriteResult: {
    originalText: string;
    rewrittenText: string;
    /** If set, saving will update this existing note instead of creating a new one */
    editNoteId?: string;
  };
  ViewSavedNote: {
    originalText: string;
    rewrittenText: string;
    noteId: string;
  };
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
        <OfflineBanner />
        <CodeEntryScreen onActivated={() => setAppState('activated')} />
      </SafeAreaProvider>
    );
  }

  // ── Activated → main app with navigation ────────────────────────────
  return (
    <SafeAreaProvider>
      <OfflineBanner />
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
            {({ navigation, route }) => (
              <WriteNoteScreen
                initialText={route.params?.initialText}
                editNoteId={route.params?.editNoteId}
                onGoBack={() => navigation.goBack()}
                onNavigateToResult={(originalText, rewrittenText, editNoteId) =>
                  navigation.navigate('RewriteResult', {
                    originalText,
                    rewrittenText,
                    ...(editNoteId ? { editNoteId } : {}),
                  })
                }
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="RewriteResult">
            {({ navigation, route }) => (
              <RewriteResultScreen
                originalText={route.params.originalText}
                rewrittenText={route.params.rewrittenText}
                editNoteId={route.params.editNoteId}
                onGoBack={() => navigation.goBack()}
                onEditOriginal={() => navigation.goBack()}
                onWriteAnother={() => {
                  // Pop back to Home, then push a fresh WriteNote
                  navigation.popToTop();
                  navigation.navigate('WriteNote');
                }}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="SavedNotes">
            {({ navigation }) => (
              <SavedNotesScreen
                onGoBack={() => navigation.goBack()}
                onWriteNote={() => {
                  navigation.goBack();
                  navigation.navigate('WriteNote');
                }}
                onViewNote={(originalText, rewrittenText) =>
                  navigation.navigate('ViewSavedNote', {
                    originalText,
                    rewrittenText,
                  })
                }
              />
            )}
          </Stack.Screen>

          {/* Reuse RewriteResultScreen for viewing saved notes */}
          <Stack.Screen name="ViewSavedNote">
            {({ navigation, route }) => (
              <RewriteResultScreen
                originalText={route.params.originalText}
                rewrittenText={route.params.rewrittenText}
                editNoteId={route.params.noteId}
                isViewingSaved
                onGoBack={() => navigation.goBack()}
                onEditOriginal={() => {
                  // Launch WriteNote in edit mode with the original text
                  navigation.navigate('WriteNote', {
                    editNoteId: route.params.noteId,
                    initialText: route.params.originalText,
                  });
                }}
                onWriteAnother={() => {
                  navigation.popToTop();
                  navigation.navigate('WriteNote');
                }}
              />
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
