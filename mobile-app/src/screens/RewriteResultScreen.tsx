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

const BRAND_BLUE = '#2563EB';
const BRAND_BLUE_LIGHT = '#DBEAFE';

// ─── View modes ──────────────────────────────────────────────────────
type ViewMode = 'comparison' | 'rewritten';

interface Props {
  originalText: string;
  rewrittenText: string;
  onEditOriginal: () => void;
  onWriteAnother: () => void;
  onGoBack: () => void;
  /**
   * When set, the Save button will UPDATE this existing note instead of
   * creating a new one. Passed when coming from an edit flow.
   */
  editNoteId?: string;
  /**
   * When true, the screen is viewing a previously saved note.
   * Changes the Edit Original button label to "Edit & Re-rewrite".
   */
  isViewingSaved?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────
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
  // If viewing a saved note (isViewingSaved), it's already saved
  const [isSaved, setIsSaved] = useState(isViewingSaved);

  // ── Toast animation ─────────────────────────────────────────────────
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (message: string) => {
      setCopyFeedback(message);
      // Clear any existing timeout
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      // Animate in
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      // Animate out after delay
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

  // Cleanup timeout on unmount
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

  /** Quick copy — copies rewritten note directly (primary action) */
  const handleQuickCopy = useCallback(async () => {
    const result = await copyToClipboard(noteTexts, 'rewritten');
    if (result.success) {
      showToast('Rewritten note copied!');
    } else {
      Alert.alert('Copy Failed', 'Could not copy text to clipboard.');
    }
  }, [noteTexts, showToast]);

  /** Expanded copy — shows options for which text to copy */
  const handleCopyOptions = useCallback(() => {
    showCopyOptions(noteTexts, (result) => {
      if (result.success) {
        showToast(`${result.label} copied!`);
      } else {
        Alert.alert('Copy Failed', 'Could not copy text to clipboard.');
      }
    });
  }, [noteTexts, showToast]);

  /** Share — shows options for which text to share */
  const handleShare = useCallback(() => {
    showShareOptions(noteTexts);
  }, [noteTexts]);

  const handleSave = useCallback(async () => {
    if (isSaved && !editNoteId) {
      Alert.alert(
        'Already Saved',
        'This note has already been saved to your device.'
      );
      return;
    }

    try {
      if (editNoteId) {
        // Update the existing saved note
        const updated = await updateNote(editNoteId, {
          originalText,
          rewrittenText,
        });
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
        Alert.alert(
          'Note Updated',
          'The saved note has been updated with the new rewritten version.'
        );
      } else {
        // Save as a new note
        await saveNote({ originalText, rewrittenText });
        setIsSaved(true);
        setSaveFeedback(true);
        setTimeout(() => setSaveFeedback(false), 2500);
        Alert.alert(
          'Note Saved',
          'Both the original and rewritten versions have been saved to your device. You can view them in Saved Notes.'
        );
      }
    } catch {
      Alert.alert(
        'Save Failed',
        'Could not save the note. Please try again.'
      );
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
        <Text
          style={[
            styles.tabText,
            viewMode === 'comparison' && styles.tabTextActive,
          ]}
        >
          Before / After
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, viewMode === 'rewritten' && styles.tabActive]}
        onPress={() => setViewMode('rewritten')}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.tabText,
            viewMode === 'rewritten' && styles.tabTextActive,
          ]}
        >
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
        <Text
          style={[styles.wordComparisonValue, styles.wordComparisonDiff]}
        >
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
            <Text style={styles.noteLabelBadgeTextRewritten}>
              Audit-Ready Draft
            </Text>
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
            <Text style={styles.noteLabelBadgeTextRewritten}>
              Audit-Ready Draft
            </Text>
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

      {/* Copy options hint */}
      <Text style={styles.copyHint}>
        Long-press Copy for more options
      </Text>

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
              ? (editNoteId ? '✓ Updated!' : '✓ Saved!')
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
            {isViewingSaved ? 'Saved Note' : editNoteId ? 'Note Re-rewritten' : 'Note Rewritten Successfully'}
          </Text>
          <Text style={styles.successSubtitle}>
            {isViewingSaved
              ? 'Tap “Edit & Re-rewrite” to modify and re-run the AI rewrite.'
              : 'Review the comparison below, then copy or save.'}
          </Text>
        </View>
      </View>

