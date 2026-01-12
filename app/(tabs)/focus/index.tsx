/**
 * Focus Screen
 *
 * Main timer experience for Odak.
 * Implements the hold-to-start ritual and break-the-seal quit mechanism.
 *
 * Layout is fixed to prevent content shift between phases.
 */

import React, { useCallback, useEffect, useReducer, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { useUnistyles } from 'react-native-unistyles';
import * as Haptics from 'expo-haptics';
import { Host, HStack, Button as SwiftUIButton, Text as SwiftUIText } from '@expo/ui/swift-ui';
import { glassEffect, frame, font, foregroundStyle, buttonStyle, tint } from '@expo/ui/swift-ui/modifiers';
import { hasLiquidGlassSupport } from '../../../utils/capabilities';

// Domain
import {
  timerReducer,
  getDisplayState,
  createDefaultSettings,
  restoreTimerState,
  getPreset,
  getAllPresets,
  type TimerState,
  type TimerEvent,
  type FocusSettings,
  type PresetId,
} from '../../../domain';

// Storage
import {
  getActiveTimer,
  saveActiveTimer,
  addFocusSession,
  getFocusSettings,
  getSelectedPreset,
  saveSelectedPreset,
  useAccentColor,
} from '../../../utils/storage';

// Components
import { DotGrid } from '../../../components/focus/DotGrid';
import { SwipeToFocus } from '../../../components/focus/SwipeToFocus';

const TICK_INTERVAL = 1000; // 1 second

// Preset selector with Liquid Glass support on iOS 26+
interface PresetSelectorProps {
  presets: ReturnType<typeof getAllPresets>;
  selectedPresetId: PresetId;
  onSelect: (presetId: PresetId) => void;
  accentColor: string;
}

function PresetSelector({
  presets,
  selectedPresetId,
  onSelect,
  accentColor,
}: PresetSelectorProps) {
  const { theme } = useUnistyles();
  const isGlassAvailable = hasLiquidGlassSupport();

  // iOS 26+: Use native SwiftUI Button with Liquid Glass
  if (Platform.OS === 'ios' && isGlassAvailable) {
    // Convert hex accent color to rgba with transparency for glass tint
    const hexToRgba = (hex: string, alpha: number): string => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    const glassTint = hexToRgba(accentColor, 0.6);

    return (
      <Host style={styles.presetSelector} matchContents>
        <HStack spacing={12} alignment="center">
          {presets.map((preset) => {
            const isSelected = preset.id === selectedPresetId;
            // Selected: accent tinted glass + white text
            // Non-selected: regular glass + primary text
            return (
              <SwiftUIButton
                key={preset.id}
                onPress={() => onSelect(preset.id)}
                modifiers={[
                  frame({ width: 56, height: 56 }),
                  glassEffect({
                    glass: {
                      variant: 'regular',
                      interactive: true,
                      tint: isSelected ? glassTint : undefined,
                    },
                    shape: 'circle',
                  }),
                ]}
              >
                <SwiftUIText
                  modifiers={[
                    font({ size: 18, weight: 'semibold' }),
                    foregroundStyle(isSelected ? '#FFFFFF' : theme.colors.textPrimary),
                  ]}
                >
                  {String(preset.durationMinutes)}
                </SwiftUIText>
              </SwiftUIButton>
            );
          })}
        </HStack>
      </Host>
    );
  }

  // Fallback: React Native buttons for older iOS or Android
  return (
    <View style={styles.presetSelector}>
      {presets.map((preset) => {
        const isSelected = preset.id === selectedPresetId;
        const textColor = isSelected ? '#FFFFFF' : theme.colors.textPrimary;

        return (
          <Pressable
            key={preset.id}
            onPress={() => onSelect(preset.id)}
            style={[
              styles.presetButton,
              {
                backgroundColor: isSelected
                  ? accentColor
                  : theme.isDark
                    ? 'rgba(255,255,255,0.1)'
                    : 'rgba(0,0,0,0.05)',
              },
            ]}
          >
            <Text style={[styles.presetText, { color: textColor }]}>
              {preset.durationMinutes}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function FocusScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();

  // Accent color from user settings
  const accentColorName = useAccentColor();
  const accent = theme.colors.accent[accentColorName];
  const accentColor = theme.isDark ? accent.secondary : accent.primary;

  // Settings (loaded once, updated via settings screen)
  const [settings, setSettings] = useState<FocusSettings>(createDefaultSettings);

  // Timer state
  const [timerState, dispatch] = useReducer(
    (state: TimerState, event: TimerEvent) => {
      const result = timerReducer(state, event, settings);

      // Handle side effects
      if (result.session) {
        addFocusSession(result.session);
      }

      // Persist active timer
      saveActiveTimer(result.state.activeTimer);

      return result.state;
    },
    null,
    () => {
      // Initialize from persisted state
      const activeTimer = getActiveTimer();
      const selectedPreset = getSelectedPreset();
      return restoreTimerState(activeTimer, selectedPreset);
    }
  );

  // Sub-minute progress (0-1 within current minute)
  const [currentDotProgress, setCurrentDotProgress] = useState(0);

  // Load settings on mount
  useEffect(() => {
    setSettings(getFocusSettings());
  }, []);

  // Tick timer for countdown updates
  useEffect(() => {
    if (timerState.phase === 'focusing' || timerState.phase === 'break') {
      const interval = setInterval(() => {
        dispatch({ type: 'TICK' });

        // Calculate sub-minute progress
        if (timerState.activeTimer) {
          const now = Date.now();
          const endsAt = new Date(timerState.activeTimer.endsAt).getTime();
          const remainingMs = Math.max(0, endsAt - now);
          const remainingSeconds = remainingMs / 1000;
          const secondsInCurrentMinute = remainingSeconds % 60;
          // Progress is inverted: 0 = full minute left, 1 = about to tick
          const progress = 1 - (secondsInCurrentMinute / 60);
          setCurrentDotProgress(progress);
        }
      }, TICK_INTERVAL);

      return () => clearInterval(interval);
    } else {
      setCurrentDotProgress(0);
    }
  }, [timerState.phase, timerState.activeTimer]);

  // Get display values
  const displayState = getDisplayState(timerState, settings);
  const selectedPreset = getPreset(timerState.selectedPresetId);
  const allPresets = getAllPresets();

  // Handlers
  const handlePresetSelect = useCallback((presetId: PresetId) => {
    dispatch({ type: 'SELECT_PRESET', presetId });
    saveSelectedPreset(presetId);
    if (Platform.OS === 'ios' && settings.vibrationEnabled) {
      Haptics.selectionAsync();
    }
  }, [settings.vibrationEnabled]);

  const handleSwipeComplete = useCallback(() => {
    // Directly start focusing when swipe is completed
    dispatch({
      type: 'HOLD_THRESHOLD_MET',
      presetId: timerState.selectedPresetId,
    });
  }, [timerState.selectedPresetId]);

  const handleBreakSeal = useCallback(() => {
    dispatch({ type: 'BREAK_SEAL' });
  }, []);

  const handleConfirmEndEarly = useCallback(() => {
    Alert.alert(
      'End Session Early?',
      'You still have time left. Are you sure you want to end this focus session?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => dispatch({ type: 'CANCEL_END_EARLY' }),
        },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: () => dispatch({ type: 'CONFIRM_END_EARLY' }),
        },
      ]
    );
  }, []);

  const handleSkipBreak = useCallback(() => {
    dispatch({ type: 'SKIP_BREAK' });
  }, []);

  // Show confirmation when in endedEarly phase
  useEffect(() => {
    if (timerState.phase === 'endedEarly') {
      handleConfirmEndEarly();
    }
  }, [timerState.phase, handleConfirmEndEarly]);

  // Phase checks
  const isIdle = timerState.phase === 'idle';
  const isFocusing = timerState.phase === 'focusing';
  const isBreak = timerState.phase === 'break';
  const isEndedEarly = timerState.phase === 'endedEarly';
  const isActive = isFocusing || isBreak || isEndedEarly;

  // Format time as mm:ss
  const formatTime = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Background color for break mode
  const backgroundColor = isBreak
    ? accentColor
    : theme.colors.background;

  const textColor = isBreak
    ? '#FFFFFF'
    : theme.colors.textPrimary;

  const subtleTextColor = isBreak
    ? 'rgba(255, 255, 255, 0.7)'
    : theme.colors.textTertiary;

  // Tab bar height estimate for bottom padding
  const tabBarHeight = 90;

  return (
    <View style={[styles.container, { backgroundColor, paddingTop: insets.top }]}>
      {/* Fixed Header - Always present to prevent layout shift */}
      <View style={styles.header}>
        {isActive ? (
          /* Timer display during focus/break - shows mm:ss only if enabled in settings */
          settings.showMinutesRemaining ? (
            <Animated.View
              entering={FadeIn.duration(200)}
              style={styles.timerHeader}
            >
              <Text style={[styles.timerText, { color: textColor }]}>
                {formatTime(displayState.remainingSeconds)}
              </Text>
            </Animated.View>
          ) : (
            /* Show preset name when timer is hidden (philosophy: time as texture, not numbers) */
            <Animated.View
              entering={FadeIn.duration(200)}
              style={styles.timerHeader}
            >
              <Text style={[styles.presetLabel, { color: textColor }]}>
                {isBreak ? 'Break' : selectedPreset.name}
              </Text>
            </Animated.View>
          )
        ) : (
          /* Preset selector (idle/holding) */
          <PresetSelector
            presets={allPresets}
            selectedPresetId={timerState.selectedPresetId}
            onSelect={handlePresetSelect}
            accentColor={accentColor}
          />
        )}
      </View>

      {/* Main content area - absolute positioning to prevent layout shift */}
      <View style={[styles.content, { paddingBottom: tabBarHeight }]}>
        {/* Break mode overlay */}
        {isBreak && (
          <View style={styles.breakOverlay}>
            <View style={styles.breakContent}>
              <DotGrid
                rows={1}
                cols={settings.breakDurationMinutes}
                activeDots={displayState.litDots}
                currentDotProgress={currentDotProgress}
                isBreak
                accentColor={accentColor}
              />

              <Text style={styles.breakText}>
                Take a break
              </Text>
            </View>

            {/* Unified skip button - same position as play/lock */}
            <View style={styles.holdButtonContainer}>
              <SwipeToFocus
                mode="break"
                onComplete={handleSkipBreak}
                vibrationEnabled={settings.vibrationEnabled}
                accessibilityLabel="Skip break"
                accentColor={accentColor}
              />
            </View>
          </View>
        )}

        {/* Focus grid - centered in content area */}
        {!isBreak && (
          <View style={styles.gridContainer}>
            <DotGrid
              rows={selectedPreset.gridRows}
              cols={selectedPreset.gridCols}
              activeDots={displayState.litDots}
              currentDotProgress={isFocusing ? currentDotProgress : 0}
              accentColor={accentColor}
              hapticOnSwipe={isFocusing && settings.vibrationEnabled}
            />
          </View>
        )}

        {/* Focus control button - fixed position, changes based on state */}
        {(isIdle || isFocusing) && (
          <View style={styles.holdButtonContainer}>
            <SwipeToFocus
              mode={isIdle ? 'idle' : 'focusing'}
              onComplete={isIdle ? handleSwipeComplete : handleBreakSeal}
              disabled={isEndedEarly}
              vibrationEnabled={settings.vibrationEnabled}
              accessibilityLabel={isIdle
                ? `Hold to start ${selectedPreset.durationMinutes} minute focus session`
                : 'Hold to end focus session'
              }
              accentColor={accentColor}
            />
          </View>
        )}
      </View>

      {/* Debug info (dev only) */}
      {__DEV__ && (
        <View style={[styles.debugInfo, { bottom: tabBarHeight + 10 }]}>
          <Text style={[styles.debugText, { color: subtleTextColor }]}>
            {timerState.phase} • {Math.round(currentDotProgress * 100)}%
          </Text>
          {/* Speedup button - only during focus/break */}
          {(isFocusing || isBreak) && (
            <Pressable
              onPress={() => dispatch({ type: 'DEBUG_SPEEDUP' })}
              style={styles.debugSpeedupButton}
            >
              <Text style={styles.debugSpeedupText}>⚡</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 80,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  presetButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetText: {
    fontSize: 18,
    fontWeight: '600',
  },
  timerHeader: {
    alignItems: 'center',
  },
  timerText: {
    fontSize: 48,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  presetLabel: {
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    position: 'relative',
  },
  // Grid is absolutely centered - never shifts position
  gridContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 140, // Leave space for button at bottom
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Focus control button - fixed position above tab bar
  holdButtonContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 92, // Above tab bar
    alignItems: 'center',
  },
  // Break mode takes over the whole content area
  breakOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // Break content centered above the button
  breakContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 140, // Same as gridContainer - leave space for button
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
  },
  breakText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  debugInfo: {
    position: 'absolute',
    left: 16,
    right: 0,
    alignItems: 'flex-start',
  },
  debugText: {
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  debugSpeedupButton: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,149,0,0.3)',
    borderRadius: 12,
  },
  debugSpeedupText: {
    fontSize: 16,
  },
});
