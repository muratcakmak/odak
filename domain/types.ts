/**
 * Odak Timer Domain Types
 *
 * Timer truth is derived from timestamps (startedAt/endsAt), not tick loops.
 * This ensures deterministic state after app restarts and background/foreground transitions.
 */

// Timer phases following ENGINEERING.md state machine
export type TimerPhase =
  | 'idle'
  | 'holdingToStart'
  | 'focusing'
  | 'break'
  | 'completed'
  | 'endedEarly';

// Preset identifiers
export type PresetId = 'quick' | 'standard' | 'deep';

// Focus session data (persisted)
export interface FocusSession {
  id: string;
  presetId: PresetId;
  startedAt: string; // ISO timestamp
  endsAt: string; // ISO timestamp
  completedAt?: string; // ISO timestamp when session ended
  wasCompleted: boolean; // true if timer ran to completion, false if ended early
  totalMinutes: number;
}

// Active timer state (persisted when focusing/break)
export interface ActiveTimerState {
  sessionId: string;
  phase: 'focusing' | 'break';
  presetId: PresetId;
  startedAt: string; // ISO timestamp
  endsAt: string; // ISO timestamp
  totalMinutes: number;
}

// Transient UI state (not persisted)
export interface HoldingState {
  startedAt: number; // performance.now() or Date.now()
  progress: number; // 0 to 1
}

// Full timer state for the UI
export interface TimerState {
  phase: TimerPhase;
  activeTimer: ActiveTimerState | null;
  holding: HoldingState | null;
  selectedPresetId: PresetId;
}

// Focus settings (persisted)
export interface FocusSettings {
  version: number;
  autoBreakEnabled: boolean;
  showMinutesRemaining: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  breakDurationMinutes: number;
}

// Computed values for UI rendering
export interface TimerDisplayState {
  remainingMinutes: number;
  remainingSeconds: number;
  litDots: number;
  totalDots: number;
  progress: number; // 0 to 1 (0 = just started, 1 = complete)
}

// Timer engine events for state machine transitions
export type TimerEvent =
  | { type: 'START_HOLDING' }
  | { type: 'RELEASE_HOLD' }
  | { type: 'HOLD_THRESHOLD_MET'; presetId: PresetId }
  | { type: 'BREAK_SEAL' }
  | { type: 'CONFIRM_END_EARLY' }
  | { type: 'CANCEL_END_EARLY' }
  | { type: 'TICK' }
  | { type: 'SKIP_BREAK' }
  | { type: 'SELECT_PRESET'; presetId: PresetId }
  | { type: 'DEBUG_SPEEDUP' }; // Dev only - compress time to 3s

// Constants
export const HOLD_THRESHOLD_MS = 2500; // 2.5 seconds to commit
export const SEAL_THRESHOLD_MS = 2000; // 2 seconds to break seal
export const DEFAULT_BREAK_MINUTES = 5;
