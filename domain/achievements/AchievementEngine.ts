/**
 * Achievement Engine
 *
 * Processes focus sessions and updates achievement progress.
 * Designed to be called after each session completion.
 *
 * Key design decisions:
 * - Deterministic: same inputs always produce same outputs
 * - Batch-friendly: can recompute all progress from scratch
 * - SQLite-backed: all queries optimized for SQLite
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  AchievementProgress,
  AchievementProcessResult,
  ComputedStats,
  StreakData,
  DailyStats,
  AchievementEngineConfig,
  AchievementDefinition,
} from './types';
import { ACHIEVEMENT_DEFINITIONS } from '../models/Achievement';
import type { FocusSession } from '../types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: AchievementEngineConfig = {
  dailyGoal: 4,
  minSessionsForRateAchievements: {
    rate80: 10,
    rate90: 25,
    rate95: 50,
  },
};

// ============================================================================
// Achievement Engine Class
// ============================================================================

export class AchievementEngine {
  private db: SQLiteDatabase;
  private config: AchievementEngineConfig;

  constructor(db: SQLiteDatabase, config?: Partial<AchievementEngineConfig>) {
    this.db = db;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Process a newly completed session
   * Called from TimerEngine after session ends
   */
  async processSession(session: FocusSession): Promise<AchievementProcessResult> {
    // 1. Insert session into SQLite
    await this.insertSession(session);

    // 2. Update daily aggregates
    await this.updateDailyStats(session);

    // 3. Update streak data
    const streakData = await this.updateStreakData(session);

    // 4. Compute current statistics
    const stats = await this.computeStats();

    // 5. Check all achievements
    const { newlyUnlocked, updatedProgress } = await this.checkAllAchievements(
      stats,
      session
    );

    return { newlyUnlocked, updatedProgress, streakData };
  }

  /**
   * Recompute all achievement progress from scratch
   * Useful for migration or data recovery
   */
  async recomputeAll(): Promise<AchievementProcessResult> {
    // Reset all progress (keep sessions)
    await this.db.runAsync('DELETE FROM user_achievements');
    await this.db.runAsync('DELETE FROM daily_stats');
    await this.db.runAsync('DELETE FROM streak_data WHERE id = 1');
    await this.db.runAsync(`
      INSERT INTO streak_data (id, current_streak, best_streak)
      VALUES (1, 0, 0)
    `);

    // Recompute daily stats
    await this.rebuildDailyStats();

    // Recompute streak
    const streakData = await this.rebuildStreakData();

    // Compute stats and check achievements
    const stats = await this.computeStats();
    const { newlyUnlocked, updatedProgress } =
      await this.checkAllAchievements(stats);

    return { newlyUnlocked, updatedProgress, streakData };
  }

  /**
   * Get current streak data
   */
  async getStreakData(): Promise<StreakData> {
    const data = await this.db.getFirstAsync<{
      current_streak: number;
      best_streak: number;
      last_active_date: string | null;
      streak_start_date: string | null;
    }>('SELECT * FROM streak_data WHERE id = 1');

    return {
      currentStreak: data?.current_streak ?? 0,
      bestStreak: data?.best_streak ?? 0,
      lastActiveDate: data?.last_active_date ?? null,
      streakStartDate: data?.streak_start_date ?? null,
    };
  }

  /**
   * Get all achievement progress
   */
  async getAllProgress(): Promise<AchievementProgress[]> {
    const rows = await this.db.getAllAsync<{
      id: string;
      current_progress: number;
      criteria_value: number;
      is_unlocked: number;
      unlocked_at: string | null;
    }>(`
      SELECT
        d.id,
        COALESCE(u.current_progress, 0) as current_progress,
        d.criteria_value,
        COALESCE(u.is_unlocked, 0) as is_unlocked,
        u.unlocked_at
      FROM achievement_definitions d
      LEFT JOIN user_achievements u ON d.id = u.achievement_id
      WHERE d.is_hidden = 0 OR u.is_unlocked = 1
      ORDER BY d.sort_order
    `);

    return rows.map((row) => ({
      achievementId: row.id,
      currentProgress: row.current_progress,
      targetValue: row.criteria_value,
      isUnlocked: row.is_unlocked === 1,
      unlockedAt: row.unlocked_at,
    }));
  }

  // ==========================================================================
  // Private: Session Management
  // ==========================================================================

  private async insertSession(session: FocusSession): Promise<void> {
    await this.db.runAsync(
      `
      INSERT OR REPLACE INTO focus_sessions (
        id, preset_id, started_at, ends_at, completed_at, was_completed, total_minutes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      session.id,
      session.presetId,
      session.startedAt,
      session.endsAt,
      session.completedAt ?? null,
      session.wasCompleted ? 1 : 0,
      session.totalMinutes
    );
  }

  // ==========================================================================
  // Private: Daily Stats
  // ==========================================================================

  private async updateDailyStats(session: FocusSession): Promise<void> {
    const dateKey = session.startedAt.substring(0, 10); // YYYY-MM-DD

    await this.db.runAsync(
      `
      INSERT INTO daily_stats (
        date_key, total_sessions, completed_sessions, total_minutes,
        quick_sessions, standard_sessions, deep_sessions, met_goal
      )
      SELECT
        ?,
        COUNT(*),
        SUM(was_completed),
        SUM(CASE WHEN was_completed = 1 THEN total_minutes ELSE 0 END),
        SUM(CASE WHEN preset_id = 'quick' AND was_completed = 1 THEN 1 ELSE 0 END),
        SUM(CASE WHEN preset_id = 'standard' AND was_completed = 1 THEN 1 ELSE 0 END),
        SUM(CASE WHEN preset_id = 'deep' AND was_completed = 1 THEN 1 ELSE 0 END),
        CASE WHEN SUM(was_completed) >= ? THEN 1 ELSE 0 END
      FROM focus_sessions
      WHERE date_key = ?
      ON CONFLICT(date_key) DO UPDATE SET
        total_sessions = excluded.total_sessions,
        completed_sessions = excluded.completed_sessions,
        total_minutes = excluded.total_minutes,
        quick_sessions = excluded.quick_sessions,
        standard_sessions = excluded.standard_sessions,
        deep_sessions = excluded.deep_sessions,
        met_goal = excluded.met_goal,
        updated_at = datetime('now')
    `,
      dateKey,
      this.config.dailyGoal,
      dateKey
    );
  }

  private async rebuildDailyStats(): Promise<void> {
    await this.db.runAsync(
      `
      INSERT OR REPLACE INTO daily_stats (
        date_key, total_sessions, completed_sessions, total_minutes,
        quick_sessions, standard_sessions, deep_sessions, met_goal
      )
      SELECT
        date_key,
        COUNT(*),
        SUM(was_completed),
        SUM(CASE WHEN was_completed = 1 THEN total_minutes ELSE 0 END),
        SUM(CASE WHEN preset_id = 'quick' AND was_completed = 1 THEN 1 ELSE 0 END),
        SUM(CASE WHEN preset_id = 'standard' AND was_completed = 1 THEN 1 ELSE 0 END),
        SUM(CASE WHEN preset_id = 'deep' AND was_completed = 1 THEN 1 ELSE 0 END),
        CASE WHEN SUM(was_completed) >= ? THEN 1 ELSE 0 END
      FROM focus_sessions
      GROUP BY date_key
    `,
      this.config.dailyGoal
    );
  }

  // ==========================================================================
  // Private: Streak Tracking
  // ==========================================================================

  private async updateStreakData(session: FocusSession): Promise<StreakData> {
    if (!session.wasCompleted) {
      // Only completed sessions count toward streak
      return this.getStreakData();
    }

    const sessionDate = session.startedAt.substring(0, 10);
    const currentData = await this.getStreakData();

    // Calculate new streak
    let newStreak = currentData.currentStreak;
    let newStreakStart = currentData.streakStartDate;

    if (!currentData.lastActiveDate) {
      // First ever session
      newStreak = 1;
      newStreakStart = sessionDate;
    } else if (sessionDate === currentData.lastActiveDate) {
      // Same day, no change
    } else {
      const lastDate = new Date(currentData.lastActiveDate);
      const currentDate = new Date(sessionDate);
      const daysDiff = Math.floor(
        (currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === 1) {
        // Consecutive day
        newStreak = currentData.currentStreak + 1;
      } else if (daysDiff > 1) {
        // Streak broken
        newStreak = 1;
        newStreakStart = sessionDate;
      }
    }

    const newBest = Math.max(currentData.bestStreak, newStreak);

    await this.db.runAsync(
      `
      INSERT OR REPLACE INTO streak_data (
        id, current_streak, best_streak, last_active_date, streak_start_date, updated_at
      ) VALUES (1, ?, ?, ?, ?, datetime('now'))
    `,
      newStreak,
      newBest,
      sessionDate,
      newStreakStart
    );

    return {
      currentStreak: newStreak,
      bestStreak: newBest,
      lastActiveDate: sessionDate,
      streakStartDate: newStreakStart,
    };
  }

  private async rebuildStreakData(): Promise<StreakData> {
    const dates = await this.db.getAllAsync<{ date_key: string }>(`
      SELECT DISTINCT date_key
      FROM focus_sessions
      WHERE was_completed = 1
      ORDER BY date_key DESC
    `);

    if (dates.length === 0) {
      return {
        currentStreak: 0,
        bestStreak: 0,
        lastActiveDate: null,
        streakStartDate: null,
      };
    }

    let currentStreak = 0;
    let bestStreak = 0;
    let streakStart: string | null = null;
    let expectedDate = new Date();
    expectedDate.setHours(0, 0, 0, 0);

    let tempStreak = 0;
    let tempStart: string | null = null;

    for (const row of dates) {
      const rowDate = new Date(row.date_key);
      const diff = Math.floor(
        (expectedDate.getTime() - rowDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diff === 0 || diff === 1) {
        tempStreak++;
        tempStart = row.date_key;
        expectedDate = new Date(rowDate);
        expectedDate.setDate(expectedDate.getDate() - 1);
      } else {
        if (currentStreak === 0) {
          // First streak is the current one
          currentStreak = tempStreak;
          streakStart = tempStart;
        }
        bestStreak = Math.max(bestStreak, tempStreak);
        tempStreak = 1;
        tempStart = row.date_key;
        expectedDate = new Date(rowDate);
        expectedDate.setDate(expectedDate.getDate() - 1);
      }
    }

    // Final streak
    if (currentStreak === 0) {
      currentStreak = tempStreak;
      streakStart = tempStart;
    }
    bestStreak = Math.max(bestStreak, tempStreak);

    const lastActiveDate = dates[0].date_key;

    await this.db.runAsync(
      `
      INSERT OR REPLACE INTO streak_data (
        id, current_streak, best_streak, last_active_date, streak_start_date, updated_at
      ) VALUES (1, ?, ?, ?, ?, datetime('now'))
    `,
      currentStreak,
      bestStreak,
      lastActiveDate,
      streakStart
    );

    return {
      currentStreak,
      bestStreak,
      lastActiveDate,
      streakStartDate: streakStart,
    };
  }

  // ==========================================================================
  // Private: Statistics Computation
  // ==========================================================================

  private async computeStats(): Promise<ComputedStats> {
    const today = new Date().toISOString().substring(0, 10);

    // Cumulative stats
    const cumulative = await this.db.getFirstAsync<{
      total_sessions: number;
      total_minutes: number;
      deep_sessions: number;
      completion_rate: number;
    }>(`
      SELECT
        SUM(was_completed) as total_sessions,
        SUM(CASE WHEN was_completed = 1 THEN total_minutes ELSE 0 END) as total_minutes,
        SUM(CASE WHEN preset_id = 'deep' AND was_completed = 1 THEN 1 ELSE 0 END) as deep_sessions,
        ROUND(100.0 * SUM(was_completed) / NULLIF(COUNT(*), 0), 1) as completion_rate
      FROM focus_sessions
    `);

    // Today's stats
    const todayStats = await this.db.getFirstAsync<{
      completed_sessions: number;
      deep_sessions: number;
      met_goal: number;
    }>(`
      SELECT completed_sessions, deep_sessions, met_goal
      FROM daily_stats WHERE date_key = ?
    `, today);

    // Streak data
    const streakData = await this.getStreakData();

    // Consecutive goal days
    const consecutiveGoalDays = await this.countConsecutiveGoalDays();

    // Time-based patterns
    const timePatterns = await this.checkTimePatterns();

    return {
      totalCompletedSessions: cumulative?.total_sessions ?? 0,
      totalMinutes: cumulative?.total_minutes ?? 0,
      totalDeepSessions: cumulative?.deep_sessions ?? 0,
      completionRate: cumulative?.completion_rate ?? 0,
      currentStreak: streakData.currentStreak,
      bestStreak: streakData.bestStreak,
      todaySessions: todayStats?.completed_sessions ?? 0,
      todayDeepSessions: todayStats?.deep_sessions ?? 0,
      todayMetGoal: (todayStats?.met_goal ?? 0) === 1,
      consecutiveGoalDays,
      hasEarlySession: timePatterns.hasEarly,
      hasLateSession: timePatterns.hasLate,
    };
  }

  private async countConsecutiveGoalDays(): Promise<number> {
    const result = await this.db.getAllAsync<{ date_key: string }>(`
      SELECT date_key FROM daily_stats
      WHERE met_goal = 1
      ORDER BY date_key DESC
    `);

    if (result.length === 0) return 0;

    let count = 0;
    let expectedDate = new Date();
    expectedDate.setHours(0, 0, 0, 0);

    for (const row of result) {
      const rowDate = new Date(row.date_key);
      const diff = Math.floor(
        (expectedDate.getTime() - rowDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diff === 0 || diff === 1) {
        count++;
        expectedDate = new Date(rowDate);
        expectedDate.setDate(expectedDate.getDate() - 1);
      } else {
        break;
      }
    }

    return count;
  }

  private async checkTimePatterns(): Promise<{
    hasEarly: boolean;
    hasLate: boolean;
  }> {
    const result = await this.db.getFirstAsync<{
      has_early: number;
      has_late: number;
    }>(`
      SELECT
        MAX(CASE WHEN CAST(substr(started_at, 12, 2) AS INTEGER) < 9 THEN 1 ELSE 0 END) as has_early,
        MAX(CASE WHEN CAST(substr(started_at, 12, 2) AS INTEGER) >= 22 THEN 1 ELSE 0 END) as has_late
      FROM focus_sessions
      WHERE was_completed = 1
    `);

    return {
      hasEarly: result?.has_early === 1,
      hasLate: result?.has_late === 1,
    };
  }

  // ==========================================================================
  // Private: Achievement Checking
  // ==========================================================================

  private async checkAllAchievements(
    stats: ComputedStats,
    recentSession?: FocusSession
  ): Promise<{
    newlyUnlocked: AchievementProgress[];
    updatedProgress: AchievementProgress[];
  }> {
    const newlyUnlocked: AchievementProgress[] = [];
    const updatedProgress: AchievementProgress[] = [];

    for (const achievement of ACHIEVEMENT_DEFINITIONS) {
      const result = await this.checkAchievement(
        achievement,
        stats,
        recentSession
      );

      if (result.justUnlocked) {
        newlyUnlocked.push(result.progress);
      } else if (result.progressChanged) {
        updatedProgress.push(result.progress);
      }
    }

    return { newlyUnlocked, updatedProgress };
  }

  private async checkAchievement(
    achievement: AchievementDefinition,
    stats: ComputedStats,
    recentSession?: FocusSession
  ): Promise<{
    progress: AchievementProgress;
    justUnlocked: boolean;
    progressChanged: boolean;
  }> {
    // Get current progress from DB
    const existing = await this.db.getFirstAsync<{
      current_progress: number;
      is_unlocked: number;
      unlocked_at: string | null;
    }>(`
      SELECT current_progress, is_unlocked, unlocked_at
      FROM user_achievements
      WHERE achievement_id = ?
    `, achievement.id);

    const wasUnlocked = existing?.is_unlocked === 1;

    // Calculate new progress based on criteria type
    let newProgress = 0;
    let isMet = false;

    switch (achievement.criteriaType) {
      case 'threshold':
        newProgress = this.getThresholdProgress(achievement, stats);
        isMet = newProgress >= achievement.criteriaValue;
        break;

      case 'streak':
        newProgress = stats.currentStreak;
        isMet = newProgress >= achievement.criteriaValue;
        break;

      case 'cumulative':
        newProgress = this.getCumulativeProgress(achievement, stats);
        isMet = newProgress >= achievement.criteriaValue;
        break;

      case 'rate':
        newProgress = Math.floor(stats.completionRate);
        isMet = this.checkRateAchievement(achievement, stats);
        break;

      case 'pattern':
        const patternResult = this.checkPatternAchievement(
          achievement,
          stats,
          recentSession
        );
        newProgress = patternResult.progress;
        isMet = patternResult.isMet;
        break;
    }

    // Determine if state changed
    const progressChanged = newProgress !== (existing?.current_progress ?? 0);
    const justUnlocked = !wasUnlocked && isMet;

    // Update database
    const now = new Date().toISOString();
    await this.db.runAsync(
      `
      INSERT INTO user_achievements (
        achievement_id, current_progress, target_value, is_unlocked, unlocked_at, progress_updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(achievement_id) DO UPDATE SET
        current_progress = excluded.current_progress,
        is_unlocked = excluded.is_unlocked,
        unlocked_at = CASE
          WHEN user_achievements.is_unlocked = 0 AND excluded.is_unlocked = 1
          THEN excluded.unlocked_at
          ELSE user_achievements.unlocked_at
        END,
        progress_updated_at = excluded.progress_updated_at
    `,
      achievement.id,
      newProgress,
      achievement.criteriaValue,
      isMet ? 1 : 0,
      isMet && justUnlocked ? now : null,
      now
    );

    return {
      progress: {
        achievementId: achievement.id,
        currentProgress: newProgress,
        targetValue: achievement.criteriaValue,
        isUnlocked: isMet,
        unlockedAt:
          isMet && justUnlocked
            ? now
            : existing?.is_unlocked
              ? existing.unlocked_at
              : null,
      },
      justUnlocked,
      progressChanged,
    };
  }

  private getThresholdProgress(
    achievement: AchievementDefinition,
    stats: ComputedStats
  ): number {
    switch (achievement.criteriaUnit) {
      case 'sessions':
        return stats.totalCompletedSessions;
      case 'deep_sessions':
        return stats.totalDeepSessions;
      default:
        return 0;
    }
  }

  private getCumulativeProgress(
    achievement: AchievementDefinition,
    stats: ComputedStats
  ): number {
    switch (achievement.criteriaUnit) {
      case 'sessions':
        return stats.totalCompletedSessions;
      case 'deep_sessions':
        return stats.totalDeepSessions;
      case 'minutes':
        return stats.totalMinutes;
      default:
        return 0;
    }
  }

  private checkRateAchievement(
    achievement: AchievementDefinition,
    stats: ComputedStats
  ): boolean {
    const minSessions: Record<string, number> = {
      completion_rate_80: this.config.minSessionsForRateAchievements.rate80,
      completion_rate_90: this.config.minSessionsForRateAchievements.rate90,
      completion_rate_95: this.config.minSessionsForRateAchievements.rate95,
    };

    const required = minSessions[achievement.id] ?? 10;

    return (
      stats.totalCompletedSessions >= required &&
      stats.completionRate >= achievement.criteriaValue
    );
  }

  private checkPatternAchievement(
    achievement: AchievementDefinition,
    stats: ComputedStats,
    _recentSession?: FocusSession
  ): { progress: number; isMet: boolean } {
    switch (achievement.id) {
      case 'morning_ritual':
        return {
          progress: stats.hasEarlySession ? 1 : 0,
          isMet: stats.hasEarlySession,
        };

      case 'night_owl':
        return {
          progress: stats.hasLateSession ? 1 : 0,
          isMet: stats.hasLateSession,
        };

      case 'perfect_day':
        return {
          progress: stats.todaySessions,
          isMet: stats.todaySessions >= achievement.criteriaValue,
        };

      case 'perfect_week':
        return {
          progress: stats.consecutiveGoalDays,
          isMet: stats.consecutiveGoalDays >= 7,
        };

      case 'deep_marathon':
        return {
          progress: stats.todayDeepSessions,
          isMet: stats.todayDeepSessions >= 3,
        };

      default:
        return { progress: 0, isMet: false };
    }
  }
}
