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
    return 'That code doesn\'t look right. Double-check the code and try again.';
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
    // Strip everything except alphanumeric and hyphens, uppercase
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

    // Basic format check: MAC-XXXX-XXXX-XXXX
    if (!/^MAC-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(trimmedCode)) {
      setError('Invalid code format. Codes look like: MAC-XXXX-XXXX-XXXX');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const deviceId = await getDeviceId();
      const result = await verifyAccessCode(trimmedCode, deviceId);

      // Save activation data locally for offline use
      await saveActivation({
        activationToken: result.activation_token,
        agencyName: result.agency_name,
        activatedAt: new Date().toISOString(),
        codeUsed: trimmedCode,
      });

      // Notify parent — app is now activated
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
      <StatusBar style="light" />

      {/* Error Banner */}
      <ErrorBanner
        message={error}
        onDismiss={() => setError(null)}
        autoDismissMs={0}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>RD</Text>
          </View>
          <Text style={styles.appName}>RiteDoc</Text>
          <Text style={styles.tagline}>ReadyCompliant</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Activate Your App</Text>
          <Text style={styles.cardSubtitle}>
            Enter the access code provided by your agency to activate the RiteDoc app on this device.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Access Code</Text>
            <TextInput
              ref={inputRef}
              style={[styles.codeInput, error ? styles.codeInputError : null]}
              value={code}
              onChangeText={handleCodeChange}
              placeholder="MAC-XXXX-XXXX-XXXX"
              placeholderTextColor="#9ca3af"
              autoCapitalize="characters"
              autoCorrect={false}
              autoComplete="off"
              spellCheck={false}
              keyboardType="default"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              editable={!loading}
              maxLength={16} // MAC-XXXX-XXXX-XXXX = 16 chars
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
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Activate App</Text>
            )}
          </TouchableOpacity>

          {loading ? (
            <Text style={styles.loadingHint}>Verifying your code online…</Text>
          ) : null}
        </View>

        {/* Info footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Each access code can only be used once.{'\n'}
            After activation, the app works fully offline.
          </Text>
          <Text style={styles.footerContact}>
            Need a code? Contact your agency administrator.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const BRAND_BLUE = '#1a56db';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4ff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
  },

  // Header / Logo
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: BRAND_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: BRAND_BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
    letterSpacing: 0.3,
  },

  // Card
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 24,
  },

  // Input
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  codeInput: {
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: 2,
    textAlign: 'center',
    backgroundColor: '#f9fafb',
  },
  codeInputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },

  // Submit button
  submitButton: {
    backgroundColor: BRAND_BLUE,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BRAND_BLUE,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#93c5fd',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  loadingHint: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 13,
    marginTop: 12,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  footerText: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  footerContact: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: '500',
  },
});
