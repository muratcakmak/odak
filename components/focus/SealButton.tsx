/**
 * SealButton (Break-the-Seal)
 *
 * High-friction quit control that requires a 2s long-press.
 * Shown during focus phase to discourage casual quitting.
 *
 * Per PRODUCT.md: "High-friction quit" - breaking the seal
 * should feel weighty and intentional.
 *
 * @example
 * <SealButton
 *   onBreakSeal={() => dispatch({ type: 'BREAK_SEAL' })}
 *   disabled={phase !== 'focusing'}
 * />
 */

import React, { useCallback, useRef, useState, memo } from 'react';
import {
  View,
  Pressable,
  Text,
  Platform,
} from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle, Rect, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useUnistyles } from 'react-native-unistyles';
import { SEAL_THRESHOLD_MS } from '../../domain/types';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface SealButtonProps {
  /** Called when user completes the 2s hold */
  onBreakSeal: () => void;
  /** Disable the button */
  disabled?: boolean;
  /** Button size */
  size?: number;
}

const STROKE_WIDTH = 3;
const TICK_INTERVAL = 50; // Update progress every 50ms

export const SealButton = memo(function SealButton({
  onBreakSeal,
  disabled = false,
  size = 56,
}: SealButtonProps) {
  const { theme } = useUnistyles();
  const [isHolding, setIsHolding] = useState(false);

  const progress = useSharedValue(0);
  const scale = useSharedValue(1);
  const holdStartRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasTriggeredRef = useRef(false);

  const radius = (size - STROKE_WIDTH * 2) / 2;
  const circumference = 2 * Math.PI * radius;

  // Animated progress ring
  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  // Button scale animation
  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Icon opacity based on progress
  const animatedIconStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value * 0.3,
  }));

  const triggerHaptic = useCallback(() => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const triggerSuccessHaptic = useCallback(() => {
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, []);

  const startHold = useCallback(() => {
    if (disabled) return;

    setIsHolding(true);
    hasTriggeredRef.current = false;
    holdStartRef.current = Date.now();
    triggerHaptic();

    // Start progress timer
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartRef.current;
      const newProgress = Math.min(1, elapsed / SEAL_THRESHOLD_MS);
      progress.value = withTiming(newProgress, { duration: TICK_INTERVAL });

      if (newProgress >= 1 && !hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        triggerSuccessHaptic();
        onBreakSeal();
      }
    }, TICK_INTERVAL);
  }, [disabled, progress, onBreakSeal, triggerHaptic, triggerSuccessHaptic]);

  const endHold = useCallback(() => {
    setIsHolding(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Reset progress with spring animation
    progress.value = withSpring(0, {
      damping: 15,
      stiffness: 150,
    });
  }, [progress]);

  const gesture = Gesture.LongPress()
    .minDuration(100)
    .maxDistance(30)
    .onStart(() => {
      'worklet';
      scale.value = withTiming(0.95, { duration: 150 });
      runOnJS(startHold)();
    })
    .onEnd(() => {
      'worklet';
      scale.value = withSpring(1, { damping: 15, stiffness: 200 });
      runOnJS(endHold)();
    });

  const buttonColor = theme.colors.glass.regular;

  const iconColor = theme.colors.textTertiary;

  const progressColor = theme.colors.systemRed;

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.container, animatedButtonStyle]}>
        {/* Background circle */}
        <View
          style={[
            styles.button,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: buttonColor,
            },
          ]}
        >
          {/* Lock icon */}
          <Animated.View style={animatedIconStyle}>
            <LockIcon size={size * 0.4} color={iconColor} />
          </Animated.View>
        </View>

        {/* Progress ring */}
        <Svg
          width={size}
          height={size}
          style={styles.progressRing}
        >
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={progressColor}
            strokeWidth={STROKE_WIDTH}
            fill="transparent"
            strokeDasharray={circumference}
            animatedProps={animatedCircleProps}
            strokeLinecap="round"
            rotation={-90}
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
      </Animated.View>
    </GestureDetector>
  );
});

// Simple lock icon component
function LockIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Lock body */}
      <Rect
        x="5"
        y="11"
        width="14"
        height="10"
        rx="2"
        stroke={color}
        strokeWidth="2"
        fill="none"
      />
      {/* Lock shackle */}
      <Path
        d="M8 11V7a4 4 0 1 1 8 0v4"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

const styles = StyleSheet.create(() => ({
  container: {
    position: 'relative',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRing: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
}));

export default SealButton;
