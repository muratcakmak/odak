/**
 * Awards Gallery Screen
 *
 * Displays all awards in a 3-column grid.
 * - Unlocked awards: full color, full opacity
 * - Locked awards: gray, 0.5 opacity
 *
 * Tapping an award navigates to the detail view with shared element transition.
 */

import { useLayoutEffect } from "react";
import { View, Text, Pressable, ScrollView, useWindowDimensions, Platform } from "react-native";
import { router, useNavigation } from "expo-router";
import { SymbolView } from "expo-symbols";
import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import * as Haptics from "expo-haptics";

import { useAchievements } from "../../../hooks/useAchievements";
import { getVisibleAchievements } from "../../../domain/models/Achievement";
import { useAccentColor } from "../../../utils/storage";
import { countUnlockedAwards, IONICON_MAP } from "../../../components/awards";
import type { AchievementDefinition } from "../../../domain/achievements/types";

// ============================================================================
// Award Badge Item
// ============================================================================

interface AwardItemProps {
  definition: AchievementDefinition;
  isUnlocked: boolean;
  accentColor: string;
  columns: number;
}

function AwardItem({ definition, isUnlocked, accentColor, columns }: AwardItemProps) {
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

  // Calculate flex basis percentage based on columns (accounting for gaps)
  const basisPercent = `${100 / columns - 2}%` as const;

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.badgeContainer,
        {
          flexBasis: basisPercent,
          flexGrow: 1,
          maxWidth: `${100 / columns}%`,
          backgroundColor: theme.colors.card,
          opacity: pressed ? 0.7 : isUnlocked ? 1 : 0.5,
        },
      ]}
    >
      <View style={styles.iconContainer}>
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
      </View>
      <Text
        style={[
          styles.badgeName,
          { color: isUnlocked ? theme.colors.textPrimary : theme.colors.textSecondary },
        ]}
        numberOfLines={1}
      >
        {definition.name}
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
  const navigation = useNavigation();

  // Accent color
  const accentColorName = useAccentColor();
  const accent = theme.colors.accent[accentColorName];
  const accentColor = theme.isDark ? accent.secondary : accent.primary;

  // Responsive column count based on screen width
  const columns = screenWidth >= 1024 ? 5 : screenWidth >= 768 ? 4 : 3;

  // Get all visible achievements sorted
  const visibleDefinitions = getVisibleAchievements();

  // Create progress lookup map
  const progressMap = new Map((achievements ?? []).map((a) => [a.achievementId, a]));

  // Count unlocked
  const unlockedCount = countUnlockedAwards(achievements ?? []);
  const countText = `${unlockedCount} of ${visibleDefinitions.length} earned`;

  // Set up header right with count (like Stats tab pattern)
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Text style={[styles.headerCount, { color: theme.colors.textSecondary }]}>
          {countText}
        </Text>
      ),
    });
  }, [navigation, countText, theme.colors.textSecondary]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
    >
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
              columns={columns}
            />
          );
        })}
      </View>
    </ScrollView>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 100,
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
}));
