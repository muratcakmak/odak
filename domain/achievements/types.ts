/**
 * Achievement System Types
 *
 * Type definitions for the Odak achievements system.
 * Following the principle of local-first with versioned schemas.
 */

import type { FocusSession, PresetId } from '../types';

// ============================================================================
// Achievement Categories & Criteria
// ============================================================================

export type AchievementCategory =
  | 'commitment'
  | 'consistency'
  | 'completion'
  | 'depth'
  | 'milestone';

export type CriteriaType =
  | 'threshold' // Reach X value once (e.g., first session)
  | 'streak' // X consecutive days
  | 'cumulative' // Total over all time
  | 'pattern' // Complex multi-condition (e.g., time of day)
  | 'rate'; // Percentage threshold (e.g., 80% completion rate)

// ============================================================================
// Achievement Definition (static, seeded at app start)
// ============================================================================

export interface AchievementDefinition {
  id: string;
  category: AchievementCategory;
  name: string;
  description: string;
  icon: string; // SF Symbol name
  criteriaType: CriteriaType;
  criteriaValue: number;
  criteriaUnit?: string;
  sortOrder: number;
  isHidden: boolean; // Hidden until unlocked (surprise achievements)
}

// ============================================================================
// Achievement Progress (per-user state)
// ============================================================================

export interface AchievementProgress {
  achievementId: string;
  currentProgress: number;
  targetValue: number;
  isUnlocked: boolean;
  unlockedAt: string | null;
}

// ============================================================================
// Streak Tracking
// ============================================================================

export interface StreakData {
  currentStreak: number;
  bestStreak: number;
  lastActiveDate: string | null; // YYYY-MM-DD
  streakStartDate: string | null; // YYYY-MM-DD
}

// ============================================================================
// Daily Statistics (materialized aggregate)
// ============================================================================

export interface DailyStats {
  dateKey: string; // YYYY-MM-DD
  totalSessions: number;
  completedSessions: number;
  totalMinutes: number;
  quickSessions: number;
  standardSessions: number;
  deepSessions: number;
  metGoal: boolean;
}

// ============================================================================
// Computed Statistics (for achievement checking)
// ============================================================================

export interface ComputedStats {
  // Cumulative totals
  totalCompletedSessions: number;
  totalMinutes: number;
  totalDeepSessions: number;

  // Rates
  completionRate: number; // 0-100

  // Streak
  currentStreak: number;
  bestStreak: number;

  // Today's stats
  todaySessions: number;
  todayDeepSessions: number;
  todayMetGoal: boolean;

  // Consecutive goal days (for perfect week)
  consecutiveGoalDays: number;

  // Time-based patterns
  hasEarlySession: boolean; // Before 9 AM
  hasLateSession: boolean; // After 10 PM
}

// ============================================================================
// Achievement Processing Result
// ============================================================================

export interface AchievementProcessResult {
  newlyUnlocked: AchievementProgress[];
  updatedProgress: AchievementProgress[];
  streakData: StreakData;
}

// ============================================================================
// Engine Configuration
// ============================================================================

export interface AchievementEngineConfig {
  dailyGoal: number;
  minSessionsForRateAchievements: {
    rate80: number; // 10
    rate90: number; // 25
    rate95: number; // 50
  };
}
