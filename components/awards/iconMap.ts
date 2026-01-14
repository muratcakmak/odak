/**
 * Shared icon mapping for SF Symbols to Ionicons (Android fallback)
 *
 * Maps iOS SF Symbol names to their closest Ionicons equivalents
 * for cross-platform achievement/award icons.
 */

import type Ionicons from "@expo/vector-icons/Ionicons";

export const IONICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  // Commitment
  sparkle: "sparkles",
  "sunrise.fill": "sunny",
  "moon.stars.fill": "moon",
  // Consistency
  flame: "flame-outline",
  "flame.fill": "flame",
  "flame.circle": "flame",
  "flame.circle.fill": "flame",
  "trophy.fill": "trophy",
  "crown.fill": "medal",
  // Completion
  "checkmark.seal": "checkmark-circle",
  "checkmark.seal.fill": "checkmark-circle",
  "star.circle.fill": "star",
  "sun.max.fill": "sunny",
  "calendar.badge.checkmark": "calendar",
  // Depth
  drop: "water-outline",
  "drop.fill": "water",
  "drop.circle": "water",
  "drop.circle.fill": "water",
  "figure.run": "fitness",
  // Milestone
  leaf: "leaf-outline",
  "leaf.fill": "leaf",
  "laurel.leading": "ribbon",
  "laurel.trailing": "ribbon",
  "medal.fill": "medal",
  clock: "time-outline",
  "clock.fill": "time",
  "clock.badge.checkmark": "time",
};
