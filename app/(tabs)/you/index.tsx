import { useState, useCallback } from "react";
import { StyleSheet, View, Text, Pressable, ScrollView, Platform, useWindowDimensions } from "react-native";
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
  checkAchievements,
  updateBestStreak,
  ACHIEVEMENTS,
  getUnlockedAchievementIds,
} from "../../../utils/storage";
import type { FocusSession } from "../../../domain/types";
import { useUnistyles } from "react-native-unistyles";
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
  const styles = createStyles(theme);

  // SF Symbol intensity based on streak length
  const getStreakSymbol = (): string => {
    if (currentStreak >= 30) return "flame.circle.fill";
    if (currentStreak >= 14) return "flame.fill";
    return "flame";
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
  const styles = createStyles(theme);

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
  const styles = createStyles(theme);
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
  unlockedIds: Set<string>;
  accentColor: string;
  theme: any;
}

function AchievementGrid({ unlockedIds, accentColor, theme }: AchievementGridProps) {
  const styles = createStyles(theme);
  const { width: screenWidth } = useWindowDimensions();

  // Calculate badge width: (screen - padding*2 - gap*2) / 3
  const horizontalPadding = 20;
  const gap = 8;
  const badgeWidth = (screenWidth - horizontalPadding * 2 - gap * 2) / 3;

  const achievements = Object.values(ACHIEVEMENTS);

  return (
    <View style={styles.achievementsContainer}>
      <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>ACHIEVEMENTS</Text>

      <View style={styles.achievementsGrid}>
        {achievements.map((achievement) => {
          const isUnlocked = unlockedIds.has(achievement.id);
          const iconColor = isUnlocked ? accentColor : theme.colors.textSecondary;

          return (
            <View
              key={achievement.id}
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
                  name={achievement.icon as any}
                  size={28}
                  tintColor={iconColor}
                  style={styles.achievementIcon}
                />
              ) : (
                <Ionicons
                  name={getIoniconForAchievement(achievement.id)}
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
                {achievement.name}
              </Text>
              <Text
                style={[styles.achievementDesc, { color: theme.colors.textSecondary }]}
                numberOfLines={1}
              >
                {achievement.description}
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
    week_warrior: "flame",
    month_master: "trophy",
    century_club: "star",
    focus_pro: "locate",
    deep_diver: "diamond",
    consistency_king: "sparkles",
  };
  return map[id] || "ribbon";
}

// ============================================================================
// MAIN SCREEN
// ============================================================================

export default function YouScreen() {
  const { theme } = useUnistyles();
  const styles = createStyles(theme);
  const isDark = theme.isDark;

  // Accent color
  const accentColorName = useAccentColor();
  const accent = theme.colors.accent[accentColorName];
  const accentColor = isDark ? accent.secondary : accent.primary;

  // Focus data state
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [profile, setProfile] = useState(() => getFocusProfile());
  const [currentStreak, setCurrentStreak] = useState(0);
  const [todaySessions, setTodaySessions] = useState(0);
  const [stats, setStats] = useState({ totalMinutes: 0, totalSessions: 0, completedSessions: 0 });
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());

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
      setUnlockedIds(getUnlockedAchievementIds());

      // Update best streak if needed
      updateBestStreak(streak);

      // Check for new achievements
      checkAchievements(history);

      // Trigger animation
      const timeout = setTimeout(triggerAnimation, 100);
      return () => clearTimeout(timeout);
    }, [triggerAnimation])
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
          unlockedIds={unlockedIds}
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

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  // Streak Card
  streakCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderRadius: 24,
    marginBottom: 16,
    ...theme.effects.shadow.card,
  },
  streakIcon: {
    marginBottom: 8,
  },
  streakValue: {
    fontSize: 56,
    fontWeight: "800",
    color: theme.colors.onImage.primary,
    fontVariant: ["tabular-nums"],
  },
  streakLabel: {
    fontSize: 17,
    fontWeight: "600",
    color: theme.colors.onImage.secondary,
    marginTop: 4,
  },
  streakBest: {
    fontSize: 14,
    color: theme.colors.onImage.faint,
    marginTop: 12,
  },

  // Stats Cards
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  statIcon: {
    marginBottom: 8,
    opacity: 0.6,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    fontSize: 13,
    marginTop: 4,
  },

  // Daily Goal
  goalContainer: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  goalTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  goalDots: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  goalDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  goalText: {
    fontSize: 14,
  },

  // Achievements
  achievementsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  achievementsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  achievementBadge: {
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  achievementIcon: {
    marginBottom: 8,
  },
  achievementName: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  achievementDesc: {
    fontSize: 10,
    textAlign: "center",
    marginTop: 2,
  },

  // Empty state
  emptyHint: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
});
