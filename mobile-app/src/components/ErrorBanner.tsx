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
import { Colors, Typography, Spacing, Radii, Shadows } from '../theme';

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
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs + 2,
    zIndex: 1000,
  },
  banner: {
    backgroundColor: Colors.errorLight,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.sm,
  },
  icon: {
    fontSize: Typography.size.body,
    color: Colors.error,
    marginRight: Spacing.sm + 2,
    flexShrink: 0,
  },
  message: {
    flex: 1,
    fontSize: Typography.size.base,
    color: Colors.error,
    fontWeight: Typography.weight.semibold,
    lineHeight: Typography.lineHeight.tight,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Spacing.sm,
    flexShrink: 0,
  },
  actionButton: {
    backgroundColor: Colors.error,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    marginRight: Spacing.sm,
  },
  actionButtonText: {
    color: Colors.white,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
  },
  dismissButton: {
    padding: 2,
  },
  dismissText: {
    fontSize: Typography.size.md,
    color: Colors.textTertiary,
    fontWeight: Typography.weight.semibold,
  },
});
