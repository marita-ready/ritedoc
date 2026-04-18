/**
 * RiteDoc Mobile App — Home Screen
 *
 * The main screen shown after the app has been successfully activated.
 * This is a placeholder — replace with the actual RiteDoc app content.
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
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { loadActivation, clearActivation, ActivationData } from '../services/activation';

interface Props {
  onDeactivated?: () => void;
}

export default function HomeScreen({ onDeactivated }: Props) {
  const [activation, setActivation] = useState<ActivationData | null>(null);

  useEffect(() => {
    loadActivation().then(setActivation);
  }, []);

  const handleReset = () => {
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
            onDeactivated?.();
          },
        },
      ]
    );
  };

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
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>RD</Text>
        </View>
        <Text style={styles.appName}>RiteDoc</Text>
      </View>

      {/* Activation info */}
      {activation ? (
        <View style={styles.activationCard}>
          <View style={styles.activationBadge}>
            <Text style={styles.activationBadgeText}>✓ Activated</Text>
          </View>
          <Text style={styles.agencyName}>{activation.agencyName}</Text>
          <Text style={styles.activationDate}>
            Activated {formatDate(activation.activatedAt)}
          </Text>
        </View>
      ) : null}

      {/* Main content placeholder */}
      <View style={styles.content}>
        <Text style={styles.contentTitle}>Welcome to RiteDoc</Text>
        <Text style={styles.contentText}>
          Your app is activated and ready to use.{'\n'}
          Replace this screen with the actual RiteDoc app content.
        </Text>
      </View>

      {/* Debug/Reset — hide in production */}
      <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
        <Text style={styles.resetButtonText}>Reset Activation (Debug)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#1a56db',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  appName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  activationCard: {
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  activationBadge: {
    backgroundColor: '#10b981',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  activationBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  agencyName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#065f46',
    marginBottom: 2,
  },
  activationDate: {
    fontSize: 13,
    color: '#059669',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  contentText: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  resetButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  resetButtonText: {
    fontSize: 13,
    color: '#9ca3af',
    textDecorationLine: 'underline',
  },
});
