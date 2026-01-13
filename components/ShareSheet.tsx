import { useState } from "react";
import { View, Text, Pressable, Switch, Modal } from "react-native";
import { GlassView } from "expo-glass-effect";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { hasLiquidGlassSupport } from "../utils/capabilities";
import { useAccentColor } from "../utils/storage";

interface ShareSheetProps {
  visible: boolean;
  onClose: () => void;
  year: number;
  daysLeft: number;
  totalDays: number;
  dayOfYear: number;
}

// Mini dot grid for preview
function MiniDotGrid({
  totalDays,
  dayOfYear,
  passedColor,
  remainingColor,
}: {
  totalDays: number;
  dayOfYear: number;
  passedColor: string;
  remainingColor: string;
}) {
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
              backgroundColor: i < dayOfYear ? passedColor : remainingColor,
            },
          ]}
        />
      ))}
    </View>
  );
}

const miniGridStyles = StyleSheet.create(() => ({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dot: {
    borderRadius: 100,
  },
}));

// Picker button component
function PickerButton({ label, value, accentColor }: { label: string; value: string; accentColor: string }) {
  return (
    <View style={styles.pickerContainer}>
      <View style={styles.pickerButton}>
        <Text style={[styles.pickerValue, { color: accentColor }]}>{value}</Text>
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
  accentColor,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  accentColor: string;
}) {
  const { theme } = useUnistyles();

  return (
    <View style={styles.toggleContainer}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.colors.controlTrackOff, true: accentColor }}
        thumbColor={theme.colors.onImage.primary}
        ios_backgroundColor={theme.colors.controlTrackOff}
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
  const shareUi = appTheme.colors.share.ui;
  const accentColorName = useAccentColor();
  const accentColor = appTheme.colors.accent[accentColorName].primary;

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
                passedColor={appTheme.colors.systemGray4}
                remainingColor={appTheme.colors.onImage.primary}
                shareUi={shareUi}
                accentColor={accentColor}
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
                passedColor={appTheme.colors.systemGray4}
                remainingColor={appTheme.colors.onImage.primary}
                shareUi={shareUi}
                accentColor={accentColor}
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
  shareUi,
  passedColor,
  remainingColor,
  accentColor,
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
  passedColor: string;
  remainingColor: string;
  shareUi: {
    overlay: string;
    handle: string;
    previewCard: string;
    actionButton: string;
    textPrimary: string;
    textSecondary: string;
  };
  accentColor: string;
}) {
  return (
    <>
      {/* Handle bar */}
      <View style={[styles.handleBar, { backgroundColor: shareUi.handle }]} />

      {/* Preview Card */}
      <View style={[styles.previewCard, { backgroundColor: shareUi.previewCard }]}>
        <Text style={[styles.previewYear, { color: shareUi.textPrimary }]}>{year}</Text>
        <View style={styles.previewGridContainer}>
          <MiniDotGrid
            totalDays={totalDays}
            dayOfYear={dayOfYear}
            passedColor={passedColor}
            remainingColor={remainingColor}
          />
        </View>
        <View style={styles.previewFooter}>
          <Text style={[styles.previewAppName, { color: shareUi.textSecondary }]}>left-time.app</Text>
          <Text style={[styles.previewDaysLeft, { color: shareUi.textSecondary }]}>{daysLeft} days left</Text>
        </View>
      </View>

      {/* Pickers Row */}
      <View style={styles.pickersRow}>
        <PickerButton label="" value="Dark" accentColor={accentColor} />
        <PickerButton label="" value="White" accentColor={accentColor} />
        <PickerButton label="" value="Dots" accentColor={accentColor} />
      </View>

      {/* Toggles */}
      <View style={styles.togglesContainer}>
        <ToggleRow label="Title" value={showTitle} onValueChange={setShowTitle} accentColor={accentColor} />
        <ToggleRow label="Time left" value={showTimeLeft} onValueChange={setShowTimeLeft} accentColor={accentColor} />
        <ToggleRow label="Left app" value={showLeftApp} onValueChange={setShowLeftApp} accentColor={accentColor} />
      </View>

      {/* Share Button */}
      <Pressable style={[styles.shareButton, { backgroundColor: accentColor }]} onPress={onShare}>
        <Text style={[styles.shareButtonText, { color: shareUi.overlay }]}>Share</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create((theme) => ({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.share.ui.overlay,
    justifyContent: "flex-end",
  },
  sheetContainer: {
    maxHeight: "70%",
  },
  sheet: {
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  handleBar: {
    width: 36,
    height: 5,
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: theme.spacing.lg,
  },
  previewCard: {
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: "center",
    marginBottom: theme.spacing.lg,
  },
  previewYear: {
    fontSize: theme.typography.sizes.md + 1,
    fontWeight: theme.typography.weights.semibold,
    marginBottom: theme.spacing.sm + 4,
  },
  previewGridContainer: {
    marginBottom: theme.spacing.sm + 4,
  },
  previewFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  previewAppName: {
    fontSize: theme.typography.sizes.xs + 1,
    fontFamily: "Courier",
  },
  previewDaysLeft: {
    fontSize: theme.typography.sizes.xs + 1,
    fontFamily: "Courier",
  },
  pickersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacing.lg,
  },
  pickerContainer: {
    alignItems: "center",
    flex: 1,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  pickerValue: {
    fontSize: theme.typography.sizes.lg + 1,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.share.ui.textPrimary,
  },
  pickerChevron: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.share.ui.textSecondary,
    transform: [{ rotate: "180deg" }],
  },
  pickerLabel: {
    fontSize: theme.typography.sizes.sm + 1,
    color: theme.colors.share.ui.textSecondary,
    marginTop: theme.spacing.xs,
  },
  togglesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacing.lg,
  },
  toggleContainer: {
    alignItems: "center",
    flex: 1,
  },
  toggleLabel: {
    fontSize: theme.typography.sizes.sm + 1,
    color: theme.colors.share.ui.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  shareButton: {
    borderRadius: theme.borderRadius.md - 2,
    paddingVertical: theme.spacing.md,
    alignItems: "center",
  },
  shareButtonText: {
    fontSize: theme.typography.sizes.lg + 1,
    fontWeight: theme.typography.weights.semibold,
  },
}));
