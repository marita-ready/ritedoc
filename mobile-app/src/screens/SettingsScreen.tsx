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
import {
  getCartridgeVersion,
  getActiveCartridge,
} from '../services/cartridgeConfig';
import { Colors, Typography, Spacing, Radii, Shadows } from '../theme';

// ─── Constants ───────────────────────────────────────────────────────
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
  const [cartridgeVersion, setCartridgeVersion] = useState<string>(getCartridgeVersion());

  // ── Load data on mount ──────────────────────────────────────────
  useEffect(() => {
    loadActivation().then(setActivation);
    loadModelInfo();
    getNotificationPermissionStatus().then((status) => {
      setNotificationStatus(status.charAt(0).toUpperCase() + status.slice(1));
    });
    getActiveCartridge()
      .then((c) => setCartridgeVersion(c.version))
      .catch(() => {});
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
      case 'ready':     return Colors.success;
      case 'loading':
      case 'inferring': return Colors.warning;
      case 'error':     return Colors.error;
      default:          return modelInfo.available ? Colors.primary : Colors.textTertiary;
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
              if (modelManager.isReady) {
                await modelManager.release();
              }
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
        <Text style={mono ? styles.infoValueMono : styles.infoValue}>{value}</Text>
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
              <Text style={[styles.infoValue, { color: modelStatusColor(modelInfo.status) }]}>
                {modelStatusLabel(modelInfo.status)}
              </Text>
            )}
            {renderInfoRow(
              'File size',
              modelInfo.sizeFormatted ?? (modelInfo.available ? 'Checking…' : 'Not installed')
            )}
            {renderInfoRow('Cartridge', `v${cartridgeVersion}`, true, true)}
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
              <Text style={styles.privacyTitle}>100% On-Device Processing</Text>
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

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // ── Header ──────────────────────────────────────────────────────
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
    paddingRight: Spacing.md,
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
  headerSpacer: {
    minWidth: 60,
  },

  // ── Scroll ──────────────────────────────────────────────────────
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Spacing.sm,
  },

  // ── Sections ────────────────────────────────────────────────────
  section: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: Typography.tracking.widest,
    marginBottom: Spacing.sm + 2,
  },
  sectionTitleDanger: {
    color: Colors.error,
  },
  sectionNote: {
    fontSize: Typography.size.base,
    color: Colors.textTertiary,
    marginTop: Spacing.sm,
    lineHeight: Typography.lineHeight.normal,
    paddingHorizontal: Spacing.xs,
  },

  // ── Card ────────────────────────────────────────────────────────
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  cardDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
  },

  // ── Brand row inside About card ──────────────────────────────────
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
  },
  brandBadge: {
    width: 44,
    height: 44,
    borderRadius: Radii.lg,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  brandBadgeText: {
    fontSize: Typography.size.bodyLg,
    fontWeight: Typography.weight.extrabold,
    color: Colors.white,
    letterSpacing: 0.5,
  },
  brandTextBlock: {
    flex: 1,
  },
  brandAppName: {
    fontSize: Typography.size.display,
    fontWeight: Typography.weight.extrabold,
    color: Colors.textPrimary,
    letterSpacing: Typography.tracking.tight,
  },
  brandTagline: {
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // ── Info rows ────────────────────────────────────────────────────
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    fontSize: Typography.size.body,
    color: Colors.textSecondary,
    fontWeight: Typography.weight.medium,
    flex: 1,
  },
  infoValue: {
    fontSize: Typography.size.body,
    color: Colors.textPrimary,
    fontWeight: Typography.weight.semibold,
    textAlign: 'right',
    flexShrink: 1,
    marginLeft: Spacing.md,
  },
  infoValueMono: {
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
    fontWeight: Typography.weight.semibold,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.5,
    textAlign: 'right',
    flexShrink: 1,
    marginLeft: Spacing.md,
  },
  linkText: {
    fontSize: Typography.size.body,
    color: Colors.primary,
    fontWeight: Typography.weight.semibold,
    textDecorationLine: 'underline',
  },

  // ── Status badge ─────────────────────────────────────────────────
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successLight,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.successBorder,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.statusGreen,
    marginRight: Spacing.xs + 2,
  },
  statusText: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: Colors.success,
  },

  // ── Privacy card ─────────────────────────────────────────────────
  privacyCard: {
    backgroundColor: Colors.primaryFaint,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.infoBorder,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  privacyIcon: {
    fontSize: 22,
    marginRight: Spacing.md,
    marginTop: 1,
  },
  privacyTextBlock: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: Typography.size.body,
    fontWeight: Typography.weight.bold,
    color: Colors.primaryDark,
    marginBottom: Spacing.xs + 2,
  },
  privacyBody: {
    fontSize: Typography.size.md,
    color: Colors.primaryDark,
    lineHeight: Typography.lineHeight.normal,
  },

  // ── Action buttons ───────────────────────────────────────────────
  actionButton: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.xs,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: Typography.size.body,
    fontWeight: Typography.weight.semibold,
    color: Colors.textPrimary,
  },
  actionHint: {
    fontSize: Typography.size.base,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: Typography.lineHeight.normal,
    paddingHorizontal: Spacing.xs,
  },

  // ── Danger zone ──────────────────────────────────────────────────
  dangerButton: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.errorLight,
  },
  dangerButtonText: {
    fontSize: Typography.size.body,
    fontWeight: Typography.weight.bold,
    color: Colors.error,
  },

  // ── Bottom padding ───────────────────────────────────────────────
  bottomPad: {
    height: 40,
  },
});
