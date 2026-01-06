import { useMemo, useState, useCallback, useRef } from "react";
import { StyleSheet, View, Text, Pressable, useWindowDimensions, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { runOnJS } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";

// Calculate days info for current year
function getYearInfo() {
  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31);

  const totalDays = Math.ceil((endOfYear.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const dayOfYear = Math.ceil((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  const daysLeft = totalDays - dayOfYear;

  return { year, totalDays, dayOfYear, daysLeft, startOfYear };
}

// Get date from day index
function getDateFromDayIndex(dayIndex: number, year: number): Date {
  const date = new Date(year, 0, 1);
  date.setDate(date.getDate() + dayIndex);
  return date;
}

// Format date for display
function formatDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  };
  return date.toLocaleDateString('en-US', options);
}

// Simple Dot component with selection state
function Dot({
  isPassed,
  isSelected,
  dotSize,
  passedColor,
  remainingColor,
  selectedColor,
}: {
  isPassed: boolean;
  isSelected: boolean;
  dotSize: number;
  passedColor: string;
  remainingColor: string;
  selectedColor: string;
}) {
  return (
    <View
      style={[
        styles.dot,
        {
          width: dotSize - 2,
          height: dotSize - 2,
          backgroundColor: isSelected
            ? selectedColor
            : isPassed
              ? passedColor
              : remainingColor,
          transform: [{ scale: isSelected ? 1.4 : 1 }],
          shadowColor: isSelected ? selectedColor : "transparent",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: isSelected ? 0.9 : 0,
          shadowRadius: isSelected ? 10 : 0,
        },
      ]}
    />
  );
}

// Pill button component
function PillButton({
  children,
  onPress,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
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
    <Pressable onPress={onPress} style={[styles.pillButton, styles.pillButtonFallback, style]}>
      {children}
    </Pressable>
  );
}

// Main component
export default function RekoScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { year, totalDays, dayOfYear, daysLeft } = getYearInfo();
  const [selectedDot, setSelectedDot] = useState<number | null>(null);
  const lastHapticDot = useRef<number | null>(null);

  // Theme colors
  const colors = {
    background: isDark ? "#000000" : "#FFFFFF",
    cardBackground: isDark ? "#1C1C1E" : "#F2F2F7",
    passedDot: isDark ? "#3A3A3C" : "#C7C7CC",
    remainingDot: isDark ? "#FFFFFF" : "#000000",
    selectedDot: isDark ? "#FFFFFF" : "#000000",
    text: isDark ? "#FFFFFF" : "#000000",
    secondaryText: isDark ? "#8E8E93" : "#8E8E93",
  };

  const openShareSheet = useCallback(() => {
    router.push({
      pathname: "/share",
      params: { year, daysLeft, totalDays, dayOfYear },
    });
  }, [year, daysLeft, totalDays, dayOfYear]);

  // Get formatted date for selected dot
  const selectedDate = selectedDot !== null
    ? formatDate(getDateFromDayIndex(selectedDot, year))
    : null;

  // Calculate grid dimensions
  const columns = 14;
  const rows = Math.ceil(totalDays / columns);
  const cardPadding = 24;
  const cardMargin = 20;
  const availableWidth = screenWidth - (cardMargin * 2) - (cardPadding * 2);
  const dotGap = 8;
  const dotSize = Math.floor((availableWidth - (dotGap * (columns - 1))) / columns);
  const cellSize = dotSize + dotGap;

  // Update selected dot from gesture with haptic feedback
  const updateSelectedDot = useCallback((index: number | null) => {
    if (index !== null && index !== lastHapticDot.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      lastHapticDot.current = index;
    } else if (index === null) {
      lastHapticDot.current = null;
    }
    setSelectedDot(index);
  }, []);

  // Pan gesture for swiping across dots
  const panGesture = Gesture.Pan()
    .onStart((e) => {
      'worklet';
      const col = Math.floor(e.x / cellSize);
      const row = Math.floor(e.y / cellSize);
      let dotIndex: number | null = null;
      if (col >= 0 && col < columns && row >= 0) {
        const idx = row * columns + col;
        if (idx >= 0 && idx < totalDays) {
          dotIndex = idx;
        }
      }
      runOnJS(updateSelectedDot)(dotIndex);
    })
    .onUpdate((e) => {
      'worklet';
      const col = Math.floor(e.x / cellSize);
      const row = Math.floor(e.y / cellSize);
      let dotIndex: number | null = null;
      if (col >= 0 && col < columns && row >= 0) {
        const idx = row * columns + col;
        if (idx >= 0 && idx < totalDays) {
          dotIndex = idx;
        }
      }
      runOnJS(updateSelectedDot)(dotIndex);
    })
    .onEnd(() => {
      'worklet';
      runOnJS(updateSelectedDot)(null);
    });

  // Generate dots array
  const dots = useMemo(() => {
    return Array.from({ length: totalDays }, (_, i) => ({
      id: i,
      isPassed: i < dayOfYear,
    }));
  }, [totalDays, dayOfYear]);

  const isGlassAvailable = isLiquidGlassAvailable();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <PillButton>
          <Text style={[styles.yearText, { color: colors.text }]}>{year}</Text>
        </PillButton>

        <View style={styles.headerRight}>
          {selectedDate ? (
            <PillButton>
              <Text style={[styles.selectedDateText, { color: colors.text }]}>{selectedDate}</Text>
            </PillButton>
          ) : (
            <PillButton>
              <Text style={[styles.daysLeftText, { color: colors.text }]}>{daysLeft} days left</Text>
            </PillButton>
          )}

          <PillButton style={styles.shareButton} onPress={openShareSheet}>
            <Ionicons name="share-outline" size={20} color={colors.text} />
          </PillButton>
        </View>
      </View>

      {/* Dot Grid Card */}
      {isGlassAvailable ? (
        <GlassView style={styles.gridCard}>
          <GestureDetector gesture={panGesture}>
            <View style={styles.gridContainer}>
              {dots.map((dot) => (
                <View
                  key={dot.id}
                  style={[
                    styles.dotWrapper,
                    {
                      width: dotSize,
                      height: dotSize,
                      marginRight: (dot.id + 1) % columns === 0 ? 0 : dotGap,
                      marginBottom: dotGap,
                    }
                  ]}
                >
                  <Dot
                    isPassed={dot.isPassed}
                    isSelected={selectedDot === dot.id}
                    dotSize={dotSize}
                    passedColor={colors.passedDot}
                    remainingColor={colors.remainingDot}
                    selectedColor={colors.selectedDot}
                  />
                </View>
              ))}
            </View>
          </GestureDetector>
        </GlassView>
      ) : (
        <View style={[styles.gridCard, { backgroundColor: colors.cardBackground }]}>
          <GestureDetector gesture={panGesture}>
            <View style={styles.gridContainer}>
              {dots.map((dot) => (
                <View
                  key={dot.id}
                  style={[
                    styles.dotWrapper,
                    {
                      width: dotSize,
                      height: dotSize,
                      marginRight: (dot.id + 1) % columns === 0 ? 0 : dotGap,
                      marginBottom: dotGap,
                    }
                  ]}
                >
                  <Dot
                    isPassed={dot.isPassed}
                    isSelected={selectedDot === dot.id}
                    dotSize={dotSize}
                    passedColor={colors.passedDot}
                    remainingColor={colors.remainingDot}
                    selectedColor={colors.selectedDot}
                  />
                </View>
              ))}
            </View>
          </GestureDetector>
        </View>
      )}

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
  pillButtonFallback: {
    backgroundColor: "#1C1C1E",
  },
  shareButton: {
    paddingHorizontal: 12,
  },
  yearText: {
    fontSize: 17,
    fontWeight: "600",
  },
  selectedDateText: {
    fontSize: 15,
    fontWeight: "500",
  },
  daysLeftText: {
    fontSize: 15,
    fontWeight: "500",
  },
  gridCard: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 24,
    paddingBottom: 16,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  dotWrapper: {
    justifyContent: "center",
    alignItems: "center",
  },
  dot: {
    borderRadius: 100,
  },
});
