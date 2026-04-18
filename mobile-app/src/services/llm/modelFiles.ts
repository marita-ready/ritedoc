/**
 * RiteDoc Mobile App — Model File Management
 *
 * Utilities for checking model file availability on-device.
 * The model file (~1.7 GB) is bundled with the app or downloaded
 * on first launch — this module handles the file system checks.
 *
 * For now, this sets up the infrastructure for model file management.
 * The actual model file must be placed manually during the build process.
 * See MODEL_SETUP.md for instructions.
 */

import * as FileSystem from 'expo-file-system';
import { MODEL_PATH, MODEL_DIR, MODEL_FILENAME } from './config';

// ─── File checks ─────────────────────────────────────────────────────

/**
 * Check if the model file exists on-device and is accessible.
 */
export async function isModelAvailable(): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(MODEL_PATH);
    return info.exists && !info.isDirectory;
  } catch {
    return false;
  }
}

/**
 * Get the model file size in bytes, or null if not available.
 */
export async function getModelFileSize(): Promise<number | null> {
  try {
    const info = await FileSystem.getInfoAsync(MODEL_PATH);
    if (info.exists && !info.isDirectory && info.size) {
      return info.size;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Format a byte count as a human-readable string (e.g. "1.7 GB").
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Ensure the models directory exists on-device.
 * Called before any model file operations.
 */
export async function ensureModelDirectory(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(MODEL_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(MODEL_DIR, { intermediates: true });
  }
}

/**
 * Get a summary of the model file status for display in the UI.
 */
export async function getModelStatus(): Promise<{
  available: boolean;
  filename: string;
  path: string;
  sizeFormatted: string | null;
}> {
  const available = await isModelAvailable();
  const size = available ? await getModelFileSize() : null;

  return {
    available,
    filename: MODEL_FILENAME,
    path: MODEL_PATH,
    sizeFormatted: size ? formatFileSize(size) : null,
  };
}
