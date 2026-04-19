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

const BRAND_BLUE = '#2563EB';

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
        <ActivityIndicator size="large" color={BRAND_BLUE} />
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
    padding: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 200,
    maxWidth: 300,
  },
  message: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
  },
  subMessage: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
