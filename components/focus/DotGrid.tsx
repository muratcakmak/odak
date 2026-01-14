/**
 * DotGrid
 *
 * Visual representation of focus time as a grid of dots.
 * One dot = one minute. Dots decay left-to-right, top-to-bottom.
 *
 * The "current" dot (last active) shows sub-minute progress with an
 * animated opacity pulse that decays every 10 seconds (6/6 → 1/6).
 *
 * @example
 * // Standard 25-min preset: 5x5 grid with 20 minutes remaining, current dot at 50% through the minute
 * <DotGrid rows={5} cols={5} activeDots={20} currentDotProgress={0.5} />
 *
 * // During hold-to-start charging animation
 * <DotGrid rows={5} cols={5} activeDots={25} isCharging chargeProgress={0.6} />
 *
 * // Break mode: white dots on orange background
 * <DotGrid rows={1} cols={5} activeDots={3} isBreak />
 */

import React, { memo, useMemo, useEffect, useRef, useCallback, useState } from 'react';
import { View, ViewStyle, useWindowDimensions, Platform } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  withSpring,
  Easing,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useUnistyles } from 'react-native-unistyles';
import { GlassView } from 'expo-glass-effect';
import { BlurView } from 'expo-blur';
import { hasLiquidGlassSupport, hasBlurSupport } from '../../utils/capabilities';

// Fixed container size based on max grid (10 rows x 5 cols for 50min preset)
const MAX_ROWS = 10;
const MAX_COLS = 5;

interface DotGridProps {
  /** Number of rows in the grid */
  rows: number;
  /** Number of columns in the grid */
  cols: number;
  /** Number of dots that are "lit" (counting from index 0) */
  activeDots: number;
  /** Progress within the current minute (0-1), 0 = just started minute, 1 = about to lose this dot */
  currentDotProgress?: number;
  /** Break mode: white dots on transparent (for accent bg) */
  isBreak?: boolean;
  /** Charging mode: animate dots filling up during hold-to-start */
  isCharging?: boolean;
  /** Progress of charging animation (0-1) */
  chargeProgress?: number;
  /** Container style override */
  style?: ViewStyle;
  /** Maximum dot size in pixels */
  maxDotSize?: number;
  /** Accent color for active dots */
  accentColor?: string;
  /** Enable haptic feedback when swiping over lit dots */
  hapticOnSwipe?: boolean;
}

const DOT_GAP = 12;
const DEFAULT_DOT_SIZE = 30;

/**
 * Single animated dot component
 */
const Dot = memo(function Dot({
  index,
  isActive,
  isCurrent,
  currentProgress,
  isCharged,
  isCharging,
  isBreak,
  dotSize,
  accentColor,
  isTouched,
}: {
  index: number;
  isActive: boolean;
  isCurrent: boolean;
  currentProgress: number;
  isCharged: boolean;
  isCharging: boolean;
  isBreak: boolean;
  dotSize: number;
  accentColor?: string;
  isTouched?: boolean;
}) {
  const { theme } = useUnistyles();

  // Animated opacity for the current dot's decay
  const decayOpacity = useSharedValue(1);

  // Animated scale for touch feedback
  const touchScale = useSharedValue(1);

  // Update decay opacity when currentProgress changes
  useEffect(() => {
    if (isCurrent && !isCharging) {
      // Progress 0 = full opacity, progress 1 = faded (about to lose)
      // Using stepped decay: 6/6, 5/6, 4/6, 3/6, 2/6, 1/6
      // Opacity goes from 1.0 down to 0.1
      const step = Math.floor(currentProgress * 6);
      const targetOpacity = 1 - (step / 6) * 0.9; // Ranges from 1.0 to 0.1

      decayOpacity.value = withTiming(targetOpacity, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      });
    } else {
      decayOpacity.value = 1;
    }
  }, [isCurrent, currentProgress, isCharging, decayOpacity]);

  // Visual feedback when touched during swipe
  useEffect(() => {
    if (isTouched) {
      // Pop up animation
      touchScale.value = withSequence(
        withTiming(1.3, { duration: 80, easing: Easing.out(Easing.ease) }),
        withSpring(1, { damping: 12, stiffness: 200 })
      );
    }
  }, [isTouched, touchScale]);

  const animatedStyle = useAnimatedStyle(() => {
    const targetScale = isActive || isCharged ? 1 : 0.85;
    const baseOpacity = isActive ? 1 : isCharged ? 0.9 : 0.25;

    // Apply decay only to current dot
    const finalOpacity = isCurrent && isActive ? baseOpacity * decayOpacity.value : baseOpacity;

    // Staggered delay for charging animation
    const delay = isCharging ? index * 20 : 0;

    // Combine base scale with touch feedback scale
    const combinedScale = targetScale * touchScale.value;

    return {
      transform: [
        {
          scale: withDelay(
            delay,
            withTiming(combinedScale, {
              duration: 300,
              easing: Easing.out(Easing.ease),
            })
          ),
        },
      ],
      opacity: withDelay(
        delay,
        withTiming(finalOpacity, {
          duration: 300,
          easing: Easing.out(Easing.ease),
        })
      ),
    };
  }, [isActive, isCharged, isCharging, isCurrent, index]);

  const dotColor = useMemo(() => {
    if (isBreak) {
      // White dots for break mode (shown on accent background)
      return isActive ? theme.colors.onImage.primary : theme.colors.onImage.ghost;
    }
    // Accent color dots for focus mode
    return isActive || isCharged
      ? (accentColor || theme.colors.systemOrange)
      : theme.isDark
        ? theme.colors.onImage.ultraFaint
        : theme.colors.glass.regular;
  }, [isBreak, isActive, isCharged, accentColor, theme]);

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          backgroundColor: dotColor,
        },
        animatedStyle,
      ]}
    />
  );
});

