/**
 * RiteDoc Mobile App — Settings Screen
 *
 * Full settings screen covering:
 *   - About (app name, version, build, product of ReadyCompliant)
 *   - Activation info (agency, date, code, status)
 *   - AI Model info (model name, status, file size)
 *   - Clear cache (temp data)
 *   - Privacy note (on-device processing)
 *   - External link to readycompliant.com
 *   - Reset activation (danger zone)
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Application from 'expo-application';

import {
  loadActivation,
  clearActivation,
  type ActivationData,
} from '../services/activation';
import { modelManager, type ModelStatus } from '../services/llm/modelManager';
import { getNotificationPermissionStatus } from '../services/pushNotifications';
import {
  isModelAvailable,
  getModelFileSize,
  formatFileSize,
} from '../services/llm/modelFiles';
import { MODEL_FILENAME } from '../services/llm/config';

// ─── Constants ───────────────────────────────────────────────────────
const BRAND_BLUE = '#2563EB';
const READYCOMPLIANT_URL = 'https://readycompliant.com';

// ─── Types ───────────────────────────────────────────────────────────
interface Props {
  onGoBack: () => void;
  onDeactivated: () => void;
}

interface ModelInfo {
  status: ModelStatus;
  available: boolean;
  sizeFormatted: string | null;
}

// ─── Component ───────────────────────────────────────────────────────
export default function SettingsScreen({ onGoBack, onDeactivated }: Props) {
  const [activation, setActivation] = useState<ActivationData | null>(null);
  const [modelInfo, setModelInfo] = useState<ModelInfo>({
    status: modelManager.status,
    available: false,
    sizeFormatted: null,
  });
  const [clearingCache, setClearingCache] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<string>('Checking…');

  // ── Load data on mount ──────────────────────────────────────────
  useEffect(() => {
    loadActivation().then(setActivation);
    loadModelInfo();
    getNotificationPermissionStatus().then(status => {
      setNotificationStatus(status.charAt(0).toUpperCase() + status.slice(1));
    });
  }, []);

  // ── Subscribe to model status changes ──────────────────────────
  useEffect(() => {
    const unsubscribe = modelManager.onStatusChange((status) => {
      setModelInfo((prev) => ({ ...prev, status }));
    });
    return unsubscribe;
  }, []);

  const loadModelInfo = async () => {
    const available = await isModelAvailable();
    const size = available ? await getModelFileSize() : null;
    setModelInfo({
      status: modelManager.status,
      available,
      sizeFormatted: size ? formatFileSize(size) : null,
    });
  };

  // ── Helpers ─────────────────────────────────────────────────────
  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  const appVersion = Application.nativeApplicationVersion ?? '1.0.0';
  const buildNumber = Application.nativeBuildVersion ?? '1';

  const modelStatusLabel = (status: ModelStatus): string => {
    switch (status) {
      case 'ready':     return 'Loaded';
      case 'loading':   return 'Loading…';
      case 'inferring': return 'Processing…';
      case 'error':     return 'Error';
      default:          return modelInfo.available ? 'Available' : 'Not installed';
    }
  };

  const modelStatusColor = (status: ModelStatus): string => {
    switch (status) {
      case 'ready':     return '#059669';
      case 'loading':
      case 'inferring': return '#D97706';
      case 'error':     return '#DC2626';
      default:          return modelInfo.available ? '#2563EB' : '#9CA3AF';
    }
  };

  // ── Handlers ────────────────────────────────────────────────────
  const handleOpenWebsite = useCallback(() => {
    Linking.openURL(READYCOMPLIANT_URL).catch(() => {
      Alert.alert('Could not open link', `Please visit ${READYCOMPLIANT_URL}`);
    });
  }, []);

  const handleClearCache = useCallback(async () => {
    Alert.alert(
      'Clear Cache',
      'This will clear any temporary data stored by the app. Your activation will not be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setClearingCache(true);
            try {
              // Release model from memory if loaded (it can be reloaded on next use)
              if (modelManager.isReady) {
                await modelManager.release();
              }
              // Reload model info to reflect new state
              await loadModelInfo();
            } catch (error) {
              console.warn('[Settings] Cache clear error:', error);
            } finally {
              setClearingCache(false);
            }
            Alert.alert(
              'Cache Cleared',
              'Temporary data has been cleared. The AI model will reload on your next rewrite.'
            );
          },
        },
      ]
    );
  }, []);

  const handleReset = useCallback(() => {
    Alert.alert(
      'Reset Activation',
      'This will remove the activation from this device. You will need a new access code to re-activate. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await clearActivation();
            onDeactivated();
          },
        },
      ]
    );
  }, [onDeactivated]);

  // ── Render helpers ───────────────────────────────────────────────
  const renderSectionHeader = (title: string, danger = false) => (
    <Text style={[styles.sectionTitle, danger && styles.sectionTitleDanger]}>
      {title}
    </Text>
  );

  const renderInfoRow = (
    label: string,
    value: React.ReactNode,
    isLast = false,
    mono = false
  ) => (
    <View style={[styles.infoRow, isLast && styles.infoRowLast]}>
      <Text style={styles.infoLabel}>{label}</Text>
      {typeof value === 'string' ? (
        <Text style={mono ? styles.infoValueMono : styles.infoValue}>
          {value}
        </Text>
      ) : (
        value
      )}
    </View>
  );

  // ── Main render ──────────────────────────────────────────────────
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
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── About ─────────────────────────────────────────────── */}
        <View style={styles.section}>
          {renderSectionHeader('About')}
          <View style={styles.card}>
            {/* Branding header inside card */}
            <View style={styles.brandRow}>
              <View style={styles.brandBadge}>
                <Text style={styles.brandBadgeText}>RD</Text>
              </View>
              <View style={styles.brandTextBlock}>
                <Text style={styles.brandAppName}>RiteDoc</Text>
                <Text style={styles.brandTagline}>A product of ReadyCompliant</Text>
              </View>
            </View>
            <View style={styles.cardDivider} />
            {renderInfoRow('Version', `${appVersion} (Build ${buildNumber})`)}
            {renderInfoRow('Platform', Platform.OS === 'ios' ? 'iOS' : 'Android')}
            {renderInfoRow(
              'Website',
              <TouchableOpacity onPress={handleOpenWebsite} activeOpacity={0.7}>
                <Text style={styles.linkText}>readycompliant.com ↗</Text>
              </TouchableOpacity>,
              true
            )}
          </View>
        </View>

        {/* ── Activation ────────────────────────────────────────── */}
        <View style={styles.section}>
          {renderSectionHeader('Activation')}
          <View style={styles.card}>
            {renderInfoRow(
              'Status',
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Active</Text>
              </View>
            )}
            {activation?.agencyName
              ? renderInfoRow('Agency', activation.agencyName)
              : null}
            {activation?.activatedAt
              ? renderInfoRow('Activated', formatDate(activation.activatedAt))
              : null}
            {activation?.codeUsed
              ? renderInfoRow('Code', activation.codeUsed, false, true)
              : null}
            {renderInfoRow('Notifications', notificationStatus, true)}
          </View>
        </View>

        {/* ── AI Model ──────────────────────────────────────────── */}
        <View style={styles.section}>
          {renderSectionHeader('AI Model')}
          <View style={styles.card}>
            {renderInfoRow('Model', 'Gemma 2B Instruct (Q4_K_M)')}
            {renderInfoRow('File', MODEL_FILENAME, false, true)}
            {renderInfoRow(
              'Status',
              <Text
                style={[
                  styles.infoValue,
                  { color: modelStatusColor(modelInfo.status) },
                ]}
              >
                {modelStatusLabel(modelInfo.status)}
              </Text>
            )}
            {renderInfoRow(
              'File size',
              modelInfo.sizeFormatted ?? (modelInfo.available ? 'Checking…' : 'Not installed'),
              true
            )}
          </View>
          <Text style={styles.sectionNote}>
            The AI model runs entirely on your device. No internet connection is
            required for note rewriting.
          </Text>
        </View>

        {/* ── Privacy ───────────────────────────────────────────── */}
        <View style={styles.section}>
          {renderSectionHeader('Privacy')}
          <View style={styles.privacyCard}>
            <Text style={styles.privacyIcon}>🔒</Text>
            <View style={styles.privacyTextBlock}>
              <Text style={styles.privacyTitle}>
                100% On-Device Processing
              </Text>
              <Text style={styles.privacyBody}>
                All note rewriting happens locally on your device using an
                on-device AI model. Nothing is sent to the cloud. Your notes
                never leave your phone.
              </Text>
            </View>
          </View>
        </View>

        {/* ── Storage ───────────────────────────────────────────── */}
        <View style={styles.section}>
          {renderSectionHeader('Storage')}
          <TouchableOpacity
            style={[styles.actionButton, clearingCache && styles.actionButtonDisabled]}
            onPress={handleClearCache}
            activeOpacity={0.8}
            disabled={clearingCache}
          >
            <Text style={styles.actionButtonText}>
              {clearingCache ? 'Clearing…' : 'Clear Cache'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.actionHint}>
            Releases the AI model from memory. It will reload automatically on
            your next rewrite. Your activation is not affected.
          </Text>
        </View>

        {/* ── Danger Zone ───────────────────────────────────────── */}
        <View style={styles.section}>
          {renderSectionHeader('Danger Zone', true)}
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleReset}
            activeOpacity={0.8}
          >
            <Text style={styles.dangerButtonText}>Reset Activation</Text>
          </TouchableOpacity>
          <Text style={styles.actionHint}>
            Removes the activation from this device. You will need a new access
            code to re-activate.
          </Text>
        </View>

        {/* Bottom padding */}
        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // ── Header ──────────────────────────────────────────────────────
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
    paddingRight: 12,
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
  headerSpacer: {
    minWidth: 60,
  },

  // ── Scroll ──────────────────────────────────────────────────────
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
  },

  // ── Sections ────────────────────────────────────────────────────
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  sectionTitleDanger: {
    color: '#DC2626',
  },
  sectionNote: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 8,
    lineHeight: 18,
    paddingHorizontal: 4,
  },

  // ── Card ────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 0,
  },

  // ── Brand row inside About card ──────────────────────────────────
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  brandBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: BRAND_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  brandBadgeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  brandTextBlock: {
    flex: 1,
  },
  brandAppName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
  },
  brandTagline: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },

  // ── Info rows ────────────────────────────────────────────────────
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
    flex: 1,
  },
  infoValue: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
    textAlign: 'right',
    flexShrink: 1,
    marginLeft: 12,
  },
  infoValueMono: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.5,
    textAlign: 'right',
    flexShrink: 1,
    marginLeft: 12,
  },
  linkText: {
    fontSize: 15,
    color: BRAND_BLUE,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  // ── Status badge ─────────────────────────────────────────────────
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },

  // ── Privacy card ─────────────────────────────────────────────────
  privacyCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  privacyIcon: {
    fontSize: 22,
    marginRight: 14,
    marginTop: 1,
  },
  privacyTextBlock: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1D4ED8',
    marginBottom: 6,
  },
  privacyBody: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },

  // ── Action buttons ───────────────────────────────────────────────
  actionButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  actionHint: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
    paddingHorizontal: 4,
  },

  // ── Danger zone ──────────────────────────────────────────────────
  dangerButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
  },
  dangerButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
  },

  // ── Bottom padding ───────────────────────────────────────────────
  bottomPad: {
    height: 40,
  },
});
