/**
 * RiteDoc Mobile App — Home / Dashboard Screen
 *
 * The main screen shown after the app has been successfully activated.
 * Displays a welcome message, activation status, and quick action buttons
 * for core app features.
 *
 * The app is fully offline at this point. The activation token and agency
 * name are available from local storage via loadActivation().
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loadActivation, ActivationData } from '../services/activation';
import { Colors, Typography, Spacing, Radii, Shadows } from '../theme';

interface Props {
  onNavigate: (screen: 'WriteNote' | 'SavedNotes' | 'Settings') => void;
}

export default function HomeScreen({ onNavigate }: Props) {
  const [activation, setActivation] = useState<ActivationData | null>(null);

  useEffect(() => {
    loadActivation().then(setActivation);
  }, []);

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoBadgeText}>RD</Text>
            </View>
            <View>
              <Text style={styles.appName}>RiteDoc</Text>
              <Text style={styles.tagline}>ReadyCompliant</Text>
            </View>
          </View>
        </View>

        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Welcome to RiteDoc</Text>
          {activation?.agencyName ? (
            <Text style={styles.welcomeSubtitle}>{activation.agencyName}</Text>
          ) : null}
        </View>

        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <View style={styles.statusTextContainer}>
              <Text style={styles.statusTitle}>App Activated</Text>
              <Text style={styles.statusSubtitle}>
                {activation?.activatedAt
                  ? `Since ${formatDate(activation.activatedAt)}`
                  : 'Ready to use'}
              </Text>
            </View>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>Active</Text>
          </View>
        </View>

        {/* Section Label */}
        <Text style={styles.sectionLabel}>Quick Actions</Text>

        {/* Primary Action — Write New Note */}
        <TouchableOpacity
          style={styles.primaryActionButton}
          onPress={() => onNavigate('WriteNote')}
          activeOpacity={0.85}
        >
          <View style={styles.primaryActionIconWrap}>
            <Text style={styles.primaryActionIconText}>✏️</Text>
          </View>
          <View style={styles.primaryActionContent}>
            <Text style={styles.primaryActionTitle}>Write New Note</Text>
            <Text style={styles.primaryActionSubtitle}>
              Start a new support note
            </Text>
          </View>
          <Text style={styles.actionChevron}>›</Text>
        </TouchableOpacity>

        {/* Secondary Actions */}
        <View style={styles.secondaryActionsRow}>
          <TouchableOpacity
            style={styles.secondaryActionButton}
            onPress={() => onNavigate('Settings')}
            activeOpacity={0.85}
          >
            <View style={styles.secondaryActionIconWrap}>
              <Text style={styles.secondaryActionIconText}>⚙️</Text>
            </View>
            <Text style={styles.secondaryActionTitle}>Settings</Text>
            <Text style={styles.secondaryActionSubtitle}>App preferences</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryActionButton}
            onPress={() => onNavigate('SavedNotes')}
            activeOpacity={0.85}
          >
            <View style={styles.secondaryActionIconWrap}>
              <Text style={styles.secondaryActionIconText}>📋</Text>
            </View>
            <Text style={styles.secondaryActionTitle}>Note History</Text>
            <Text style={styles.secondaryActionSubtitle}>View past notes</Text>
          </TouchableOpacity>
        </View>

        {/* Footer Privacy Banner */}
        <View style={styles.privacyBanner}>
          <Text style={styles.privacyIcon}>🔒</Text>
          <Text style={styles.privacyText}>
            All note rewriting happens on this device. Nothing is sent to the cloud.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxxl,
  },

  // ── Header ───────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xxl,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: Radii.lg,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    ...Shadows.logoBadge,
  },
  logoBadgeText: {
    color: Colors.white,
    fontSize: Typography.size.title,
    fontWeight: Typography.weight.extrabold,
    letterSpacing: Typography.tracking.wide,
  },
  appName: {
    fontSize: Typography.size.heading,
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
    letterSpacing: Typography.tracking.wide,
  },
  tagline: {
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    marginTop: 1,
    letterSpacing: Typography.tracking.wide,
  },

  // ── Welcome ──────────────────────────────────────────────────────────
  welcomeSection: {
    marginBottom: Spacing.xl,
  },
  welcomeTitle: {
    fontSize: Typography.size.hero,
    fontWeight: Typography.weight.extrabold,
    color: Colors.textPrimary,
    letterSpacing: Typography.tracking.tight,
    marginBottom: Spacing.xs,
  },
  welcomeSubtitle: {
    fontSize: Typography.size.bodyLg,
    color: Colors.textSecondary,
    fontWeight: Typography.weight.medium,
  },

  // ── Status Card ──────────────────────────────────────────────────────
  statusCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xxl,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.xs,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.statusGreen,
    marginRight: Spacing.md,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    fontSize: Typography.size.body,
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
  },
  statusSubtitle: {
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: Colors.successLight,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderWidth: 1,
    borderColor: Colors.successBorder,
  },
  statusBadgeText: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: Colors.success,
  },

  // ── Section Label ────────────────────────────────────────────────────
  sectionLabel: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: Typography.tracking.wider,
    marginBottom: Spacing.md,
  },

  // ── Primary Action Button ────────────────────────────────────────────
  primaryActionButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    ...Shadows.primaryButton,
  },
  primaryActionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: Radii.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.base,
  },
  primaryActionIconText: {
    fontSize: 22,
  },
  primaryActionContent: {
    flex: 1,
  },
  primaryActionTitle: {
    fontSize: Typography.size.subtitle,
    fontWeight: Typography.weight.bold,
    color: Colors.white,
    marginBottom: 2,
  },
  primaryActionSubtitle: {
    fontSize: Typography.size.md,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  actionChevron: {
    fontSize: 28,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: Typography.weight.regular,
  },

  // ── Secondary Actions ────────────────────────────────────────────────
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  secondaryActionButton: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.xs,
  },
  secondaryActionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: Radii.lg,
    backgroundColor: Colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  secondaryActionIconText: {
    fontSize: 22,
  },
  secondaryActionTitle: {
    fontSize: Typography.size.body,
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
    marginBottom: 2,
    textAlign: 'center',
  },
  secondaryActionSubtitle: {
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // ── Privacy Banner ───────────────────────────────────────────────────
  privacyBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.primaryFaint,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.infoBorder,
  },
  privacyIcon: {
    fontSize: 14,
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  privacyText: {
    flex: 1,
    fontSize: Typography.size.base,
    color: Colors.primary,
    lineHeight: Typography.lineHeight.snug,
    fontWeight: Typography.weight.medium,
  },
});
