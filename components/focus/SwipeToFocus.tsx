/**
 * SwipeToFocus / FocusButton
 *
 * Unified button for focus control:
 * - Idle mode: Play icon, orange, hold to start focus
 * - Focusing mode: Lock icon, gray, hold to break seal
 *
 * Follows PRODUCT.md: "Hold to Start" and "Break the Seal" rituals.
 * Includes VoiceOver-accessible alternative.
 *
 * Features a dot-charging ring that fills progressively during hold,
 * mirroring the main DotGrid visual language.
 */

import React, { useCallback, useEffect, useRef, memo, useState } from 'react';
import {
  View,
  Text,
  AccessibilityInfo,
  Pressable,
  Platform,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  cancelAnimation,
  runOnJS,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import Svg, { Rect, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { DotRing } from './DotRing';
import { hasSeenHoldHint, markHoldHintSeen } from '../../utils/storage';

const BUTTON_SIZE = 72;
const RING_SIZE = 112; // Slightly larger to accommodate dot ring
const HOLD_DURATION_IDLE = 1500; // 1.5s to start focus
const HOLD_DURATION_FOCUS = 2000; // 2s to break seal
const DOT_COUNT = 12; // Must match DotRing's DOT_COUNT

type ButtonMode = 'idle' | 'focusing' | 'break';

// Lock icon component (defined first for use in FocusButton)
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

// Focus button with enhanced visibility
interface FocusButtonProps {
  mode: ButtonMode;
  iconColor: string;
  buttonBgColor: string;
  accentColor: string;
}

function FocusButton({ mode, iconColor, buttonBgColor, accentColor }: FocusButtonProps) {
  const { theme } = useUnistyles();

  const icon =
    mode === 'idle' ? (
      <Ionicons name="play" size={28} color={iconColor} style={styles.playIcon} />
    ) : mode === 'break' ? (
      <Ionicons name="play-skip-forward" size={28} color={iconColor} />
    ) : (
      <LockIcon size={28} color={iconColor} />
    );

  // Subtle border for idle state to improve visibility
  const borderStyle = mode === 'idle' ? {
    borderWidth: 1,
    borderColor: `${accentColor}50`, // 30% opacity
  } : {};

  return (
    <View style={[styles.button, { backgroundColor: buttonBgColor }, borderStyle]}>
      {icon}
    </View>
  );
}

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
  /** Accent color for the button and ring */
  accentColor?: string;
}

export const SwipeToFocus = memo(function SwipeToFocus({
  mode,
  onComplete,
  disabled = false,
  vibrationEnabled = true,
  accessibilityLabel,
  accentColor,
}: SwipeToFocusProps) {
  const { theme } = useUnistyles();
  const isVoiceOverRef = useRef(false);
  const holdStartRef = useRef<number | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastLitDotCountRef = useRef<number>(0); // Track lit dots for haptic feedback

  // Tutorial hint state
  const [showHint, setShowHint] = useState(false);

  const holdDuration = mode === 'idle' ? HOLD_DURATION_IDLE : HOLD_DURATION_FOCUS;
  const isBreakMode = mode === 'break';
  const defaultLabel = mode === 'idle'
    ? 'Hold to start focus session'
    : mode === 'break'
      ? 'Skip break'
      : 'Hold to end focus session';

  // Check if hint should be shown on mount
  // Always show in dev mode for testing
  useEffect(() => {
    if (mode === 'idle' && (__DEV__ || !hasSeenHoldHint())) {
      setShowHint(true);
    }
  }, [mode]);

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

  // Breathing animation scale (idle only)
  const breathingScale = useSharedValue(1);

  // Reusable function to start breathing animation
  const startBreathingAnimation = useCallback(() => {
    breathingScale.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1, // Infinite repeat
      true // Reverse
    );
  }, [breathingScale]);

  // Start/stop breathing animation based on mode
  useEffect(() => {
    if (mode === 'idle') {
      startBreathingAnimation();
    } else {
      cancelAnimation(breathingScale);
      breathingScale.value = withTiming(1, { duration: 150 });
    }

    return () => {
      cancelAnimation(breathingScale);
    };
  }, [mode, breathingScale, startBreathingAnimation]);

  // Reset progress when mode changes
  useEffect(() => {
    progress.value = 0;
    hasTriggered.value = false;
    lastLitDotCountRef.current = 0;
  }, [mode, progress, hasTriggered]);

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
    // Reset progress immediately to prevent color flicker when mode changes
    progress.value = 0;
    triggerHaptic(mode === 'idle' ? 'success' : 'warning');

    // Mark hint as seen on first successful hold (idle mode only)
    if (mode === 'idle' && showHint) {
      markHoldHintSeen();
      setShowHint(false);
    }

    onComplete();
  }, [mode, onComplete, triggerHaptic, progress, showHint]);

  // Start hold tracking
  const startHold = useCallback(() => {
    if (disabled || hasTriggered.value) return;

    // Break mode: instant tap, no hold required
    if (isBreakMode) {
      hasTriggered.value = true;
      handleComplete();
      return;
    }

    // Stop breathing animation during hold
    cancelAnimation(breathingScale);
    breathingScale.value = withTiming(1, { duration: 100 });

    holdStartRef.current = Date.now();
    lastLitDotCountRef.current = 0;
    isHolding.value = true;
    triggerHaptic('light');

    holdIntervalRef.current = setInterval(() => {
      if (holdStartRef.current && !hasTriggered.value) {
        const elapsed = Date.now() - holdStartRef.current;
        const newProgress = Math.min(1, elapsed / holdDuration);
        progress.value = newProgress;

        // Calculate how many dots should be lit
        const litDotCount = Math.floor(newProgress * DOT_COUNT);

        // Haptic feedback when a new dot lights up
        if (litDotCount > lastLitDotCountRef.current) {
          triggerHaptic('light');
          lastLitDotCountRef.current = litDotCount;
        }

        if (newProgress >= 1) {
          hasTriggered.value = true;
          if (holdIntervalRef.current) {
            clearInterval(holdIntervalRef.current);
          }
          handleComplete();
        }
      }
    }, 16); // ~60fps
  }, [disabled, progress, isHolding, hasTriggered, holdDuration, triggerHaptic, handleComplete, isBreakMode, breathingScale]);

  // End hold tracking
  const endHold = useCallback(() => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
    }
    holdStartRef.current = null;
    lastLitDotCountRef.current = 0;
    isHolding.value = false;

    if (!hasTriggered.value) {
      // Reset progress with spring animation
      progress.value = withSpring(0, {
        damping: 15,
        stiffness: 150,
      });

      // Restart breathing animation if in idle mode
      if (mode === 'idle') {
        startBreathingAnimation();
      }
    }
  }, [progress, isHolding, hasTriggered, mode, startBreathingAnimation]);

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

  // Animated styles - combines press scale and breathing
  const buttonStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value * breathingScale.value },
    ],
  }));

  // VoiceOver accessible button
  const handleVoiceOverPress = useCallback(() => {
    triggerHaptic(mode === 'idle' ? 'success' : 'warning');

    // Mark hint as seen on VoiceOver press too
    if (mode === 'idle' && showHint) {
      markHoldHintSeen();
      setShowHint(false);
    }

    onComplete();
  }, [mode, onComplete, triggerHaptic, showHint]);

  // Colors based on mode (use accentColor if provided, fallback to systemOrange)
  const activeColor = accentColor || theme.colors.systemOrange;

  const buttonBgColor = mode === 'idle'
    ? theme.colors.glass.regular
    : mode === 'break'
      ? theme.colors.onImage.ultraFaint // White translucent for break (on accent bg)
      : theme.colors.glass.regular;

  // Icon colors: accent for play (call-to-action), muted for focusing, white for break
  const iconColor = mode === 'idle'
    ? activeColor // Accent colored play icon on glass
    : mode === 'break'
      ? theme.colors.onImage.primary // White icon for break (on accent background)
      : theme.colors.textTertiary;

  return (
    <View style={styles.container}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.wrapper, buttonStyle]}>
          {/* Dot ring progress indicator */}
          <View style={styles.ringContainer} pointerEvents="none">
            <DotRing
              progress={progress}
              accentColor={activeColor}
              mode={mode}
              isHolding={isHolding}
            />
          </View>

          {/* Center button */}
          <FocusButton
            mode={mode}
            iconColor={iconColor}
            buttonBgColor={buttonBgColor}
            accentColor={activeColor}
          />
        </Animated.View>
      </GestureDetector>

      {/* Tutorial hint (first launch only, idle mode) */}
      {showHint && mode === 'idle' && (
        <Animated.Text
          style={[styles.hintText, { color: theme.colors.textTertiary }]}
          entering={FadeIn.duration(300).delay(500)}
        >
          Hold to start
        </Animated.Text>
      )}

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

const styles = StyleSheet.create((theme) => ({
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.shadow.base,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  playIcon: {
    marginLeft: 3, // Optical centering for play icon
  },
  hintText: {
    position: 'absolute',
    top: RING_SIZE + theme.spacing.sm,
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.medium,
  },
  voiceOverButton: {
    position: 'absolute',
    top: -10000,
    left: -10000,
    width: 1,
    height: 1,
  },
}));

export default SwipeToFocus;
