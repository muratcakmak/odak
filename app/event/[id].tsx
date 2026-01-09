import { useLocalSearchParams, router } from "expo-router";
import { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  ImageBackground,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassView } from "expo-glass-effect";
import { hasLiquidGlassSupport } from "../../utils/capabilities";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  getAheadEvents,
  getSinceEvents,
  type AheadEvent,
  type SinceEvent,
} from "../../utils/storage";

type EventData =
  | { type: "ahead"; event: AheadEvent }
  | { type: "since"; event: SinceEvent }
  | null;

interface CountdownValues {
  weeks: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalDays: number;
  percentDone: number;
  percentLeft: number;
}

function calculateCountdown(
  targetDate: Date,
  startDate: Date,
  isAhead: boolean
): CountdownValues {
  const now = new Date();

  if (isAhead) {
    // Countdown to future event
    const remainingMs = Math.max(0, targetDate.getTime() - now.getTime());
    const totalMs = targetDate.getTime() - startDate.getTime();
    const elapsedMs = now.getTime() - startDate.getTime();

    const percentDone = Math.min(
      100,
      Math.max(0, Math.round((elapsedMs / totalMs) * 100))
    );
    const percentLeft = 100 - percentDone;

    const weeks = Math.floor(remainingMs / (1000 * 60 * 60 * 24 * 7));
    const days = Math.floor(
      (remainingMs % (1000 * 60 * 60 * 24 * 7)) / (1000 * 60 * 60 * 24)
    );
    const hours = Math.floor(
      (remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

    const totalDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));

    return {
      weeks,
      days,
      hours,
      minutes,
      seconds,
      totalDays,
      percentDone,
      percentLeft,
    };
  } else {
    // Count up from past event (since)
    const elapsedMs = Math.max(0, now.getTime() - targetDate.getTime());

    const weeks = Math.floor(elapsedMs / (1000 * 60 * 60 * 24 * 7));
    const days = Math.floor(
      (elapsedMs % (1000 * 60 * 60 * 24 * 7)) / (1000 * 60 * 60 * 24)
    );
    const hours = Math.floor(
      (elapsedMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((elapsedMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((elapsedMs % (1000 * 60)) / 1000);

    const totalDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));

    return {
      weeks,
      days,
      hours,
      minutes,
      seconds,
      totalDays,
      percentDone: 0,
      percentLeft: 100,
    };
  }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeBetween(startDate: Date, endDate: Date): string {
  const diffMs = Math.abs(endDate.getTime() - startDate.getTime());
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? "s" : ""}`);
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? "s" : ""}`);
  if (minutes > 0 && days === 0)
    parts.push(`${minutes} minute${minutes !== 1 ? "s" : ""}`);

  return parts.join(", ") || "0 minutes";
}

function getMainTimeUnit(countdown: CountdownValues, isAhead: boolean): string {
  if (countdown.weeks > 0) {
    return `${countdown.weeks} week${countdown.weeks !== 1 ? "s" : ""} ${isAhead ? "left" : ""}`;
  }
  if (countdown.days > 0 || countdown.weeks === 0) {
    const totalDays = countdown.weeks * 7 + countdown.days;
    if (totalDays > 0) {
      return `${totalDays} day${totalDays !== 1 ? "s" : ""} ${isAhead ? "left" : ""}`;
    }
  }
  if (countdown.hours > 0) {
    return `${countdown.hours} hour${countdown.hours !== 1 ? "s" : ""} ${isAhead ? "left" : ""}`;
  }
  if (countdown.minutes > 0) {
    return `${countdown.minutes} minute${countdown.minutes !== 1 ? "s" : ""} ${isAhead ? "left" : ""}`;
  }
  return isAhead ? "Due now" : "Just started";
}

// Mini Calendar Component
function MiniCalendar({ targetDate }: { targetDate: Date }) {
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  const monthName = targetDate.toLocaleDateString("en-US", { month: "long" });

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();

  let startDay = firstDayOfMonth.getDay();
  startDay = startDay === 0 ? 6 : startDay - 1;

  const targetDay = targetDate.getDate();
  const today = new Date();
  const isCurrentMonth =
    today.getMonth() === month && today.getFullYear() === year;
  const currentDay = isCurrentMonth ? today.getDate() : -1;

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  return (
    <View style={styles.calendarContainer}>
      <View style={styles.calendarHeader}>
        <View style={styles.calendarTitleRow}>
          <Text style={styles.calendarMonth}>{monthName}</Text>
          <Text style={styles.calendarYear}>{year}</Text>
        </View>
        <View style={styles.calendarNavRow}>
          <Pressable style={styles.calendarNavButton}>
            <Ionicons name="chevron-back" size={16} color="#8E8E93" />
          </Pressable>
          <Pressable style={styles.calendarNavButton}>
            <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
          </Pressable>
          <Pressable style={styles.calendarNavButton}>
            <Ionicons name="calendar-outline" size={16} color="#8E8E93" />
          </Pressable>
        </View>
      </View>

      <View style={styles.weekDaysRow}>
        {weekDays.map((day) => (
          <View key={day} style={styles.weekDayCell}>
            <Text style={styles.weekDayText}>{day}</Text>
          </View>
        ))}
      </View>

      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={styles.weekRow}>
          {week.map((day, dayIndex) => {
            const isTarget = day === targetDay;
            const isCurrent = day === currentDay;
            const isHighlighted = day !== null && day <= targetDay;
            const isPast = day !== null && day < currentDay;

            return (
              <View key={dayIndex} style={styles.dayCell}>
                {day !== null ? (
                  <View
                    style={[
                      styles.dayCircle,
                      isHighlighted && styles.dayCircleHighlighted,
                      isPast && styles.dayCirclePast,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isHighlighted && styles.dayTextHighlighted,
                      ]}
                    >
                      {day}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.dayCircleEmpty} />
                )}
              </View>
            );
          })}
          {week.length < 7 &&
            Array(7 - week.length)
              .fill(null)
              .map((_, i) => (
                <View key={`empty-${i}`} style={styles.dayCell}>
                  <View style={styles.dayCircleEmpty} />
                </View>
              ))}
        </View>
      ))}
    </View>
  );
}

