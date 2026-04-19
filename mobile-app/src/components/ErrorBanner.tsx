/**
 * RiteDoc Mobile App — Error Banner Component
 *
 * A dismissible error message bar that appears at the top of a screen.
 * User-friendly messages only — no technical stack traces.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';

interface Props {
  /** The error message to display. Pass null/undefined to hide. */
  message: string | null | undefined;
  /** Called when the user taps the dismiss button */
  onDismiss: () => void;
  /** Optional action button label */
  actionLabel?: string;
  /** Called when the user taps the optional action button */
  onAction?: () => void;
  /** Auto-dismiss after this many milliseconds (0 = never) */
  autoDismissMs?: number;
}

export default function ErrorBanner({
  message,
  onDismiss,
  actionLabel,
  onAction,
  autoDismissMs = 0,
}: Props) {
  const animation = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isVisible = !!message;

  useEffect(() => {
    Animated.timing(animation, {
      toValue: isVisible ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();

    if (isVisible && autoDismissMs > 0) {
      timerRef.current = setTimeout(onDismiss, autoDismissMs);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isVisible, autoDismissMs, onDismiss, animation]);

  if (!isVisible) return null;

  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, 0],
  });

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY }], opacity: animation }]}
    >
      <View style={styles.banner}>
        <Text style={styles.icon}>⚠</Text>
        <Text style={styles.message} numberOfLines={3}>
          {message}
        </Text>
        <View style={styles.actions}>
          {actionLabel && onAction ? (
            <TouchableOpacity onPress={onAction} style={styles.actionButton}>
              <Text style={styles.actionButtonText}>{actionLabel}</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            onPress={onDismiss}
            style={styles.dismissButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.dismissText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 6,
    zIndex: 1000,
  },
  banner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  icon: {
    fontSize: 15,
    color: '#DC2626',
    marginRight: 10,
    flexShrink: 0,
  },
  message: {
    flex: 1,
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '600',
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    flexShrink: 0,
  },
  actionButton: {
    backgroundColor: '#DC2626',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  dismissButton: {
    padding: 2,
  },
  dismissText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '600',
  },
});
