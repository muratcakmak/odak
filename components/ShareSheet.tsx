import { useState } from "react";
import { StyleSheet, View, Text, Pressable, Switch, Modal } from "react-native";
import { GlassView } from "expo-glass-effect";
import { useUnistyles } from "react-native-unistyles";
import { hasLiquidGlassSupport } from "../utils/capabilities";

interface ShareSheetProps {
  visible: boolean;
  onClose: () => void;
  year: number;
  daysLeft: number;
  totalDays: number;
  dayOfYear: number;
}

// Mini dot grid for preview
function MiniDotGrid({ totalDays, dayOfYear }: { totalDays: number; dayOfYear: number }) {
  const columns = 14;
  const dotSize = 6;
  const gap = 2;

  return (
    <View style={[miniGridStyles.container, { width: columns * (dotSize + gap) }]}>
      {Array.from({ length: totalDays }, (_, i) => (
        <View
          key={i}
          style={[
            miniGridStyles.dot,
            {
              width: dotSize,
              height: dotSize,
              marginRight: (i + 1) % columns === 0 ? 0 : gap,
              marginBottom: gap,
              backgroundColor: i < dayOfYear ? "#3A3A3C" : "#FFFFFF",
            },
          ]}
        />
      ))}
    </View>
  );
}

const miniGridStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dot: {
    borderRadius: 100,
  },
});

// Picker button component
function PickerButton({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.pickerContainer}>
      <View style={styles.pickerButton}>
        <Text style={styles.pickerValue}>{value}</Text>
        <Text style={styles.pickerChevron}>⌃</Text>
      </View>
      <Text style={styles.pickerLabel}>{label}</Text>
    </View>
  );
}

// Toggle row component
function ToggleRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleContainer}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#3A3A3C", true: "#34C759" }}
        thumbColor="#FFFFFF"
        ios_backgroundColor="#3A3A3C"
      />
    </View>
  );
}

export function ShareSheet({
  visible,
  onClose,
  year,
  daysLeft,
  totalDays,
  dayOfYear,
}: ShareSheetProps) {
  const [theme, setTheme] = useState<"Dark" | "White">("Dark");
  const [dotColor, setDotColor] = useState<"White" | "Color">("White");
  const [dotStyle, setDotStyle] = useState<"Dots" | "Squares">("Dots");
  const [showTitle, setShowTitle] = useState(false);
  const [showTimeLeft, setShowTimeLeft] = useState(true);
  const [showLeftApp, setShowLeftApp] = useState(false);

  const isGlassAvailable = hasLiquidGlassSupport();
  const { theme: appTheme } = useUnistyles();

  const handleShare = () => {
    // TODO: Implement actual share functionality
    console.log("Share pressed");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheetContainer} onPress={(e) => e.stopPropagation()}>
          {isGlassAvailable ? (
            <GlassView style={styles.sheet}>
              <SheetContent
                year={year}
                daysLeft={daysLeft}
                totalDays={totalDays}
                dayOfYear={dayOfYear}
                theme={theme}
                dotColor={dotColor}
                dotStyle={dotStyle}
                showTitle={showTitle}
                showTimeLeft={showTimeLeft}
                showLeftApp={showLeftApp}
                setShowTitle={setShowTitle}
                setShowTimeLeft={setShowTimeLeft}
                setShowLeftApp={setShowLeftApp}
                onShare={handleShare}
              />
            </GlassView>
          ) : (
            <View style={[styles.sheet, { backgroundColor: appTheme.colors.card }]}>
              <SheetContent
                year={year}
                daysLeft={daysLeft}
                totalDays={totalDays}
                dayOfYear={dayOfYear}
                theme={theme}
                dotColor={dotColor}
                dotStyle={dotStyle}
                showTitle={showTitle}
                showTimeLeft={showTimeLeft}
                showLeftApp={showLeftApp}
                setShowTitle={setShowTitle}
                setShowTimeLeft={setShowTimeLeft}
                setShowLeftApp={setShowLeftApp}
                onShare={handleShare}
              />
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SheetContent({
  year,
  daysLeft,
  totalDays,
  dayOfYear,
  theme,
  dotColor,
  dotStyle,
  showTitle,
  showTimeLeft,
  showLeftApp,
  setShowTitle,
  setShowTimeLeft,
  setShowLeftApp,
  onShare,
}: {
  year: number;
  daysLeft: number;
  totalDays: number;
  dayOfYear: number;
  theme: string;
  dotColor: string;
  dotStyle: string;
  showTitle: boolean;
  showTimeLeft: boolean;
  showLeftApp: boolean;
  setShowTitle: (v: boolean) => void;
  setShowTimeLeft: (v: boolean) => void;
  setShowLeftApp: (v: boolean) => void;
  onShare: () => void;
}) {
  return (
    <>
      {/* Handle bar */}
      <View style={styles.handleBar} />

      {/* Preview Card */}
      <View style={styles.previewCard}>
        <Text style={styles.previewYear}>{year}</Text>
        <View style={styles.previewGridContainer}>
          <MiniDotGrid totalDays={totalDays} dayOfYear={dayOfYear} />
        </View>
        <View style={styles.previewFooter}>
          <Text style={styles.previewAppName}>left-time.app</Text>
          <Text style={styles.previewDaysLeft}>{daysLeft} days left</Text>
        </View>
      </View>

      {/* Pickers Row */}
      <View style={styles.pickersRow}>
        <PickerButton label="" value="Dark" />
        <PickerButton label="" value="White" />
        <PickerButton label="" value="Dots" />
      </View>

      {/* Toggles */}
      <View style={styles.togglesContainer}>
        <ToggleRow label="Title" value={showTitle} onValueChange={setShowTitle} />
        <ToggleRow label="Time left" value={showTimeLeft} onValueChange={setShowTimeLeft} />
        <ToggleRow label="Left app" value={showLeftApp} onValueChange={setShowLeftApp} />
      </View>

      {/* Share Button */}
      <Pressable style={styles.shareButton} onPress={onShare}>
        <Text style={styles.shareButtonText}>Share</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    maxHeight: "70%",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  handleBar: {
    width: 36,
    height: 5,
    backgroundColor: "#5C5C5E",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 20,
  },
  previewCard: {
    backgroundColor: "#1C1C1E",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginBottom: 24,
  },
  previewYear: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  previewGridContainer: {
    marginBottom: 12,
  },
  previewFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  previewAppName: {
    fontSize: 11,
    color: "#8E8E93",
    fontFamily: "Courier",
  },
  previewDaysLeft: {
    fontSize: 11,
    color: "#8E8E93",
    fontFamily: "Courier",
  },
  pickersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  pickerContainer: {
    alignItems: "center",
    flex: 1,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pickerValue: {
    fontSize: 17,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  pickerChevron: {
    fontSize: 12,
    color: "#8E8E93",
    transform: [{ rotate: "180deg" }],
  },
  pickerLabel: {
    fontSize: 13,
    color: "#8E8E93",
    marginTop: 4,
  },
  togglesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  toggleContainer: {
    alignItems: "center",
    flex: 1,
  },
  toggleLabel: {
    fontSize: 13,
    color: "#FFFFFF",
    marginBottom: 8,
  },
  shareButton: {
    backgroundColor: "#2C2C2E",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  shareButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
