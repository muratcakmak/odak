/**
 * Awards Utility Functions
 */

import type { AchievementDefinition, AchievementProgress } from "../../domain/achievements/types";
import { ACHIEVEMENT_DEFINITIONS } from "../../domain/models/Achievement";

/**
 * Result type for next achievable award
 */
export interface NextAchievableAward {
  progress: AchievementProgress;
  definition: AchievementDefinition;
  progressPercent: number;
}

/**
 * Find the next achievable award (closest to being unlocked)
 *
 * Logic:
 * 1. Filter to locked awards
 * 2. Calculate progress percentage for each
 * 3. Sort by progress percentage (highest first)
 * 4. Return the one closest to completion
 */
export function getNextAchievableAward(
  achievements: AchievementProgress[]
): NextAchievableAward | null {
  if (!achievements || achievements.length === 0) {
    return null;
  }

  // Create lookup map for definitions
  const definitionMap = new Map(
    ACHIEVEMENT_DEFINITIONS.map((d) => [d.id, d])
  );

  // Filter to locked awards with progress data
  const lockedWithProgress = achievements
    .filter((a) => !a.isUnlocked)
    .map((progress) => {
      const definition = definitionMap.get(progress.achievementId);
      if (!definition) return null;

      // Calculate progress percentage
      const target = definition.criteriaValue;
      const current = progress.currentProgress ?? 0;
      const progressPercent = target > 0 ? (current / target) * 100 : 0;

      return {
        progress,
        definition,
        progressPercent,
      };
    })
    .filter((item): item is NextAchievableAward => item !== null);

  // Sort by progress percentage (highest first), then by sortOrder
  lockedWithProgress.sort((a, b) => {
    if (b.progressPercent !== a.progressPercent) {
      return b.progressPercent - a.progressPercent;
    }
    return a.definition.sortOrder - b.definition.sortOrder;
  });

  // Return the closest one (or null if all unlocked)
  return lockedWithProgress[0] ?? null;
}

/**
 * Count unlocked achievements
 */
export function countUnlockedAwards(achievements: AchievementProgress[]): number {
  return achievements?.filter((a) => a.isUnlocked).length ?? 0;
}

/**
 * Get total achievements count (visible only)
 */
export function getTotalAwardsCount(): number {
  return ACHIEVEMENT_DEFINITIONS.filter((d) => !d.isHidden).length;
}

/**
 * Format progress text (e.g., "5/7 days", "3/10 sessions")
 */
export function formatProgressText(
  current: number,
  target: number,
  unit: string
): string {
  // Normalize unit for display
  const displayUnit = unit
    .replace("_", " ")
    .replace("deep sessions", "deep")
    .replace("percent", "%");

  return `${current}/${target} ${displayUnit}`;
}
