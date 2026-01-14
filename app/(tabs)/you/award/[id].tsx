/**
 * Award Detail Screen
 *
 * Apple Fitness-style award detail view:
 * - Always dark background (#000000)
 * - Large centered badge with shared element transition
 * - White title, gray description
 * - Orange progress bar for incomplete awards
 * - "Earned on [date]" for completed awards
 */

import { View, Text, Platform } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { SymbolView } from "expo-symbols";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated, { FadeInUp, ZoomIn } from "react-native-reanimated";
import { StyleSheet } from "react-native-unistyles";

import { useAchievements } from "../../../../hooks/useAchievements";
import { getAchievementById } from "../../../../domain/models/Achievement";
import { formatProgressText } from "../../../../components/awards";

// Dark theme colors (always used regardless of system theme)
const DARK_COLORS = {
  background: "#000000",
  textPrimary: "#FFFFFF",
  textSecondary: "rgba(255, 255, 255, 0.6)",
  accent: "#FF9F0A", // Orange
  progressBackground: "rgba(255, 255, 255, 0.2)",
};

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
// Progress Bar Component
// ============================================================================

interface ProgressBarProps {
  current: number;
  target: number;
  unit: string;
}

function ProgressBar({ current, target, unit }: ProgressBarProps) {
  const progress = Math.min((current / target) * 100, 100);

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressBarBackground}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${progress}%` },
          ]}
        />
      </View>
      <Text style={styles.progressText}>
        {formatProgressText(current, target, unit)}
      </Text>
    </View>
  );
}

// ============================================================================
// Main Screen
// ============================================================================

export default function AwardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { achievements } = useAchievements();

  // Get achievement definition and progress
  const definition = getAchievementById(id);
  const progress = achievements?.find((a) => a.achievementId === id);

  // Handle missing data
  if (!definition) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerTitle: "",
            headerStyle: { backgroundColor: DARK_COLORS.background },
            headerTintColor: DARK_COLORS.textPrimary,
          }}
        />
        <Text style={styles.errorText}>Award not found</Text>
      </View>
    );
  }

  const isUnlocked = progress?.isUnlocked ?? false;
  const currentProgress = progress?.currentProgress ?? 0;
  const iconColor = isUnlocked ? DARK_COLORS.accent : DARK_COLORS.textSecondary;
  const ioniconName = IONICON_MAP[definition.icon] ?? "ribbon";

  // Format unlock date
  const formatDate = (timestamp?: number) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const unlockDate = progress?.unlockedAt ? formatDate(progress.unlockedAt) : null;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: "",
          headerStyle: { backgroundColor: DARK_COLORS.background },
          headerTintColor: DARK_COLORS.textPrimary,
          headerTransparent: false,
        }}
      />

      <View style={styles.content}>
        {/* Large Badge Icon */}
        <Animated.View
          entering={ZoomIn.duration(300).springify()}
          style={styles.iconContainer}
        >
          {Platform.OS === "ios" ? (
            <SymbolView
              name={definition.icon as any}
              size={100}
              tintColor={iconColor}
            />
          ) : (
            <Ionicons
              name={ioniconName}
              size={100}
              color={iconColor}
            />
          )}
        </Animated.View>

        {/* Title */}
        <Animated.Text
          entering={FadeInUp.delay(100).duration(300)}
          style={styles.title}
        >
          {definition.name}
        </Animated.Text>

        {/* Description */}
        <Animated.Text
          entering={FadeInUp.delay(150).duration(300)}
          style={styles.description}
        >
          {definition.description}
        </Animated.Text>

        {/* Progress or Earned Date */}
        <Animated.View entering={FadeInUp.delay(200).duration(300)}>
          {isUnlocked ? (
            unlockDate && (
              <Text style={styles.earnedDate}>
                Earned on {unlockDate}
              </Text>
            )
          ) : (
            <ProgressBar
              current={currentProgress}
              target={definition.criteriaValue}
              unit={definition.criteriaUnit}
            />
          )}
        </Animated.View>
      </View>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create(() => ({
  container: {
    flex: 1,
    backgroundColor: DARK_COLORS.background,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: DARK_COLORS.textPrimary,
    textAlign: "center",
    marginBottom: 12,
  },
  description: {
    fontSize: 17,
    fontWeight: "400",
    color: DARK_COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  earnedDate: {
    fontSize: 15,
    fontWeight: "400",
    color: DARK_COLORS.textSecondary,
    textAlign: "center",
  },
  progressContainer: {
    width: "100%",
    alignItems: "center",
  },
  progressBarBackground: {
    width: "100%",
    height: 8,
    backgroundColor: DARK_COLORS.progressBackground,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: DARK_COLORS.accent,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 15,
    fontWeight: "500",
    color: DARK_COLORS.textSecondary,
    marginTop: 12,
  },
  errorText: {
    fontSize: 17,
    color: DARK_COLORS.textSecondary,
    textAlign: "center",
  },
}));
