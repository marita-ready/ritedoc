/**
 * RiteDoc Mobile App — Shared Design Tokens
 *
 * Single source of truth for all visual constants used across screens
 * and components. Import from this file instead of hardcoding values.
 *
 * Usage:
 *   import { Colors, Typography, Spacing, Radii, Shadows } from '../theme';
 */

import { Platform, StyleSheet } from 'react-native';

// ─── Colour Palette ──────────────────────────────────────────────────

export const Colors = {
  // Brand
  primary: '#2563EB',        // RiteDoc blue — buttons, links, active states
  primaryDark: '#1D4ED8',    // Pressed/hover state for primary
  primaryLight: '#DBEAFE',   // Light blue tint — backgrounds, borders
  primaryFaint: '#EFF6FF',   // Very light blue — info cards, footer banners

  // Neutrals
  white: '#FFFFFF',
  background: '#F8FAFC',     // App background (off-white)
  surface: '#FFFFFF',        // Card / panel background
  border: '#E5E7EB',         // Default border
  borderLight: '#F3F4F6',    // Subtle dividers

  // Text
  textPrimary: '#111827',    // Headings, body text
  textSecondary: '#6B7280',  // Subtitles, hints, labels
  textTertiary: '#9CA3AF',   // Placeholders, disabled text
  textMuted: '#D1D5DB',      // Very faint text

  // Semantic — Success
  success: '#059669',
  successDark: '#065F46',
  successLight: '#ECFDF5',
  successBorder: '#A7F3D0',
  successFaint: '#D1FAE5',

  // Semantic — Error / Danger
  error: '#EF4444',
  errorDark: '#B91C1C',
  errorLight: '#FEF2F2',
  errorBorder: '#FECACA',

  // Semantic — Warning / Amber
  warning: '#F59E0B',
  warningDark: '#92400E',
  warningLight: '#FEF3C7',
  warningBorder: '#FDE68A',
  warningFaint: '#FFFBEB',

  // Semantic — Info (blue alias)
  info: '#2563EB',
  infoLight: '#EFF6FF',
  infoBorder: '#BFDBFE',

  // Status
  statusGreen: '#10B981',    // Online / active dot
  statusAmber: '#F59E0B',    // Warning / offline dot

  // Tab bar
  tabActive: '#2563EB',
  tabInactive: '#9CA3AF',
  tabBackground: '#FFFFFF',
  tabBorder: '#E5E7EB',

  // Disabled
  disabled: '#93C5FD',       // Disabled primary button
  disabledText: '#D1D5DB',
} as const;

// ─── Typography ──────────────────────────────────────────────────────

export const Typography = {
  // Font sizes
  size: {
    xs: 11,
    sm: 12,
    base: 13,
    md: 14,
    body: 15,
    bodyLg: 16,
    title: 17,
    subtitle: 18,
    heading: 20,
    display: 24,
    hero: 28,
  },

  // Font weights (as string literals for React Native)
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },

  // Line heights
  lineHeight: {
    tight: 18,
    snug: 20,
    normal: 22,
    relaxed: 24,
    loose: 26,
  },

  // Letter spacing
  tracking: {
    tight: -0.3,
    normal: 0,
    wide: 0.3,
    wider: 0.5,
    widest: 1,
    code: 2,
  },
} as const;

// ─── Spacing ─────────────────────────────────────────────────────────

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  section: 48,
} as const;

// ─── Border Radii ────────────────────────────────────────────────────

export const Radii = {
  xs: 4,
  sm: 6,
  md: 8,
  base: 10,
  lg: 12,
  xl: 14,
  xxl: 16,
  pill: 100,
  circle: 9999,
} as const;

// ─── Shadows ─────────────────────────────────────────────────────────

export const Shadows = {
  /** Barely-there lift — cards on white backgrounds */
  xs: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
    },
    android: { elevation: 1 },
    default: {},
  }),

  /** Standard card shadow */
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.07,
      shadowRadius: 6,
    },
    android: { elevation: 2 },
    default: {},
  }),

  /** Elevated card */
  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.10,
      shadowRadius: 10,
    },
    android: { elevation: 4 },
    default: {},
  }),

  /** Floating elements (modals, FABs) */
  lg: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.14,
      shadowRadius: 14,
    },
    android: { elevation: 8 },
    default: {},
  }),

  /** Primary button glow — uses brand colour */
  primaryButton: Platform.select({
    ios: {
      shadowColor: '#2563EB',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.28,
      shadowRadius: 8,
    },
    android: { elevation: 6 },
    default: {},
  }),

  /** Logo / RD badge glow */
  logoBadge: Platform.select({
    ios: {
      shadowColor: '#2563EB',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
    },
    android: { elevation: 4 },
    default: {},
  }),
} as const;