      {/* Tab bar */}
      {renderTabBar()}

      {/* Word count comparison */}
      {renderWordComparison()}

      {/* Content area */}
      {viewMode === 'comparison'
        ? renderComparisonView()
        : renderRewrittenOnlyView()}

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
    backgroundColor: '#F8FAFC',
  },

  // ── Header ─────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    paddingVertical: 4,
    paddingRight: 8,
    minWidth: 60,
  },
  backButtonText: {
    fontSize: 16,
    color: BRAND_BLUE,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  headerShareButton: {
    paddingVertical: 4,
    paddingLeft: 8,
    minWidth: 60,
    alignItems: 'flex-end',
  },
  headerShareText: {
    fontSize: 15,
    color: BRAND_BLUE,
    fontWeight: '600',
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
    backgroundColor: '#065F46',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  // ── Success banner ─────────────────────────────────────────────────
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  successIcon: {
    fontSize: 20,
    color: '#059669',
    fontWeight: '700',
    marginRight: 12,
    width: 28,
    height: 28,
    lineHeight: 28,
    textAlign: 'center',
    backgroundColor: '#D1FAE5',
    borderRadius: 14,
    overflow: 'hidden',
  },
  successTextContainer: {
    flex: 1,
  },
  successTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#065F46',
    marginBottom: 2,
  },
  successSubtitle: {
    fontSize: 13,
    color: '#047857',
    lineHeight: 18,
  },

  /** Override for the info banner when viewing a saved note */
  savedBanner: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },

  // ── Tab bar ──────────────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: BRAND_BLUE,
  },

  // ── Word count comparison bar ──────────────────────────────────────
  wordComparisonBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  wordComparisonItem: {
    flex: 1,
    alignItems: 'center',
  },
  wordComparisonLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  wordComparisonValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },
  wordComparisonDiff: {
    color: BRAND_BLUE,
  },
  wordComparisonDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E5E7EB',
  },

  // ── Scroll area ────────────────────────────────────────────────────
  scrollArea: {
    flex: 1,
    marginTop: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },

  // ── Note sections ──────────────────────────────────────────────────
  noteSection: {
    marginBottom: 4,
  },
  noteLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  noteLabelBadgeOriginal: {
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  noteLabelBadgeTextOriginal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  noteLabelBadgeRewritten: {
    backgroundColor: '#ECFDF5',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  noteLabelBadgeTextRewritten: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  noteCharCount: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  // ── Note cards ─────────────────────────────────────────────────────
  noteCardOriginal: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    minHeight: 80,
  },
  noteCardRewritten: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    minHeight: 80,
  },
  noteCardRewrittenFull: {
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    minHeight: 160,
  },
  noteCardText: {
    fontSize: 15,
    color: '#1F2937',
    lineHeight: 23,
  },
  noteCardTextLarge: {
    fontSize: 16,
    color: '#1F2937',
    lineHeight: 26,
  },

  // ── Arrow separator ────────────────────────────────────────────────
  arrowSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 4,
  },
  arrowLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  arrowBadge: {
    backgroundColor: BRAND_BLUE_LIGHT,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  arrowBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: BRAND_BLUE,
  },

  // ── Action buttons ─────────────────────────────────────────────────
  actionsContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 8 : 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  primaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: BRAND_BLUE,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BRAND_BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  shareButton: {
    backgroundColor: '#F0F4FF',
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BRAND_BLUE_LIGHT,
  },
  shareButtonText: {
    color: BRAND_BLUE,
    fontSize: 16,
    fontWeight: '700',
  },
  copyHint: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 4,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  secondaryButtonFilled: {
    flex: 1,
    backgroundColor: '#F0F4FF',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BRAND_BLUE_LIGHT,
  },
  secondaryButtonFilledText: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND_BLUE,
  },
  secondaryButtonSaved: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  secondaryButtonSavedText: {
    color: '#059669',
  },
  secondaryButtonOutline: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  secondaryButtonOutlineText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  tertiaryButton: {
    marginTop: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tertiaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
});
