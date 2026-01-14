/**
 * DotRing
 *
 * A circular arrangement of dots that light up progressively during hold gestures.
 * Mirrors the main DotGrid visual language for consistent app identity.
 *
 * Used by SwipeToFocus for the "hold to start" ritual.
 */

import React, { memo, useEffect } from 'react';
import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
  withSpring,
  withSequence,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';

const DOT_COUNT = 12; // 12 dots, 30° apart
const DOT_SIZE = 8; // 8px diameter
const RING_RADIUS = 52; // Distance from center to dots

type ButtonMode = 'idle' | 'focusing' | 'break';

interface DotRingProps {
  /** Progress value 0-1 */
  progress: SharedValue<number>;
  /** Accent color for lit dots in idle mode */
  accentColor: string;
  /** Current button mode */
  mode: ButtonMode;
  /** Whether user is currently holding */
  isHolding: SharedValue<boolean>;
}

// Individual animated dot
interface DotProps {
  index: number;
  progress: SharedValue<number>;
  accentColor: string;
  mode: ButtonMode;
  isHolding: SharedValue<boolean>;
  celebrationScale: SharedValue<number>;
}

const Dot = memo(function Dot({
  index,
  progress,
  accentColor,
  mode,
  isHolding,
  celebrationScale,
}: DotProps) {
  const { theme } = useUnistyles();

  // Calculate position on the ring
  const angle = (index / DOT_COUNT) * 2 * Math.PI - Math.PI / 2; // Start from top (-90°)
  const x = Math.cos(angle) * RING_RADIUS;
  const y = Math.sin(angle) * RING_RADIUS;

  // Dot threshold for this position (when should it light up)
  const threshold = index / DOT_COUNT;

  // Derived value to determine if this dot should be lit
  const isLit = useDerivedValue(() => {
    return progress.value > threshold;
  });

  // Animated opacity and color
  const animatedStyle = useAnimatedStyle(() => {
    const lit = isLit.value;
    const holding = isHolding.value;

    // Base opacity: faint when not holding, slightly more visible when holding
    const baseOpacity = holding ? 0.35 : 0.25;

    // Lit dots are fully opaque
    const opacity = withTiming(lit ? 1 : baseOpacity, {
      duration: 150,
      easing: Easing.out(Easing.ease),
    });

    // Scale for celebration effect
    const scale = celebrationScale.value;

    return {
      opacity,
      transform: [{ scale }],
      backgroundColor: lit
        ? mode === 'focusing'
          ? theme.colors.systemRed
          : accentColor
        : theme.colors.glass.regular,
    };
  });

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          left: RING_RADIUS + x - DOT_SIZE / 2,
          top: RING_RADIUS + y - DOT_SIZE / 2,
        },
        animatedStyle,
      ]}
    />
  );
});

export const DotRing = memo(function DotRing({
  progress,
  accentColor,
  mode,
  isHolding,
}: DotRingProps) {
  // Celebration animation scale (applied to all dots)
  const celebrationScale = useSharedValue(1);

  // Trigger celebration when progress reaches 1
  useEffect(() => {
    // We can't directly observe shared values in useEffect,
    // so celebration is triggered externally via progress reaching 1
  }, []);

  // Expose celebration trigger via derived value watching progress
  useDerivedValue(() => {
    if (progress.value >= 1) {
      // Pulse outward animation
      celebrationScale.value = withSequence(
        withTiming(1.15, { duration: 100 }),
        withSpring(1, { damping: 12, stiffness: 180 })
      );
    }
    return progress.value;
  });

  // Reset celebration scale when progress resets
  useDerivedValue(() => {
    if (progress.value === 0) {
      celebrationScale.value = 1;
    }
    return progress.value;
  });

  // Create array of dot indices
  const dots = Array.from({ length: DOT_COUNT }, (_, i) => i);

  return (
    <View style={styles.container}>
      {dots.map((index) => (
        <Dot
          key={index}
          index={index}
          progress={progress}
          accentColor={accentColor}
          mode={mode}
          isHolding={isHolding}
          celebrationScale={celebrationScale}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create((theme) => ({
  container: {
    width: RING_RADIUS * 2 + DOT_SIZE,
    height: RING_RADIUS * 2 + DOT_SIZE,
    position: 'relative',
  },
  dot: {
    position: 'absolute',
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
}));

export default DotRing;
