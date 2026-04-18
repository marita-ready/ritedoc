/**
 * RiteDoc Mobile App — Activation Storage Service
 *
 * Persists activation data locally using Expo SecureStore so the app
 * works fully offline after the initial one-time code verification.
 */

import * as SecureStore from 'expo-secure-store';

const ACTIVATION_KEY = 'ritedoc_activation';

export interface ActivationData {
  activationToken: string;
  agencyName: string;
  activatedAt: string;  // ISO date string
  codeUsed: string;     // The MAC-XXXX-XXXX-XXXX code that was redeemed
}

/**
 * Save activation data to secure local storage.
 * Called once after successful code verification.
 */
export async function saveActivation(data: ActivationData): Promise<void> {
  await SecureStore.setItemAsync(ACTIVATION_KEY, JSON.stringify(data));
}

/**
 * Load activation data from secure local storage.
 * Returns null if the app has not been activated yet.
 */
export async function loadActivation(): Promise<ActivationData | null> {
  try {
    const raw = await SecureStore.getItemAsync(ACTIVATION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ActivationData;
  } catch {
    return null;
  }
}

/**
 * Check whether the app has been activated.
 * This is a quick synchronous-style check using the stored value.
 */
export async function isActivated(): Promise<boolean> {
  const data = await loadActivation();
  return data !== null && !!data.activationToken;
}

/**
 * Clear activation data (for testing/reset purposes).
 * In production, this should only be accessible via a hidden debug menu.
 */
export async function clearActivation(): Promise<void> {
  await SecureStore.deleteItemAsync(ACTIVATION_KEY);
}
