/**
 * useAchievements Hook
 *
 * React hook for accessing and managing achievements.
 * Provides reactive state for achievement progress and streak data.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { getDatabase } from '../data/database';
import {
  AchievementEngine,
  type AchievementProgress,
  type AchievementProcessResult,
  type StreakData,
} from '../domain/achievements';
import type { FocusSession } from '../domain/types';

// ============================================================================
// Types
// ============================================================================

export interface UseAchievementsResult {
  // Data
  achievements: AchievementProgress[];
  streakData: StreakData;

  // Actions
  processSession: (session: FocusSession) => Promise<AchievementProcessResult>;
  refreshAchievements: () => Promise<void>;

  // State
  isLoading: boolean;
  recentlyUnlocked: AchievementProgress[];
  dismissUnlocked: (achievementId: string) => void;
  clearAllUnlocked: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useAchievements(): UseAchievementsResult {
  const [achievements, setAchievements] = useState<AchievementProgress[]>([]);
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    bestStreak: 0,
    lastActiveDate: null,
    streakStartDate: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [recentlyUnlocked, setRecentlyUnlocked] = useState<AchievementProgress[]>(
    []
  );

  // Keep engine instance stable across renders
  const engineRef = useRef<AchievementEngine | null>(null);

  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      const db = getDatabase();
      engineRef.current = new AchievementEngine(db);
    }
    return engineRef.current;
  }, []);

  // Load achievements on mount
  useEffect(() => {
    refreshAchievements();
  }, []);

  /**
   * Refresh all achievement data from database
   */
  const refreshAchievements = useCallback(async () => {
    setIsLoading(true);
    try {
      const engine = getEngine();

      // Load achievements
      const progress = await engine.getAllProgress();
      setAchievements(progress);

      // Load streak data
      const streak = await engine.getStreakData();
      setStreakData(streak);
    } catch (error) {
      console.error('[useAchievements] Failed to refresh:', error);
    } finally {
      setIsLoading(false);
    }
  }, [getEngine]);

  /**
   * Process a completed session and check for new achievements
   */
  const processSession = useCallback(
    async (session: FocusSession): Promise<AchievementProcessResult> => {
      const engine = getEngine();
      const result = await engine.processSession(session);

      // Update local state
      await refreshAchievements();

      // Track newly unlocked for UI celebration
      if (result.newlyUnlocked.length > 0) {
        setRecentlyUnlocked((prev) => [...prev, ...result.newlyUnlocked]);
      }

      return result;
    },
    [getEngine, refreshAchievements]
  );

  /**
   * Dismiss a single unlocked achievement from the celebration queue
   */
  const dismissUnlocked = useCallback((achievementId: string) => {
    setRecentlyUnlocked((prev) =>
      prev.filter((a) => a.achievementId !== achievementId)
    );
  }, []);

  /**
   * Clear all unlocked achievements from the celebration queue
   */
  const clearAllUnlocked = useCallback(() => {
    setRecentlyUnlocked([]);
  }, []);

  return {
    achievements,
    streakData,
    processSession,
    refreshAchievements,
    isLoading,
    recentlyUnlocked,
    dismissUnlocked,
    clearAllUnlocked,
  };
}

// ============================================================================
// Convenience Hooks
// ============================================================================

/**
 * Hook for just the streak data (lightweight)
 */
export function useStreak(): {
  streakData: StreakData;
  isLoading: boolean;
  refresh: () => Promise<void>;
} {
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    bestStreak: 0,
    lastActiveDate: null,
    streakStartDate: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const db = getDatabase();
      const engine = new AchievementEngine(db);
      const streak = await engine.getStreakData();
      setStreakData(streak);
    } catch (error) {
      console.error('[useStreak] Failed to refresh:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { streakData, isLoading, refresh };
}

/**
 * Hook for checking if a specific achievement is unlocked
 */
export function useAchievementStatus(achievementId: string): {
  isUnlocked: boolean;
  progress: number;
  target: number;
  isLoading: boolean;
} {
  const [status, setStatus] = useState({
    isUnlocked: false,
    progress: 0,
    target: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const db = getDatabase();
        const result = await db.getFirstAsync<{
          current_progress: number;
          criteria_value: number;
          is_unlocked: number;
        }>(
          `
          SELECT
            COALESCE(u.current_progress, 0) as current_progress,
            d.criteria_value,
            COALESCE(u.is_unlocked, 0) as is_unlocked
          FROM achievement_definitions d
          LEFT JOIN user_achievements u ON d.id = u.achievement_id
          WHERE d.id = ?
        `,
          achievementId
        );

        if (result) {
          setStatus({
            isUnlocked: result.is_unlocked === 1,
            progress: result.current_progress,
            target: result.criteria_value,
          });
        }
      } catch (error) {
        console.error('[useAchievementStatus] Failed to load:', error);
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [achievementId]);

  return { ...status, isLoading };
}
