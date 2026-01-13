/**
 * HoldableArea
 *
 * Full-screen touchable area that requires a 2.5s hold to commit.
 * Provides visual and haptic feedback during the hold.
 *
 * Follows PRODUCT.md: "Hold to Start" commitment ritual.
 * Includes VoiceOver-accessible alternative button.
 *
 * @example
 * <HoldableArea
 *   onHoldStart={() => dispatch({ type: 'START_HOLDING' })}
 *   onHoldEnd={() => dispatch({ type: 'RELEASE_HOLD' })}
 *   onCommit={() => dispatch({ type: 'HOLD_THRESHOLD_MET', presetId })}
 *   progress={holding?.progress ?? 0}
 *   isHolding={phase === 'holdingToStart'}
 * >
 *   <DotGrid ... />
 * </HoldableArea>
 */

import React, { useCallback, useEffect, useRef, memo } from 'react';
import {
  View,
  AccessibilityInfo,
  Pressable,
  Platform,
} from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useUnistyles } from 'react-native-unistyles';
import { HOLD_THRESHOLD_MS } from '../../domain/types';

interface HoldableAreaProps {
  /** Called when user starts pressing */
  onHoldStart: () => void;
  /** Called when user releases before threshold */
  onHoldEnd: () => void;
  /** Called when hold threshold is met */
  onCommit: () => void;
  /** Current hold progress (0-1) */
  progress: number;
  /** Whether currently in holding state */
  isHolding: boolean;
  /** Disable interaction (e.g., during focus) */
  disabled?: boolean;
  /** Children to render inside the holdable area */
  children: React.ReactNode;
  /** Accessibility label for VoiceOver button */
  accessibilityLabel?: string;
}

export const HoldableArea = memo(function HoldableArea({
  onHoldStart,
  onHoldEnd,
  onCommit,
  progress,
  isHolding,
  disabled = false,
  children,
  accessibilityLabel = 'Start focus session',
}: HoldableAreaProps) {
  const { theme } = useUnistyles();
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasCommittedRef = useRef(false);
  const isVoiceOverRef = useRef(false);

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

  // Animated scale for press feedback
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Haptic feedback
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'success') => {
    if (Platform.OS !== 'ios') return;

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
    }
  }, []);

  // Handle hold start
  const handleHoldStart = useCallback(() => {
    if (disabled) return;

    hasCommittedRef.current = false;
    triggerHaptic('light');
    onHoldStart();
  }, [disabled, onHoldStart, triggerHaptic]);

  // Handle hold end (release before threshold)
  const handleHoldEnd = useCallback(() => {
    if (hasCommittedRef.current) return;
    onHoldEnd();
  }, [onHoldEnd]);

  // Handle commit (threshold met)
  const handleCommit = useCallback(() => {
    hasCommittedRef.current = true;
    triggerHaptic('success');
    onCommit();
  }, [onCommit, triggerHaptic]);

  // Gesture handler
  const gesture = Gesture.LongPress()
    .minDuration(100) // Start tracking quickly
    .maxDistance(50) // Allow small movement
    .onStart(() => {
      'worklet';
      scale.value = withTiming(0.98, {
        duration: 200,
        easing: Easing.out(Easing.ease),
      });
      runOnJS(handleHoldStart)();
    })
    .onEnd(() => {
      'worklet';
      scale.value = withTiming(1, {
        duration: 200,
        easing: Easing.out(Easing.ease),
      });
      runOnJS(handleHoldEnd)();
    });

  // Monitor progress for commit trigger
  useEffect(() => {
    if (isHolding && progress >= 1 && !hasCommittedRef.current) {
      handleCommit();
    }
  }, [isHolding, progress, handleCommit]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        clearInterval(holdTimerRef.current);
      }
    };
  }, []);

  // VoiceOver accessible button (shown only for screen readers)
  const handleVoiceOverPress = useCallback(() => {
    triggerHaptic('success');
    // For VoiceOver, skip the hold and commit immediately
    onCommit();
  }, [onCommit, triggerHaptic]);

  return (
    <View style={styles.container}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.touchable, animatedStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>

      {/* VoiceOver-only button - hidden from visual UI */}
      <Pressable
        style={styles.voiceOverButton}
        onPress={handleVoiceOverPress}
        disabled={disabled}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Double tap to start a focus session immediately"
      />
    </View>
  );
});

const styles = StyleSheet.create(() => ({
  container: {
    // Don't use flex: 1 - just wrap children without expanding
  },
  touchable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceOverButton: {
    // Positioned off-screen but still accessible to VoiceOver
    position: 'absolute',
    top: -10000,
    left: -10000,
    width: 1,
    height: 1,
  },
}));

export default HoldableArea;
