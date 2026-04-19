/**
 * RiteDoc Mobile App — Write Note Screen
 *
 * The primary note entry screen where support workers type their raw
 * progress notes and tap "Rewrite Note" to transform them into
 * professional NDIS-compliant notes via the on-device Gemma 2B model.
 *
 * After a successful rewrite, navigates to the dedicated
 * RewriteResultScreen for before/after comparison.
 *
 * States:
 * 1. Editing — user types raw notes
 * 2. Rewriting — model loading + inference running, tokens stream in
 *
 * Keyboard handling:
 * - KeyboardAvoidingView keeps the bottom toolbar visible above the keyboard
 * - Tapping outside the input dismisses the keyboard
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRewriter } from '../hooks/useRewriter';
import ErrorBanner from '../components/ErrorBanner';
import { Colors, Typography, Spacing, Radii, Shadows } from '../theme';

// ─── Screen modes ────────────────────────────────────────────────────
type ScreenMode = 'editing' | 'rewriting';

interface Props {
  onGoBack: () => void;
  onNavigateToResult: (
    originalText: string,
    rewrittenText: string,
    editNoteId?: string
  ) => void;
  /** Pre-fill the text input (used when editing an existing saved note) */
  initialText?: string;
  /** If set, the rewrite result will update this existing note */
  editNoteId?: string;
}

