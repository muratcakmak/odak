import { useState } from "react";
import { StyleSheet, View, Text, Pressable, Switch, Modal } from "react-native";
import { GlassView } from "expo-glass-effect";
import { useUnistyles } from "react-native-unistyles";

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
function PickerButton({ label, value, accentColor }: { label: string; value: string; accentColor: string }) {
  const { theme: appTheme } = useUnistyles();
  const styles = createStyles(appTheme);

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
  const styles = createStyles(theme);

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
  const styles = createStyles(appTheme);
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
  const { theme: appTheme } = useUnistyles();
  const styles = createStyles(appTheme);

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

const createStyles = (theme: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.share.ui.overlay,
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
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 20,
  },
  previewCard: {
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginBottom: 24,
  },
  previewYear: {
    fontSize: 15,
    fontWeight: "600",
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
    fontFamily: "Courier",
  },
  previewDaysLeft: {
    fontSize: 11,
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
    color: theme.colors.share.ui.textPrimary,
  },
  pickerChevron: {
    fontSize: 12,
    color: theme.colors.share.ui.textSecondary,
    transform: [{ rotate: "180deg" }],
  },
  pickerLabel: {
    fontSize: 13,
    color: theme.colors.share.ui.textSecondary,
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
    color: theme.colors.share.ui.textPrimary,
    marginBottom: 8,
  },
  shareButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  shareButtonText: {
    fontSize: 17,
    fontWeight: "600",
  },
});
