/**
 * Shared constants for award/achievement screens
 *
 * Uses darkColors from theme for award detail screen (Apple Fitness-style always-dark)
 */

import { darkColors, sharedColors } from "../../theme/unistyles";

/**
 * Award detail screen colors - always dark regardless of system theme
 * References theme tokens to maintain consistency
 */
export const AWARD_DETAIL_COLORS = {
  background: darkColors.background,
  textPrimary: darkColors.textPrimary,
  textSecondary: darkColors.textSecondary,
  accent: darkColors.systemOrange,
  progressBackground: sharedColors.onImage.ultraFaint,
} as const;
