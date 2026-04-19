/**
 * RiteDoc Mobile App — Rewrite Result Screen
 *
 * Dedicated comparison screen showing the original raw note alongside
 * the AI-rewritten, NDIS-compliant version. Users can toggle between
 * a stacked "Before / After" view and a "Rewritten Only" view.
 *
 * Actions:
 * - Copy rewritten note / original / both to clipboard
 * - Share via native share sheet (rewritten only or both)
 * - Save both versions locally via noteStorage service
 * - Edit the original note
 * - Write another note from scratch
 *
 * Receives both texts via navigation params.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { saveNote, updateNote } from '../services/noteStorage';
import {
  copyToClipboard,
  showCopyOptions,
  showShareOptions,
} from '../services/noteExport';
import { Colors, Typography, Spacing, Radii, Shadows } from '../theme';

// ─── View modes ──────────────────────────────────────────────────────
type ViewMode = 'comparison' | 'rewritten';

interface Props {
  originalText: string;
  rewrittenText: string;
  onEditOriginal: () => void;
  onWriteAnother: () => void;
  onGoBack: () => void;
  editNoteId?: string;
  isViewingSaved?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────
function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function countChars(text: string): number {
  return text.length;
}

export default function RewriteResultScreen({
  originalText,
  rewrittenText,
  onEditOriginal,
  onWriteAnother,
  onGoBack,
  editNoteId,
  isViewingSaved = false,
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('comparison');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [saveFeedback, setSaveFeedback] = useState(false);
  const [isSaved, setIsSaved] = useState(isViewingSaved);

  // ── Toast animation ─────────────────────────────────────────────────
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (message: string) => {
      setCopyFeedback(message);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      toastTimeoutRef.current = setTimeout(() => {
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setCopyFeedback(null));
      }, 2000);
    },
    [toastOpacity]
  );

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const noteTexts = { originalText, rewrittenText };

  // ── Counts ──────────────────────────────────────────────────────────
  const originalWords = countWords(originalText);
  const rewrittenWords = countWords(rewrittenText);
  const originalChars = countChars(originalText);
  const rewrittenChars = countChars(rewrittenText);
  const wordDiff = rewrittenWords - originalWords;
  const wordDiffLabel =
    wordDiff === 0 ? 'same' : wordDiff > 0 ? `+${wordDiff}` : `${wordDiff}`;

  // ── Handlers ────────────────────────────────────────────────────────

  const handleQuickCopy = useCallback(async () => {
    const result = await copyToClipboard(noteTexts, 'rewritten');
    if (result.success) {
      showToast('Rewritten note copied!');
    } else {
      Alert.alert('Copy Failed', 'Could not copy text to clipboard.');
    }
  }, [noteTexts, showToast]);

  const handleCopyOptions = useCallback(() => {
    showCopyOptions(noteTexts, (result) => {
      if (result.success) {
        showToast(`${result.label} copied!`);
      } else {
        Alert.alert('Copy Failed', 'Could not copy text to clipboard.');
      }
    });
  }, [noteTexts, showToast]);

  const handleShare = useCallback(() => {
    showShareOptions(noteTexts);
  }, [noteTexts]);

  const handleSave = useCallback(async () => {
    if (isSaved && !editNoteId) {
      Alert.alert('Already Saved', 'This note has already been saved to your device.');
      return;
    }

    try {
      if (editNoteId) {
        const updated = await updateNote(editNoteId, { originalText, rewrittenText });
        if (!updated) {
          Alert.alert(
            'Update Failed',
            'Could not find the original note to update. It may have been deleted.'
          );
          return;
        }
        setIsSaved(true);
        setSaveFeedback(true);
        setTimeout(() => setSaveFeedback(false), 2500);
        Alert.alert('Note Updated', 'The saved note has been updated with the new rewritten version.');
      } else {
        await saveNote({ originalText, rewrittenText });
        setIsSaved(true);
        setSaveFeedback(true);
        setTimeout(() => setSaveFeedback(false), 2500);
        Alert.alert(
          'Note Saved',
          'Both the original and rewritten versions have been saved to your device.'
        );
      }
    } catch {
      Alert.alert('Save Failed', 'Could not save the note. Please try again.');
    }
  }, [originalText, rewrittenText, isSaved, editNoteId]);

  const handleWriteAnother = useCallback(() => {
    const message = isSaved
      ? 'This will start a fresh note.'
      : "This will start a fresh note. Make sure you've copied or saved the rewritten note first.";

    Alert.alert('Write Another Note?', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Start Fresh', onPress: onWriteAnother },
    ]);
  }, [onWriteAnother, isSaved]);

  // ── Render: Toast ──────────────────────────────────────────────────
  const renderToast = () => {
    if (!copyFeedback) return null;
    return (
      <Animated.View
        style={[styles.toastContainer, { opacity: toastOpacity }]}
        pointerEvents="none"
      >
        <View style={styles.toast}>
          <Text style={styles.toastText}>✓ {copyFeedback}</Text>
        </View>
      </Animated.View>
    );
  };

  // ── Render: Tab bar ────────────────────────────────────────────────
  const renderTabBar = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tab, viewMode === 'comparison' && styles.tabActive]}
        onPress={() => setViewMode('comparison')}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabText, viewMode === 'comparison' && styles.tabTextActive]}>
          Before / After
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, viewMode === 'rewritten' && styles.tabActive]}
        onPress={() => setViewMode('rewritten')}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabText, viewMode === 'rewritten' && styles.tabTextActive]}>
          Rewritten Only
        </Text>
      </TouchableOpacity>
    </View>
  );

  // ── Render: Word count comparison bar ──────────────────────────────
  const renderWordComparison = () => (
    <View style={styles.wordComparisonBar}>
      <View style={styles.wordComparisonItem}>
        <Text style={styles.wordComparisonLabel}>Original</Text>
        <Text style={styles.wordComparisonValue}>
          {originalWords} {originalWords === 1 ? 'word' : 'words'}
        </Text>
      </View>
      <View style={styles.wordComparisonDivider} />
      <View style={styles.wordComparisonItem}>
        <Text style={styles.wordComparisonLabel}>Rewritten</Text>
        <Text style={styles.wordComparisonValue}>
          {rewrittenWords} {rewrittenWords === 1 ? 'word' : 'words'}
        </Text>
      </View>
      <View style={styles.wordComparisonDivider} />
      <View style={styles.wordComparisonItem}>
        <Text style={styles.wordComparisonLabel}>Diff</Text>
        <Text style={[styles.wordComparisonValue, styles.wordComparisonDiff]}>
          {wordDiffLabel}
        </Text>
      </View>
    </View>
  );

  // ── Render: Comparison view (stacked before/after) ─────────────────
  const renderComparisonView = () => (
    <ScrollView
      style={styles.scrollArea}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Original note card */}
      <View style={styles.noteSection}>
        <View style={styles.noteLabelRow}>
          <View style={styles.noteLabelBadgeOriginal}>
            <Text style={styles.noteLabelBadgeTextOriginal}>Your Raw Note</Text>
          </View>
          <Text style={styles.noteCharCount}>{originalChars} chars</Text>
        </View>
        <View style={styles.noteCardOriginal}>
          <Text style={styles.noteCardText} selectable>
            {originalText}
          </Text>
        </View>
      </View>

      {/* Arrow separator */}
      <View style={styles.arrowSeparator}>
        <View style={styles.arrowLine} />
        <View style={styles.arrowBadge}>
          <Text style={styles.arrowBadgeText}>AI Rewrite</Text>
        </View>
        <View style={styles.arrowLine} />
      </View>

      {/* Rewritten note card */}
      <View style={styles.noteSection}>
        <View style={styles.noteLabelRow}>
          <View style={styles.noteLabelBadgeRewritten}>
            <Text style={styles.noteLabelBadgeTextRewritten}>Audit-Ready Draft</Text>
          </View>
          <Text style={styles.noteCharCount}>{rewrittenChars} chars</Text>
        </View>
        <View style={styles.noteCardRewritten}>
          <Text style={styles.noteCardText} selectable>
            {rewrittenText}
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  // ── Render: Rewritten-only view ────────────────────────────────────
  const renderRewrittenOnlyView = () => (
    <ScrollView
      style={styles.scrollArea}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.noteSection}>
        <View style={styles.noteLabelRow}>
          <View style={styles.noteLabelBadgeRewritten}>
            <Text style={styles.noteLabelBadgeTextRewritten}>Audit-Ready Draft</Text>
          </View>
          <Text style={styles.noteCharCount}>
            {rewrittenWords} words · {rewrittenChars} chars
          </Text>
        </View>
        <View style={styles.noteCardRewrittenFull}>
          <Text style={styles.noteCardTextLarge} selectable>
            {rewrittenText}
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  // ── Render: Action buttons ─────────────────────────────────────────
  const renderActions = () => (
    <View style={styles.actionsContainer}>
      {/* Primary row: Quick Copy + Share */}
      <View style={styles.primaryRow}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleQuickCopy}
          onLongPress={handleCopyOptions}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>📋 Copy Rewritten</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShare}
          activeOpacity={0.85}
        >
          <Text style={styles.shareButtonText}>↗ Share</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.copyHint}>Long-press Copy for more options</Text>

      {/* Secondary row: Save + Edit Original */}
      <View style={styles.secondaryRow}>
        <TouchableOpacity
          style={[
            styles.secondaryButtonFilled,
            isSaved && styles.secondaryButtonSaved,
          ]}
          onPress={handleSave}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.secondaryButtonFilledText,
              isSaved && styles.secondaryButtonSavedText,
            ]}
          >
            {saveFeedback
              ? editNoteId
                ? '✓ Updated!'
                : '✓ Saved!'
              : isSaved && !editNoteId
                ? '✓ Saved'
                : editNoteId
                  ? '💾 Update Note'
                  : '💾 Save Note'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButtonOutline}
          onPress={onEditOriginal}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryButtonOutlineText}>
            {isViewingSaved ? '✏️ Edit & Re-rewrite' : '✏️ Edit Original'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tertiary: Write Another */}
      <TouchableOpacity
        style={styles.tertiaryButton}
        onPress={handleWriteAnother}
        activeOpacity={0.7}
      >
        <Text style={styles.tertiaryButtonText}>+ Write Another Note</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Main render ────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onGoBack}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isViewingSaved ? 'Saved Note' : 'Note Comparison'}
        </Text>
        <TouchableOpacity
          onPress={handleShare}
          style={styles.headerShareButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.headerShareText}>↗ Share</Text>
        </TouchableOpacity>
      </View>

      {/* Success / info banner */}
      <View style={[styles.successBanner, isViewingSaved && styles.savedBanner]}>
        <Text style={styles.successIcon}>{isViewingSaved ? '📋' : '✓'}</Text>
        <View style={styles.successTextContainer}>
          <Text style={styles.successTitle}>
            {isViewingSaved
              ? 'Saved Note'
              : editNoteId
                ? 'Note Re-rewritten'
                : 'Note Rewritten Successfully'}
          </Text>
          <Text style={styles.successSubtitle}>
            {isViewingSaved
              ? 'Tap "Edit & Re-rewrite" to modify and re-run the AI rewrite.'
              : 'Review the comparison below, then copy or save.'}
          </Text>
        </View>
      </View>

      {/* Tab bar */}
      {renderTabBar()}

      {/* Word count comparison */}
      {renderWordComparison()}

      {/* Content area */}
      {viewMode === 'comparison' ? renderComparisonView() : renderRewrittenOnlyView()}

      {/* Action buttons */}
      {renderActions()}

      {/* Floating toast */}
      {renderToast()}
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // ── Header ─────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  backButton: {
    paddingVertical: 4,
    paddingRight: Spacing.sm,
    minWidth: 60,
  },
  backButtonText: {
    fontSize: Typography.size.bodyLg,
    color: Colors.primary,
    fontWeight: Typography.weight.semibold,
  },
  headerTitle: {
    fontSize: Typography.size.title,
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
  },
  headerShareButton: {
    paddingVertical: 4,
    paddingLeft: Spacing.sm,
    minWidth: 60,
    alignItems: 'flex-end',
  },
  headerShareText: {
    fontSize: Typography.size.body,
    color: Colors.primary,
    fontWeight: Typography.weight.semibold,
  },

  // ── Toast ──────────────────────────────────────────────────────────
  toastContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  toast: {
    backgroundColor: Colors.successDark,
    borderRadius: Radii.base,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    ...Shadows.md,
  },
  toastText: {
    color: Colors.white,
    fontSize: Typography.size.body,
    fontWeight: Typography.weight.semibold,
  },

  // ── Success / info banner ──────────────────────────────────────────
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successLight,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.md,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.successBorder,
  },
  savedBanner: {
    backgroundColor: Colors.primaryFaint,
    borderColor: Colors.infoBorder,
  },
  successIcon: {
    fontSize: 20,
    color: Colors.success,
    fontWeight: Typography.weight.bold,
    marginRight: Spacing.md,
    width: 28,
    height: 28,
    lineHeight: 28,
    textAlign: 'center',
    backgroundColor: Colors.successFaint,
    borderRadius: 14,
    overflow: 'hidden',
  },
  successTextContainer: {
    flex: 1,
  },
  successTitle: {
    fontSize: Typography.size.body,
    fontWeight: Typography.weight.bold,
    color: Colors.successDark,
    marginBottom: 2,
  },
  successSubtitle: {
    fontSize: Typography.size.base,
    color: Colors.success,
    lineHeight: Typography.lineHeight.tight,
  },

  // ── Tab bar ──────────────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: Spacing.base,
    marginTop: Spacing.md,
    backgroundColor: Colors.borderLight,
    borderRadius: Radii.base,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: Radii.sm + 2,
  },
  tabActive: {
    backgroundColor: Colors.surface,
    ...Shadows.xs,
  },
  tabText: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
  },

  // ── Word count comparison bar ──────────────────────────────────────
  wordComparisonBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginHorizontal: Spacing.base,
    marginTop: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radii.base,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  wordComparisonItem: {
    flex: 1,
    alignItems: 'center',
  },
  wordComparisonLabel: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: Typography.tracking.wider,
    marginBottom: 2,
  },
  wordComparisonValue: {
    fontSize: Typography.size.body,
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
  },
  wordComparisonDiff: {
    color: Colors.primary,
  },
  wordComparisonDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.border,
  },

  // ── Scroll area ────────────────────────────────────────────────────
  scrollArea: {
    flex: 1,
    marginTop: Spacing.md,
  },
  scrollContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.sm,
  },

  // ── Note sections ──────────────────────────────────────────────────
  noteSection: {
    marginBottom: Spacing.xs,
  },
  noteLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  noteLabelBadgeOriginal: {
    backgroundColor: '#FEF3C7',
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  noteLabelBadgeTextOriginal: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: '#92400E',
  },
  noteLabelBadgeRewritten: {
    backgroundColor: Colors.successLight,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.successBorder,
  },
  noteLabelBadgeTextRewritten: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.successDark,
  },
  noteCharCount: {
    fontSize: Typography.size.sm,
    color: Colors.textTertiary,
    fontWeight: Typography.weight.medium,
  },

  // ── Note cards ─────────────────────────────────────────────────────
  noteCardOriginal: {
    backgroundColor: '#FFFBEB',
    borderRadius: Radii.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: '#FDE68A',
    minHeight: 80,
  },
  noteCardRewritten: {
    backgroundColor: '#F0FDF4',
    borderRadius: Radii.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    minHeight: 80,
  },
  noteCardRewrittenFull: {
    backgroundColor: '#F0FDF4',
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    minHeight: 160,
  },
  noteCardText: {
    fontSize: Typography.size.body,
    color: Colors.textPrimary,
    lineHeight: Typography.lineHeight.relaxed - 1,
  },
  noteCardTextLarge: {
    fontSize: Typography.size.bodyLg,
    color: Colors.textPrimary,
    lineHeight: Typography.lineHeight.relaxed,
  },

  // ── Arrow separator ────────────────────────────────────────────────
  arrowSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  arrowLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  arrowBadge: {
    backgroundColor: Colors.primaryFaint,
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    marginHorizontal: Spacing.sm + 2,
    borderWidth: 1,
    borderColor: Colors.infoBorder,
  },
  arrowBadgeText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.primary,
  },

  // ── Action buttons ─────────────────────────────────────────────────
  actionsContainer: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm + 2,
    paddingBottom: Platform.OS === 'ios' ? Spacing.sm : Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  primaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm + 2,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: Radii.xl,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.primaryButton,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: Typography.size.bodyLg,
    fontWeight: Typography.weight.bold,
  },
  shareButton: {
    backgroundColor: Colors.primaryFaint,
    borderRadius: Radii.xl,
    paddingVertical: 15,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.infoBorder,
  },
  shareButtonText: {
    color: Colors.primary,
    fontSize: Typography.size.bodyLg,
    fontWeight: Typography.weight.bold,
  },
  copyHint: {
    fontSize: Typography.size.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.xs + 2,
    marginBottom: Spacing.xs,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm + 2,
    marginTop: Spacing.xs + 2,
  },
  secondaryButtonFilled: {
    flex: 1,
    backgroundColor: Colors.primaryFaint,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.infoBorder,
  },
  secondaryButtonFilledText: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
    color: Colors.primary,
  },
  secondaryButtonSaved: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.successBorder,
  },
  secondaryButtonSavedText: {
    color: Colors.success,
  },
  secondaryButtonOutline: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryButtonOutlineText: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
    color: Colors.textPrimary,
  },
  tertiaryButton: {
    marginTop: Spacing.sm + 2,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
  },
  tertiaryButtonText: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
    color: Colors.textSecondary,
  },
});
