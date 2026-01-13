import { useLocalSearchParams, router } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ImageBackground,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassView } from "expo-glass-effect";
import { hasLiquidGlassSupport } from "../utils/capabilities";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import Ionicons from "@expo/vector-icons/Ionicons";
import { DatePicker, Host } from "@expo/ui/swift-ui";
import { datePickerStyle, tint } from "@expo/ui/swift-ui/modifiers";
import {
  getAheadEvents,
  getSinceEvents,
  useAccentColor,
  type AheadEvent,
  type SinceEvent,
} from "../utils/storage";
import { AdaptivePillButton } from "./ui";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

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

// Calendar Section Component using native DatePicker
const CalendarSection = React.memo(function CalendarSection({
  targetDate,
  isAhead,
  accentColor,
}: {
  targetDate: Date;
  isAhead: boolean;
  accentColor: string;
}) {
  const { theme } = useUnistyles();

  // Memoize the date range to prevent creating new Date objects on every render
  const dateRange = React.useMemo(() => {
    const now = Date.now();
    return isAhead
      ? {
        start: new Date(now),
        end: new Date(now + 10 * 365 * 24 * 60 * 60 * 1000),
      }
      : {
        start: new Date(now - 50 * 365 * 24 * 60 * 60 * 1000),
        end: new Date(now),
      };
  }, [isAhead]);

  // Memoize card style to prevent object recreation
  const cardStyle = React.useMemo(() => ({
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.cardBorder,
    borderWidth: 0.5,
    ...theme.effects.shadow.cardGlow,
  }), [theme.colors.background, theme.colors.cardBorder, theme.effects.shadow.cardGlow]);

  if (Platform.OS !== "ios") {
    return null;
  }

  return (
    <View style={[styles.calendarContainer, cardStyle]} pointerEvents="none">
      <Host style={styles.calendarHost}>
        <DatePicker
          selection={targetDate}
          range={dateRange}
          modifiers={[datePickerStyle("graphical"), tint(accentColor)]}
        />
      </Host>
    </View>
  );
});

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

interface EventDetailScreenProps {
  /** Optional: specify event type to search only in that list */
  eventType?: "ahead" | "since";
}

