import { useState, useRef, useCallback } from "react";
import { StyleSheet, View, Text, Pressable, Switch, useColorScheme, Platform } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import Svg, { Path, Polygon } from "react-native-svg";
import { Button, ContextMenu, Host } from "@expo/ui/swift-ui";
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from "react-native-reanimated";

// Type definitions
type ThemeType = "Dark" | "Light";
type ColorType = "White" | "Blue" | "Green" | "Orange" | "Yellow" | "Pink" | "Red" | "Mint" | "Purple" | "Brown";
type ShapeType = "Dots" | "Squares" | "Stars" | "Diamonds" | "Hexagons" | "Hearts" | "X" | "Hash";

// Color configurations
const colorConfig: Record<ColorType, { dot: string; lightBg: string; passedDark: string; passedLight: string }> = {
  White: { dot: "#000000", lightBg: "#F5F5F7", passedDark: "#3A3A3C", passedLight: "#C7C7CC" },
  Blue: { dot: "#007AFF", lightBg: "#E8F4FD", passedDark: "#1C3A5F", passedLight: "#B3D4FC" },
  Green: { dot: "#34C759", lightBg: "#E8F8EC", passedDark: "#1C4D2A", passedLight: "#B3E8C2" },
  Orange: { dot: "#FF9500", lightBg: "#FFF4E6", passedDark: "#5F3A1C", passedLight: "#FFDDB3" },
  Yellow: { dot: "#FFCC00", lightBg: "#FFFBE6", passedDark: "#5F4D1C", passedLight: "#FFECB3" },
  Pink: { dot: "#FF2D55", lightBg: "#FFE8EC", passedDark: "#5F1C2A", passedLight: "#FFB3C2" },
  Red: { dot: "#FF3B30", lightBg: "#FFE8E7", passedDark: "#5F1C1C", passedLight: "#FFB3B0" },
  Mint: { dot: "#00C7BE", lightBg: "#E6FAF9", passedDark: "#1C4D4A", passedLight: "#B3F0ED" },
  Purple: { dot: "#AF52DE", lightBg: "#F5E8FA", passedDark: "#3D1C5F", passedLight: "#E0B3F0" },
  Brown: { dot: "#A2845E", lightBg: "#F5F0E8", passedDark: "#4D3A2A", passedLight: "#D4C4B0" },
};

// Shape rendering components
function ShapeRenderer({
  shape,
  size,
  color,
}: {
  shape: ShapeType;
  size: number;
  color: string;
}) {
  switch (shape) {
    case "Dots":
      return (
        <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
      );

    case "Squares":
      return (
        <View style={{ width: size, height: size, borderRadius: size * 0.15, backgroundColor: color }} />
      );

    case "Stars":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6-6.3 4.6 2.3-7-6-4.6h7.6z"
            fill={color}
          />
        </Svg>
      );

    case "Diamonds":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Polygon
            points="12,2 22,12 12,22 2,12"
            fill={color}
          />
        </Svg>
      );

    case "Hexagons":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Polygon
            points="12,2 21,7 21,17 12,22 3,17 3,7"
            fill={color}
          />
        </Svg>
      );

    case "Hearts":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            fill={color}
          />
        </Svg>
      );

    case "X":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M4 4l16 16M20 4l-16 16"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
          />
        </Svg>
      );

    case "Hash":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M4 8h16M4 16h16M8 4v16M16 4v16"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
          />
        </Svg>
      );

    default:
      return (
        <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
      );
  }
}

// Get columns for mini grid based on view type
function getMiniGridColumns(viewType: string, total: number): number {
  switch (viewType) {
    case "now": return 10;
    case "today": return 6;
    case "month": return 7;
    case "year":
    case "since": return 14;
    case "ahead":
      if (total <= 10) return 5;
      if (total <= 30) return 6;
      if (total <= 60) return 8;
      if (total <= 100) return 10;
      return 12;
    default: return 14;
  }
}

