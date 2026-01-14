/**
 * AwardBadge - Reusable award badge component
 *
 * Used in:
 * - AwardsCard (summary on You screen)
 * - Awards Gallery (grid view)
 * - Award Detail (full screen)
 */

import { Platform, View, Text } from "react-native";
import { SymbolView } from "expo-symbols";
import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import type { AchievementDefinition } from "../../domain/achievements/types";

// ============================================================================
// Types
// ============================================================================

type BadgeSize = "small" | "medium" | "large";

interface AwardBadgeProps {
  /** Achievement definition with icon and metadata */
  definition: AchievementDefinition;
  /** Whether the award is unlocked */
  isUnlocked: boolean;
  /** Size variant */
  size?: BadgeSize;
  /** Override icon color (defaults to accent when unlocked, gray when locked) */
  iconColor?: string;
  /** Show name under icon */
  showName?: boolean;
  /** Show description under name */
  showDescription?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const SIZE_CONFIG = {
  small: {
    iconSize: 28,
    containerPadding: 12,
    nameSize: 12,
    descSize: 10,
  },
  medium: {
    iconSize: 48,
    containerPadding: 16,
    nameSize: 14,
    descSize: 12,
  },
  large: {
    iconSize: 80,
    containerPadding: 24,
    nameSize: 20,
    descSize: 16,
  },
} as const;

// Android fallback icons
const IONICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
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

// ============================================================================
// Component
// ============================================================================

export function AwardBadge({
  definition,
  isUnlocked,
  size = "medium",
  iconColor,
  showName = false,
  showDescription = false,
}: AwardBadgeProps) {
  const { theme } = useUnistyles();
  const config = SIZE_CONFIG[size];

  // Determine icon color
  const defaultIconColor = isUnlocked
    ? theme.colors.systemOrange
    : theme.colors.textSecondary;
  const finalIconColor = iconColor ?? defaultIconColor;

  // Get ionicon name for Android
  const ioniconName = IONICON_MAP[definition.icon] ?? "ribbon";

  // Render icon based on platform
  const renderIcon = () => {
    if (Platform.OS === "ios") {
      return (
        <SymbolView
          name={definition.icon as any}
          size={config.iconSize}
          tintColor={finalIconColor}
        />
      );
    }
    return (
      <Ionicons
        name={ioniconName}
        size={config.iconSize}
        color={finalIconColor}
      />
    );
  };

  // Wrapper component - use Animated.View for shared transitions
  const content = (
    <View style={styles.content}>
      {renderIcon()}
      {showName && (
        <Text
          style={[
            styles.name,
            {
              fontSize: config.nameSize,
              color: isUnlocked
                ? theme.colors.textPrimary
                : theme.colors.textSecondary,
            },
          ]}
          numberOfLines={1}
        >
          {definition.name}
        </Text>
      )}
      {showDescription && (
        <Text
          style={[
            styles.description,
            {
              fontSize: config.descSize,
              color: theme.colors.textSecondary,
            },
          ]}
          numberOfLines={size === "large" ? undefined : 1}
        >
          {definition.description}
        </Text>
      )}
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        {
          padding: config.containerPadding,
          opacity: isUnlocked ? 1 : 0.5,
        },
      ]}
    >
      {content}
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create((theme) => ({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
  },
  name: {
    fontWeight: theme.typography.weights.semibold,
    textAlign: "center",
    marginTop: theme.spacing.sm,
  },
  description: {
    textAlign: "center",
    marginTop: theme.spacing.xs,
  },
}));

export default AwardBadge;
