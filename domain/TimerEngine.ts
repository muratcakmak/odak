/**
 * Timer Engine
 *
 * State machine for the Odak focus timer.
 * Follows ENGINEERING.md transitions:
 *   idle → holdingToStart → focusing → break → idle
 *   focusing → endedEarly (break seal)
 *
 * Timer truth is derived from timestamps, not tick loops.
 */

import type {
  TimerPhase,
  TimerState,
  TimerEvent,
  PresetId,
  ActiveTimerState,
  FocusSession,
  FocusSettings,
  TimerDisplayState,
  HoldingState,
} from './types';
import {
  HOLD_THRESHOLD_MS,
  DEFAULT_BREAK_MINUTES,
} from './types';
import { getPreset, getLitDots, BREAK_PRESET } from './models/Preset';
import {
  createFocusSession,
  createActiveTimerState,
  completeSession,
  endSessionEarly,
  getRemainingTime,
  getProgress,
} from './models/Session';

// Initial state
export function createInitialTimerState(
  selectedPresetId: PresetId = 'standard'
): TimerState {
  return {
    phase: 'idle',
    activeTimer: null,
    holding: null,
    selectedPresetId,
  };
}

// Default settings
export function createDefaultSettings(): FocusSettings {
  return {
    version: 1,
    autoBreakEnabled: true,
    showMinutesRemaining: false,
    soundEnabled: true,
    vibrationEnabled: true,
    breakDurationMinutes: DEFAULT_BREAK_MINUTES,
    liveActivityEnabled: true,
    notificationsEnabled: true,
  };
}

/**
 * State machine reducer
 */
export function timerReducer(
  state: TimerState,
  event: TimerEvent,
  settings: FocusSettings
): {
  state: TimerState;
  session?: FocusSession; // Returned when a session completes or ends early
  shouldStartBreak?: boolean;
} {
  switch (event.type) {
    case 'SELECT_PRESET': {
      if (state.phase !== 'idle') {
        return { state }; // Can only change preset when idle
      }
      return {
        state: {
          ...state,
          selectedPresetId: event.presetId,
        },
      };
    }

    case 'START_HOLDING': {
      if (state.phase !== 'idle' && state.phase !== 'break') {
        return { state }; // Can only start holding from idle or break
      }
      return {
        state: {
          ...state,
          phase: 'holdingToStart',
          holding: {
            startedAt: Date.now(),
            progress: 0,
          },
        },
      };
    }

    case 'RELEASE_HOLD': {
      if (state.phase !== 'holdingToStart') {
        return { state };
      }
      // Return to previous phase (idle or break)
      const previousPhase = state.activeTimer?.phase === 'break' ? 'break' : 'idle';
      return {
        state: {
          ...state,
          phase: previousPhase,
          holding: null,
        },
      };
    }

    case 'HOLD_THRESHOLD_MET': {
      // Allow starting from idle (direct trigger) or holdingToStart (legacy hold mechanism)
      if (state.phase !== 'holdingToStart' && state.phase !== 'idle') {
        return { state };
      }

      // If coming from break, skip break and start new focus
      const wasInBreak = state.activeTimer?.phase === 'break';

      // Create new focus session
      const session = createFocusSession(event.presetId);
      const activeTimer = createActiveTimerState(session, 'focusing');

      return {
        state: {
          ...state,
          phase: 'focusing',
          activeTimer,
          holding: null,
          selectedPresetId: event.presetId,
        },
        session: wasInBreak ? undefined : session, // Don't double-save if transitioning from break
      };
    }

    case 'BREAK_SEAL': {
      if (state.phase !== 'focusing') {
        return { state }; // Can only break seal during focus
      }
      return {
        state: {
          ...state,
          phase: 'endedEarly',
        },
      };
    }

    case 'CONFIRM_END_EARLY': {
      if (state.phase !== 'endedEarly' || !state.activeTimer) {
        return { state };
      }

      // Create the ended early session
      const session: FocusSession = {
        id: state.activeTimer.sessionId,
        presetId: state.activeTimer.presetId,
        startedAt: state.activeTimer.startedAt,
        endsAt: state.activeTimer.endsAt,
        completedAt: new Date().toISOString(),
        wasCompleted: false,
        totalMinutes: state.activeTimer.totalMinutes,
      };

      return {
        state: {
          ...state,
          phase: 'idle',
          activeTimer: null,
        },
        session: endSessionEarly(session),
      };
    }

    case 'CANCEL_END_EARLY': {
      if (state.phase !== 'endedEarly') {
        return { state };
      }
      return {
        state: {
          ...state,
          phase: 'focusing',
        },
      };
    }

    case 'SKIP_BREAK': {
      if (state.phase !== 'break') {
        return { state };
      }
      return {
        state: {
          ...state,
          phase: 'idle',
          activeTimer: null,
        },
      };
    }

    case 'TICK': {
      // Check timer expiration
      if (state.phase === 'focusing' && state.activeTimer) {
        const { isExpired } = getRemainingTime(state.activeTimer);
        if (isExpired) {
          // Focus completed - transition to break or idle
          const session: FocusSession = {
            id: state.activeTimer.sessionId,
            presetId: state.activeTimer.presetId,
            startedAt: state.activeTimer.startedAt,
            endsAt: state.activeTimer.endsAt,
            completedAt: new Date().toISOString(),
            wasCompleted: true,
            totalMinutes: state.activeTimer.totalMinutes,
          };

          if (settings.autoBreakEnabled) {
            // Start break
            const now = new Date();
            const breakEndsAt = new Date(
              now.getTime() + settings.breakDurationMinutes * 60 * 1000
            );

            return {
              state: {
                ...state,
                phase: 'break',
                activeTimer: {
                  sessionId: session.id + '_break',
                  phase: 'break',
                  presetId: session.presetId,
                  startedAt: now.toISOString(),
                  endsAt: breakEndsAt.toISOString(),
                  totalMinutes: settings.breakDurationMinutes,
                },
              },
              session: completeSession(session),
              shouldStartBreak: true,
            };
          } else {
            return {
              state: {
                ...state,
                phase: 'idle',
                activeTimer: null,
              },
              session: completeSession(session),
            };
          }
        }
      }

      // Check break expiration
      if (state.phase === 'break' && state.activeTimer) {
        const { isExpired } = getRemainingTime(state.activeTimer);
        if (isExpired) {
          return {
            state: {
              ...state,
              phase: 'idle',
              activeTimer: null,
            },
          };
        }
      }

      // Update holding progress
      if (state.phase === 'holdingToStart' && state.holding) {
        const elapsed = Date.now() - state.holding.startedAt;
        const progress = Math.min(1, elapsed / HOLD_THRESHOLD_MS);
        return {
          state: {
            ...state,
            holding: {
              ...state.holding,
              progress,
            },
          },
        };
      }

      return { state };
    }

    case 'DEBUG_SPEEDUP': {
      // Dev only - compress timer to 3 seconds
      if (state.phase !== 'focusing' && state.phase !== 'break') {
        return { state };
      }
      if (!state.activeTimer) return { state };

      // Set endsAt to 3 seconds from now
      const newEndsAt = new Date(Date.now() + 3000).toISOString();
      return {
        state: {
          ...state,
          activeTimer: { ...state.activeTimer, endsAt: newEndsAt },
        },
      };
    }

    default:
      return { state };
  }
}

