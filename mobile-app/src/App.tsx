/**
 * RiteDoc Mobile App — Root Component
 *
 * Navigation architecture:
 *
 *   AppErrorBoundary
 *     └─ AppContent
 *         ├─ (loading)       → branded splash card
 *         ├─ (not_activated) → CodeEntryScreen (outside nav)
 *         └─ (activated)     → NavigationContainer
 *                                └─ RootStack (native stack, headerless)
 *                                    ├─ MainTabs (bottom tab navigator)
 *                                    │   ├─ Home     (house icon)
 *                                    │   ├─ Write    (hero pencil icon, centre)
 *                                    │   └─ Settings (gear icon)
 *                                    ├─ RewriteResult  (push on top of tabs)
 *                                    └─ ViewSavedNote  (push on top of tabs)
 *
 * The tab bar is visible on Home, Write, and Settings.
 * RewriteResult and ViewSavedNote push on top and hide the tab bar.
 *
 * Splash screen:
 * - preventAutoHideAsync() at module load
 * - hideAsync() after activation check resolves
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator, BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { isActivated } from './services/activation';
import CodeEntryScreen from './screens/CodeEntryScreen';
import OfflineBanner from './components/OfflineBanner';
import AppErrorBoundary from './components/AppErrorBoundary';
import {
  registerForPushNotificationsAsync,
  setupNotificationListeners,
} from './services/pushNotifications';
import { getActiveCartridge } from './services/cartridgeConfig';
import { triggerCartridgeUpdateInBackground } from './services/cartridgeUpdater';
import HomeScreen from './screens/HomeScreen';
import WriteNoteScreen from './screens/WriteNoteScreen';
import RewriteResultScreen from './screens/RewriteResultScreen';
import SettingsScreen from './screens/SettingsScreen';

// Keep the native splash screen visible until we explicitly hide it
SplashScreen.preventAutoHideAsync().catch(() => {});

const BRAND_BLUE = '#2563EB';

// ─── Navigation types ────────────────────────────────────────────────

/** Params for the bottom tab navigator */
export type TabParamList = {
  HomeTab: undefined;
  WriteTab: undefined;
  SettingsTab: undefined;
};

/** Params for the root stack (tabs + overlay screens) */
export type RootStackParamList = {
  MainTabs: undefined;
  WriteNote:
    | undefined
    | {
        editNoteId: string;
        initialText: string;
      };
  RewriteResult: {
    originalText: string;
    rewrittenText: string;
    editNoteId?: string;
  };
  ViewSavedNote: {
    originalText: string;
    rewrittenText: string;
    noteId: string;
  };
};

const Tab = createBottomTabNavigator<TabParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

// ─── Tab bar icons (pure RN, no icon library) ────────────────────────

/**
 * Minimal SVG-style icons drawn with View + Text.
 * Keeps the bundle small — no @expo/vector-icons dependency needed.
 */
function HomeIcon({ color, size }: { color: string; size: number }) {
  return (
    <Text style={{ fontSize: size - 2, color, lineHeight: size }}>⌂</Text>
  );
}

function WriteIcon({ color, size, isHero }: { color: string; size: number; isHero?: boolean }) {
  if (isHero) {
    return (
      <View style={tabStyles.heroIconWrapper}>
        <Text style={{ fontSize: size - 2, color: '#FFFFFF', lineHeight: size }}>
          ✎
        </Text>
      </View>
    );
  }
  return (
    <Text style={{ fontSize: size - 2, color, lineHeight: size }}>✎</Text>
  );
}

function SettingsIcon({ color, size }: { color: string; size: number }) {
  return (
    <Text style={{ fontSize: size - 2, color, lineHeight: size }}>⚙</Text>
  );
}

// ─── Custom tab bar button for the hero Write tab ────────────────────

function WriteTabButton({ children, onPress, accessibilityState }: BottomTabBarButtonProps) {
  return (
    <TouchableOpacity
      style={tabStyles.heroButton}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
    >
      <View style={tabStyles.heroCircle}>{children}</View>
    </TouchableOpacity>
  );
}

// ─── Tab Navigator ───────────────────────────────────────────────────

