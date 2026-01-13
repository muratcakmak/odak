/**
 * Odak Timer Domain
 *
 * Public API for the timer domain layer.
 */

// Types
export type {
  TimerPhase,
  PresetId,
  FocusSession,
  ActiveTimerState,
  HoldingState,
  TimerState,
  FocusSettings,
  TimerDisplayState,
  TimerEvent,
} from './types';

export {
  HOLD_THRESHOLD_MS,
  SEAL_THRESHOLD_MS,
  DEFAULT_BREAK_MINUTES,
} from './types';

// Preset model
export type { Preset } from './models/Preset';
export {
  PRESETS,
  BREAK_PRESET,
  getPreset,
  getAllPresets,
  getTotalDots,
  getLitDots,
} from './models/Preset';

// Session model
export {
  generateSessionId,
  createFocusSession,
  createActiveTimerState,
  completeSession,
  endSessionEarly,
  getRemainingTime,
  getProgress,
  groupSessionsByDay,
  formatDayLabel,
  getTotalMinutesForDay,
  deduplicateSessions,
} from './models/Session';

// Timer engine
export {
  createInitialTimerState,
  createDefaultSettings,
  timerReducer,
  getDisplayState,
  restoreTimerState,
  isHoldThresholdMet,
} from './TimerEngine';
