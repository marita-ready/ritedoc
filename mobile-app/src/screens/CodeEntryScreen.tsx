/**
 * RiteDoc Mobile App — Code Entry Screen
 *
 * The first screen a support worker sees when the app is not yet activated.
 * They enter their one-time access code (MAC-XXXX-XXXX-XXXX) here.
 *
 * Flow:
 *   1. Worker enters code
 *   2. App makes ONE online call to POST /api/mobile/verify-code
 *   3. On success: saves activation token locally → navigates to Home
 *   4. On failure: shows clear error message, allows retry
 *   5. After activation: app works fully offline
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { verifyAccessCode } from '../services/api';
import { saveActivation } from '../services/activation';
import { getDeviceId } from '../utils/device';
import ErrorBanner from '../components/ErrorBanner';
import { Colors, Typography, Spacing, Radii, Shadows } from '../theme';

interface Props {
  onActivated: () => void;
}

/**
 * Map raw errors to user-friendly messages.
 */
function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (lower.includes('network') || lower.includes('fetch') || lower.includes('timeout')) {
    return 'No internet connection. Please check your Wi-Fi or mobile data and try again.';
  }
  if (lower.includes('invalid') || lower.includes('not found') || lower.includes('404')) {
    return "That code doesn't look right. Double-check the code and try again.";
  }
  if (lower.includes('already') || lower.includes('used') || lower.includes('redeemed')) {
    return 'This code has already been used. Contact your agency administrator for a new code.';
  }
  if (lower.includes('expired')) {
    return 'This code has expired. Contact your agency administrator for a new code.';
  }
  if (lower.includes('500') || lower.includes('server')) {
    return 'The server is temporarily unavailable. Please try again in a moment.';
  }
  return 'Verification failed. Please check your connection and try again.';
}

export default function CodeEntryScreen({ onActivated }: Props) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  // Format the code as the user types: MAC-XXXX-XXXX-XXXX
  const handleCodeChange = (text: string) => {
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    setCode(cleaned);
    setError(null);
  };

  const handleSubmit = async () => {
    const trimmedCode = code.trim();

    if (!trimmedCode) {
      setError('Please enter your access code.');
      return;
    }

    if (!/^MAC-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(trimmedCode)) {
      setError('Invalid code format. Codes look like: MAC-XXXX-XXXX-XXXX');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const deviceId = await getDeviceId();
      const result = await verifyAccessCode(trimmedCode, deviceId);

      await saveActivation({
        activationToken: result.activation_token,
        agencyName: result.agency_name,
        activatedAt: new Date().toISOString(),
        codeUsed: trimmedCode,
      });

      onActivated();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="dark" />

      {/* Error Banner */}
      <ErrorBanner
        message={error}
        onDismiss={() => setError(null)}
        autoDismissMs={0}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header / Logo */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>RD</Text>
          </View>
          <Text style={styles.appName}>RiteDoc</Text>
          <Text style={styles.tagline}>A product of ReadyCompliant</Text>
        </View>

        {/* Activation Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Activate Your App</Text>
          <Text style={styles.cardSubtitle}>
            Enter the access code provided by your agency to activate RiteDoc on this device.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Access Code</Text>
            <TextInput
              ref={inputRef}
              style={[styles.codeInput, error ? styles.codeInputError : null]}
              value={code}
              onChangeText={handleCodeChange}
              placeholder="MAC-XXXX-XXXX-XXXX"
              placeholderTextColor={Colors.textTertiary}
              autoCapitalize="characters"
              autoCorrect={false}
              autoComplete="off"
              spellCheck={false}
              keyboardType="default"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              editable={!loading}
              maxLength={16}
            />
          </View>

          {/* Submit button */}
          <TouchableOpacity
            style={[styles.submitButton, loading ? styles.submitButtonDisabled : null]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Activate App</Text>
            )}
          </TouchableOpacity>

          {loading ? (
            <Text style={styles.loadingHint}>Verifying your code online…</Text>
          ) : null}
        </View>

        {/* Privacy / info banner */}
        <View style={styles.privacyBanner}>
          <Text style={styles.privacyIcon}>🔒</Text>
          <Text style={styles.privacyText}>
            Each code can only be used once. After activation, the app works fully offline — your notes never leave your device.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerContact}>
            Need a code? Contact your agency administrator.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primaryFaint,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: 64,
    paddingBottom: Spacing.xxxl,
    alignItems: 'center',
  },

  // ── Header / Logo ────────────────────────────────────────────────────
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadows.logoBadge,
  },
  logoBadgeText: {
    color: Colors.white,
    fontSize: Typography.size.hero,
    fontWeight: Typography.weight.extrabold,
    letterSpacing: Typography.tracking.widest,
  },
  appName: {
    fontSize: Typography.size.hero,
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
    letterSpacing: Typography.tracking.wide,
    marginBottom: Spacing.xs,
  },
  tagline: {
    fontSize: Typography.size.md,
    color: Colors.textSecondary,
    letterSpacing: Typography.tracking.wide,
  },

  // ── Card ─────────────────────────────────────────────────────────────
  card: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radii.xxl,
    padding: 28,
    marginBottom: Spacing.base,
    ...Shadows.md,
  },
  cardTitle: {
    fontSize: Typography.size.heading,
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  cardSubtitle: {
    fontSize: Typography.size.md,
    color: Colors.textSecondary,
    lineHeight: Typography.lineHeight.snug,
    marginBottom: Spacing.xl,
  },

  // ── Input ────────────────────────────────────────────────────────────
  inputContainer: {
    marginBottom: Spacing.base,
  },
  inputLabel: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: Typography.tracking.wider,
  },
  codeInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radii.base,
    paddingHorizontal: Spacing.base,
    paddingVertical: 14,
    fontSize: 20,
    fontWeight: Typography.weight.semibold,
    color: Colors.textPrimary,
    letterSpacing: Typography.tracking.code,
    textAlign: 'center',
    backgroundColor: '#F9FAFB',
  },
  codeInputError: {
    borderColor: Colors.error,
    backgroundColor: Colors.errorLight,
  },

  // ── Submit button ────────────────────────────────────────────────────
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.base,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.primaryButton,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.disabled,
    ...(Platform.OS === 'ios' ? { shadowOpacity: 0 } : { elevation: 0 }),
  },
  submitButtonText: {
    color: Colors.white,
    fontSize: Typography.size.bodyLg,
    fontWeight: Typography.weight.bold,
    letterSpacing: Typography.tracking.wide,
  },
  loadingHint: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: Typography.size.base,
    marginTop: Spacing.md,
  },

  // ── Privacy banner ───────────────────────────────────────────────────
  privacyBanner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.primaryFaint,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.infoBorder,
    marginBottom: Spacing.base,
  },
  privacyIcon: {
    fontSize: 16,
    marginRight: Spacing.sm,
    marginTop: 1,
  },
  privacyText: {
    flex: 1,
    fontSize: Typography.size.base,
    color: Colors.primary,
    lineHeight: Typography.lineHeight.snug,
    fontWeight: Typography.weight.medium,
  },

  // ── Footer ───────────────────────────────────────────────────────────
  footer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
  },
  footerContact: {
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: Typography.weight.medium,
  },
});
