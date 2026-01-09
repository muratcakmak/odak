import React from 'react';
import { Pressable, ViewStyle, StyleProp } from 'react-native';
import { GlassView } from 'expo-glass-effect';
import { hasLiquidGlassSupport } from '../../utils/capabilities';
import { useUnistyles } from 'react-native-unistyles';

interface AdaptivePillButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Disable the button */
  disabled?: boolean;
  /** Custom fallback background color */
  fallbackBackgroundColor?: string;
}

/**
 * AdaptivePillButton - A pill-shaped button that uses:
 * - Liquid Glass (GlassView) on iOS 18+
 * - Solid color fallback on older iOS or Android
 */
export function AdaptivePillButton({
  children,
  onPress,
  style,
  disabled = false,
  fallbackBackgroundColor,
}: AdaptivePillButtonProps) {
  const { theme } = useUnistyles();
  const isGlassAvailable = hasLiquidGlassSupport();

  const handlePress = () => {
    if (disabled) return;
    onPress?.();
  };

  // iOS 18+: Use native Liquid Glass
  if (isGlassAvailable) {
    return (
      <Pressable onPress={handlePress} disabled={disabled}>
        <GlassView style={style} isInteractive>
          {children}
        </GlassView>
      </Pressable>
    );
  }

  // Solid color fallback
  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={[
        { backgroundColor: fallbackBackgroundColor || theme.colors.card },
        style,
        { opacity: disabled ? 0.5 : 1 },
      ]}
    >
      {children}
    </Pressable>
  );
}

export default AdaptivePillButton;
