import React from 'react';
import { View, ViewStyle, StyleProp, Platform, useColorScheme } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView } from 'expo-glass-effect';
import { hasLiquidGlassSupport, hasBlurSupport } from '../../utils/capabilities';
import { useUnistyles } from 'react-native-unistyles';

interface AdaptiveCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Enable touch interaction feedback (iOS 18+ only) */
  isInteractive?: boolean;
  /** Use blur on pre-iOS 18 (true) or solid color (false). When false, also skips GlassView. */
  useBlurFallback?: boolean;
  /** Custom fallback background color */
  fallbackBackgroundColor?: string;
}

/**
 * AdaptiveCard - A card component that uses:
 * - Liquid Glass (GlassView) on iOS 18+ (unless useBlurFallback is false)
 * - BlurView on iOS 10-17 (unless useBlurFallback is false)
 * - Solid color fallback on older iOS, Android, or when useBlurFallback is false
 */
export function AdaptiveCard({
  children,
  style,
  isInteractive = false,
  useBlurFallback = true,
  fallbackBackgroundColor,
}: AdaptiveCardProps) {
  const { theme } = useUnistyles();
  const colorScheme = useColorScheme();
  const isGlassAvailable = hasLiquidGlassSupport();
  const isBlurAvailable = hasBlurSupport();

  // If useBlurFallback is false, skip glass/blur and use solid color
  if (!useBlurFallback) {
    return (
      <View
        style={[
          {
            backgroundColor: fallbackBackgroundColor || theme.colors.card,
            borderRadius: theme.borderRadius.lg,
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  // iOS 18+: Use native Liquid Glass
  if (isGlassAvailable) {
    return (
      <GlassView style={style} isInteractive={isInteractive}>
        {children}
      </GlassView>
    );
  }

  // iOS 10-17: Use BlurView for native-like appearance
  if (Platform.OS === 'ios' && isBlurAvailable) {
    return (
      <BlurView
        intensity={60}
        tint={colorScheme === 'dark' ? 'dark' : 'light'}
        style={[
          {
            overflow: 'hidden',
            borderRadius: theme.borderRadius.lg,
          },
          style,
        ]}
      >
        {children}
      </BlurView>
    );
  }

  // Solid color fallback
  return (
    <View
      style={[
        {
          backgroundColor: fallbackBackgroundColor || theme.colors.card,
          borderRadius: theme.borderRadius.lg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export default AdaptiveCard;
