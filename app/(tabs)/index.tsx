import { useMemo, useState, useCallback, useRef, useEffect, memo } from "react";
import { StyleSheet, View, Text, Pressable, useWindowDimensions, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import Animated, {
  FadeIn,
  Easing,
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  SharedValue,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { Host, ContextMenu, Button, Divider } from "@expo/ui/swift-ui";
import { useTheme } from "../../hooks/useTheme";
import { getAheadEvents, getSinceEvents, type AheadEvent, type SinceEvent } from "../../utils/storage";

// View types
type ViewType = "now" | "today" | "month" | "year" | "since" | "ahead";

interface ViewConfig {
  type: ViewType;
  eventId?: string;
  eventTitle?: string;
}

// Get current time info
function getNowInfo() {
  const now = new Date();
  const minutesPassed = now.getMinutes();
  const minutesLeft = 60 - minutesPassed;
  const currentTime = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return { total: 60, passed: minutesPassed, left: minutesLeft, label: currentTime };
}

// Get today info
function getTodayInfo() {
  const now = new Date();
  const hoursPassed = now.getHours();
  const hoursLeft = 24 - hoursPassed;
  const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
  return { total: 24, passed: hoursPassed, left: hoursLeft, label: dayName };
}

// Get month info
function getMonthInfo() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysPassed = now.getDate();
  const daysLeft = daysInMonth - daysPassed;
  const monthName = now.toLocaleDateString("en-US", { month: "long" });
  return { total: daysInMonth, passed: daysPassed, left: daysLeft, label: monthName };
}

// Get year info
function getYearInfo() {
  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31);
  const totalDays = Math.ceil((endOfYear.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const dayOfYear = Math.ceil((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  const daysLeft = totalDays - dayOfYear;
  return { total: totalDays, passed: dayOfYear, left: daysLeft, label: String(year) };
}

// Get since event info
function getSinceEventInfo(event: SinceEvent) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const start = new Date(event.startDate);
  start.setHours(0, 0, 0, 0);
  const daysPassed = Math.max(0, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const total = 365;
  const daysLeft = total - daysPassed;
  return { total, passed: daysPassed, left: daysLeft, label: event.title };
}

// Get ahead event info
function getAheadEventInfo(event: AheadEvent) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(event.date);
  target.setHours(0, 0, 0, 0);
  const daysLeft = Math.max(0, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const total = daysLeft;
  return { total, passed: 0, left: daysLeft, label: event.title, isCountdown: true };
}

// Format time left text
function formatTimeLeft(left: number, viewType: ViewType, isCountdown?: boolean): string {
  if (isCountdown) {
    return `${left} days to start`;
  }
  switch (viewType) {
    case "now":
      return `${left} minutes left`;
    case "today":
      return `${left} hours left`;
    default:
      return `${left} days left`;
  }
}

// Get label for a specific dot index based on view type
function getDotLabel(dotIndex: number, viewType: ViewType, eventStartDate?: string): string {
  const now = new Date();

  switch (viewType) {
    case "now": {
      // Show the minute (e.g., "12:05")
      const hour = now.getHours();
      const minute = dotIndex;
      const date = new Date(now);
      date.setMinutes(minute);
      return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    }
    case "today": {
      // Show the hour (e.g., "3 PM")
      const date = new Date(now);
      date.setHours(dotIndex, 0, 0, 0);
      return date.toLocaleTimeString("en-US", { hour: "numeric", hour12: true });
    }
    case "month": {
      // Show the date (e.g., "Jan 15")
      const date = new Date(now.getFullYear(), now.getMonth(), dotIndex + 1);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    case "year": {
      // Show the date (e.g., "Jan 15")
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const date = new Date(startOfYear.getTime() + dotIndex * 24 * 60 * 60 * 1000);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    case "since": {
      // Show days since start
      if (eventStartDate) {
        const start = new Date(eventStartDate);
        const date = new Date(start.getTime() + dotIndex * 24 * 60 * 60 * 1000);
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      }
      return `Day ${dotIndex + 1}`;
    }
    case "ahead": {
      // Show days until event
      return `Day ${dotIndex + 1}`;
    }
    default:
      return `${dotIndex + 1}`;
  }
}

// Get columns based on view type and total
function getColumns(viewType: ViewType, total: number): number {
  switch (viewType) {
    case "now":
      return 10;
    case "today":
      return 6;
    case "month":
      return 7;
    case "year":
    case "since":
      return 14;
    case "ahead":
      if (total <= 10) return 5;
      if (total <= 30) return 6;
      if (total <= 60) return 8;
      if (total <= 100) return 10;
      return 12;
    default:
      return 14;
  }
}

// Simple static dot - no animations, pure View
const StaticDot = memo(function StaticDot({
  isPassed,
  size,
  passedColor,
  remainingColor,
}: {
  isPassed: boolean;
  size: number;
  passedColor: string;
  remainingColor: string;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: isPassed ? passedColor : remainingColor,
      }}
    />
  );
});

// Selection highlight overlay - single animated component
const SelectionHighlight = memo(function SelectionHighlight({
  selectedDot,
  dotSize,
  cellSize,
  columns,
  total,
  color,
}: {
  selectedDot: SharedValue<number>;
  dotSize: number;
  cellSize: number;
  columns: number;
  total: number;
  color: string;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const index = selectedDot.value;
    if (index < 0 || index >= total) {
      return { opacity: 0 };
    }
    const row = Math.floor(index / columns);
    const col = index % columns;
    const x = col * cellSize + (cellSize - dotSize) / 2;
    const y = row * cellSize + (cellSize - dotSize) / 2;

    return {
      opacity: 1,
      transform: [
        { translateX: x },
        { translateY: y },
        { scale: 1.4 },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          width: dotSize - 2,
          height: dotSize - 2,
          borderRadius: (dotSize - 2) / 2,
          backgroundColor: color,
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 8,
        },
        animatedStyle,
      ]}
      pointerEvents="none"
    />
  );
});

// Memoized Pill button component
const PillButton = memo(function PillButton({
  children,
  onPress,
  style,
  fallbackColor,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
  fallbackColor?: string;
}) {
  const isGlassAvailable = isLiquidGlassAvailable();

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
    <Pressable onPress={onPress} style={[styles.pillButton, { backgroundColor: fallbackColor || "#1C1C1E" }, style]}>
      {children}
    </Pressable>
  );
});

// Grid of dots - renders all dots as simple Views
const DotGrid = memo(function DotGrid({
  total,
  passed,
  isCountdown,
  columns,
  dotSize,
  dotGap,
  passedColor,
  remainingColor,
}: {
  total: number;
  passed: number;
  isCountdown: boolean;
  columns: number;
  dotSize: number;
  dotGap: number;
  passedColor: string;
  remainingColor: string;
}) {
  // Pre-generate dot data
  const dots = useMemo(() => {
    return Array.from({ length: total }, (_, i) => ({
      id: i,
      isPassed: isCountdown ? false : i < passed,
    }));
  }, [total, passed, isCountdown]);

  return (
    <>
      {dots.map((dot) => (
        <View
          key={dot.id}
          style={{
            width: dotSize,
            height: dotSize,
            marginRight: (dot.id + 1) % columns === 0 ? 0 : dotGap,
            marginBottom: dotGap,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <StaticDot
            isPassed={dot.isPassed}
            size={dotSize - 2}
            passedColor={passedColor}
            remainingColor={remainingColor}
          />
        </View>
      ))}
    </>
  );
});

// Main component
export default function LeftScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const { isDark, colors: themeColors } = useTheme();
  const [viewConfig, setViewConfig] = useState<ViewConfig>({ type: "year" });
  const [sinceEvents, setSinceEvents] = useState<SinceEvent[]>([]);
  const [aheadEvents, setAheadEvents] = useState<AheadEvent[]>([]);
  const [selectedDotLabel, setSelectedDotLabel] = useState<string | null>(null);

  // Shared value for selected dot (runs on UI thread)
  const selectedDot = useSharedValue<number>(-1);
  const lastHapticDot = useRef<number>(-1);

  // Load events
  useEffect(() => {
    setSinceEvents(getSinceEvents());
    setAheadEvents(getAheadEvents());
  }, []);

  // Theme colors - memoized
  const colors = useMemo(() => ({
    background: themeColors.background,
    cardBackground: themeColors.card,
    text: themeColors.textPrimary,
    secondaryText: themeColors.textSecondary,
    passedDot: isDark ? "#3A3A3C" : "#C7C7CC",
    remainingDot: themeColors.textPrimary,
  }), [themeColors, isDark]);

  // Get view info based on current view config
  const viewInfo = useMemo(() => {
    switch (viewConfig.type) {
      case "now":
        return getNowInfo();
      case "today":
        return getTodayInfo();
      case "month":
        return getMonthInfo();
      case "year":
        return getYearInfo();
      case "since": {
        const event = sinceEvents.find(e => e.id === viewConfig.eventId);
        if (event) return getSinceEventInfo(event);
        return getYearInfo();
      }
      case "ahead": {
        const event = aheadEvents.find(e => e.id === viewConfig.eventId);
        if (event) return getAheadEventInfo(event);
        return getYearInfo();
      }
      default:
        return getYearInfo();
    }
  }, [viewConfig, sinceEvents, aheadEvents]);

  const { total, passed, left, label } = viewInfo;
  const isCountdown = (viewInfo as any).isCountdown;
  const columns = getColumns(viewConfig.type, total);
  const timeLeftText = formatTimeLeft(left, viewConfig.type, isCountdown);

  // Memoized callbacks
  const openShareSheet = useCallback(() => {
    router.push({
      pathname: "/share",
      params: {
        label,
        timeLeftText,
        total,
        passed,
        viewType: viewConfig.type,
      },
    });
  }, [label, timeLeftText, total, passed, viewConfig.type]);

  // Memoized grid dimensions
  const gridDimensions = useMemo(() => {
    const cardPadding = 24;
    const cardMargin = 20;
    const availableWidth = screenWidth - (cardMargin * 2) - (cardPadding * 2);
    const dotGap = viewConfig.type === "now" || viewConfig.type === "today" ? 12 : 8;
    const calculatedDotSize = Math.floor((availableWidth - (dotGap * (columns - 1))) / columns);
    const dotSize = Math.min(calculatedDotSize, 24);
    const cellSize = dotSize + dotGap;
    const gridWidth = columns * dotSize + (columns - 1) * dotGap;
    return { dotGap, dotSize, cellSize, gridWidth };
  }, [screenWidth, columns, viewConfig.type]);

  const { dotGap, dotSize, cellSize, gridWidth } = gridDimensions;

  // Get event start date for since view
  const eventStartDate = useMemo(() => {
    if (viewConfig.type === "since") {
      const event = sinceEvents.find(e => e.id === viewConfig.eventId);
      return event?.startDate;
    }
    return undefined;
  }, [viewConfig, sinceEvents]);

  // Haptic feedback and label update handler (called from worklet via runOnJS)
  const triggerHapticAndLabel = useCallback((dotIndex: number) => {
    if (dotIndex !== lastHapticDot.current && dotIndex >= 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      lastHapticDot.current = dotIndex;
      setSelectedDotLabel(getDotLabel(dotIndex, viewConfig.type, eventStartDate));
    } else if (dotIndex < 0) {
      lastHapticDot.current = -1;
      setSelectedDotLabel(null);
    }
  }, [viewConfig.type, eventStartDate]);

  // Pan gesture - fully worklet-based
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onStart((e) => {
          'worklet';
          const col = Math.floor(e.x / cellSize);
          const row = Math.floor(e.y / cellSize);
          let dotIndex = -1;
          if (col >= 0 && col < columns && row >= 0) {
            const idx = row * columns + col;
            if (idx >= 0 && idx < total) {
              dotIndex = idx;
            }
          }
          selectedDot.value = dotIndex;
          runOnJS(triggerHapticAndLabel)(dotIndex);
        })
        .onUpdate((e) => {
          'worklet';
          const col = Math.floor(e.x / cellSize);
          const row = Math.floor(e.y / cellSize);
          let dotIndex = -1;
          if (col >= 0 && col < columns && row >= 0) {
            const idx = row * columns + col;
            if (idx >= 0 && idx < total) {
              dotIndex = idx;
            }
          }
          if (dotIndex !== selectedDot.value) {
            selectedDot.value = dotIndex;
            runOnJS(triggerHapticAndLabel)(dotIndex);
          }
        })
        .onEnd(() => {
          'worklet';
          selectedDot.value = -1;
          runOnJS(triggerHapticAndLabel)(-1);
        }),
    [cellSize, columns, total, triggerHapticAndLabel]
  );

  const isGlassAvailable = isLiquidGlassAvailable();
  const viewKey = `${viewConfig.type}-${viewConfig.eventId || ''}`;

  // Memoized view config setters
  const setNowView = useCallback(() => setViewConfig({ type: "now" }), []);
  const setTodayView = useCallback(() => setViewConfig({ type: "today" }), []);
  const setMonthView = useCallback(() => setViewConfig({ type: "month" }), []);
  const setYearView = useCallback(() => setViewConfig({ type: "year" }), []);

  const gridContent = (
    <ScrollView
      style={styles.dotsScrollView}
      contentContainerStyle={styles.dotsScrollContent}
      showsVerticalScrollIndicator={false}
    >
      <GestureDetector gesture={panGesture}>
        <Animated.View
          key={viewKey}
          entering={FadeIn.duration(250).easing(Easing.out(Easing.quad))}
          style={[styles.gridContainer, { width: gridWidth, position: 'relative' }]}
        >
          <DotGrid
            total={total}
            passed={passed}
            isCountdown={isCountdown}
            columns={columns}
            dotSize={dotSize}
            dotGap={dotGap}
            passedColor={colors.passedDot}
            remainingColor={colors.remainingDot}
          />
          <SelectionHighlight
            selectedDot={selectedDot}
            dotSize={dotSize}
            cellSize={cellSize}
            columns={columns}
            total={total}
            color={colors.remainingDot}
          />
        </Animated.View>
      </GestureDetector>
    </ScrollView>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        {Platform.OS === "ios" ? (
          <Host style={{ height: 44 }}>
            <ContextMenu activationMethod="singlePress">
              <ContextMenu.Items>
                <Button label="Now" systemImage="clock" onPress={setNowView} />
                <Button label="Today" systemImage="sun.max" onPress={setTodayView} />
                <Button label="Month" systemImage="calendar" onPress={setMonthView} />
                <Button label="Year" systemImage="calendar" onPress={setYearView} />
                {(sinceEvents.length > 0 || aheadEvents.length > 0) && <Divider />}
                {sinceEvents.map((event) => (
                  <Button
                    key={event.id}
                    label={event.title}
                    systemImage="circle.grid.2x2"
                    onPress={() => setViewConfig({ type: "since", eventId: event.id, eventTitle: event.title })}
                  />
                ))}
                {aheadEvents.map((event) => (
                  <Button
                    key={event.id}
                    label={event.title}
                    systemImage="macwindow"
                    onPress={() => setViewConfig({ type: "ahead", eventId: event.id, eventTitle: event.title })}
                  />
                ))}
              </ContextMenu.Items>
              <ContextMenu.Trigger>
                <View>
                  <PillButton fallbackColor={colors.cardBackground}>
                    <Text style={[styles.labelText, { color: colors.text }]}>{label}</Text>
                  </PillButton>
                </View>
              </ContextMenu.Trigger>
            </ContextMenu>
          </Host>
        ) : (
          <PillButton fallbackColor={colors.cardBackground}>
            <Text style={[styles.labelText, { color: colors.text }]}>{label}</Text>
          </PillButton>
        )}

        <View style={styles.headerRight}>
          <PillButton fallbackColor={colors.cardBackground}>
            <Text style={[styles.daysLeftText, { color: colors.text }]}>
              {selectedDotLabel || timeLeftText}
            </Text>
          </PillButton>

          <PillButton style={styles.shareButton} onPress={openShareSheet} fallbackColor={colors.cardBackground}>
            <Ionicons name="share-outline" size={20} color={colors.text} />
          </PillButton>
        </View>
      </View>

      {/* Dot Grid Card */}
      <View style={styles.cardContainer}>
        {isGlassAvailable ? (
          <GlassView style={styles.gridCard}>
            {gridContent}
          </GlassView>
        ) : (
          <View style={[styles.gridCard, { backgroundColor: colors.cardBackground }]}>
            {gridContent}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pillButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  shareButton: {
    paddingHorizontal: 12,
  },
  labelText: {
    fontSize: 17,
    fontWeight: "600",
  },
  daysLeftText: {
    fontSize: 15,
    fontWeight: "500",
  },
  cardContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  gridCard: {
    flex: 1,
    borderRadius: 24,
    overflow: "hidden",
  },
  dotsScrollView: {
    flex: 1,
  },
  dotsScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
});