// Mini grid for preview
function MiniDotGrid({
  total,
  passed,
  viewType,
  theme,
  color,
  shape,
}: {
  total: number;
  passed: number;
  viewType: string;
  theme: ThemeType;
  color: ColorType;
  shape: ShapeType;
}) {
  const columns = getMiniGridColumns(viewType, total);
  const dotSize = viewType === "year" || total > 100 ? 4 : 6;
  const gap = 2;

  const config = colorConfig[color];
  const passedColor = theme === "Dark" ? config.passedDark : config.passedLight;
  const remainingColor = theme === "Dark"
    ? (color === "White" ? "#FFFFFF" : config.dot)
    : config.dot;

  return (
    <View style={[miniGridStyles.container, { width: columns * (dotSize + gap), justifyContent: "center" }]}>
      {Array.from({ length: Math.min(total, 400) }, (_, i) => (
        <View
          key={i}
          style={{
            marginRight: (i + 1) % columns === 0 ? 0 : gap,
            marginBottom: gap,
          }}
        >
          <ShapeRenderer
            shape={shape}
            size={dotSize}
            color={i < passed ? passedColor : remainingColor}
          />
        </View>
      ))}
    </View>
  );
}

const miniGridStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
});

// Menu picker using iOS ContextMenu (popover style)
function MenuPicker<T extends string>({
  value,
  options,
  onSelect,
}: {
  value: T;
  options: readonly T[];
  onSelect: (option: T) => void;
}) {
  if (Platform.OS !== "ios") {
    // Fallback for non-iOS
    return (
      <Pressable style={styles.pickerButton}>
        <Text style={styles.pickerValue}>{value}</Text>
        <Text style={styles.pickerChevron}>⌃</Text>
      </Pressable>
    );
  }

  return (
    <Host style={{ width: 100, height: 40 }}>
      <ContextMenu activationMethod="singlePress">
        <ContextMenu.Items>
          {options.map((option) => (
            <Button
              key={option}
              label={option}
              systemImage={option === value ? "checkmark" : undefined}
              onPress={() => onSelect(option)}
            />
          ))}
        </ContextMenu.Items>
        <ContextMenu.Trigger>
          <Button label={`${value} ▾`} />
        </ContextMenu.Trigger>
      </ContextMenu>
    </Host>
  );
}

// Toggle with label above
function ToggleItem({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleItem}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#39393D", true: "#34C759" }}
        thumbColor="#FFFFFF"
        ios_backgroundColor="#39393D"
      />
    </View>
  );
}

// Picker options
const themeOptions: ThemeType[] = ["Dark", "Light"];
const colorOptions: ColorType[] = ["White", "Blue", "Green", "Orange", "Yellow", "Pink", "Red", "Mint", "Purple", "Brown"];
const shapeOptions: ShapeType[] = ["Dots", "Squares", "Stars", "Diamonds", "Hexagons", "Hearts", "X", "Hash"];