export function EventDetailScreen({ eventType }: EventDetailScreenProps = {}) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const [eventData, setEventData] = useState<EventData>(null);
  const [countdown, setCountdown] = useState<CountdownValues | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Dynamic accent color
  const accentColorName = useAccentColor();
  // This screen is always dark-themed (Hero UI)
  const accentColor = theme.colors.accent[accentColorName].primary;

  const isDark = theme.isDark;
  const progressDone = isDark ? theme.colors.systemGray4 : theme.colors.systemGray5;
  const progressLeft = accentColor;

  const cardStyle = {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.cardBorder,
    borderWidth: 0.5,
    // Premium shadow
    ...theme.effects.shadow.cardGlow,
  };

  // Animated scroll value
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: interpolate(
        scrollY.value,
        [-350, 0],
        [700, 350],
        Extrapolate.CLAMP
      ),
      transform: [
        {
          translateY: interpolate(
            scrollY.value,
            [-350, 0, 350],
            [-175, 0, 0], // Parallax effect on scroll up
            Extrapolate.CLAMP
          ),
        },
      ],
    };
  });

  const textAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        scrollY.value,
        [0, 250],
        [1, 0],
        Extrapolate.CLAMP
      ),
      transform: [
        {
          translateY: interpolate(
            scrollY.value,
            [-350, 0, 350],
            [0, 0, 200], // Parallax effect
            Extrapolate.CLAMP
          ),
        },
      ],
    };
  });

  // Load event data
  useEffect(() => {
    if (!id) {
      setNotFound(true);
      return;
    }

    // If eventType is specified, only search in that list
    if (eventType === "ahead") {
      const aheadEvents = getAheadEvents();
      const aheadEvent = aheadEvents.find((e) => e.id === id);
      if (aheadEvent) {
        setEventData({ type: "ahead", event: aheadEvent });
        setNotFound(false);
      } else {
        setNotFound(true);
      }
      return;
    }

    if (eventType === "since") {
      const sinceEvents = getSinceEvents();
      const sinceEvent = sinceEvents.find((e) => e.id === id);
      if (sinceEvent) {
        setEventData({ type: "since", event: sinceEvent });
        setNotFound(false);
      } else {
        setNotFound(true);
      }
      return;
    }

    // No eventType specified - check both lists (legacy behavior)
    const aheadEvents = getAheadEvents();
    const aheadEvent = aheadEvents.find((e) => e.id === id);

    if (aheadEvent) {
      setEventData({ type: "ahead", event: aheadEvent });
      setNotFound(false);
      return;
    }

    const sinceEvents = getSinceEvents();
    const sinceEvent = sinceEvents.find((e) => e.id === id);

    if (sinceEvent) {
      setEventData({ type: "since", event: sinceEvent });
      setNotFound(false);
    } else {
      // Event not found in either list
      setNotFound(true);
    }
  }, [id, eventType]);

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

  if (notFound) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
          <Pressable
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/dates");
              }
            }}
            style={styles.notFoundBackButton}
          >
            <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
          </Pressable>
          <Ionicons name="calendar-outline" size={64} color={theme.colors.textSecondary} style={{ marginBottom: theme.spacing.md }} />
          <Text style={[styles.loadingText, { color: theme.colors.textPrimary, fontSize: theme.typography.sizes.lg + 2, fontWeight: "600" }]}>Event not found</Text>
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary, marginTop: theme.spacing.sm }]}>This event may have been deleted</Text>
        </View>
      </View>
    );
  }

  if (!eventData || !countdown) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading...</Text>
        </View>
      </View>
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



  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Background Image Layer (Absolute) */}
      <Animated.View style={[styles.heroBackgroundContainer, headerAnimatedStyle]}>
        <ImageBackground
          source={{ uri: image }}
          style={styles.heroBackground}
          imageStyle={styles.heroImage}
        >
          <View style={styles.heroOverlay} />
        </ImageBackground>
      </Animated.View>

      {/* Close Button (Fixed z-index) */}
      <View style={[styles.closeButtonContainer, { paddingTop: insets.top + 8 }]}>
        <AdaptivePillButton
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/dates");
            }
          }}
          style={styles.closeButton}
          fallbackBackgroundColor={theme.colors.overlay.medium}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.onImage.primary} />
        </AdaptivePillButton>
      </View>

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        {/* Transparent Header Spacer with embedded content */}
        <View style={styles.heroSpacer}>
          <Animated.View style={[styles.heroContent, textAnimatedStyle]}>
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
          </Animated.View>
        </View>

        {/* Progress Section - Only for ahead events */}
        {
          isAhead && (
            <View style={[styles.section, cardStyle]}>
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
                      backgroundColor: progressDone,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.progressLeft,
                    {
                      width: `${countdown.percentLeft}%`,
                      backgroundColor: progressLeft,
                    },
                  ]}
                />
              </View>
            </View>
          )
        }

        {/* Date Details Section */}
        <View style={[styles.section, cardStyle]}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
              {isAhead ? "From" : "Started"}
            </Text>
            <Text style={[styles.detailValue, { color: theme.colors.textPrimary }]}>
              {isAhead ? formatDate(new Date()) : formatDate(targetDate)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>{isAhead ? "Until" : "Now"}</Text>
            <Text style={[styles.detailValue, { color: theme.colors.textPrimary }]}>
              {isAhead ? formatDate(targetDate) : formatDate(new Date())}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
              {isAhead ? "Time between" : "Duration"}
            </Text>
            <Text style={[styles.detailValue, { color: theme.colors.textPrimary }]}>
              {formatTimeBetween(
                isAhead ? new Date() : targetDate,
                isAhead ? targetDate : new Date()
              )}
            </Text>
          </View>
          <View style={[styles.detailRow, styles.detailRowLast]}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
              {isAhead ? "Time left" : "Time elapsed"}
            </Text>
            <Text style={[styles.detailValue, { color: theme.colors.textPrimary }]}>
              {countdown.totalDays} day{countdown.totalDays !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>

        {/* Calendar Section */}
        <CalendarSection targetDate={targetDate} isAhead={isAhead} accentColor={accentColor} />

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {/* <HeaderPillButton style={styles.actionButton}>
            <Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.onImage.primary} />
          </HeaderPillButton>
          <HeaderPillButton style={styles.actionButton}>
            <Ionicons name="share-outline" size={20} color={theme.colors.onImage.primary} />
          </HeaderPillButton> */}
        </View>
      </Animated.ScrollView >
    </View >
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: theme.typography.sizes.lg,
  },
  notFoundBackButton: {
    position: "absolute",
    top: 60,
    left: theme.spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  // Close Button
  closeButtonContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: theme.spacing.md,
    zIndex: 10,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.overlay.medium,
    alignItems: "center",
    justifyContent: "center",
  },

  // Hero Background (Absolute)
  heroBackgroundContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 350,
    zIndex: 0,
  },
  heroBackground: {
    width: "100%",
    height: "100%",
  },
  // Spacer for ScrollView
  heroSpacer: {
    height: 350,
    justifyContent: "flex-end",
  },
  heroSection: {
    height: 350,
  },
  heroImage: {
    resizeMode: "cover",
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay.medium,
    justifyContent: "flex-end",
  },
  heroContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  mainCountdown: {
    fontSize: theme.typography.sizes.xxl + theme.spacing.sm + theme.spacing.xs,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.onImage.primary,
    marginBottom: theme.spacing.sm,
    textShadowColor: theme.colors.shadow.medium,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  eventTitle: {
    fontSize: theme.typography.sizes.xxl - 2,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.onImage.primary,
    marginBottom: theme.spacing.xs,
    textShadowColor: theme.colors.shadow.medium,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  eventSubtitle: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.onImage.muted,
    marginBottom: theme.spacing.lg,
    textShadowColor: theme.colors.shadow.medium,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Countdown Units
  countdownUnits: {
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: theme.spacing.lg,
  },
  countdownUnit: {
    alignItems: "center",
  },
  countdownValue: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.onImage.primary,
    textShadowColor: theme.colors.shadow.medium,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  countdownLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.onImage.subtle,
    marginTop: 2,
    textShadowColor: theme.colors.shadow.medium,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Section styles
  section: {
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    borderRadius: theme.borderRadius.sm + 4,
    padding: theme.spacing.md,
  },

  // Progress Section
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacing.sm,
  },
  progressText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.systemGray,
  },
  progressBar: {
    height: theme.spacing.sm,
    backgroundColor: theme.colors.systemGray4,
    borderRadius: theme.spacing.xs,
    flexDirection: "row",
    overflow: "hidden",
  },
  progressDone: {
    height: "100%",
    borderRadius: theme.spacing.xs,
  },
  progressLeft: {
    height: "100%",
    borderRadius: theme.spacing.xs,
  },

  // Detail Section
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.sm + 4,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.systemGray4,
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    fontSize: theme.typography.sizes.md + 1,
  },
  detailValue: {
    fontSize: theme.typography.sizes.md + 1,
  },

  // Calendar styles
  calendarContainer: {
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    borderRadius: theme.borderRadius.sm + 4,
    overflow: "hidden",
  },
  calendarHost: {
    width: "100%",
    height: 480,
  },

  // Action Buttons
  actionButtons: {
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm + 4,
  },
  pillButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  pillButtonFallback: {
    backgroundColor: theme.colors.systemGray5,
  },
  actionButton: {
    width: 50,
    height: 50,
  },
}));
