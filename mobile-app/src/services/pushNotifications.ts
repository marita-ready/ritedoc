/**
 * RiteDoc Mobile App — Push Notifications Service (Placeholder)
 *
 * Handles notification permissions, token retrieval, and basic listeners.
 * Actual push logic will be implemented in a future update.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure how notifications are handled when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request permissions and get the Expo push token.
 * Should be called on app startup.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  if (!Device.isDevice) {
    console.log('[PushNotifications] Must use physical device for Push Notifications');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[PushNotifications] Failed to get push token for push notification!');
      return null;
    }

    // Get the token
    const expoTokenResponse = await Notifications.getExpoPushTokenAsync({
      // projectId: 'your-project-id', // Optional: will use value from app.json
    });
    token = expoTokenResponse.data;

    console.log('[PushNotifications] Expo Push Token:', token);
  } catch (error) {
    console.error('[PushNotifications] Error registering for push notifications:', error);
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563EB',
    });
  }

  return token;
}

/**
 * Check the current notification permission status.
 */
export async function getNotificationPermissionStatus(): Promise<Notifications.PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

/**
 * Placeholder for handling incoming notifications.
 */
export function setupNotificationListeners() {
  // Listener for when a notification is received while the app is foregrounded
  const notificationListener = Notifications.addNotificationReceivedListener(notification => {
    console.log('[PushNotifications] Notification Received:', notification);
  });

  // Listener for when a user interacts with a notification (taps it)
  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('[PushNotifications] Notification Response:', response);
  });

  return () => {
    notificationListener.remove();
    responseListener.remove();
  };
}
