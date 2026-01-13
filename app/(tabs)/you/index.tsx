import { useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView, Platform, useWindowDimensions } from "react-native";
import { SymbolView } from "expo-symbols";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, Stack } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import {
  useAccentColor,
  getFocusHistory,
  getFocusProfile,
  getCurrentStreak,
  getTodaySessionsCount,
  getTotalStats,
  updateBestStreak,
} from "../../../utils/storage";
import { useAchievements, useStreak } from "../../../hooks/useAchievements";
import { getVisibleAchievements } from "../../../domain/models/Achievement";
import type { AchievementProgress } from "../../../domain/achievements/types";
import type { FocusSession } from "../../../domain/types";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from "react-native-reanimated";

// ============================================================================
// STREAK CARD - Hero component showing current streak
// ============================================================================

interface StreakCardProps {
  currentStreak: number;
  bestStreak: number;
  accentColor: string;
  theme: any;
  onTap: () => void;
  animatedStyle: any;
}

function StreakCard({ currentStreak, bestStreak, accentColor, theme, onTap, animatedStyle }: StreakCardProps) {
  // SF Symbol intensity based on streak length
  const getStreakSymbol = () => {
    if (currentStreak >= 30) return "flame.circle.fill" as const;
    if (currentStreak >= 14) return "flame.fill" as const;
    return "flame" as const;
  };

  return (
    <Pressable onPress={onTap}>
      <Animated.View style={[styles.streakCard, { backgroundColor: accentColor }, animatedStyle]}>
        {Platform.OS === "ios" ? (
          <SymbolView
            name={getStreakSymbol()}
            size={36}
            tintColor={theme.colors.onImage.primary}
            style={styles.streakIcon}
          />
        ) : (
          <Ionicons name="flame" size={36} color={theme.colors.onImage.primary} style={styles.streakIcon} />
        )}
        <Text style={styles.streakValue}>{currentStreak}</Text>
        <Text style={styles.streakLabel}>day streak</Text>
        {bestStreak > currentStreak && (
          <Text style={styles.streakBest}>Best: {bestStreak} days</Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

// ============================================================================
// STATS CARDS - Total time and sessions
// ============================================================================

interface StatsCardsProps {
  totalMinutes: number;
  completedSessions: number;
  totalSessions: number;
  theme: any;
}

function StatsCards({ totalMinutes, completedSessions, totalSessions, theme }: StatsCardsProps) {
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return { primary: `${hours}h ${mins}m`, secondary: `${minutes} min total` };
    }
    return { primary: `${minutes}`, secondary: "minutes" };
  };

  const time = formatTime(totalMinutes);
  const completionRate = totalSessions > 0
    ? Math.round((completedSessions / totalSessions) * 100)
    : 0;

  return (
    <View style={styles.statsRow}>
      <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
        {Platform.OS === "ios" ? (
          <SymbolView
            name="clock"
            size={24}
            tintColor={theme.colors.textSecondary}
            style={styles.statIcon}
          />
        ) : (
          <Ionicons name="time-outline" size={24} color={theme.colors.textSecondary} style={styles.statIcon} />
        )}
        <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{time.primary}</Text>
        <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{time.secondary}</Text>
      </View>

      <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
        {Platform.OS === "ios" ? (
          <SymbolView
            name="checkmark.circle"
            size={24}
            tintColor={theme.colors.textSecondary}
            style={styles.statIcon}
          />
        ) : (
          <Ionicons name="checkmark-circle-outline" size={24} color={theme.colors.textSecondary} style={styles.statIcon} />
        )}
        <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{completedSessions}</Text>
        <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>sessions ({completionRate}%)</Text>
      </View>
    </View>
  );
}

// ============================================================================
// DAILY GOAL PROGRESS - Dot progress indicator
// ============================================================================

interface DailyGoalProgressProps {
  todaySessions: number;
  dailyGoal: number;
  accentColor: string;
  theme: any;
}

function DailyGoalProgress({ todaySessions, dailyGoal, accentColor, theme }: DailyGoalProgressProps) {
  const isComplete = todaySessions >= dailyGoal;

  return (
    <View style={[styles.goalContainer, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.goalHeader}>
        <Text style={[styles.goalTitle, { color: theme.colors.textSecondary }]}>DAILY GOAL</Text>
        {isComplete && (
          Platform.OS === "ios" ? (
            <SymbolView name="checkmark.circle.fill" size={18} tintColor={accentColor} />
          ) : (
            <Ionicons name="checkmark-circle" size={18} color={accentColor} />
          )
        )}
      </View>

      <View style={styles.goalDots}>
        {Array.from({ length: dailyGoal }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.goalDot,
              {
                backgroundColor: i < todaySessions ? accentColor : theme.colors.borderSecondary,
              },
            ]}
          />
        ))}
      </View>

      <Text style={[styles.goalText, { color: theme.colors.textSecondary }]}>
        {todaySessions}/{dailyGoal} sessions today
      </Text>
    </View>
  );
}

