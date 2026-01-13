/**
 * Achievement Definitions
 *
 * All achievements for the Odak focus app.
 * Aligned with Odak philosophy:
 * - Reward consistency over frequency
 * - Celebrate completion over attempts
 * - Honor depth of focus (Deep sessions)
 * - No gamification that encourages addiction
 */

import type { AchievementDefinition } from '../achievements/types';

// ============================================================================
// Achievement Definitions (25 total)
// ============================================================================

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // ===========================================================================
  // COMMITMENT - Honoring the ritual (3)
  // ===========================================================================
  {
    id: 'first_focus',
    category: 'commitment',
    name: 'First Focus',
    description: 'Complete your first focus session',
    icon: 'sparkle',
    criteriaType: 'threshold',
    criteriaValue: 1,
    criteriaUnit: 'sessions',
    sortOrder: 100,
    isHidden: false,
  },
  {
    id: 'morning_ritual',
    category: 'commitment',
    name: 'Morning Ritual',
    description: 'Complete a session before 9 AM',
    icon: 'sunrise.fill',
    criteriaType: 'pattern',
    criteriaValue: 1,
    criteriaUnit: 'sessions',
    sortOrder: 110,
    isHidden: true,
  },
  {
    id: 'night_owl',
    category: 'commitment',
    name: 'Night Owl',
    description: 'Complete a session after 10 PM',
    icon: 'moon.stars.fill',
    criteriaType: 'pattern',
    criteriaValue: 1,
    criteriaUnit: 'sessions',
    sortOrder: 111,
    isHidden: true,
  },

  // ===========================================================================
  // CONSISTENCY - Showing up day after day (6)
  // ===========================================================================
  {
    id: 'streak_3',
    category: 'consistency',
    name: 'Getting Started',
    description: '3-day streak',
    icon: 'flame',
    criteriaType: 'streak',
    criteriaValue: 3,
    criteriaUnit: 'days',
    sortOrder: 200,
    isHidden: false,
  },
  {
    id: 'streak_7',
    category: 'consistency',
    name: 'Week Warrior',
    description: '7-day streak',
    icon: 'flame.fill',
    criteriaType: 'streak',
    criteriaValue: 7,
    criteriaUnit: 'days',
    sortOrder: 210,
    isHidden: false,
  },
  {
    id: 'streak_14',
    category: 'consistency',
    name: 'Fortnight Focus',
    description: '14-day streak',
    icon: 'flame.circle',
    criteriaType: 'streak',
    criteriaValue: 14,
    criteriaUnit: 'days',
    sortOrder: 220,
    isHidden: false,
  },
  {
    id: 'streak_30',
    category: 'consistency',
    name: 'Month Master',
    description: '30-day streak',
    icon: 'flame.circle.fill',
    criteriaType: 'streak',
    criteriaValue: 30,
    criteriaUnit: 'days',
    sortOrder: 230,
    isHidden: false,
  },
  {
    id: 'streak_100',
    category: 'consistency',
    name: 'Centurion',
    description: '100-day streak',
    icon: 'trophy.fill',
    criteriaType: 'streak',
    criteriaValue: 100,
    criteriaUnit: 'days',
    sortOrder: 240,
    isHidden: false,
  },
  {
    id: 'streak_365',
    category: 'consistency',
    name: 'Year of Focus',
    description: '365-day streak',
    icon: 'crown.fill',
    criteriaType: 'streak',
    criteriaValue: 365,
    criteriaUnit: 'days',
    sortOrder: 250,
    isHidden: true,
  },

  // ===========================================================================
  // COMPLETION - Finishing what you start (5)
  // ===========================================================================
  {
    id: 'completion_rate_80',
    category: 'completion',
    name: 'Reliable',
    description: 'Maintain 80% completion rate (min 10 sessions)',
    icon: 'checkmark.seal',
    criteriaType: 'rate',
    criteriaValue: 80,
    criteriaUnit: 'percent',
    sortOrder: 300,
    isHidden: false,
  },
  {
    id: 'completion_rate_90',
    category: 'completion',
    name: 'Dedicated',
    description: 'Maintain 90% completion rate (min 25 sessions)',
    icon: 'checkmark.seal.fill',
    criteriaType: 'rate',
    criteriaValue: 90,
    criteriaUnit: 'percent',
    sortOrder: 310,
    isHidden: false,
  },
  {
    id: 'completion_rate_95',
    category: 'completion',
    name: 'Perfectionist',
    description: 'Maintain 95% completion rate (min 50 sessions)',
    icon: 'star.circle.fill',
    criteriaType: 'rate',
    criteriaValue: 95,
    criteriaUnit: 'percent',
    sortOrder: 320,
    isHidden: false,
  },
  {
    id: 'perfect_day',
    category: 'completion',
    name: 'Perfect Day',
    description: 'Complete 4+ sessions in one day, all finished',
    icon: 'sun.max.fill',
    criteriaType: 'pattern',
    criteriaValue: 4,
    criteriaUnit: 'sessions',
    sortOrder: 330,
    isHidden: false,
  },
  {
    id: 'perfect_week',
    category: 'completion',
    name: 'Perfect Week',
    description: 'Meet daily goal for 7 consecutive days',
    icon: 'calendar.badge.checkmark',
    criteriaType: 'pattern',
    criteriaValue: 7,
    criteriaUnit: 'days',
    sortOrder: 340,
    isHidden: false,
  },

  // ===========================================================================
  // DEPTH - Embracing deep work (5)
  // ===========================================================================
  {
    id: 'first_deep',
    category: 'depth',
    name: 'Deep Dive',
    description: 'Complete your first 50-minute Deep session',
    icon: 'drop',
    criteriaType: 'threshold',
    criteriaValue: 1,
    criteriaUnit: 'deep_sessions',
    sortOrder: 400,
    isHidden: false,
  },
  {
    id: 'deep_10',
    category: 'depth',
    name: 'Deep Explorer',
    description: 'Complete 10 Deep sessions',
    icon: 'drop.fill',
    criteriaType: 'cumulative',
    criteriaValue: 10,
    criteriaUnit: 'deep_sessions',
    sortOrder: 410,
    isHidden: false,
  },
  {
    id: 'deep_50',
    category: 'depth',
    name: 'Deep Diver',
    description: 'Complete 50 Deep sessions',
    icon: 'drop.circle',
    criteriaType: 'cumulative',
    criteriaValue: 50,
    criteriaUnit: 'deep_sessions',
    sortOrder: 420,
    isHidden: false,
  },
  {
    id: 'deep_100',
    category: 'depth',
    name: 'Deep Master',
    description: 'Complete 100 Deep sessions',
    icon: 'drop.circle.fill',
    criteriaType: 'cumulative',
    criteriaValue: 100,
    criteriaUnit: 'deep_sessions',
    sortOrder: 430,
    isHidden: false,
  },
  {
    id: 'deep_marathon',
    category: 'depth',
    name: 'Deep Marathon',
    description: 'Complete 3 Deep sessions in one day',
    icon: 'figure.run',
    criteriaType: 'pattern',
    criteriaValue: 3,
    criteriaUnit: 'deep_sessions',
    sortOrder: 440,
    isHidden: true,
  },

  // ===========================================================================
  // MILESTONE - Cumulative journey markers (6)
  // ===========================================================================
  {
    id: 'sessions_10',
    category: 'milestone',
    name: 'Getting Serious',
    description: 'Complete 10 focus sessions',
    icon: 'leaf',
    criteriaType: 'cumulative',
    criteriaValue: 10,
    criteriaUnit: 'sessions',
    sortOrder: 500,
    isHidden: false,
  },
  {
    id: 'sessions_50',
    category: 'milestone',
    name: 'Building Momentum',
    description: 'Complete 50 focus sessions',
    icon: 'leaf.fill',
    criteriaType: 'cumulative',
    criteriaValue: 50,
    criteriaUnit: 'sessions',
    sortOrder: 510,
    isHidden: false,
  },
  {
    id: 'sessions_100',
    category: 'milestone',
    name: 'Century Club',
    description: 'Complete 100 focus sessions',
    icon: 'laurel.leading',
    criteriaType: 'cumulative',
    criteriaValue: 100,
    criteriaUnit: 'sessions',
    sortOrder: 520,
    isHidden: false,
  },
  {
    id: 'sessions_500',
    category: 'milestone',
    name: 'Focus Veteran',
    description: 'Complete 500 focus sessions',
    icon: 'laurel.trailing',
    criteriaType: 'cumulative',
    criteriaValue: 500,
    criteriaUnit: 'sessions',
    sortOrder: 530,
    isHidden: false,
  },
  {
    id: 'sessions_1000',
    category: 'milestone',
    name: 'Focus Legend',
    description: 'Complete 1,000 focus sessions',
    icon: 'medal.fill',
    criteriaType: 'cumulative',
    criteriaValue: 1000,
    criteriaUnit: 'sessions',
    sortOrder: 540,
    isHidden: false,
  },
  {
    id: 'hours_10',
    category: 'milestone',
    name: 'Ten Hours',
    description: 'Accumulate 10 hours of focus time',
    icon: 'clock',
    criteriaType: 'cumulative',
    criteriaValue: 600, // 10 hours in minutes
    criteriaUnit: 'minutes',
    sortOrder: 550,
    isHidden: false,
  },
  {
    id: 'hours_50',
    category: 'milestone',
    name: 'Fifty Hours',
    description: 'Accumulate 50 hours of focus time',
    icon: 'clock.fill',
    criteriaType: 'cumulative',
    criteriaValue: 3000, // 50 hours in minutes
    criteriaUnit: 'minutes',
    sortOrder: 560,
    isHidden: false,
  },
  {
    id: 'hours_100',
    category: 'milestone',
    name: 'Century Hours',
    description: 'Accumulate 100 hours of focus time',
    icon: 'clock.badge.checkmark',
    criteriaType: 'cumulative',
    criteriaValue: 6000, // 100 hours in minutes
    criteriaUnit: 'minutes',
    sortOrder: 570,
    isHidden: false,
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

export function getAchievementById(id: string): AchievementDefinition | undefined {
  return ACHIEVEMENT_DEFINITIONS.find((a) => a.id === id);
}

export function getAchievementsByCategory(
  category: AchievementDefinition['category']
): AchievementDefinition[] {
  return ACHIEVEMENT_DEFINITIONS.filter((a) => a.category === category);
}

export function getVisibleAchievements(): AchievementDefinition[] {
  return ACHIEVEMENT_DEFINITIONS.filter((a) => !a.isHidden);
}
