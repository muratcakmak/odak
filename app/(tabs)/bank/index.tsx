/**
 * Stats Screen
 *
 * Focus analytics and patterns visualization.
 * Shows today's stats, 7-day/30-day/90-day charts, and session dot heatmap.
 *
 * Philosophy: "Time as texture" - dots represent focus, not just numbers.
 */

import React, { useMemo, useCallback, useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUnistyles } from 'react-native-unistyles';
import { useNavigation, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

import { getFocusHistory, storage, useAccentColor } from '../../../utils/storage';
import { hasLiquidGlassSupport } from '../../../utils/capabilities';
import { deduplicateSessions } from '../../../domain';
import type { FocusSession } from '../../../domain/types';

// Date utilities (no external deps)
function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
}

function subDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

function formatDayShort(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

// Types
interface DayStats {
  date: Date;
  day: string;
  sessions: number;
  minutes: number;
}

interface WeekStats {
  weekStart: Date;
  label: string;
  sessions: number;
  minutes: number;
}

interface MonthStats {
  monthStart: Date;
  label: string;
  sessions: number;
  minutes: number;
}

// Get start of week (Sunday)
function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  result.setDate(result.getDate() - day);
  result.setHours(0, 0, 0, 0);
  return result;
}

// Get start of month
function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

// Check if date is within range (inclusive)
function isWithinDays(date: Date, daysAgo: number): boolean {
  const now = new Date();
  const cutoff = subDays(now, daysAgo);
  cutoff.setHours(0, 0, 0, 0);
  return date >= cutoff;
}

// Format week label (e.g., "Jan 5")
function formatWeekLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Format month label (e.g., "Jan")
function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short' });
}

