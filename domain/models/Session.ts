/**
 * Focus Session Model
 *
 * Represents a completed or in-progress focus session.
 * Sessions are persisted to the Bank (history) when completed.
 */

import type { FocusSession, PresetId, ActiveTimerState } from '../types';
import { getPreset } from './Preset';

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Create a new focus session when user commits
 */
export function createFocusSession(presetId: PresetId): FocusSession {
  const preset = getPreset(presetId);
  const now = new Date();
  const endsAt = new Date(now.getTime() + preset.durationMinutes * 60 * 1000);

  return {
    id: generateSessionId(),
    presetId,
    startedAt: now.toISOString(),
    endsAt: endsAt.toISOString(),
    wasCompleted: false,
    totalMinutes: preset.durationMinutes,
  };
}

/**
 * Create active timer state from a session
 */
export function createActiveTimerState(
  session: FocusSession,
  phase: 'focusing' | 'break' = 'focusing'
): ActiveTimerState {
  return {
    sessionId: session.id,
    phase,
    presetId: session.presetId,
    startedAt: session.startedAt,
    endsAt: session.endsAt,
    totalMinutes: session.totalMinutes,
  };
}

/**
 * Mark a session as completed
 */
export function completeSession(session: FocusSession): FocusSession {
  return {
    ...session,
    completedAt: new Date().toISOString(),
    wasCompleted: true,
  };
}

/**
 * Mark a session as ended early
 */
export function endSessionEarly(session: FocusSession): FocusSession {
  return {
    ...session,
    completedAt: new Date().toISOString(),
    wasCompleted: false,
  };
}

/**
 * Calculate remaining time for a session
 */
export function getRemainingTime(session: FocusSession | ActiveTimerState): {
  remainingMs: number;
  remainingMinutes: number;
  remainingSeconds: number;
  isExpired: boolean;
} {
  const now = Date.now();
  const endsAt = new Date(session.endsAt).getTime();
  const remainingMs = Math.max(0, endsAt - now);
  const remainingMinutes = remainingMs / 60000;
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const isExpired = remainingMs <= 0;

  return {
    remainingMs,
    remainingMinutes,
    remainingSeconds,
    isExpired,
  };
}

/**
 * Calculate progress (0 = just started, 1 = complete)
 */
export function getProgress(session: FocusSession | ActiveTimerState): number {
  const startedAt = new Date(session.startedAt).getTime();
  const endsAt = new Date(session.endsAt).getTime();
  const now = Date.now();
  const totalDuration = endsAt - startedAt;
  const elapsed = now - startedAt;

  return Math.min(1, Math.max(0, elapsed / totalDuration));
}

/**
 * Group sessions by day for Bank display
 */
export function groupSessionsByDay(
  sessions: FocusSession[]
): Map<string, FocusSession[]> {
  const grouped = new Map<string, FocusSession[]>();

  // Sort by most recent first
  const sorted = [...sessions].sort(
    (a, b) =>
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );

  for (const session of sorted) {
    const date = new Date(session.startedAt);
    const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

    if (!grouped.has(dayKey)) {
      grouped.set(dayKey, []);
    }
    grouped.get(dayKey)!.push(session);
  }

  return grouped;
}

/**
 * Format day key for display
 */
export function formatDayLabel(dayKey: string): string {
  const date = new Date(dayKey + 'T00:00:00');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Calculate total focus time for a day
 */
export function getTotalMinutesForDay(sessions: FocusSession[]): number {
  return sessions
    .filter((s) => s.wasCompleted)
    .reduce((total, s) => total + s.totalMinutes, 0);
}

/**
 * Deduplicate sessions by ID, keeping the LAST occurrence (final state).
 *
 * Sessions are saved twice: once when started (wasCompleted: false)
 * and again when completed (wasCompleted: true). We want the final state.
 */
export function deduplicateSessions(sessions: FocusSession[]): FocusSession[] {
  const sessionMap = new Map<string, FocusSession>();
  for (const session of sessions) {
    sessionMap.set(session.id, session);
  }
  return Array.from(sessionMap.values());
}
