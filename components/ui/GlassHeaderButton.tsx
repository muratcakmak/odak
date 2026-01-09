import React from "react";
import { Pressable, View, ViewStyle, StyleProp, StyleSheet } from "react-native";
import { GlassView } from "expo-glass-effect";
import { hasLiquidGlassSupport } from "../../utils/capabilities";
import { useUnistyles } from "react-native-unistyles";

interface GlassHeaderButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * GlassHeaderButton - A pill-shaped glass button for native Stack headers.
 * Uses GlassView on iOS 18+ for liquid glass effect.
 */
export function GlassHeaderButton({ children, onPress, style }: GlassHeaderButtonProps) {
  const { theme } = useUnistyles();
  const isGlassAvailable = hasLiquidGlassSupport();

  if (isGlassAvailable) {
    return (
      <Pressable onPress={onPress}>
        <GlassView style={[styles.button, style]} isInteractive>
          {children}
        </GlassView>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={[styles.button, { backgroundColor: theme.colors.card }, style]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
  },
});

export default GlassHeaderButton;