export default function BankScreen() {
  const insets = useSafeAreaInsets();
  const { theme, rt } = useUnistyles();
  const navigation = useNavigation();

  // Accent color from user settings
  const accentColorName = useAccentColor();
  const accent = theme.colors.accent[accentColorName];
  const accentColor = theme.isDark ? accent.secondary : accent.primary;

  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Header button color (match liquid glass handling)
  const isLiquidGlass = hasLiquidGlassSupport();
  const headerIconColor =
    isLiquidGlass && rt.themeName === 'light'
      ? theme.colors.textPrimary
      : theme.colors.textPrimary;

  // Set up header right button for History
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => router.push('/bank/history')}
          style={({ pressed }) => ({
            opacity: pressed ? 0.5 : 1,
            paddingHorizontal: 8,
          })}
          accessibilityLabel="View session history"
          accessibilityRole="button"
        >
          <Ionicons
            name="list-outline"
            size={22}
            color={headerIconColor}
          />
        </Pressable>
      ),
    });
  }, [navigation, headerIconColor]);

  // Load sessions on mount and when storage changes
  useEffect(() => {
    setSessions(getFocusHistory());

    const listener = storage.addOnValueChangedListener((key) => {
      if (key === 'focus_history') {
        queueMicrotask(() => {
          setSessions(getFocusHistory());
        });
      }
    });

    return () => listener.remove();
  }, []);

  // Pull to refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setSessions(getFocusHistory());
    setRefreshing(false);
  }, []);

  const deduplicatedSessions = useMemo(
    () => deduplicateSessions(sessions),
    [sessions]
  );

  // Today's stats
  const todayStats = useMemo(() => {
    const todaySessions = deduplicatedSessions.filter(
      (s) => isToday(new Date(s.startedAt)) && s.wasCompleted
    );
    return {
      count: todaySessions.length,
      minutes: todaySessions.reduce((acc, s) => acc + s.totalMinutes, 0),
    };
  }, [deduplicatedSessions]);

  // 7-day data
  const weekData = useMemo(() => {
    const days: DayStats[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = subDays(now, i);
      const daySessions = deduplicatedSessions.filter((s) => {
        const sessionDate = new Date(s.startedAt);
        return isSameDay(sessionDate, date) && s.wasCompleted;
      });

      days.push({
        date,
        day: formatDayShort(date),
        sessions: daySessions.length,
        minutes: daySessions.reduce((acc, s) => acc + s.totalMinutes, 0),
      });
    }

    return days;
  }, [deduplicatedSessions]);

  const maxMinutes = Math.max(...weekData.map((d) => d.minutes), 1);
  const weekTotal = weekData.reduce((acc, d) => acc + d.minutes, 0);
  const weekSessions = weekData.reduce((acc, d) => acc + d.sessions, 0);

  // 30-day data (grouped by week - 4 weeks)
  const monthData = useMemo(() => {
    const weeks: WeekStats[] = [];
    const now = new Date();

    for (let i = 3; i >= 0; i--) {
      const weekStart = startOfWeek(subDays(now, i * 7));
      const weekEnd = subDays(weekStart, -7);

      const weekSessions = deduplicatedSessions.filter((s) => {
        const sessionDate = new Date(s.startedAt);
        return (
          sessionDate >= weekStart &&
          sessionDate < weekEnd &&
          s.wasCompleted &&
          isWithinDays(sessionDate, 30)
        );
      });

      weeks.push({
        weekStart,
        label: formatWeekLabel(weekStart),
        sessions: weekSessions.length,
        minutes: weekSessions.reduce((acc, s) => acc + s.totalMinutes, 0),
      });
    }

    return weeks;
  }, [deduplicatedSessions]);

  const maxMonthMinutes = Math.max(...monthData.map((w) => w.minutes), 1);
  const monthTotal = monthData.reduce((acc, w) => acc + w.minutes, 0);
  const monthSessions = monthData.reduce((acc, w) => acc + w.sessions, 0);

  // 90-day data (grouped by month - 3 months)
  const quarterData = useMemo(() => {
    const months: MonthStats[] = [];
    const now = new Date();

    for (let i = 2; i >= 0; i--) {
      const monthStart = startOfMonth(
        new Date(now.getFullYear(), now.getMonth() - i, 1)
      );
      const monthEnd = startOfMonth(
        new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      );

      const monthSessions = deduplicatedSessions.filter((s) => {
        const sessionDate = new Date(s.startedAt);
        return (
          sessionDate >= monthStart &&
          sessionDate < monthEnd &&
          s.wasCompleted
        );
      });

      months.push({
        monthStart,
        label: formatMonthLabel(monthStart),
        sessions: monthSessions.length,
        minutes: monthSessions.reduce((acc, s) => acc + s.totalMinutes, 0),
      });
    }

    return months;
  }, [deduplicatedSessions]);

  const maxQuarterMinutes = Math.max(...quarterData.map((m) => m.minutes), 1);
  const quarterTotal = quarterData.reduce((acc, m) => acc + m.minutes, 0);
  const quarterSessions = quarterData.reduce((acc, m) => acc + m.sessions, 0);

  // Check if current period for highlighting
  const isCurrentWeek = (weekStart: Date): boolean => {
    const now = new Date();
    const currentWeekStart = startOfWeek(now);
    return weekStart.getTime() === currentWeekStart.getTime();
  };

  const isCurrentMonth = (monthStart: Date): boolean => {
    const now = new Date();
    return (
      monthStart.getMonth() === now.getMonth() &&
      monthStart.getFullYear() === now.getFullYear()
    );
  };

  // Colors
  const cardBg = theme.colors.glass.regular;
  const barEmpty = theme.colors.glass.regular;
  const barFilled = accentColor;
  const barFilledFaded = theme.colors.glass.tinted;
  const dotColor = accentColor;

  // Tab bar height estimate
  const tabBarHeight = 90;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: tabBarHeight + insets.bottom },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.colors.textTertiary}
        />
      }
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
    >
      {/* Today Card */}
      <Animated.View
        entering={FadeInDown.delay(0).duration(400)}
        style={[styles.card, { backgroundColor: cardBg }]}
      >
        <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>
          Today
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
              {todayStats.count}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>
              sessions
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: accentColor }]}>
              {todayStats.minutes}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>
              minutes
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Week Chart */}
      <Animated.View
        entering={FadeInDown.delay(100).duration(400)}
        style={[styles.card, { backgroundColor: cardBg }]}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>
            Last 7 days
          </Text>
          <Text style={[styles.weekSummary, { color: theme.colors.textPrimary }]}>
            {weekTotal} min · {weekSessions} sessions
          </Text>
        </View>

        {/* Bar chart */}
        <View style={styles.chartContainer}>
          {weekData.map((day, index) => {
            const heightPercent =
              day.minutes > 0
                ? Math.max((day.minutes / maxMinutes) * 100, 8)
                : 8;
            const isActiveToday = isToday(day.date);
            const barColor =
              day.minutes > 0
                ? isActiveToday
                  ? barFilled
                  : barFilledFaded
                : barEmpty;

            return (
              <Animated.View
                key={day.day + index}
                entering={FadeIn.delay(index * 50).duration(300)}
                style={styles.barColumn}
              >
                <View style={styles.barWrapper}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${heightPercent}%`,
                        backgroundColor: barColor,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.dayLabel,
                    {
                      color: isActiveToday
                        ? theme.colors.textPrimary
                        : theme.colors.textTertiary,
                      fontWeight: isActiveToday ? '600' : '400',
                    },
                  ]}
                >
                  {day.day}
                </Text>
              </Animated.View>
            );
          })}
        </View>
      </Animated.View>

      {/* 30-Day Chart (Weekly) */}
      <Animated.View
        entering={FadeInDown.delay(200).duration(400)}
        style={[styles.card, { backgroundColor: cardBg }]}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>
            Last 30 days
          </Text>
          <Text style={[styles.weekSummary, { color: theme.colors.textPrimary }]}>
            {monthTotal} min · {monthSessions} sessions
          </Text>
        </View>

        {/* Weekly bar chart */}
        <View style={styles.chartContainer}>
          {monthData.map((week, index) => {
            const heightPercent =
              week.minutes > 0
                ? Math.max((week.minutes / maxMonthMinutes) * 100, 8)
                : 8;
            const isCurrent = isCurrentWeek(week.weekStart);
            const barColor =
              week.minutes > 0
                ? isCurrent
                  ? barFilled
                  : barFilledFaded
                : barEmpty;

            return (
              <Animated.View
                key={week.label + index}
                entering={FadeIn.delay(index * 50).duration(300)}
                style={styles.barColumn}
              >
                <View style={styles.barWrapper}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${heightPercent}%`,
                        backgroundColor: barColor,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.dayLabel,
                    {
                      color: isCurrent
                        ? theme.colors.textPrimary
                        : theme.colors.textTertiary,
                      fontWeight: isCurrent ? '600' : '400',
                    },
                  ]}
                >
                  {week.label}
                </Text>
              </Animated.View>
            );
          })}
        </View>
      </Animated.View>

      {/* 90-Day Chart (Monthly) */}
      <Animated.View
        entering={FadeInDown.delay(300).duration(400)}
        style={[styles.card, { backgroundColor: cardBg }]}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>
            Last 90 days
          </Text>
          <Text style={[styles.weekSummary, { color: theme.colors.textPrimary }]}>
            {quarterTotal} min · {quarterSessions} sessions
          </Text>
        </View>

        {/* Monthly bar chart */}
        <View style={styles.chartContainer}>
          {quarterData.map((month, index) => {
            const heightPercent =
              month.minutes > 0
                ? Math.max((month.minutes / maxQuarterMinutes) * 100, 8)
                : 8;
            const isCurrent = isCurrentMonth(month.monthStart);
            const barColor =
              month.minutes > 0
                ? isCurrent
                  ? barFilled
                  : barFilledFaded
                : barEmpty;

            return (
              <Animated.View
                key={month.label + index}
                entering={FadeIn.delay(index * 50).duration(300)}
                style={styles.barColumn}
              >
                <View style={styles.barWrapper}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${heightPercent}%`,
                        backgroundColor: barColor,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.dayLabel,
                    {
                      color: isCurrent
                        ? theme.colors.textPrimary
                        : theme.colors.textTertiary,
                      fontWeight: isCurrent ? '600' : '400',
                    },
                  ]}
                >
                  {month.label}
                </Text>
              </Animated.View>
            );
          })}
        </View>
      </Animated.View>

      {/* Dot Heatmap */}
      <Animated.View
        entering={FadeInDown.delay(400).duration(400)}
        style={[styles.card, { backgroundColor: cardBg }]}
      >
        <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>
          Session dots
        </Text>

        {weekSessions > 0 ? (
          <View style={styles.dotsContainer}>
            {weekData.flatMap((day, dayIndex) =>
              Array.from({ length: day.sessions }).map((_, i) => (
                <Animated.View
                  key={`${day.day}-${dayIndex}-${i}`}
                  entering={FadeIn.delay((dayIndex * 4 + i) * 30).duration(200)}
                  style={[styles.dot, { backgroundColor: dotColor }]}
                />
              ))
            )}
          </View>
        ) : (
          <Text style={[styles.emptyText, { color: theme.colors.textTertiary }]}>
            Complete sessions to see dots here
          </Text>
        )}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  card: {
    padding: theme.spacing.lg - 4,
    borderRadius: theme.borderRadius.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg - 4,
  },
  cardLabel: {
    fontSize: theme.typography.sizes.sm + 1,
    fontWeight: theme.typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.xl,
  },
  statItem: {
    flex: 1,
  },
  statValue: {
    fontSize: theme.typography.sizes.display - theme.spacing.sm,
    fontWeight: theme.typography.weights.semibold,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: theme.typography.sizes.md,
    marginTop: theme.spacing.xs,
  },
  weekSummary: {
    fontSize: theme.typography.sizes.sm + 1,
    fontWeight: theme.typography.weights.medium,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 120,
    gap: theme.spacing.sm,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  barWrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: 24,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    minHeight: 8,
  },
  dayLabel: {
    fontSize: theme.typography.sizes.sm - 1,
    textTransform: 'uppercase',
  },
  dotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  emptyText: {
    fontSize: theme.typography.sizes.md,
  },
}));