export default function ShareScreen() {
  const colorScheme = useColorScheme();
  const params = useLocalSearchParams<{
    label: string;
    timeLeftText: string;
    total: string;
    passed: string;
    viewType: string;
  }>();

  const label = params.label || "2026";
  const timeLeftText = params.timeLeftText || "360 days left";
  const total = parseInt(params.total || "365", 10);
  const passed = parseInt(params.passed || "5", 10);
  const viewType = params.viewType || "year";

  // Default theme based on system setting
  const [theme, setTheme] = useState<ThemeType>(colorScheme === "dark" ? "Dark" : "Light");
  const [color, setColor] = useState<ColorType>("Red");
  const [shape, setShape] = useState<ShapeType>("Stars");
  const [showTitle, setShowTitle] = useState(true);
  const [showTimeLeft, setShowTimeLeft] = useState(true);
  const [showRekoApp, setShowRekoApp] = useState(true);

  const isDark = theme === "Dark";
  const config = colorConfig[color];

  const viewShotRef = useRef<ViewShot>(null);
  const [isSharing, setIsSharing] = useState(false);

  // Animated values
  const cardRotation = useSharedValue(Math.random() * 10 - 5);
  const cardScale = useSharedValue(0.85);
  const buttonScale = useSharedValue(1);

  // Animated styles for preview card
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: cardScale.value },
      { rotate: `${cardRotation.value}deg` },
    ],
  }));

  // Animated styles for share button
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  // Handle card tap - random tilt with spring animation
  const handleCardTap = useCallback(() => {
    const newRotation = Math.random() * 10 - 5;
    cardRotation.value = withSpring(newRotation, {
      damping: 10,
      stiffness: 100,
    });
    // Subtle bounce effect
    cardScale.value = withSequence(
      withTiming(0.82, { duration: 100 }),
      withSpring(0.85, { damping: 10, stiffness: 200 })
    );
  }, []);

  // Handle button press in/out
  const handleButtonPressIn = useCallback(() => {
    buttonScale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  }, []);

  const handleButtonPressOut = useCallback(() => {
    buttonScale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, []);

  const handleShare = async () => {
    if (isSharing) return;

    try {
      setIsSharing(true);

      // Capture the preview card as an image
      const uri = await viewShotRef.current?.capture?.();

      if (uri) {
        // Check if sharing is available
        const isAvailable = await Sharing.isAvailableAsync();

        if (isAvailable) {
          await Sharing.shareAsync(uri, {
            mimeType: "image/png",
            dialogTitle: `Share ${label}`,
          });
        }
      }
    } catch (error) {
      console.error("Share error:", error);
    } finally {
      setIsSharing(false);
    }
  };

  // Get preview card background color
  const previewBgColor = isDark ? "#2C2C2E" : config.lightBg;
  const yearColor = isDark ? config.dot : config.dot;
  const footerColor = isDark ? "#8E8E93" : "#8E8E93";

  return (
    <View style={styles.container}>
      {/* Preview Card */}
      <Pressable onPress={handleCardTap}>
        <Animated.View style={[styles.previewWrapper, cardAnimatedStyle]}>
          <ViewShot
            ref={viewShotRef}
            options={{ format: "png", quality: 1 }}
          >
            <View style={[
              styles.previewCard,
              { backgroundColor: previewBgColor }
            ]}>
            {showTitle && (
              <Text style={[
                styles.previewYear,
                { color: yearColor }
              ]}>{label}</Text>
            )}
            <View style={[styles.previewGridContainer, !showTitle && { marginTop: 8 }]}>
              <MiniDotGrid
                total={total}
                passed={passed}
                viewType={viewType}
                theme={theme}
                color={color}
                shape={shape}
              />
            </View>
            {(showRekoApp || showTimeLeft) && (
              <View style={styles.previewFooter}>
                {showRekoApp ? (
                  <Text style={[styles.previewFooterText, { color: footerColor }]}>
                    left-time.app
                  </Text>
                ) : (
                  <View />
                )}
                {showTimeLeft ? (
                  <Text style={[styles.previewFooterText, { color: footerColor }]}>
                    {timeLeftText}
                  </Text>
                ) : (
                  <View />
                )}
              </View>
            )}
          </View>
        </ViewShot>
      </Animated.View>
    </Pressable>

      {/* Pickers Row */}
      <View style={styles.pickersRow}>
        <MenuPicker
          value={theme}
          options={themeOptions}
          onSelect={setTheme}
        />
        <MenuPicker
          value={color}
          options={colorOptions}
          onSelect={setColor}
        />
        <MenuPicker
          value={shape}
          options={shapeOptions}
          onSelect={setShape}
        />
      </View>

      {/* Toggles Row */}
      <View style={styles.togglesRow}>
        <ToggleItem label="Title" value={showTitle} onValueChange={setShowTitle} />
        <ToggleItem label="Time left" value={showTimeLeft} onValueChange={setShowTimeLeft} />
        <ToggleItem label="Left app" value={showRekoApp} onValueChange={setShowRekoApp} />
      </View>

      {/* Share Button */}
      <Pressable
        onPress={handleShare}
        onPressIn={handleButtonPressIn}
        onPressOut={handleButtonPressOut}
        disabled={isSharing}
      >
        <Animated.View style={[styles.shareButton, buttonAnimatedStyle]}>
          <Text style={styles.shareButtonText}>Share</Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 10,
  },
  previewWrapper: {
    alignItems: "center",
    marginBottom: 24,
  },
  previewCard: {
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
  },
  previewYear: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  previewGridContainer: {
    marginBottom: 8,
  },
  previewFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 4,
  },
  previewFooterText: {
    fontSize: 9,
    fontFamily: "Courier",
  },
  pickersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
    paddingHorizontal: 20,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pickerValue: {
    fontSize: 17,
    fontWeight: "400",
    color: "#FFFFFF",
  },
  pickerChevron: {
    fontSize: 10,
    color: "#8E8E93",
    transform: [{ rotate: "180deg" }],
    marginTop: 2,
  },
  togglesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
    paddingHorizontal: 10,
  },
  toggleItem: {
    alignItems: "center",
    gap: 10,
  },
  toggleLabel: {
    fontSize: 13,
    color: "#FFFFFF",
  },
  shareButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: "#007AFF",
  },
  shareButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
