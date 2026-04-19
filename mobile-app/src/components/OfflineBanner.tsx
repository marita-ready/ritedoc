/**
 * RiteDoc Mobile App — Offline Mode Indicator
 *
 * A small banner that appears at the top of the screen when the device
 * is offline. Since the app works fully offline for note rewriting,
 * this is informational only.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';

const OFFLINE_COLOR = '#F59E0B'; // Amber/Orange for informational warning

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [animation] = useState(new Animated.Value(0));

  useEffect(() => {
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener(state => {
      const offline = state.isConnected === false;
      setIsOffline(offline);

      // Animate banner visibility
      Animated.timing(animation, {
        toValue: offline ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });

    return () => unsubscribe();
  }, [animation]);

  // If online and animation finished, don't render anything
  if (!isOffline && animation.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) === (0 as any)) {
    // We still want to render for the animation to play out, 
    // but the height interpolation handles the visual hiding.
  }

  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, 0], // Slide down from top
  });

  const opacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <Animated.View 
      style={[
        styles.container, 
        { transform: [{ translateY }], opacity }
      ]}
    >
      <View style={styles.banner}>
        <Text style={styles.icon}>📡</Text>
        <Text style={styles.text}>
          You're offline — notes still rewrite normally
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 0, // Adjust for status bar/safe area
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: 16,
  },
  banner: {
    backgroundColor: OFFLINE_COLOR,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  icon: {
    fontSize: 14,
    marginRight: 8,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});
