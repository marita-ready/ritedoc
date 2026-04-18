/**
 * RiteDoc Mobile App — Device Identifier Utility
 *
 * Generates a stable device identifier for audit trail purposes.
 * This is sent during code verification so admins can see which device
 * redeemed each access code.
 */

import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

/**
 * Get a stable device identifier.
 * Uses the platform-specific installation ID where available,
 * falling back to a combination of device info.
 */
export async function getDeviceId(): Promise<string> {
  try {
    if (Platform.OS === 'android') {
      const androidId = Application.getAndroidId();
      if (androidId) return `android:${androidId}`;
    }

    if (Platform.OS === 'ios') {
      const iosId = await Application.getIosIdForVendorAsync();
      if (iosId) return `ios:${iosId}`;
    }

    // Fallback: combine device info into a readable identifier
    const brand = Device.brand || 'unknown';
    const model = Device.modelName || 'device';
    const osVersion = Device.osVersion || '0';
    return `${Platform.OS}:${brand}-${model}-${osVersion}`.toLowerCase().replace(/\s+/g, '-');
  } catch {
    return `${Platform.OS}:unknown-device`;
  }
}

/**
 * Get a human-readable device name for display purposes.
 */
export function getDeviceName(): string {
  const brand = Device.brand || '';
  const model = Device.modelName || 'Unknown Device';
  return brand ? `${brand} ${model}` : model;
}