function MainTabs({ setAppState }: { setAppState: (s: AppState) => void }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: BRAND_BLUE,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: Platform.OS === 'ios' ? 0 : 4,
        },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 8,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <HomeIcon color={color} size={size} />,
        }}
      >
        {({ navigation }: { navigation: CompositeNavigationProp<BottomTabNavigationProp<TabParamList, 'HomeTab'>, NativeStackNavigationProp<RootStackParamList>> }) => (
          <HomeScreen
            onNavigate={(screen) => {
              if (screen === 'WriteNote') {
                navigation.navigate('WriteTab');
              } else if (screen === 'Settings') {
                navigation.navigate('SettingsTab');
              } else {
                // For any other screen names, try navigating via root stack
                (navigation as any).navigate(screen);
              }
            }}
          />
        )}
      </Tab.Screen>

      <Tab.Screen
        name="WriteTab"
        options={{
          tabBarLabel: 'Write',
          tabBarIcon: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
            <WriteIcon color={color} size={size} isHero={focused} />
          ),
          tabBarButton: (props: BottomTabBarButtonProps) => <WriteTabButton {...props} />,
        }}
      >
        {({ navigation }: { navigation: CompositeNavigationProp<BottomTabNavigationProp<TabParamList, 'WriteTab'>, NativeStackNavigationProp<RootStackParamList>> }) => (
          <WriteNoteScreen
            onGoBack={() => navigation.navigate('HomeTab')}
            onNavigateToResult={(originalText, rewrittenText, editNoteId) =>
              (navigation as any).navigate('RewriteResult', {
                originalText,
                rewrittenText,
                ...(editNoteId ? { editNoteId } : {}),
              })
            }
          />
        )}
      </Tab.Screen>

      <Tab.Screen
        name="SettingsTab"
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <SettingsIcon color={color} size={size} />
          ),
        }}
      >
        {() => (
          <SettingsScreen
            onGoBack={() => {}}
            onDeactivated={() => setAppState('not_activated')}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

// ─── Root Stack (tabs + overlay screens) ─────────────────────────────

type AppState = 'loading' | 'not_activated' | 'activated';

function AppContent() {
  const [appState, setAppState] = useState<AppState>('loading');

  useEffect(() => {
    checkActivation();

    registerForPushNotificationsAsync();
    const cleanupListeners = setupNotificationListeners();
    return () => cleanupListeners();
  }, []);

  // Warm the cartridge cache and trigger a background update check
  // after activation is confirmed. Runs once per app session.
  useEffect(() => {
    if (appState === 'activated') {
      // Warm the cache on first activation
      getActiveCartridge().catch(() => {});
      // Fire-and-forget background update check (no UI, no interruption)
      triggerCartridgeUpdateInBackground();
    }
  }, [appState]);

  const checkActivation = async () => {
    try {
      const activated = await isActivated();
      setAppState(activated ? 'activated' : 'not_activated');
    } catch {
      setAppState('not_activated');
    } finally {
      await SplashScreen.hideAsync().catch(() => {});
    }
  };

  // ── Loading splash ──────────────────────────────────────────────────
  if (appState === 'loading') {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCard}>
          <View style={styles.loadingLogo}>
            <Text style={styles.loadingLogoText}>RD</Text>
          </View>
          <ActivityIndicator
            size="large"
            color={BRAND_BLUE}
            style={styles.loadingSpinner}
          />
          <Text style={styles.loadingMessage}>Starting up…</Text>
          <Text style={styles.loadingSubMessage}>
            Checking your activation status
          </Text>
        </View>
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

  // ── Activated → tab bar + stack overlay ─────────────────────────────
  return (
    <SafeAreaProvider>
      <OfflineBanner />
      <NavigationContainer>
        <RootStack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          {/* Tab navigator as the main screen */}
          <RootStack.Screen name="MainTabs">
            {() => <MainTabs setAppState={setAppState} />}
          </RootStack.Screen>

          {/* Standalone WriteNote for edit-mode (launched from saved note) */}
          <RootStack.Screen name="WriteNote">
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
          </RootStack.Screen>

          {/* Rewrite result — pushes on top of tabs, hides tab bar */}
          <RootStack.Screen name="RewriteResult">
            {({ navigation, route }) => (
              <RewriteResultScreen
                originalText={route.params.originalText}
                rewrittenText={route.params.rewrittenText}
                editNoteId={route.params.editNoteId}
                onGoBack={() => navigation.goBack()}
                onEditOriginal={() => navigation.goBack()}
                onWriteAnother={() => {
                  // Pop all the way back to tabs, landing on Write tab
                  navigation.popToTop();
                }}
              />
            )}
          </RootStack.Screen>

          {/* View a saved note (reuses RewriteResultScreen) */}
          <RootStack.Screen name="ViewSavedNote">
            {({ navigation, route }) => (
              <RewriteResultScreen
                originalText={route.params.originalText}
                rewrittenText={route.params.rewrittenText}
                editNoteId={route.params.noteId}
                isViewingSaved
                onGoBack={() => navigation.goBack()}
                onEditOriginal={() => {
                  navigation.navigate('WriteNote', {
                    editNoteId: route.params.noteId,
                    initialText: route.params.originalText,
                  });
                }}
                onWriteAnother={() => {
                  navigation.popToTop();
                }}
              />
            )}
          </RootStack.Screen>
        </RootStack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

// Wrap the entire app in the error boundary
export default function App() {
  return (
    <AppErrorBoundary>
      <AppContent />
    </AppErrorBoundary>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────

const tabStyles = StyleSheet.create({
  heroButton: {
    top: -14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: BRAND_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: BRAND_BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  heroIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: BRAND_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 40,
    paddingHorizontal: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    minWidth: 220,
  },
  loadingLogo: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: BRAND_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  loadingLogoText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  loadingSpinner: {
    marginBottom: 16,
  },
  loadingMessage: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  loadingSubMessage: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
