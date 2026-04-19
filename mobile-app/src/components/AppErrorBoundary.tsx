/**
 * RiteDoc Mobile App — App-Level Error Boundary
 *
 * Catches unhandled React render errors and shows a user-friendly
 * fallback screen instead of a white crash screen.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Colors, Typography, Spacing, Radii, Shadows } from '../theme';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export default class AppErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message ?? 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[RiteDoc] Unhandled error:', error);
    console.error('[RiteDoc] Component stack:', info.componentStack);
  }

  handleRestart = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            {/* RD Logo Badge */}
            <View style={styles.logoBadge}>
              <Text style={styles.logoText}>RD</Text>
            </View>

            {/* Error icon */}
            <Text style={styles.errorIcon}>⚠️</Text>

            <Text style={styles.title}>Something Went Wrong</Text>
            <Text style={styles.body}>
              RiteDoc ran into an unexpected problem. Your data is safe — this
              is a display error only.
            </Text>

            <TouchableOpacity
              style={styles.button}
              onPress={this.handleRestart}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>

            <Text style={styles.hint}>
              If this keeps happening, try closing and reopening the app.
            </Text>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primaryFaint,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.section,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: Radii.xl,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    ...Shadows.logoBadge,
  },
  logoText: {
    fontSize: Typography.size.heading,
    fontWeight: Typography.weight.extrabold,
    color: Colors.white,
    letterSpacing: Typography.tracking.wider,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: Spacing.base,
  },
  title: {
    fontSize: Typography.size.display,
    fontWeight: Typography.weight.extrabold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  body: {
    fontSize: Typography.size.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.normal,
    marginBottom: Spacing.xxl,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxxl,
    marginBottom: Spacing.lg,
    ...Shadows.primaryButton,
  },
  buttonText: {
    color: Colors.white,
    fontSize: Typography.size.bodyLg,
    fontWeight: Typography.weight.bold,
  },
  hint: {
    fontSize: Typography.size.base,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.tight,
  },
});