export default function WriteNoteScreen({
  onGoBack,
  onNavigateToResult,
  initialText,
  editNoteId,
}: Props) {
  const [noteText, setNoteText] = useState(initialText ?? '');
  const [screenMode, setScreenMode] = useState<ScreenMode>('editing');
  const inputRef = useRef<TextInput>(null);

  const {
    rewrite,
    isModelLoading,
    streamedText,
    error,
    clearError,
  } = useRewriter();

  // ── Derived counts ──────────────────────────────────────────────────
  const charCount = noteText.length;
  const wordCount = noteText.trim() ? noteText.trim().split(/\s+/).length : 0;
  const hasText = noteText.trim().length > 0;

  // ── Handlers ────────────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    if (!noteText.trim()) return;

    Alert.alert(
      'Clear Note',
      'Are you sure you want to clear all text? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setNoteText('');
            setScreenMode('editing');
            clearError();
            inputRef.current?.focus();
          },
        },
      ]
    );
  }, [noteText, clearError]);

  const handleRewrite = useCallback(async () => {
    if (!noteText.trim()) {
      Alert.alert(
        'Nothing to Rewrite',
        'Type some notes first, then tap Rewrite to polish them into a professional progress note.'
      );
      return;
    }

    Keyboard.dismiss();
    setScreenMode('rewriting');
    clearError();

    const result = await rewrite(noteText);

    if (result) {
      setScreenMode('editing');
      onNavigateToResult(noteText, result.text, editNoteId);
    } else {
      setScreenMode('editing');
    }
  }, [noteText, rewrite, clearError, onNavigateToResult, editNoteId]);

  const handleBack = useCallback(() => {
    if (screenMode === 'rewriting') return;

    if (noteText.trim()) {
      Alert.alert(
        'Discard Note?',
        'You have unsaved text. Are you sure you want to go back?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: onGoBack },
        ]
      );
    } else {
      onGoBack();
    }
  }, [noteText, onGoBack, screenMode]);

  // ── Render: Rewriting / Loading state ──────────────────────────────
  const renderRewritingState = () => (
    <View style={styles.rewritingContainer}>
      <View style={styles.rewritingHeader}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={styles.rewritingTitle}>
          {isModelLoading ? 'Loading AI Model...' : 'Rewriting Note...'}
        </Text>
      </View>
      <Text style={styles.rewritingSubtitle}>
        {isModelLoading
          ? 'Preparing the on-device AI model. This may take a moment on first use.'
          : 'Transforming your notes into a professional progress note.'}
      </Text>

      {streamedText ? (
        <ScrollView style={styles.streamPreview} nestedScrollEnabled>
          <Text style={styles.streamPreviewText}>{streamedText}</Text>
        </ScrollView>
      ) : (
        <View style={styles.streamPreviewPlaceholder}>
          <Text style={styles.streamPreviewPlaceholderText}>
            {isModelLoading
              ? 'The model runs entirely on this device — no internet needed.'
              : 'Tokens will appear here as they are generated...'}
          </Text>
        </View>
      )}
    </View>
  );

  // ── Render: Editing state (default) ────────────────────────────────
  const renderEditingState = () => (
    <>
      {/* Text Input Area */}
      <View style={styles.inputWrapper}>
        <TextInput
          ref={inputRef}
          style={styles.textInput}
          value={noteText}
          onChangeText={setNoteText}
          placeholder={
            'Type your raw progress notes here...\n\n' +
            'Even dot points are fine — for example:\n' +
            '• Assisted client with morning routine\n' +
            '• Client was in good spirits today\n' +
            '• Reminded about medication at 10am\n' +
            '• Went for a 20 min walk together'
          }
          placeholderTextColor={Colors.textTertiary}
          multiline
          textAlignVertical="top"
          autoCorrect
          autoCapitalize="sentences"
          spellCheck
          scrollEnabled
          returnKeyType="default"
          blurOnSubmit={false}
          autoFocus={screenMode === 'editing'}
        />
      </View>

      {/* Error banner */}
      <ErrorBanner
        message={error}
        onDismiss={clearError}
        actionLabel={
          error && (error.toLowerCase().includes('model') || error.toLowerCase().includes('load'))
            ? 'Retry'
            : undefined
        }
        onAction={
          error && (error.toLowerCase().includes('model') || error.toLowerCase().includes('load'))
            ? handleRewrite
            : undefined
        }
      />

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statsLeft}>
          <View style={styles.statBadge}>
            <Text style={styles.statValue}>{wordCount}</Text>
            <Text style={styles.statLabel}>{wordCount === 1 ? ' word' : ' words'}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBadge}>
            <Text style={styles.statValue}>{charCount}</Text>
            <Text style={styles.statLabel}>{charCount === 1 ? ' char' : ' chars'}</Text>
          </View>
        </View>
        {hasText && (
          <View style={styles.readyIndicator}>
            <View style={styles.readyDot} />
            <Text style={styles.readyText}>Ready to rewrite</Text>
          </View>
        )}
      </View>

      {/* Bottom Action */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.rewriteButton, !hasText && styles.rewriteButtonDisabled]}
          onPress={handleRewrite}
          activeOpacity={0.85}
          disabled={!hasText}
        >
          <Text style={styles.rewriteButtonIcon}>✨</Text>
          <Text style={styles.rewriteButtonText}>Rewrite Note</Text>
        </TouchableOpacity>
        <Text style={styles.rewriteHint}>
          {hasText
            ? 'Tap to transform your notes into a professional progress note'
            : 'Start typing above, then tap to rewrite'}
        </Text>
      </View>
    </>
  );

  // ── Main render ────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.inner}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={handleBack}
                style={styles.navButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                disabled={screenMode === 'rewriting'}
              >
                <Text
                  style={[
                    styles.navButtonText,
                    screenMode === 'rewriting' && styles.navButtonDisabled,
                  ]}
                >
                  ← Back
                </Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>
                {editNoteId ? 'Edit Note' : 'New Note'}
              </Text>
              <TouchableOpacity
                onPress={handleClear}
                style={styles.navButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                disabled={!hasText || screenMode === 'rewriting'}
              >
                <Text
                  style={[
                    styles.clearButtonText,
                    (!hasText || screenMode === 'rewriting') && styles.navButtonDisabled,
                  ]}
                >
                  Clear
                </Text>
              </TouchableOpacity>
            </View>

            {/* Content based on screen mode */}
            {screenMode === 'rewriting'
              ? renderRewritingState()
              : renderEditingState()}
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },

  // ── Header ───────────────────────────────────────────────────────────
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
  navButton: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.xs,
    minWidth: 60,
  },
  navButtonText: {
    fontSize: Typography.size.bodyLg,
    color: Colors.primary,
    fontWeight: Typography.weight.semibold,
  },
  navButtonDisabled: {
    color: Colors.textMuted,
  },
  headerTitle: {
    fontSize: Typography.size.title,
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
  },
  clearButtonText: {
    fontSize: Typography.size.body,
    color: Colors.error,
    fontWeight: Typography.weight.semibold,
    textAlign: 'right',
  },

  // ── Editing state ─────────────────────────────────────────────────────

  inputWrapper: {
    flex: 1,
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.base,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.xs,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: Spacing.base + 2,
    paddingTop: Spacing.base + 2,
    paddingBottom: Spacing.base + 2,
    fontSize: Typography.size.bodyLg,
    color: Colors.textPrimary,
    lineHeight: Typography.lineHeight.relaxed,
  },

  // Stats Bar
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
  },
  statsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statValue: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: '#374151',
  },
  statLabel: {
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
    fontWeight: Typography.weight.medium,
  },
  statDivider: {
    width: 1,
    height: 14,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
  readyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readyDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.statusGreen,
    marginRight: Spacing.xs + 2,
  },
  readyText: {
    fontSize: Typography.size.xs,
    color: Colors.success,
    fontWeight: Typography.weight.semibold,
  },

  // Bottom Action Bar
  bottomBar: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xs,
    paddingBottom: Platform.OS === 'ios' ? Spacing.sm : Spacing.base,
  },
  rewriteButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.xl,
    paddingVertical: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.primaryButton,
  },
  rewriteButtonDisabled: {
    backgroundColor: Colors.disabled,
    ...(Platform.OS === 'ios' ? { shadowOpacity: 0 } : { elevation: 0 }),
  },
  rewriteButtonIcon: {
    fontSize: 18,
    marginRight: Spacing.sm,
  },
  rewriteButtonText: {
    color: Colors.white,
    fontSize: Typography.size.title,
    fontWeight: Typography.weight.bold,
    letterSpacing: Typography.tracking.wide,
  },
  rewriteHint: {
    textAlign: 'center',
    color: Colors.textTertiary,
    fontSize: Typography.size.xs,
    marginTop: Spacing.sm,
    lineHeight: Typography.lineHeight.tight,
  },

  // ── Rewriting state ───────────────────────────────────────────────────

  rewritingContainer: {
    flex: 1,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xl,
  },
  rewritingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  rewritingTitle: {
    fontSize: Typography.size.title,
    fontWeight: Typography.weight.bold,
    color: Colors.primary,
    marginLeft: Spacing.sm + 2,
  },
  rewritingSubtitle: {
    fontSize: Typography.size.md,
    color: Colors.textSecondary,
    lineHeight: Typography.lineHeight.snug,
    marginBottom: Spacing.lg,
  },
  streamPreview: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    padding: Spacing.base + 2,
  },
  streamPreviewText: {
    fontSize: Typography.size.body,
    color: Colors.textPrimary,
    lineHeight: Typography.lineHeight.relaxed - 1,
  },
  streamPreviewPlaceholder: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streamPreviewPlaceholderText: {
    fontSize: Typography.size.md,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.snug,
  },
});