/**
 * Calculate display state for UI rendering
 */
export function getDisplayState(
  state: TimerState,
  settings: FocusSettings
): TimerDisplayState {
  if (!state.activeTimer) {
    const preset = getPreset(state.selectedPresetId);
    return {
      remainingMinutes: preset.durationMinutes,
      remainingSeconds: preset.durationMinutes * 60,
      litDots: preset.durationMinutes,
      totalDots: preset.durationMinutes,
      progress: 0,
    };
  }

  const { remainingMinutes, remainingSeconds } = getRemainingTime(
    state.activeTimer
  );
  const progress = getProgress(state.activeTimer);
  const totalDots = state.activeTimer.totalMinutes;
  const litDots = getLitDots(remainingMinutes, totalDots);

  return {
    remainingMinutes: Math.ceil(remainingMinutes),
    remainingSeconds,
    litDots,
    totalDots,
    progress,
  };
}

/**
 * Restore timer state from persisted data
 * Called on app launch to resume any active session
 */
export function restoreTimerState(
  activeTimer: ActiveTimerState | null,
  selectedPresetId: PresetId = 'standard'
): TimerState {
  if (!activeTimer) {
    return createInitialTimerState(selectedPresetId);
  }

  const { isExpired } = getRemainingTime(activeTimer);

  if (isExpired) {
    // Timer already expired while app was closed
    return createInitialTimerState(selectedPresetId);
  }

  // Resume the timer
  return {
    phase: activeTimer.phase,
    activeTimer,
    holding: null,
    selectedPresetId,
  };
}

/**
 * Check if hold threshold is met
 */
export function isHoldThresholdMet(holding: HoldingState | null): boolean {
  if (!holding) return false;
  const elapsed = Date.now() - holding.startedAt;
  return elapsed >= HOLD_THRESHOLD_MS;
}