// ─── Component Presets ───────────────────────────────────────────────

/**
 * Pre-built StyleSheet-compatible style objects for common components.
 * These are plain objects (not StyleSheet.create) so they can be spread
 * into StyleSheet.create() calls in individual files.
 */

export const ComponentStyles = {
  /** Standard app screen background */
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  /** White card with border and shadow */
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },

  /** Elevated white card (modals, feature cards) */
  cardElevated: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.xxl,
    padding: Spacing.xl,
    ...Shadows.md,
  },

  /** Standard screen header bar */
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },

  /** Header title text */
  headerTitle: {
    fontSize: Typography.size.title,
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
  },

  /** Back / nav button text */
  navButtonText: {
    fontSize: Typography.size.bodyLg,
    color: Colors.primary,
    fontWeight: Typography.weight.semibold,
  },

  /** Primary action button */
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.xl,
    paddingVertical: Spacing.base,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    ...Shadows.primaryButton,
  },

  /** Primary button text */
  primaryButtonText: {
    color: Colors.white,
    fontSize: Typography.size.bodyLg,
    fontWeight: Typography.weight.bold,
    letterSpacing: Typography.tracking.wide,
  },

  /** Disabled primary button */
  primaryButtonDisabled: {
    backgroundColor: Colors.disabled,
    ...(Platform.OS === 'ios'
      ? { shadowOpacity: 0 }
      : { elevation: 0 }),
  },

  /** Secondary outlined button */
  secondaryButton: {
    backgroundColor: Colors.primaryFaint,
    borderRadius: Radii.xl,
    paddingVertical: Spacing.md,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },

  /** Secondary button text */
  secondaryButtonText: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
    color: Colors.primary,
  },

  /** Ghost / outline button */
  outlineButton: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  /** Outline button text */
  outlineButtonText: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
    color: Colors.textPrimary,
  },

  /** Danger / destructive button */
  dangerButton: {
    backgroundColor: Colors.errorLight,
    borderRadius: Radii.xl,
    paddingVertical: Spacing.base,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
  },

  /** Danger button text */
  dangerButtonText: {
    color: Colors.error,
    fontSize: Typography.size.bodyLg,
    fontWeight: Typography.weight.bold,
  },

  /** RD logo badge (small — 44×44, used in headers) */
  logoBadgeSmall: {
    width: 44,
    height: 44,
    borderRadius: Radii.lg,
    backgroundColor: Colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    ...Shadows.logoBadge,
  },

  /** RD logo badge (large — 72×72, used on splash/auth screens) */
  logoBadgeLarge: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    ...Shadows.logoBadge,
  },

  /** RD text inside the small badge */
  logoBadgeTextSmall: {
    color: Colors.white,
    fontSize: Typography.size.title,
    fontWeight: Typography.weight.extrabold,
    letterSpacing: Typography.tracking.wide,
  },

  /** RD text inside the large badge */
  logoBadgeTextLarge: {
    color: Colors.white,
    fontSize: Typography.size.hero,
    fontWeight: Typography.weight.extrabold,
    letterSpacing: Typography.tracking.widest,
  },

  /** Section header label (uppercase caps) */
  sectionLabel: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: Colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: Typography.tracking.wider,
    marginBottom: Spacing.sm,
  },

  /** Info banner — blue tint */
  infoBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.primaryFaint,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.infoBorder,
  },

  /** Success banner — green tint */
  successBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.successLight,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.successBorder,
  },

  /** Warning banner — amber tint */
  warningBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.warningLight,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.warningBorder,
  },
} as const;

// ─── Convenience re-exports ──────────────────────────────────────────

/** Flat StyleSheet for common reusable styles (avoids re-creating) */
export const GlobalStyles = StyleSheet.create({
  flex1: { flex: 1 },
  row: { flexDirection: 'row' },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  screenBg: { flex: 1, backgroundColor: Colors.background },
  surfaceBg: { backgroundColor: Colors.surface },
});