export const DotGrid = memo(function DotGrid({
  rows,
  cols,
  activeDots,
  currentDotProgress = 0,
  isBreak = false,
  isCharging = false,
  chargeProgress = 0,
  style,
  maxDotSize = DEFAULT_DOT_SIZE,
  accentColor,
  hapticOnSwipe = false,
}: DotGridProps) {
  const { width: windowWidth } = useWindowDimensions();
  const { theme } = useUnistyles();
  const totalDots = rows * cols;
  const chargedDots = isCharging ? Math.floor(chargeProgress * totalDots) : 0;
  const isGlassAvailable = hasLiquidGlassSupport();
  const isBlurAvailable = hasBlurSupport();

  // The current dot is the last active one (activeDots - 1)
  const currentDotIndex = activeDots > 0 ? activeDots - 1 : -1;

  // SharedValue for selected dot - runs on UI thread
  const selectedDot = useSharedValue<number>(-1);

  // Track previous total dots for animation trigger
  const prevTotalDots = useRef(totalDots);

  // Vertical offset for bump animation
  const containerTranslateY = useSharedValue(0);

  // Subtle bump animation when grid size changes (preset switch)
  useEffect(() => {
    if (prevTotalDots.current !== totalDots && prevTotalDots.current > 0) {
      // Start slightly below and spring up
      containerTranslateY.value = 3;
      containerTranslateY.value = withSpring(0);
    }
    prevTotalDots.current = totalDots;
  }, [totalDots, containerTranslateY]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: containerTranslateY.value }],
  }));

  // Track last dot that triggered haptic (JS thread)
  const lastHapticDotRef = useRef<number>(-1);

  // Track currently touched dot for visual feedback
  const [touchedDotIndex, setTouchedDotIndex] = useState<number>(-1);

  // Calculate dot size based on available width (using MAX_COLS for consistent sizing)
  const dotSize = useMemo(() => {
    // Estimate available width (80% of screen width for the grid)
    const availableWidth = windowWidth * 0.8;
    const calculatedSize = (availableWidth - (MAX_COLS - 1) * DOT_GAP) / MAX_COLS;
    return Math.min(maxDotSize, Math.max(12, calculatedSize));
  }, [windowWidth, maxDotSize]);

  // Cell size for hit testing (dot + gap)
  const cellSize = dotSize + DOT_GAP;

  // Calculate grid dimensions for current grid (used for hit testing)
  const gridWidth = cols * dotSize + (cols - 1) * DOT_GAP;
  const gridHeight = rows * dotSize + (rows - 1) * DOT_GAP;

  // Calculate FIXED container dimensions based on max grid (used for glass container)
  const maxGridWidth = MAX_COLS * dotSize + (MAX_COLS - 1) * DOT_GAP;
  const maxGridHeight = MAX_ROWS * dotSize + (MAX_ROWS - 1) * DOT_GAP;

  // Haptic and visual feedback handler (called from worklet via runOnJS)
  const triggerHapticAndFeedback = useCallback((dotIndex: number) => {
    if (dotIndex !== lastHapticDotRef.current && dotIndex >= 0) {
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      lastHapticDotRef.current = dotIndex;
      setTouchedDotIndex(dotIndex);
    } else if (dotIndex < 0) {
      lastHapticDotRef.current = -1;
      setTouchedDotIndex(-1);
    }
  }, []);

  // Pan gesture - hit detection runs in worklet, only runOnJS when dot changes
  // Uses "nearest dot" approach for more forgiving touch detection
  const panGesture = Gesture.Pan()
    .onStart((e) => {
      'worklet';
      if (!hapticOnSwipe) return;

      // Find nearest dot using rounded division (snaps to closest)
      const col = Math.round(e.x / cellSize - 0.5);
      const row = Math.round(e.y / cellSize - 0.5);
      let dotIndex = -1;

      if (col >= 0 && col < cols && row >= 0 && row < rows) {
        dotIndex = row * cols + col;
      } else {
        // Clamp to grid bounds for edge touches
        const clampedCol = Math.max(0, Math.min(cols - 1, col));
        const clampedRow = Math.max(0, Math.min(rows - 1, row));
        dotIndex = clampedRow * cols + clampedCol;
      }

      if (dotIndex >= 0 && dotIndex < totalDots) {
        selectedDot.value = dotIndex;
        runOnJS(triggerHapticAndFeedback)(dotIndex);
      }
    })
    .onUpdate((e) => {
      'worklet';
      if (!hapticOnSwipe) return;

      // Find nearest dot using rounded division (snaps to closest)
      const col = Math.round(e.x / cellSize - 0.5);
      const row = Math.round(e.y / cellSize - 0.5);
      let dotIndex = -1;

      if (col >= 0 && col < cols && row >= 0 && row < rows) {
        dotIndex = row * cols + col;
      } else {
        // Clamp to grid bounds for edge touches
        const clampedCol = Math.max(0, Math.min(cols - 1, col));
        const clampedRow = Math.max(0, Math.min(rows - 1, row));
        dotIndex = clampedRow * cols + clampedCol;
      }

      // Only trigger runOnJS if dot actually changed
      if (dotIndex >= 0 && dotIndex < totalDots && dotIndex !== selectedDot.value) {
        selectedDot.value = dotIndex;
        runOnJS(triggerHapticAndFeedback)(dotIndex);
      }
    })
    .onEnd(() => {
      'worklet';
      if (!hapticOnSwipe) return;

      selectedDot.value = -1;
      runOnJS(triggerHapticAndFeedback)(-1);
    });

  // Generate grid rows
  const gridRows = useMemo(() => {
    const result: number[][] = [];
    for (let row = 0; row < rows; row++) {
      const rowDots: number[] = [];
      for (let col = 0; col < cols; col++) {
        rowDots.push(row * cols + col);
      }
      result.push(rowDots);
    }
    return result;
  }, [rows, cols]);

  // Grid content
  const gridContent = (
    <View style={styles.gridInner}>
      {gridRows.map((rowIndices, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {rowIndices.map((dotIndex) => {
            const isActive = dotIndex < activeDots;
            const isCharged = isCharging && dotIndex < chargedDots;
            const isCurrent = dotIndex === currentDotIndex && !isCharging;

            return (
              <Dot
                key={dotIndex}
                index={dotIndex}
                isActive={isActive}
                isCurrent={isCurrent}
                currentProgress={isCurrent ? currentDotProgress : 0}
                isCharged={isCharged}
                isCharging={isCharging}
                isBreak={isBreak}
                dotSize={dotSize}
                accentColor={accentColor}
                isTouched={dotIndex === touchedDotIndex}
              />
            );
          })}
        </View>
      ))}
    </View>
  );

  // iOS 26+: Wrap in GlassView container with FIXED size for all presets
  if (Platform.OS === 'ios' && isGlassAvailable && !isBreak) {
    const padding = 20;
    return (
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.container, style, containerAnimatedStyle]}>
          <GlassView
            style={[
              styles.glassContainer,
              {
                // Use max grid dimensions for consistent container size across all presets
                width: maxGridWidth + padding * 2,
                height: maxGridHeight + padding * 2,
                borderRadius: 24,
              },
            ]}
          >
            {gridContent}
          </GlassView>
        </Animated.View>
      </GestureDetector>
    );
  }

  // iOS 18-25: Use BlurView for native-like container
  if (Platform.OS === 'ios' && isBlurAvailable && !isBreak) {
    const padding = 20;
    return (
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.container, style, containerAnimatedStyle]}>
          <View
            style={[
              styles.blurContainer,
              {
                width: maxGridWidth + padding * 2,
                height: maxGridHeight + padding * 2,
                borderRadius: 24,
                overflow: 'hidden',
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(245,245,247,0.85)',
                borderWidth: 1,
                borderColor: theme.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)',
                shadowColor: theme.colors.shadow.base,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.12,
                shadowRadius: 16,
              },
            ]}
          >
            <BlurView
              intensity={30}
              tint={theme.isDark ? 'dark' : 'light'}
              style={styles.blurFill}
            />
            <View style={styles.blurContent}>
              {gridContent}
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
    );
  }

  // Android / Older iOS / Break mode: Solid color fallback
  const padding = 20;
  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, style, containerAnimatedStyle]}>
        <View
          style={[
            styles.solidContainer,
            {
              width: maxGridWidth + padding * 2,
              height: maxGridHeight + padding * 2,
              borderRadius: 24,
              backgroundColor: isBreak ? 'transparent' : theme.colors.glass.regular,
            },
          ]}
        >
          {gridContent}
        </View>
      </Animated.View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create(() => ({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  blurContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  blurFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  blurContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  solidContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: DOT_GAP,
    marginBottom: DOT_GAP,
  },
  dot: {
    // Base dot styles - size and color applied dynamically
  },
}));

export default DotGrid;
