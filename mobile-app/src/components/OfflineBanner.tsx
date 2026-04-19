/**
 * RiteDoc Mobile App — Offline Mode Indicator
 *
 * A small banner that appears at the top of the screen when the device
 * is offline. Since the app works fully offline for note rewriting,
 * this is informational only — not a warning.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Colors, Typography, Spacing, Radii, Shadows } from '../theme';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [animation] = useState(new Animated.Value(0));

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = state.isConnected === false;
      setIsOffline(offline);

      Animated.timing(animation, {
        toValue: offline ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });

    return () => unsubscribe();
  }, [animation]);

  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, 0],
  });

  const opacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  if (!isOffline) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }], opacity }]}>
      <View style={styles.banner}>
        <Text style={styles.icon}>📡</Text>
        <Text style={styles.text}>You're offline — notes still rewrite normally</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: Spacing.base,
  },
  banner: {
    backgroundColor: Colors.warning,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.pill,
    ...Shadows.md,
  },
  icon: {
    fontSize: Typography.size.md,
    marginRight: Spacing.sm,
  },
  text: {
    color: Colors.white,
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    textAlign: 'center',
  },
});
