/**
 * Awards Gallery Screen
 *
 * Displays all awards in a 3-column grid.
 * - Unlocked awards: full color, full opacity
 * - Locked awards: gray, 0.5 opacity
 *
 * Tapping an award navigates to the detail view with shared element transition.
 */

import { View, Text, Pressable, ScrollView, useWindowDimensions, Platform } from "react-native";
import { router, Stack } from "expo-router";
import { SymbolView } from "expo-symbols";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated from "react-native-reanimated";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import * as Haptics from "expo-haptics";

import { useAchievements } from "../../../hooks/useAchievements";
import { getVisibleAchievements } from "../../../domain/models/Achievement";
import { useAccentColor } from "../../../utils/storage";
import { AwardBadge, awardTransition, countUnlockedAwards } from "../../../components/awards";
import type { AchievementDefinition } from "../../../domain/achievements/types";

// Android fallback icons
const IONICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  sparkle: "sparkles",
  "sunrise.fill": "sunny",
  "moon.stars.fill": "moon",
  flame: "flame-outline",
  "flame.fill": "flame",
  "flame.circle": "flame",
  "flame.circle.fill": "flame",
  "trophy.fill": "trophy",
  "crown.fill": "medal",
  "checkmark.seal": "checkmark-circle",
  "checkmark.seal.fill": "checkmark-circle",
  "star.circle.fill": "star",
  "sun.max.fill": "sunny",
  "calendar.badge.checkmark": "calendar",
  drop: "water-outline",
  "drop.fill": "water",
  "drop.circle": "water",
  "drop.circle.fill": "water",
  "figure.run": "fitness",
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
// Award Badge Item
// ============================================================================

interface AwardItemProps {
  definition: AchievementDefinition;
  isUnlocked: boolean;
  accentColor: string;
  width: number;
}

function AwardItem({ definition, isUnlocked, accentColor, width }: AwardItemProps) {
  const { theme } = useUnistyles();
  const iconColor = isUnlocked ? accentColor : theme.colors.textSecondary;
  const ioniconName = IONICON_MAP[definition.icon] ?? "ribbon";

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/you/award/[id]",
      params: { id: definition.id },
    });
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.badgeContainer,
        {
          width,
          backgroundColor: theme.colors.card,
          opacity: pressed ? 0.7 : isUnlocked ? 1 : 0.5,
        },
      ]}
    >
      <Animated.View
        sharedTransitionTag={`award-${definition.id}`}
        sharedTransitionStyle={awardTransition}
        style={styles.iconContainer}
      >
        {Platform.OS === "ios" ? (
          <SymbolView
            name={definition.icon as any}
            size={32}
            tintColor={iconColor}
          />
        ) : (
          <Ionicons
            name={ioniconName}
            size={32}
            color={iconColor}
          />
        )}
      </Animated.View>
      <Text
        style={[
          styles.badgeName,
          { color: isUnlocked ? theme.colors.textPrimary : theme.colors.textSecondary },
        ]}
        numberOfLines={1}
      >
        {definition.name}
      </Text>
      <Text
        style={[styles.badgeDesc, { color: theme.colors.textSecondary }]}
        numberOfLines={1}
      >
        {definition.description}
      </Text>
    </Pressable>
  );
}

// ============================================================================
// Main Screen
// ============================================================================

export default function AwardsGalleryScreen() {
  const { theme } = useUnistyles();
  const { width: screenWidth } = useWindowDimensions();
  const { achievements } = useAchievements();

  // Accent color
  const accentColorName = useAccentColor();
  const accent = theme.colors.accent[accentColorName];
  const accentColor = theme.isDark ? accent.secondary : accent.primary;

  // Calculate badge width for 3-column grid
  const horizontalPadding = theme.spacing.lg;
  const gap = theme.spacing.sm;
  const badgeWidth = (screenWidth - horizontalPadding * 2 - gap * 2) / 3;

  // Get all visible achievements sorted
  const visibleDefinitions = getVisibleAchievements();

  // Create progress lookup map
  const progressMap = new Map((achievements ?? []).map((a) => [a.achievementId, a]));

  // Count unlocked
  const unlockedCount = countUnlockedAwards(achievements ?? []);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen
        options={{
          headerTitle: "Awards",
          headerLargeTitle: true,
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Header with count */}
        <View style={styles.header}>
          <Text style={[styles.headerCount, { color: theme.colors.textSecondary }]}>
            {unlockedCount} of {visibleDefinitions.length} earned
          </Text>
        </View>

        {/* Awards Grid */}
        <View style={styles.grid}>
          {visibleDefinitions.map((definition) => {
            const progress = progressMap.get(definition.id);
            const isUnlocked = progress?.isUnlocked ?? false;

            return (
              <AwardItem
                key={definition.id}
                definition={definition}
                isUnlocked={isUnlocked}
                accentColor={accentColor}
                width={badgeWidth}
              />
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 100,
  },
  header: {
    paddingVertical: theme.spacing.md,
  },
  headerCount: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.regular,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  badgeContainer: {
    padding: theme.spacing.sm + 4,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: theme.spacing.sm,
  },
  badgeName: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    textAlign: "center",
  },
  badgeDesc: {
    fontSize: theme.typography.sizes.xs,
    textAlign: "center",
    marginTop: theme.spacing.xs / 2,
  },
}));
