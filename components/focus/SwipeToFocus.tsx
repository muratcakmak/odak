/**
 * SwipeToFocus / FocusButton
 *
 * Unified button for focus control:
 * - Idle mode: Play icon, orange, hold to start focus
 * - Focusing mode: Lock icon, gray, hold to break seal
 *
 * Follows PRODUCT.md: "Hold to Start" and "Break the Seal" rituals.
 * Includes VoiceOver-accessible alternative.
 */

import React, { useCallback, useEffect, useRef, memo } from 'react';
import {
  View,
  StyleSheet,
  AccessibilityInfo,
  Pressable,
  Platform,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Circle, Rect, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';

const BUTTON_SIZE = 72;
const RING_SIZE = 88;
const STROKE_WIDTH = 4;
const HOLD_DURATION_IDLE = 1500; // 1.5s to start focus
const HOLD_DURATION_FOCUS = 2000; // 2s to break seal

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type ButtonMode = 'idle' | 'focusing' | 'break';

interface SwipeToFocusProps {
  /** Current mode */
  mode: ButtonMode;
  /** Called when hold is completed */
  onComplete: () => void;
  /** Disable interaction */
  disabled?: boolean;
  /** Enable haptic feedback (default: true) */
  vibrationEnabled?: boolean;
  /** Accessibility label for VoiceOver */
  accessibilityLabel?: string;
}

export const SwipeToFocus = memo(function SwipeToFocus({
  mode,
  onComplete,
  disabled = false,
  vibrationEnabled = true,
  accessibilityLabel,
}: SwipeToFocusProps) {
  const { theme } = useUnistyles();
  const isVoiceOverRef = useRef(false);
  const holdStartRef = useRef<number | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const holdDuration = mode === 'idle' ? HOLD_DURATION_IDLE : HOLD_DURATION_FOCUS;
  const isBreakMode = mode === 'break';
  const defaultLabel = mode === 'idle'
    ? 'Hold to start focus session'
    : mode === 'break'
    ? 'Skip break'
    : 'Hold to end focus session';

  // Track VoiceOver state
  useEffect(() => {
    const checkVoiceOver = async () => {
      const isEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      isVoiceOverRef.current = isEnabled;
    };
    checkVoiceOver();

    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      (isEnabled) => {
        isVoiceOverRef.current = isEnabled;
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);

  // Animation values
  const progress = useSharedValue(0);
  const scale = useSharedValue(1);
  const isHolding = useSharedValue(false);
  const hasTriggered = useSharedValue(false);

  // Reset progress when mode changes
  useEffect(() => {
    progress.value = 0;
    hasTriggered.value = false;
  }, [mode, progress, hasTriggered]);

  // Ring circumference
  const radius = (RING_SIZE - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (holdIntervalRef.current) {
        clearInterval(holdIntervalRef.current);
      }
    };
  }, []);

  // Haptic feedback (respects vibrationEnabled setting)
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'success' | 'warning') => {
    if (Platform.OS !== 'ios' || !vibrationEnabled) return;

    switch (type) {
      case 'light':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'success':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
    }
  }, [vibrationEnabled]);

  // Handle hold completion
  const handleComplete = useCallback(() => {
    triggerHaptic(mode === 'idle' ? 'success' : 'warning');
    onComplete();
  }, [mode, onComplete, triggerHaptic]);

  // Start hold tracking
  const startHold = useCallback(() => {
    if (disabled || hasTriggered.value) return;

    // Break mode: instant tap, no hold required
    if (isBreakMode) {
      hasTriggered.value = true;
      handleComplete();
      return;
    }

    holdStartRef.current = Date.now();
    isHolding.value = true;
    triggerHaptic('light');

    holdIntervalRef.current = setInterval(() => {
      if (holdStartRef.current && !hasTriggered.value) {
        const elapsed = Date.now() - holdStartRef.current;
        const newProgress = Math.min(1, elapsed / holdDuration);
        progress.value = newProgress;

        if (newProgress >= 1) {
          hasTriggered.value = true;
          if (holdIntervalRef.current) {
            clearInterval(holdIntervalRef.current);
          }
          handleComplete();
        }
      }
    }, 16); // ~60fps
  }, [disabled, progress, isHolding, hasTriggered, holdDuration, triggerHaptic, handleComplete, isBreakMode]);

  // End hold tracking
  const endHold = useCallback(() => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
    }
    holdStartRef.current = null;
    isHolding.value = false;

    if (!hasTriggered.value) {
      // Reset progress with spring animation
      progress.value = withSpring(0, {
        damping: 15,
        stiffness: 150,
      });
    }
  }, [progress, isHolding, hasTriggered]);

  // Gesture handler
  const gesture = Gesture.LongPress()
    .enabled(!disabled)
    .minDuration(50)
    .maxDistance(100)
    .onStart(() => {
      'worklet';
      scale.value = withTiming(0.95, { duration: 100 });
      runOnJS(startHold)();
    })
    .onEnd(() => {
      'worklet';
      scale.value = withSpring(1, { damping: 15, stiffness: 200 });
      runOnJS(endHold)();
    });

  // Animated styles
  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  // VoiceOver accessible button
  const handleVoiceOverPress = useCallback(() => {
    triggerHaptic(mode === 'idle' ? 'success' : 'warning');
    onComplete();
  }, [mode, onComplete, triggerHaptic]);

  // Colors based on mode
  const buttonBgColor = mode === 'idle'
    ? theme.colors.systemOrange
    : mode === 'break'
    ? 'rgba(255,255,255,0.2)' // White translucent for break (on orange bg)
    : (theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)');

  const ringColor = mode === 'idle'
    ? theme.colors.systemOrange
    : mode === 'break'
    ? 'rgba(255,255,255,0.3)' // Subtle white ring for break
    : theme.colors.systemRed;

  const iconColor = mode === 'idle'
    ? '#FFFFFF'
    : mode === 'break'
    ? '#FFFFFF' // White icon for break
    : (theme.isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.4)');

  return (
    <View style={styles.container}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.wrapper, buttonStyle]}>
          {/* Progress ring */}
          <View style={styles.ringContainer}>
            <Svg width={RING_SIZE} height={RING_SIZE} style={styles.svg}>
              {/* Background ring */}
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={radius}
                stroke={theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}
                strokeWidth={STROKE_WIDTH}
                fill="none"
              />
              {/* Progress ring */}
              <AnimatedCircle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={radius}
                stroke={ringColor}
                strokeWidth={STROKE_WIDTH}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                animatedProps={ringProps}
                rotation="-90"
                origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
              />
            </Svg>
          </View>

          {/* Center button */}
          <View style={[styles.button, { backgroundColor: buttonBgColor }]}>
            {mode === 'idle' ? (
              <Ionicons
                name="play"
                size={28}
                color={iconColor}
                style={styles.playIcon}
              />
            ) : mode === 'break' ? (
              <Ionicons
                name="play-skip-forward"
                size={28}
                color={iconColor}
              />
            ) : (
              <LockIcon size={28} color={iconColor} />
            )}
          </View>
        </Animated.View>
      </GestureDetector>


      {/* VoiceOver-only button */}
      <Pressable
        style={styles.voiceOverButton}
        onPress={handleVoiceOverPress}
        disabled={disabled}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || defaultLabel}
        accessibilityHint={mode === 'idle'
          ? "Double tap to start a focus session immediately"
          : mode === 'break'
          ? "Double tap to skip break and return to idle"
          : "Double tap to end focus session immediately"
        }
      />
    </View>
  );
});

// Lock icon component
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

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrapper: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringContainer: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
  },
  svg: {
    transform: [{ rotate: '0deg' }],
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  playIcon: {
    marginLeft: 3, // Optical centering for play icon
  },
  voiceOverButton: {
    position: 'absolute',
    top: -10000,
    left: -10000,
    width: 1,
    height: 1,
  },
});

export default SwipeToFocus;
