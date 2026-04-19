/**
 * RiteDoc Mobile App — Cartridge Updater
 *
 * Silently checks for cartridge updates on app launch.
 *
 * Flow:
 *   1. GET {CARTRIDGE_ENDPOINT}/version  → { versionCode, version, releasedAt }
 *   2. Compare remote versionCode against local getCartridgeVersionCode()
 *   3. If remote is newer: GET {CARTRIDGE_ENDPOINT}/latest → full CartridgeConfig JSON
 *   4. Validate the payload (required fields + optional HMAC signature)
 *   5. Write to expo-file-system (CARTRIDGE_FILE_PATH)
 *   6. Invalidate the in-memory cache
 *   7. Log result — no UI, no alerts, no interruption
 *
 * All errors are caught and logged; the app continues normally if the
 * update check fails for any reason (no internet, server down, etc.).
 *
 * The endpoint is configurable via the EXPO_PUBLIC_CARTRIDGE_URL env var.
 * Default: https://api.readycompliant.com/cartridge/mobile
 */

import * as FileSystem from 'expo-file-system';
import {
  CARTRIDGE_DIR,
  CARTRIDGE_FILE_PATH,
  type CartridgeConfig,
  getCartridgeVersionCode,
  invalidateCartridgeCache,
  getActiveCartridge,
} from './cartridgeConfig';

// ─── Configuration ───────────────────────────────────────────────────

/**
 * Base URL for the cartridge API endpoint.
 * Configurable via EXPO_PUBLIC_CARTRIDGE_URL environment variable.
 *
 * Expected endpoints:
 *   GET {base}/version  → CartridgeVersionResponse
 *   GET {base}/latest   → CartridgeConfig (full payload)
 */
const CARTRIDGE_BASE_URL: string =
  (process.env.EXPO_PUBLIC_CARTRIDGE_URL as string | undefined) ??
  'https://api.readycompliant.com/cartridge/mobile';

/** Timeout in milliseconds for each network request */
const REQUEST_TIMEOUT_MS = 10_000;

// ─── Types ───────────────────────────────────────────────────────────

/** Response shape from the /version endpoint */
interface CartridgeVersionResponse {
  versionCode: number;
  version: string;
  releasedAt: string;
}

