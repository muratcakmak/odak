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

import React, { memo, useMemo, useEffect } from 'react';
import { View, StyleSheet, ViewStyle, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useUnistyles } from 'react-native-unistyles';

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
}

const DOT_GAP = 12;
const DEFAULT_DOT_SIZE = 20;

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
}) {
  const { theme } = useUnistyles();

  // Animated opacity for the current dot's decay
  const decayOpacity = useSharedValue(1);

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

  const animatedStyle = useAnimatedStyle(() => {
    const targetScale = isActive || isCharged ? 1 : 0.85;
    const baseOpacity = isActive ? 1 : isCharged ? 0.9 : 0.25;

    // Apply decay only to current dot
    const finalOpacity = isCurrent && isActive ? baseOpacity * decayOpacity.value : baseOpacity;

    // Staggered delay for charging animation
    const delay = isCharging ? index * 20 : 0;

    return {
      transform: [
        {
          scale: withDelay(
            delay,
            withTiming(targetScale, {
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
      return isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)';
    }
    // Accent color dots for focus mode
    return isActive || isCharged
      ? (accentColor || theme.colors.systemOrange)
      : theme.isDark
      ? 'rgba(255, 255, 255, 0.15)'
      : 'rgba(0, 0, 0, 0.1)';
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
}: DotGridProps) {
  const { width: windowWidth } = useWindowDimensions();
  const totalDots = rows * cols;
  const chargedDots = isCharging ? Math.floor(chargeProgress * totalDots) : 0;

  // The current dot is the last active one (activeDots - 1)
  const currentDotIndex = activeDots > 0 ? activeDots - 1 : -1;

  // Calculate dot size based on available width
  const dotSize = useMemo(() => {
    // Estimate available width (80% of screen width for the grid)
    const availableWidth = windowWidth * 0.8;
    const calculatedSize = (availableWidth - (cols - 1) * DOT_GAP) / cols;
    return Math.min(maxDotSize, Math.max(12, calculatedSize));
  }, [windowWidth, cols, maxDotSize]);

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

  return (
    <View style={[styles.container, style]}>
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
              />
            );
          })}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
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
});

export default DotGrid;
