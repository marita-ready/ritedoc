/**
 * RiteDoc Mobile App — Loading Overlay Component
 *
 * Full-screen loading indicator with optional message text.
 * Uses RiteDoc blue #2563EB branding.
 */

import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Modal,
} from 'react-native';
import { Colors, Typography, Spacing, Radii, Shadows } from '../theme';

interface Props {
  /** Whether the overlay is visible */
  visible: boolean;
  /** Optional message to display below the spinner */
  message?: string;
  /** Optional sub-message (smaller text) */
  subMessage?: string;
  /** Whether to render as a modal (blocks interaction) or inline */
  modal?: boolean;
}

export default function LoadingOverlay({
  visible,
  message,
  subMessage,
  modal = true,
}: Props) {
  if (!visible) return null;

  const content = (
    <View style={styles.container}>
      <View style={styles.card}>
        <ActivityIndicator size="large" color={Colors.primary} />
        {message ? (
          <Text style={styles.message}>{message}</Text>
        ) : null}
        {subMessage ? (
          <Text style={styles.subMessage}>{subMessage}</Text>
        ) : null}
      </View>
    </View>
  );

  if (modal) {
    return (
      <Modal
        transparent
        animationType="fade"
        visible={visible}
        statusBarTranslucent
      >
        {content}
      </Modal>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.xxl,
    paddingVertical: Spacing.xl + 4,
    paddingHorizontal: Spacing.xxl,
    alignItems: 'center',
    ...Shadows.lg,
    minWidth: 200,
    maxWidth: 300,
  },
  message: {
    fontSize: Typography.size.bodyLg,
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: Spacing.base,
    lineHeight: Typography.lineHeight.normal,
  },
  subMessage: {
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs + 2,
    lineHeight: Typography.lineHeight.tight,
  },
});
