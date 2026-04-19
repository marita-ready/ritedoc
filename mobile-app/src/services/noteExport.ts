/**
 * RiteDoc Mobile App — Note Export Service
 *
 * Centralised utilities for copying notes to clipboard and sharing
 * via the native share sheet. All operations use plain UTF-8 text
 * only — no rich formatting.
 *
 * Provides haptic feedback on successful copy operations when the
 * device supports it.
 */

import { Share, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

// ─── Types ───────────────────────────────────────────────────────────

export type CopyMode = 'rewritten' | 'original' | 'both';
export type ShareMode = 'rewritten' | 'both';

interface NoteTexts {
  originalText: string;
  rewrittenText: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────

/** Trigger a light haptic tap. Fails silently on unsupported devices. */
async function hapticTap(): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // Haptics not available (e.g. simulator, older devices) — ignore
  }
}

/** Format both notes into a single labelled plain-text block. */
function formatBothNotes(texts: NoteTexts): string {
  return (
    '── ORIGINAL NOTE ──\n\n' +
    texts.originalText.trim() +
    '\n\n── REWRITTEN NOTE (Audit-Ready) ──\n\n' +
    texts.rewrittenText.trim()
  );
}

/** Get a human-readable label for the copy mode. */
function getCopyLabel(mode: CopyMode): string {
  switch (mode) {
    case 'rewritten':
      return 'Rewritten note';
    case 'original':
      return 'Original note';
    case 'both':
      return 'Both notes';
  }
}

// ─── Copy operations ─────────────────────────────────────────────────

/**
 * Copy note text to the clipboard.
 *
 * @param texts - The original and rewritten note texts
 * @param mode  - Which text(s) to copy
 * @returns A result object with success status and a display label
 */
export async function copyToClipboard(
  texts: NoteTexts,
  mode: CopyMode
): Promise<{ success: boolean; label: string }> {
  const label = getCopyLabel(mode);

  try {
    let textToCopy: string;

    switch (mode) {
      case 'rewritten':
        textToCopy = texts.rewrittenText.trim();
        break;
      case 'original':
        textToCopy = texts.originalText.trim();
        break;
      case 'both':
        textToCopy = formatBothNotes(texts);
        break;
    }

    await Clipboard.setStringAsync(textToCopy);
    await hapticTap();

    return { success: true, label };
  } catch {
    return { success: false, label };
  }
}

// ─── Share operations ────────────────────────────────────────────────

/**
 * Open the native share sheet with note text.
 *
 * @param texts - The original and rewritten note texts
 * @param mode  - Which text(s) to share
 * @returns true if the share was completed (not dismissed)
 */
export async function shareNote(
  texts: NoteTexts,
  mode: ShareMode
): Promise<boolean> {
  try {
    let message: string;

    if (mode === 'rewritten') {
      message = texts.rewrittenText.trim();
    } else {
      message = formatBothNotes(texts);
    }

    const result = await Share.share(
      {
        message,
        ...(Platform.OS === 'ios' ? {} : { title: 'RiteDoc Progress Note' }),
      },
      {
        dialogTitle: 'Share Progress Note',
        subject: 'RiteDoc Progress Note',
      }
    );

    if (result.action === Share.sharedAction) {
      await hapticTap();
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Show a copy options action sheet using Alert.
 * This is a convenience wrapper that presents copy mode choices.
 *
 * @param texts    - The original and rewritten note texts
 * @param onResult - Callback with the copy result (success + label)
 */
export function showCopyOptions(
  texts: NoteTexts,
  onResult: (result: { success: boolean; label: string }) => void
): void {
  // We use Alert with buttons since ActionSheet requires native module
  const { Alert } = require('react-native');

  Alert.alert('Copy to Clipboard', 'What would you like to copy?', [
    {
      text: 'Rewritten Note',
      onPress: async () => {
        const result = await copyToClipboard(texts, 'rewritten');
        onResult(result);
      },
    },
    {
      text: 'Original Note',
      onPress: async () => {
        const result = await copyToClipboard(texts, 'original');
        onResult(result);
      },
    },
    {
      text: 'Both Notes',
      onPress: async () => {
        const result = await copyToClipboard(texts, 'both');
        onResult(result);
      },
    },
    { text: 'Cancel', style: 'cancel' },
  ]);
}

/**
 * Show a share options action sheet using Alert.
 *
 * @param texts - The original and rewritten note texts
 */
export function showShareOptions(texts: NoteTexts): void {
  const { Alert } = require('react-native');

  Alert.alert('Share Note', 'What would you like to share?', [
    {
      text: 'Rewritten Note Only',
      onPress: () => shareNote(texts, 'rewritten'),
    },
    {
      text: 'Both (Original + Rewritten)',
      onPress: () => shareNote(texts, 'both'),
    },
    { text: 'Cancel', style: 'cancel' },
  ]);
}