// Header Pill Button
function HeaderPillButton({
  children,
  onPress,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
}) {
  const isGlassAvailable = hasLiquidGlassSupport();

  if (isGlassAvailable) {
    return (
      <Pressable onPress={onPress}>
        <GlassView style={[styles.pillButton, style]} isInteractive>
          {children}
        </GlassView>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={[styles.pillButton, styles.pillButtonFallback, style]}
    >
      {children}
    </Pressable>
  );
}

export default function EventDetailScreen() {
  const { id, type } = useLocalSearchParams<{ id: string; type?: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [eventData, setEventData] = useState<EventData>(null);
  const [countdown, setCountdown] = useState<CountdownValues | null>(null);

  // Load event data
  useEffect(() => {
    if (!id) return;

    // Check ahead events first, then since events
    const aheadEvents = getAheadEvents();
    const aheadEvent = aheadEvents.find((e) => e.id === id);

    if (aheadEvent) {
      setEventData({ type: "ahead", event: aheadEvent });
      return;
    }

    const sinceEvents = getSinceEvents();
    const sinceEvent = sinceEvents.find((e) => e.id === id);

    if (sinceEvent) {
      setEventData({ type: "since", event: sinceEvent });
    }
  }, [id]);

  // Update countdown every second
  useEffect(() => {
    if (!eventData) return;

    const updateCountdown = () => {
      const isAhead = eventData.type === "ahead";
      const targetDate =
        eventData.type === "ahead"
          ? new Date(eventData.event.date)
          : new Date(eventData.event.startDate);
      const startDate = new Date(); // For ahead events, we use now as reference

      setCountdown(calculateCountdown(targetDate, startDate, isAhead));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [eventData]);

  const handleClose = () => {
    router.back();
  };

  if (!eventData || !countdown) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isAhead = eventData.type === "ahead";
  const event = eventData.event;
  const title = event.title;
  const targetDate =
    eventData.type === "ahead"
      ? new Date(eventData.event.date)
      : new Date(eventData.event.startDate);
  const image =
    event.image ||
    "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800";

  const colors = {
    background: "#000000",
    surface: "#1C1C1E",
    text: "#FFFFFF",
    textSecondary: "#8E8E93",
    accent: "#FF9500",
    progressDone: "#8E8E93",
    progressLeft: "#FF9500",
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section with Background Image */}
        <ImageBackground
          source={{ uri: image }}
          style={styles.heroSection}
          imageStyle={styles.heroImage}
        >
          <View style={styles.heroOverlay}>
            <View style={styles.heroContent}>
              {/* Main Countdown */}
              <Text style={styles.mainCountdown}>
                {getMainTimeUnit(countdown, isAhead)}
              </Text>

              {/* Title and Date */}
              <Text style={styles.eventTitle}>{title}</Text>
              <Text style={styles.eventSubtitle}>
                {isAhead ? "Ends on" : "Started"} {formatDate(targetDate)}
              </Text>

              {/* Countdown Units */}
              <View style={styles.countdownUnits}>
                <View style={styles.countdownUnit}>
                  <Text style={styles.countdownValue}>{countdown.weeks}</Text>
                  <Text style={styles.countdownLabel}>weeks</Text>
                </View>
                <View style={styles.countdownUnit}>
                  <Text style={styles.countdownValue}>{countdown.days}</Text>
                  <Text style={styles.countdownLabel}>days</Text>
                </View>
                <View style={styles.countdownUnit}>
                  <Text style={styles.countdownValue}>{countdown.hours}</Text>
                  <Text style={styles.countdownLabel}>hours</Text>
                </View>
                <View style={styles.countdownUnit}>
                  <Text style={styles.countdownValue}>{countdown.minutes}</Text>
                  <Text style={styles.countdownLabel}>minutes</Text>
                </View>
                <View style={styles.countdownUnit}>
                  <Text style={styles.countdownValue}>{countdown.seconds}</Text>
                  <Text style={styles.countdownLabel}>seconds</Text>
                </View>
              </View>
            </View>
          </View>
        </ImageBackground>

        {/* Progress Section - Only for ahead events */}
        {isAhead && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressText}>
                {countdown.percentDone}% done
              </Text>
              <Text style={styles.progressText}>
                {countdown.percentLeft}% left
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressDone,
                  {
                    width: `${countdown.percentDone}%`,
                    backgroundColor: colors.progressDone,
                  },
                ]}
              />
              <View
                style={[
                  styles.progressLeft,
                  {
                    width: `${countdown.percentLeft}%`,
                    backgroundColor: colors.progressLeft,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* Date Details Section */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              {isAhead ? "From" : "Started"}
            </Text>
            <Text style={styles.detailValue}>
              {isAhead ? formatDate(new Date()) : formatDate(targetDate)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{isAhead ? "Until" : "Now"}</Text>
            <Text style={styles.detailValue}>
              {isAhead ? formatDate(targetDate) : formatDate(new Date())}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              {isAhead ? "Time between" : "Duration"}
            </Text>
            <Text style={styles.detailValue}>
              {formatTimeBetween(
                isAhead ? new Date() : targetDate,
                isAhead ? targetDate : new Date()
              )}
            </Text>
          </View>
          <View style={[styles.detailRow, styles.detailRowLast]}>
            <Text style={styles.detailLabel}>
              {isAhead ? "Time left" : "Time elapsed"}
            </Text>
            <Text style={styles.detailValue}>
              {countdown.totalDays} day{countdown.totalDays !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>

        {/* Calendar Section */}
        <MiniCalendar targetDate={targetDate} />

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <HeaderPillButton style={styles.actionButton}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#FFFFFF" />
          </HeaderPillButton>
          <HeaderPillButton style={styles.actionButton}>
            <Ionicons name="share-outline" size={20} color="#FFFFFF" />
          </HeaderPillButton>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#8E8E93",
  },

  // Hero Section
  heroSection: {
    height: 300,
  },
  heroImage: {
    resizeMode: "cover",
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  heroContent: {
    padding: 20,
    paddingBottom: 24,
  },
  mainCountdown: {
    fontSize: 36,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  eventTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  eventSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 20,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Countdown Units
  countdownUnits: {
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 20,
  },
  countdownUnit: {
    alignItems: "center",
  },
  countdownValue: {
    fontSize: 24,
    fontWeight: "600",
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  countdownLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 2,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Section styles
  section: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
  },

  // Progress Section
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: "#8E8E93",
  },
  progressBar: {
    height: 8,
    backgroundColor: "#3A3A3C",
    borderRadius: 4,
    flexDirection: "row",
    overflow: "hidden",
  },
  progressDone: {
    height: "100%",
    borderRadius: 4,
  },
  progressLeft: {
    height: "100%",
    borderRadius: 4,
  },

  // Detail Section
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#3A3A3C",
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    fontSize: 15,
    color: "#8E8E93",
  },
  detailValue: {
    fontSize: 15,
    color: "#FFFFFF",
  },

  // Calendar styles
  calendarContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#1C1C1E",
    borderRadius: 12,
    padding: 16,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  calendarTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  calendarMonth: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  calendarYear: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FF9500",
  },
  calendarNavRow: {
    flexDirection: "row",
    gap: 12,
  },
  calendarNavButton: {
    padding: 4,
  },
  weekDaysRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekDayCell: {
    flex: 1,
    alignItems: "center",
  },
  weekDayText: {
    fontSize: 12,
    color: "#8E8E93",
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  dayCell: {
    flex: 1,
    alignItems: "center",
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleHighlighted: {
    backgroundColor: "#FF9500",
  },
  dayCirclePast: {
    opacity: 0.5,
  },
  dayCircleEmpty: {
    width: 32,
    height: 32,
  },
  dayText: {
    fontSize: 14,
    color: "#FFFFFF",
  },
  dayTextHighlighted: {
    color: "#000000",
    fontWeight: "600",
  },

  // Action Buttons
  actionButtons: {
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 12,
  },
  pillButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  pillButtonFallback: {
    backgroundColor: "#2C2C2E",
  },
  actionButton: {
    width: 50,
    height: 50,
  },
});