// ============================================================================
// ACHIEVEMENT GRID - Badge collection with SF Symbols
// ============================================================================

interface AchievementGridProps {
  achievements: AchievementProgress[];
  accentColor: string;
  theme: any;
}

function AchievementGrid({ achievements, accentColor, theme }: AchievementGridProps) {
  const { width: screenWidth } = useWindowDimensions();

  // Calculate badge width: (screen - padding*2 - gap*2) / 3
  const horizontalPadding = 20;
  const gap = 8;
  const badgeWidth = (screenWidth - horizontalPadding * 2 - gap * 2) / 3;

  // Get visible achievement definitions sorted by sortOrder
  const visibleDefinitions = getVisibleAchievements();

  // Create a map of progress by achievement ID for quick lookup
  // Safety check for initial render before hook completes
  const progressMap = new Map((achievements ?? []).map((a) => [a.achievementId, a]));

  return (
    <View style={styles.achievementsContainer}>
      <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
        ACHIEVEMENTS ({(achievements ?? []).filter((a) => a.isUnlocked).length}/{visibleDefinitions.length})
      </Text>

      <View style={styles.achievementsGrid}>
        {visibleDefinitions.map((definition) => {
          const progress = progressMap.get(definition.id);
          const isUnlocked = progress?.isUnlocked ?? false;
          const iconColor = isUnlocked ? accentColor : theme.colors.textSecondary;

          return (
            <View
              key={definition.id}
              style={[
                styles.achievementBadge,
                {
                  width: badgeWidth,
                  backgroundColor: theme.colors.surface,
                  opacity: isUnlocked ? 1 : 0.4,
                },
              ]}
            >
              {Platform.OS === "ios" ? (
                <SymbolView
                  name={definition.icon as any}
                  size={28}
                  tintColor={iconColor}
                  style={styles.achievementIcon}
                />
              ) : (
                <Ionicons
                  name={getIoniconForAchievement(definition.id)}
                  size={28}
                  color={iconColor}
                  style={styles.achievementIcon}
                />
              )}
              <Text
                style={[
                  styles.achievementName,
                  { color: isUnlocked ? theme.colors.textPrimary : theme.colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {definition.name}
              </Text>
              <Text
                style={[styles.achievementDesc, { color: theme.colors.textSecondary }]}
                numberOfLines={1}
              >
                {definition.description}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// Android fallback icons for achievements
function getIoniconForAchievement(id: string): any {
  const map: Record<string, string> = {
    // Commitment
    first_focus: "sparkles",
    morning_ritual: "sunny",
    night_owl: "moon",
    // Consistency
    streak_3: "flame-outline",
    streak_7: "flame",
    streak_14: "flame",
    streak_30: "flame",
    streak_100: "trophy",
    streak_365: "crown",
    // Completion
    completion_rate_80: "checkmark-circle",
    completion_rate_90: "checkmark-circle",
    completion_rate_95: "star-circle",
    perfect_day: "sunny",
    perfect_week: "calendar",
    // Depth
    first_deep: "water-outline",
    deep_10: "water",
    deep_50: "water",
    deep_100: "water",
    deep_marathon: "fitness",
    // Milestone
    sessions_10: "leaf-outline",
    sessions_50: "leaf",
    sessions_100: "ribbon",
    sessions_500: "ribbon",
    sessions_1000: "medal",
    hours_10: "time-outline",
    hours_50: "time",
    hours_100: "time",
  };
  return map[id] || "ribbon";
}

// ============================================================================
// MAIN SCREEN
// ============================================================================

export default function YouScreen() {
  const { theme } = useUnistyles();
  const isDark = theme.isDark;

  // Accent color
  const accentColorName = useAccentColor();
  const accent = theme.colors.accent[accentColorName];
  const accentColor = isDark ? accent.secondary : accent.primary;

  // SQLite-backed achievements and streak data
  const { achievements, streakData, refreshAchievements } = useAchievements();

  // Legacy MMKV data (for stats display until fully migrated)
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [profile, setProfile] = useState(() => getFocusProfile());
  const [currentStreak, setCurrentStreak] = useState(0);
  const [todaySessions, setTodaySessions] = useState(0);
  const [stats, setStats] = useState({ totalMinutes: 0, totalSessions: 0, completedSessions: 0 });

  // Animated values for streak card
  const cardScale = useSharedValue(1);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const triggerAnimation = useCallback(() => {
    cardScale.value = withSequence(
      withTiming(1.05, { duration: 150 }),
      withSpring(1, { damping: 12, stiffness: 150 })
    );
  }, []);

  const handleCardTap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    triggerAnimation();
  };

  // Load data on focus
  useFocusEffect(
    useCallback(() => {
      const history = getFocusHistory();
      const focusProfile = getFocusProfile();

      setSessions(history);
      setProfile(focusProfile);

      const streak = getCurrentStreak(history);
      setCurrentStreak(streak);
      setTodaySessions(getTodaySessionsCount(history));
      setStats(getTotalStats(history));

      // Update best streak if needed
      updateBestStreak(streak);

      // Refresh SQLite achievements
      refreshAchievements();

      // Trigger animation
      const timeout = setTimeout(triggerAnimation, 100);
      return () => clearTimeout(timeout);
    }, [triggerAnimation, refreshAchievements])
  );

  const openSettings = () => {
    router.push("/settings");
  };

  const hasData = sessions.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Native header with liquid glass */}
      <Stack.Header>
        <Stack.Header.Right>
          <Stack.Header.Button
            icon="gearshape"
            onPress={openSettings}
          />
        </Stack.Header.Right>
      </Stack.Header>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        alwaysBounceVertical={true}
      >
        {/* Streak Card - Hero */}
        <StreakCard
          currentStreak={currentStreak}
          bestStreak={profile.bestStreak}
          accentColor={accentColor}
          theme={theme}
          onTap={handleCardTap}
          animatedStyle={cardAnimatedStyle}
        />

        {/* Stats Cards */}
        <StatsCards
          totalMinutes={stats.totalMinutes}
          completedSessions={stats.completedSessions}
          totalSessions={stats.totalSessions}
          theme={theme}
        />

        {/* Daily Goal Progress */}
        <DailyGoalProgress
          todaySessions={todaySessions}
          dailyGoal={profile.dailyGoal}
          accentColor={accentColor}
          theme={theme}
        />

        {/* Achievements */}
        <AchievementGrid
          achievements={achievements}
          accentColor={accentColor}
          theme={theme}
        />

        {/* Empty state hint */}
        {!hasData && (
          <View style={styles.emptyHint}>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              Complete your first focus session to start tracking your progress!
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },

  // Streak Card
  streakCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    aspectRatio: 1,
    width: "50%",
    alignSelf: "center",
    ...theme.effects.shadow.card,
  },
  streakIcon: {
    marginBottom: theme.spacing.sm,
  },
  streakValue: {
    fontSize: 42,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.onImage.primary,
    fontVariant: ["tabular-nums"],
  },
  streakLabel: {
    fontSize: theme.typography.sizes.lg + 1,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.onImage.secondary,
    marginTop: theme.spacing.xs,
  },
  streakBest: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.onImage.faint,
    marginTop: theme.spacing.sm + 4,
  },

  // Stats Cards
  statsRow: {
    flexDirection: "row",
    gap: theme.spacing.sm + 4,
    marginBottom: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
  },
  statIcon: {
    marginBottom: theme.spacing.sm,
    opacity: 0.6,
  },
  statValue: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    fontSize: theme.typography.sizes.sm + 1,
    marginTop: theme.spacing.xs,
  },

  // Daily Goal
  goalContainer: {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
  },
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.sm + 4,
  },
  goalTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    letterSpacing: 0.5,
  },
  goalDots: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm + 4,
  },
  goalDot: {
    width: theme.spacing.lg,
    height: theme.spacing.lg,
    borderRadius: theme.spacing.sm + 4,
  },
  goalText: {
    fontSize: theme.typography.sizes.md,
  },

  // Achievements
  achievementsContainer: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm + 4,
  },
  achievementsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  achievementBadge: {
    padding: theme.spacing.sm + 4,
    borderRadius: theme.borderRadius.sm + 4,
    alignItems: "center",
  },
  achievementIcon: {
    marginBottom: theme.spacing.sm,
  },
  achievementName: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    textAlign: "center",
  },
  achievementDesc: {
    fontSize: theme.typography.sizes.xs,
    textAlign: "center",
    marginTop: 2,
  },

  // Empty state
  emptyHint: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    alignItems: "center",
  },
  emptyText: {
    fontSize: theme.typography.sizes.md + 1,
    textAlign: "center",
    lineHeight: 22,
  },
}));