/** Result returned by checkForCartridgeUpdate() */
export interface CartridgeUpdateResult {
  /** Whether a newer cartridge was found and downloaded */
  updated: boolean;
  /** The version string of the cartridge now in use */
  activeVersion: string;
  /** Human-readable status message for logging */
  message: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Wraps fetch() with an AbortController timeout.
 */
async function fetchWithTimeout(
  url: string,
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Validates that a parsed object has the minimum required fields to be
 * a valid CartridgeConfig. Does NOT verify the HMAC signature (that
 * requires a shared secret and is handled separately in production).
 */
function isValidCartridgePayload(obj: unknown): obj is CartridgeConfig {
  if (typeof obj !== 'object' || obj === null) return false;
  const c = obj as Record<string, unknown>;
  return (
    typeof c.version === 'string' &&
    typeof c.versionCode === 'number' &&
    typeof c.systemPrompt === 'string' &&
    typeof c.userPromptTemplate === 'string' &&
    typeof c.terminology === 'object' &&
    typeof c.formattingRules === 'object'
  );
}

/**
 * Ensures the cartridge storage directory exists.
 */
async function ensureCartridgeDir(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(CARTRIDGE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(CARTRIDGE_DIR, { intermediates: true });
    console.log('[CartridgeUpdater] Created cartridge directory');
  }
}

// ─── Main update function ─────────────────────────────────────────────

/**
 * Silently checks for a cartridge update and downloads it if available.
 *
 * This function is designed to be called fire-and-forget from App.tsx.
 * It never throws — all errors are caught and logged internally.
 *
 * @returns CartridgeUpdateResult with the outcome and active version
 */
export async function checkForCartridgeUpdate(): Promise<CartridgeUpdateResult> {
  const tag = '[CartridgeUpdater]';

  try {
    // ── Step 1: Warm the cartridge cache (loads downloaded or default) ──
    const currentCartridge = await getActiveCartridge();
    const localVersionCode = getCartridgeVersionCode();
    console.log(
      `${tag} Local cartridge: v${currentCartridge.version} (code ${localVersionCode})`
    );

    // ── Step 2: Fetch remote version info ──────────────────────────────
    console.log(`${tag} Checking for updates at ${CARTRIDGE_BASE_URL}/version`);
    let versionResponse: Response;
    try {
      versionResponse = await fetchWithTimeout(
        `${CARTRIDGE_BASE_URL}/version`,
        REQUEST_TIMEOUT_MS
      );
    } catch (networkError) {
      const msg = networkError instanceof Error ? networkError.message : String(networkError);
      console.log(`${tag} Version check failed (network): ${msg}`);
      return {
        updated: false,
        activeVersion: currentCartridge.version,
        message: `Network unavailable — using local cartridge v${currentCartridge.version}`,
      };
    }

    if (!versionResponse.ok) {
      console.log(`${tag} Version endpoint returned HTTP ${versionResponse.status}`);
      return {
        updated: false,
        activeVersion: currentCartridge.version,
        message: `Server returned ${versionResponse.status} — using local cartridge v${currentCartridge.version}`,
      };
    }

    let remoteVersionInfo: CartridgeVersionResponse;
    try {
      remoteVersionInfo = (await versionResponse.json()) as CartridgeVersionResponse;
    } catch {
      console.warn(`${tag} Failed to parse version response JSON`);
      return {
        updated: false,
        activeVersion: currentCartridge.version,
        message: 'Invalid version response — using local cartridge',
      };
    }

    const remoteVersionCode = remoteVersionInfo.versionCode;
    console.log(
      `${tag} Remote cartridge: v${remoteVersionInfo.version} (code ${remoteVersionCode})`
    );

    // ── Step 3: Compare versions ───────────────────────────────────────
    if (remoteVersionCode <= localVersionCode) {
      console.log(`${tag} Already up to date (local ${localVersionCode} >= remote ${remoteVersionCode})`);
      return {
        updated: false,
        activeVersion: currentCartridge.version,
        message: `Cartridge is up to date (v${currentCartridge.version})`,
      };
    }

    // ── Step 4: Download the new cartridge ─────────────────────────────
    console.log(
      `${tag} Update available: v${currentCartridge.version} → v${remoteVersionInfo.version}. Downloading…`
    );

    let latestResponse: Response;
    try {
      latestResponse = await fetchWithTimeout(
        `${CARTRIDGE_BASE_URL}/latest`,
        REQUEST_TIMEOUT_MS
      );
    } catch (downloadError) {
      const msg = downloadError instanceof Error ? downloadError.message : String(downloadError);
      console.warn(`${tag} Download failed (network): ${msg}`);
      return {
        updated: false,
        activeVersion: currentCartridge.version,
        message: `Download failed — using local cartridge v${currentCartridge.version}`,
      };
    }

    if (!latestResponse.ok) {
      console.warn(`${tag} Download endpoint returned HTTP ${latestResponse.status}`);
      return {
        updated: false,
        activeVersion: currentCartridge.version,
        message: `Download failed (HTTP ${latestResponse.status}) — using local cartridge`,
      };
    }

    let newCartridge: unknown;
    try {
      newCartridge = await latestResponse.json();
    } catch {
      console.warn(`${tag} Failed to parse cartridge payload JSON`);
      return {
        updated: false,
        activeVersion: currentCartridge.version,
        message: 'Invalid cartridge payload — using local cartridge',
      };
    }

    // ── Step 5: Validate the payload ───────────────────────────────────
    if (!isValidCartridgePayload(newCartridge)) {
      console.warn(`${tag} Downloaded cartridge failed validation — discarding`);
      return {
        updated: false,
        activeVersion: currentCartridge.version,
        message: 'Cartridge validation failed — using local cartridge',
      };
    }

    // Extra sanity check: remote versionCode must match what was advertised
    if (newCartridge.versionCode !== remoteVersionCode) {
      console.warn(
        `${tag} versionCode mismatch: expected ${remoteVersionCode}, got ${newCartridge.versionCode}`
      );
      return {
        updated: false,
        activeVersion: currentCartridge.version,
        message: 'Cartridge version mismatch — using local cartridge',
      };
    }

    // ── Step 6: Persist to disk ────────────────────────────────────────
    await ensureCartridgeDir();
    const jsonString = JSON.stringify(newCartridge, null, 2);
    await FileSystem.writeAsStringAsync(CARTRIDGE_FILE_PATH, jsonString, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    console.log(
      `${tag} Cartridge updated and saved: v${newCartridge.version} (code ${newCartridge.versionCode})`
    );

    // ── Step 7: Invalidate cache so next access picks up the new version ─
    invalidateCartridgeCache();

    return {
      updated: true,
      activeVersion: newCartridge.version,
      message: `Cartridge updated: v${currentCartridge.version} → v${newCartridge.version}`,
    };
  } catch (unexpectedError) {
    // Catch-all — the update check must never crash the app
    console.error('[CartridgeUpdater] Unexpected error during update check:', unexpectedError);
    return {
      updated: false,
      activeVersion: 'unknown',
      message: 'Unexpected error during cartridge update check',
    };
  }
}

/**
 * Fire-and-forget wrapper for use in App.tsx.
 * Calls checkForCartridgeUpdate() in the background without awaiting.
 * Logs the result but does not surface it to the UI.
 */
export function triggerCartridgeUpdateInBackground(): void {
  checkForCartridgeUpdate()
    .then((result) => {
      console.log(`[CartridgeUpdater] Update check complete: ${result.message}`);
    })
    .catch((error) => {
      // Should never reach here due to internal catch-all, but just in case
      console.error('[CartridgeUpdater] Unhandled error in background update:', error);
    });
}
