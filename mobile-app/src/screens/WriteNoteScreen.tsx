/**
 * RiteDoc Mobile App — Write Note Screen
 *
 * The primary note entry screen where support workers type their raw
 * progress notes. Features a large multiline text input, word/character
 * count, a clear button, and a "Rewrite Note" action button.
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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

const BRAND_BLUE = '#2563EB';
const BRAND_BLUE_DARK = '#1D4ED8';

interface Props {
  onGoBack: () => void;
}

export default function WriteNoteScreen({ onGoBack }: Props) {
  const [noteText, setNoteText] = useState('');
  const inputRef = useRef<TextInput>(null);

  // ── Derived counts ──────────────────────────────────────────────────
  const charCount = noteText.length;
  const wordCount = noteText.trim()
    ? noteText.trim().split(/\s+/).length
    : 0;

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
            inputRef.current?.focus();
          },
        },
      ]
    );
  }, [noteText]);

  const handleRewrite = useCallback(() => {
    if (!noteText.trim()) {
      Alert.alert(
        'Nothing to Rewrite',
        'Type some notes first, then tap Rewrite to polish them into a professional progress note.'
      );
      return;
    }

    Alert.alert(
      'Rewrite Coming Soon',
      'The AI rewrite feature will transform your raw notes into a polished, professional progress note. This feature is coming in the next update.'
    );
  }, [noteText]);

  const handleBack = useCallback(() => {
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
  }, [noteText, onGoBack]);

  const hasText = noteText.trim().length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.inner}>
            {/* ── Header ─────────────────────────────────────────── */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={handleBack}
                style={styles.backButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>New Note</Text>
              <TouchableOpacity
                onPress={handleClear}
                style={styles.clearButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                disabled={!hasText}
              >
                <Text
                  style={[
                    styles.clearButtonText,
                    !hasText && styles.clearButtonTextDisabled,
                  ]}
                >
                  Clear
                </Text>
              </TouchableOpacity>
            </View>

            {/* ── Text Input Area ────────────────────────────────── */}
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
                autoFocus
              />
            </View>

            {/* ── Stats Bar ──────────────────────────────────────── */}
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

            {/* ── Bottom Action ───────────────────────────────────── */}
            <View style={styles.bottomBar}>
              <TouchableOpacity
                style={[
                  styles.rewriteButton,
                  !hasText && styles.rewriteButtonDisabled,
                ]}
                onPress={handleRewrite}
                activeOpacity={0.85}
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
});
