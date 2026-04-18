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
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loadActivation, ActivationData } from '../services/activation';

const BRAND_BLUE = '#2563EB';
const BRAND_BLUE_DARK = '#1D4ED8';

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
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>RD</Text>
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
            <Text style={styles.welcomeSubtitle}>
              {activation.agencyName}
            </Text>
          ) : null}
        </View>

        {/* Status Indicator */}
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

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        {/* Primary Action — Write New Note */}
        <TouchableOpacity
          style={styles.primaryActionButton}
          onPress={() => onNavigate('WriteNote')}
          activeOpacity={0.85}
        >
          <View style={styles.primaryActionIcon}>
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
            onPress={() => onNavigate('SavedNotes')}
            activeOpacity={0.85}
          >
            <View style={styles.secondaryActionIcon}>
              <Text style={styles.secondaryActionIconText}>📋</Text>
            </View>
            <Text style={styles.secondaryActionTitle}>Saved Notes</Text>
            <Text style={styles.secondaryActionSubtitle}>
              View &amp; manage
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryActionButton}
            onPress={() => onNavigate('Settings')}
            activeOpacity={0.85}
          >
            <View style={styles.secondaryActionIcon}>
              <Text style={styles.secondaryActionIconText}>⚙️</Text>
            </View>
            <Text style={styles.secondaryActionTitle}>Settings</Text>
            <Text style={styles.secondaryActionSubtitle}>
              App preferences
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer Info */}
        <View style={styles.footerInfo}>
          <Text style={styles.footerInfoText}>
            This app works fully offline. Your notes are stored securely on this device.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: BRAND_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: BRAND_BLUE,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  appName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 0.3,
  },
  tagline: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
    letterSpacing: 0.2,
  },

  // Welcome
  welcomeSection: {
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },

  // Status Card
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    backgroundColor: '#10B981',
    marginRight: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 2,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  statusSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },

  // Section Title
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Primary Action Button
  primaryActionButton: {
    backgroundColor: BRAND_BLUE,
    borderRadius: 14,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: BRAND_BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  primaryActionIconText: {
    fontSize: 22,
  },
  primaryActionContent: {
    flex: 1,
  },
  primaryActionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  primaryActionSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  actionChevron: {
    fontSize: 28,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '300',
  },

  // Secondary Actions
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  secondaryActionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  secondaryActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  secondaryActionIconText: {
    fontSize: 22,
  },
  secondaryActionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
    textAlign: 'center',
  },
  secondaryActionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },

  // Footer Info
  footerInfo: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  footerInfoText: {
    fontSize: 13,
    color: '#3B82F6',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },
});
