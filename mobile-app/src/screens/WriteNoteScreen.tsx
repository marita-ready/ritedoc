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

const BRAND_BLUE = '#2563EB';

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
  const wordCount = noteText.trim()
    ? noteText.trim().split(/\s+/).length
    : 0;
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
      // Navigate to the dedicated comparison screen
      setScreenMode('editing');
      onNavigateToResult(noteText, result.text, editNoteId);
    } else {
      // Error occurred — go back to editing mode
      setScreenMode('editing');
    }
  }, [noteText, rewrite, clearError, onNavigateToResult]);

  const handleBack = useCallback(() => {
    if (screenMode === 'rewriting') {
      // Don't allow back during rewriting
      return;
    }

    if (noteText.trim()) {
      Alert.alert(
        'Discard Note?',
        'You have unsaved text. Are you sure you want to go back?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: onGoBack,
          },
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
        <ActivityIndicator size="small" color={BRAND_BLUE} />
        <Text style={styles.rewritingTitle}>
          {isModelLoading ? 'Loading AI Model...' : 'Rewriting Note...'}
        </Text>
      </View>
      <Text style={styles.rewritingSubtitle}>
        {isModelLoading
          ? 'Preparing the on-device AI model. This may take a moment on first use.'
          : 'Transforming your notes into a professional progress note.'}
      </Text>

      {/* Streaming preview */}
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
          placeholderTextColor="#9CA3AF"
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
      {error ? (
        <TouchableOpacity
          style={styles.errorBanner}
          onPress={clearError}
          activeOpacity={0.9}
        >
          <Text style={styles.errorBannerText}>⚠ {error}</Text>
          <Text style={styles.errorDismiss}>Tap to dismiss</Text>
        </TouchableOpacity>
      ) : null}

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statsLeft}>
          <View style={styles.statBadge}>
            <Text style={styles.statValue}>{wordCount}</Text>
            <Text style={styles.statLabel}>
              {wordCount === 1 ? ' word' : ' words'}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBadge}>
            <Text style={styles.statValue}>{charCount}</Text>
            <Text style={styles.statLabel}>
              {charCount === 1 ? ' char' : ' chars'}
            </Text>
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
          style={[
            styles.rewriteButton,
            !hasText && styles.rewriteButtonDisabled,
          ]}
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
                style={styles.backButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                disabled={screenMode === 'rewriting'}
              >
                <Text
                  style={[
                    styles.backButtonText,
                    screenMode === 'rewriting' && styles.backButtonDisabled,
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
                style={styles.clearButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                disabled={!hasText || screenMode === 'rewriting'}
              >
                <Text
                  style={[
                    styles.clearButtonText,
                    (!hasText || screenMode === 'rewriting') &&
                      styles.clearButtonTextDisabled,
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
    backgroundColor: '#F8FAFC',
  },
  keyboardView: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },

  // Header
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
  backButtonDisabled: {
    color: '#D1D5DB',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  clearButton: {
    paddingVertical: 4,
    paddingLeft: 8,
    minWidth: 60,
    alignItems: 'flex-end',
  },
  clearButtonText: {
    fontSize: 15,
    color: '#EF4444',
    fontWeight: '600',
  },
  clearButtonTextDisabled: {
    color: '#D1D5DB',
  },

  // ── Editing state ──────────────────────────────────────────────────

  // Text Input
  inputWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    fontSize: 16,
    color: '#111827',
    lineHeight: 24,
  },

  // Error banner
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorBannerText: {
    fontSize: 13,
    color: '#DC2626',
    lineHeight: 18,
  },
  errorDismiss: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },

  // Stats Bar
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
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
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 12,
  },
  readyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readyDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  readyText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },

  // Bottom Action Bar
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: Platform.OS === 'ios' ? 8 : 16,
  },
  rewriteButton: {
    backgroundColor: BRAND_BLUE,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BRAND_BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  rewriteButtonDisabled: {
    backgroundColor: '#93C5FD',
    shadowOpacity: 0,
    elevation: 0,
  },
  rewriteButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  rewriteButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  rewriteHint: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 8,
    lineHeight: 16,
  },

  // ── Rewriting state ────────────────────────────────────────────────

  rewritingContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  rewritingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rewritingTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: BRAND_BLUE,
    marginLeft: 10,
  },
  rewritingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 20,
  },
  streamPreview: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    padding: 18,
  },
  streamPreviewText: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 23,
  },
  streamPreviewPlaceholder: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streamPreviewPlaceholderText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
});
