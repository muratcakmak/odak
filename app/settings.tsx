import { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Platform,
  Switch,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { Host, ContextMenu, Button } from "@expo/ui/swift-ui";
import {
  getBackgroundMode,
  setBackgroundMode,
  setAccentColor,
  type BackgroundMode,
  type AccentColor,
  useAccentColor,
  getFocusSettings,
  saveFocusSettings,
  getDailyGoal,
  setDailyGoal,
} from "../utils/storage";
import { hasLiquidGlassSupport } from "../utils/capabilities";
import type { FocusSettings } from "../domain/types";
import { StyleSheet, useUnistyles, UnistylesRuntime } from "react-native-unistyles";

// Settings row component
function SettingsRow({
  icon,
  iconBg,
  label,
  value,
  onPress,
  showChevron,
  showPlus,
  showSwitch,
  switchValue,
  onSwitchChange,
  subtitle,
  textColor,
  secondaryTextColor,
  iconColor,
  rightIcon,
}: {
  icon: string;
  iconBg: string;
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  showPlus?: boolean;
  showSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
  subtitle?: string;
  textColor?: string;
  secondaryTextColor?: string;
  iconColor?: string;
  rightIcon?: string;
}) {
  const { theme } = useUnistyles();
  const resolvedTextColor = textColor ?? theme.colors.textPrimary;
  const resolvedSecondaryTextColor = secondaryTextColor ?? theme.colors.textSecondary;
  const resolvedIconColor = iconColor ?? theme.colors.onImage.primary;

  return (
    <Pressable
      style={styles.settingsRow}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.settingsIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon as any} size={16} color={resolvedIconColor} />
      </View>
      <View style={styles.settingsLabelContainer}>
        <Text style={[styles.settingsLabel, { color: resolvedTextColor }]}>{label}</Text>
        {subtitle && <Text style={[styles.settingsSubtitle, { color: resolvedSecondaryTextColor }]}>{subtitle}</Text>}
      </View>
      {showSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: theme.colors.controlTrackOff, true: theme.colors.controlTrackOn }}
          thumbColor={theme.colors.onImage.primary}
          ios_backgroundColor={theme.colors.controlTrackOff}
        />
      ) : (
        <View style={styles.settingsRight}>
          {value && <Text style={[styles.settingsValue, { color: resolvedSecondaryTextColor }]}>{value}</Text>}
          {showPlus && <PlusBadge />}
          {showChevron && (
            <Ionicons name={(rightIcon || "chevron-forward") as any} size={16} color={resolvedSecondaryTextColor} />
          )}
          {value && !showChevron && !showPlus && (
            <Ionicons
              name="chevron-expand"
              size={16}
              color={resolvedSecondaryTextColor}
              style={{ marginLeft: 4 }}
            />
          )}
        </View>
      )}
    </Pressable>
  );
}

// Plus badge component
function PlusBadge() {
  const { theme } = useUnistyles();

  return (
    <View style={styles.plusBadge}>
      <Text style={styles.plusBadgeText}>Plus</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const accentColorState = useAccentColor();
  const [backgroundMode, setBackgroundModeState] = useState<BackgroundMode>("device");
  const [focusSettings, setFocusSettingsState] = useState<FocusSettings>(getFocusSettings);
  const [dailyGoalValue, setDailyGoalValue] = useState<number>(4);

  // Load preferences from MMKV on mount
  useEffect(() => {
    setBackgroundModeState(getBackgroundMode());
    setDailyGoalValue(getDailyGoal());
  }, []);

  // Focus settings handlers
  const updateFocusSetting = <K extends keyof FocusSettings>(
    key: K,
    value: FocusSettings[K]
  ) => {
    const updated = { ...focusSettings, [key]: value };
    setFocusSettingsState(updated);
    saveFocusSettings(updated);
  };

  const handleBackgroundModeChange = (mode: BackgroundMode) => {
    setBackgroundModeState(mode);
    setBackgroundMode(mode);

    if (mode === 'device') {
      UnistylesRuntime.setAdaptiveThemes(true);
    } else {
      UnistylesRuntime.setAdaptiveThemes(false);
      UnistylesRuntime.setTheme(mode);
    }
  };

  const formatBackgroundMode = (mode: BackgroundMode): string => {
    switch (mode) {
      case "dark": return "Dark";
      case "light": return "Light";
      case "device": return "Device";
    }
  };

  const handleAccentColorChange = (color: AccentColor) => {
    setAccentColor(color);
  };

  const formatAccentColor = (color: AccentColor): string => {
    return color.charAt(0).toUpperCase() + color.slice(1);
  };

  const handleDailyGoalChange = (goal: number) => {
    setDailyGoalValue(goal);
    setDailyGoal(goal);
  };

  const { theme } = useUnistyles();
  const colors = theme.colors;
  const useGlass = hasLiquidGlassSupport();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: useGlass ? "transparent" : colors.background }]}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Appearance Section */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Appearance</Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
          {/* Theme Row with Context Menu */}
          <View style={styles.settingsRow}>
            <View style={[styles.settingsIcon, { backgroundColor: colors.systemPurple }]}>
              <Ionicons name="color-palette" size={16} color={colors.onImage.primary} />
            </View>
            <View style={styles.settingsLabelContainer}>
              <Text style={[styles.settingsLabel, { color: colors.textPrimary }]}>Theme</Text>
            </View>
            {Platform.OS === "ios" ? (
              <Host style={{ height: 24 }}>
                <ContextMenu activationMethod="singlePress">
                  <ContextMenu.Items>
                    <Button
                      label="Blue"
                      systemImage={accentColorState === "blue" ? "checkmark" : undefined}
                      onPress={() => handleAccentColorChange("blue")}
                    />
                    <Button
                      label="Green"
                      systemImage={accentColorState === "green" ? "checkmark" : undefined}
                      onPress={() => handleAccentColorChange("green")}
                    />
                    <Button
                      label="Orange"
                      systemImage={accentColorState === "orange" ? "checkmark" : undefined}
                      onPress={() => handleAccentColorChange("orange")}
                    />
                    <Button
                      label="Yellow"
                      systemImage={accentColorState === "yellow" ? "checkmark" : undefined}
                      onPress={() => handleAccentColorChange("yellow")}
                    />
                    <Button
                      label="Pink"
                      systemImage={accentColorState === "pink" ? "checkmark" : undefined}
                      onPress={() => handleAccentColorChange("pink")}
                    />
                    <Button
                      label="Red"
                      systemImage={accentColorState === "red" ? "checkmark" : undefined}
                      onPress={() => handleAccentColorChange("red")}
                    />
                    <Button
                      label="Mint"
                      systemImage={accentColorState === "mint" ? "checkmark" : undefined}
                      onPress={() => handleAccentColorChange("mint")}
                    />
                    <Button
                      label="Purple"
                      systemImage={accentColorState === "purple" ? "checkmark" : undefined}
                      onPress={() => handleAccentColorChange("purple")}
                    />
                    <Button
                      label="Brown"
                      systemImage={accentColorState === "brown" ? "checkmark" : undefined}
                      onPress={() => handleAccentColorChange("brown")}
                    />
                  </ContextMenu.Items>
                  <ContextMenu.Trigger>
                    <View style={styles.settingsRight}>
                      <Text style={[styles.settingsValue, { color: colors.textSecondary }]}>{formatAccentColor(accentColorState)}</Text>
                      <Ionicons name="chevron-expand" size={16} color={colors.textSecondary} style={{ marginLeft: 4 }} />
                    </View>
                  </ContextMenu.Trigger>
                </ContextMenu>
              </Host>
            ) : (
              <View style={styles.settingsRight}>
                <Text style={[styles.settingsValue, { color: colors.textSecondary }]}>{formatAccentColor(accentColorState)}</Text>
                <Ionicons name="chevron-expand" size={16} color={colors.textSecondary} style={{ marginLeft: 4 }} />
              </View>
            )}
          </View>
          <View style={[styles.settingsDivider, { backgroundColor: colors.divider }]} />
          {/* Background Row with Context Menu */}
          <View style={styles.settingsRow}>
            <View style={[styles.settingsIcon, { backgroundColor: colors.systemOrange }]}>
              <Ionicons name="contrast" size={16} color={colors.onImage.primary} />
            </View>
            <View style={styles.settingsLabelContainer}>
              <Text style={[styles.settingsLabel, { color: colors.textPrimary }]}>Background</Text>
            </View>
            {Platform.OS === "ios" ? (
              <Host style={{ height: 24 }}>
                <ContextMenu activationMethod="singlePress">
                  <ContextMenu.Items>
                    <Button
                      label="Dark"
                      systemImage={backgroundMode === "dark" ? "checkmark" : undefined}
                      onPress={() => handleBackgroundModeChange("dark")}
                    />
                    <Button
                      label="Light"
                      systemImage={backgroundMode === "light" ? "checkmark" : undefined}
                      onPress={() => handleBackgroundModeChange("light")}
                    />
                    <Button
                      label="Device"
                      systemImage={backgroundMode === "device" ? "checkmark" : undefined}
                      onPress={() => handleBackgroundModeChange("device")}
                    />
                  </ContextMenu.Items>
                  <ContextMenu.Trigger>
                    <View style={styles.settingsRight}>
                      <Text style={[styles.settingsValue, { color: colors.textSecondary }]}>{formatBackgroundMode(backgroundMode)}</Text>
                      <Ionicons name="chevron-expand" size={16} color={colors.textSecondary} style={{ marginLeft: 4 }} />
                    </View>
                  </ContextMenu.Trigger>
                </ContextMenu>
              </Host>
            ) : (
              <View style={styles.settingsRight}>
                <Text style={[styles.settingsValue, { color: colors.textSecondary }]}>{formatBackgroundMode(backgroundMode)}</Text>
                <Ionicons name="chevron-expand" size={16} color={colors.textSecondary} style={{ marginLeft: 4 }} />
              </View>
            )}
          </View>
        </View>

        {/* Focus Section */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Focus</Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
          {/* Daily Goal Row with Context Menu */}
          <View style={styles.settingsRow}>
            <View style={[styles.settingsIcon, { backgroundColor: colors.systemRed }]}>
              <Ionicons name="flag" size={16} color={colors.onImage.primary} />
            </View>
            <View style={styles.settingsLabelContainer}>
              <Text style={[styles.settingsLabel, { color: colors.textPrimary }]}>Daily goal</Text>
              <Text style={[styles.settingsSubtitle, { color: colors.textSecondary }]}>Sessions per day</Text>
            </View>
            {Platform.OS === "ios" ? (
              <Host style={{ height: 24 }}>
                <ContextMenu activationMethod="singlePress">
                  <ContextMenu.Items>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <Button
                        key={num}
                        label={`${num} session${num > 1 ? "s" : ""}`}
                        systemImage={dailyGoalValue === num ? "checkmark" : undefined}
                        onPress={() => handleDailyGoalChange(num)}
                      />
                    ))}
                  </ContextMenu.Items>
                  <ContextMenu.Trigger>
                    <View style={styles.settingsRight}>
                      <Text style={[styles.settingsValue, { color: colors.textSecondary }]}>
                        {dailyGoalValue} session{dailyGoalValue > 1 ? "s" : ""}
                      </Text>
                      <Ionicons name="chevron-expand" size={16} color={colors.textSecondary} style={{ marginLeft: 4 }} />
                    </View>
                  </ContextMenu.Trigger>
                </ContextMenu>
              </Host>
            ) : (
              <View style={styles.settingsRight}>
                <Text style={[styles.settingsValue, { color: colors.textSecondary }]}>
                  {dailyGoalValue} session{dailyGoalValue > 1 ? "s" : ""}
                </Text>
                <Ionicons name="chevron-expand" size={16} color={colors.textSecondary} style={{ marginLeft: 4 }} />
              </View>
            )}
          </View>
          <View style={[styles.settingsDivider, { backgroundColor: colors.divider }]} />
          <SettingsRow
            icon="eye-outline"
            iconBg={colors.systemBlue}
            label="Show time remaining"
            subtitle="Display minutes during focus"
            showSwitch
            switchValue={focusSettings.showMinutesRemaining}
            onSwitchChange={(value) => updateFocusSetting("showMinutesRemaining", value)}
            textColor={colors.textPrimary}
            secondaryTextColor={colors.textSecondary}
          />
          <View style={[styles.settingsDivider, { backgroundColor: colors.divider }]} />
          <SettingsRow
            icon="play-outline"
            iconBg={colors.systemOrange}
            label="Auto-start break"
            subtitle="Begin break after focus ends"
            showSwitch
            switchValue={focusSettings.autoBreakEnabled}
            onSwitchChange={(value) => updateFocusSetting("autoBreakEnabled", value)}
            textColor={colors.textPrimary}
            secondaryTextColor={colors.textSecondary}
          />
          <View style={[styles.settingsDivider, { backgroundColor: colors.divider }]} />
          <SettingsRow
            icon="volume-high-outline"
            iconBg={colors.systemPurple}
            label="Sounds"
            subtitle="Audio feedback"
            showSwitch
            switchValue={focusSettings.soundEnabled}
            onSwitchChange={(value) => updateFocusSetting("soundEnabled", value)}
            textColor={colors.textPrimary}
            secondaryTextColor={colors.textSecondary}
          />
          <View style={[styles.settingsDivider, { backgroundColor: colors.divider }]} />
          <SettingsRow
            icon="phone-portrait-outline"
            iconBg={colors.systemGreen}
            label="Vibration"
            subtitle="Haptic feedback"
            showSwitch
            switchValue={focusSettings.vibrationEnabled}
            onSwitchChange={(value) => updateFocusSetting("vibrationEnabled", value)}
            textColor={colors.textPrimary}
            secondaryTextColor={colors.textSecondary}
          />
          <View style={[styles.settingsDivider, { backgroundColor: colors.divider }]} />
          <SettingsRow
            icon="apps-outline"
            iconBg={colors.systemCyan}
            label="Live Activity"
            subtitle="Dynamic Island & Lock Screen"
            showSwitch
            switchValue={focusSettings.liveActivityEnabled}
            onSwitchChange={(value) => updateFocusSetting("liveActivityEnabled", value)}
            textColor={colors.textPrimary}
            secondaryTextColor={colors.textSecondary}
          />
          <View style={[styles.settingsDivider, { backgroundColor: colors.divider }]} />
          <SettingsRow
            icon="notifications-outline"
            iconBg={colors.systemRed}
            label="Notifications"
            subtitle="Session completion alerts"
            showSwitch
            switchValue={focusSettings.notificationsEnabled}
            onSwitchChange={(value) => updateFocusSetting("notificationsEnabled", value)}
            textColor={colors.textPrimary}
            secondaryTextColor={colors.textSecondary}
          />
          <View style={[styles.settingsDivider, { backgroundColor: colors.divider }]} />
          {/* Break Duration Row with Context Menu */}
          <View style={styles.settingsRow}>
            <View style={[styles.settingsIcon, { backgroundColor: colors.systemOrange }]}>
              <Ionicons name="hourglass-outline" size={16} color={colors.onImage.primary} />
            </View>
            <View style={styles.settingsLabelContainer}>
              <Text style={[styles.settingsLabel, { color: colors.textPrimary }]}>Break duration</Text>
            </View>
            {Platform.OS === "ios" ? (
              <Host style={{ height: 24 }}>
                <ContextMenu activationMethod="singlePress">
                  <ContextMenu.Items>
                    <Button
                      label="3 minutes"
                      systemImage={focusSettings.breakDurationMinutes === 3 ? "checkmark" : undefined}
                      onPress={() => updateFocusSetting("breakDurationMinutes", 3)}
                    />
                    <Button
                      label="5 minutes"
                      systemImage={focusSettings.breakDurationMinutes === 5 ? "checkmark" : undefined}
                      onPress={() => updateFocusSetting("breakDurationMinutes", 5)}
                    />
                    <Button
                      label="10 minutes"
                      systemImage={focusSettings.breakDurationMinutes === 10 ? "checkmark" : undefined}
                      onPress={() => updateFocusSetting("breakDurationMinutes", 10)}
                    />
                    <Button
                      label="15 minutes"
                      systemImage={focusSettings.breakDurationMinutes === 15 ? "checkmark" : undefined}
                      onPress={() => updateFocusSetting("breakDurationMinutes", 15)}
                    />
                  </ContextMenu.Items>
                  <ContextMenu.Trigger>
                    <View style={styles.settingsRight}>
                      <Text style={[styles.settingsValue, { color: colors.textSecondary }]}>
                        {focusSettings.breakDurationMinutes} min
                      </Text>
                      <Ionicons name="chevron-expand" size={16} color={colors.textSecondary} style={{ marginLeft: 4 }} />
                    </View>
                  </ContextMenu.Trigger>
                </ContextMenu>
              </Host>
            ) : (
              <View style={styles.settingsRight}>
                <Text style={[styles.settingsValue, { color: colors.textSecondary }]}>
                  {focusSettings.breakDurationMinutes} min
                </Text>
                <Ionicons name="chevron-expand" size={16} color={colors.textSecondary} style={{ marginLeft: 4 }} />
              </View>
            )}
          </View>
        </View>

        {/* About Section */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>About</Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
          <SettingsRow
            icon="star-outline"
            iconBg={colors.systemYellow}
            label="What is new?"
            subtitle=""
            onPress={() => router.push("/welcome")}
            textColor={colors.textPrimary}
            secondaryTextColor={colors.textSecondary}
            showChevron
          />
        </View>

        {/* Version Footer */}
        <Text style={[styles.versionText, { color: colors.textSecondary }]}>v2026.01.09</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingTop: theme.spacing.xl + theme.spacing.lg, // Account for sheet grabber
    paddingBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    marginLeft: theme.spacing.md,
    textTransform: "uppercase",
  },
  settingsCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
    overflow: "hidden",
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.sm + 4,
    paddingHorizontal: theme.spacing.md,
  },
  settingsIcon: {
    width: 28,
    height: 28,
    borderRadius: theme.borderRadius.sm - 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.sm + 4,
  },
  settingsLabelContainer: {
    flex: 1,
  },
  settingsLabel: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.textPrimary,
  },
  settingsSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  settingsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  settingsValue: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.textSecondary,
  },
  settingsDivider: {
    height: 0.5,
    backgroundColor: theme.colors.divider,
    marginLeft: 56,
  },
  plusBadge: {
    backgroundColor: theme.colors.systemOrange,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm - 2,
  },
  plusBadgeText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.onImage.primary,
  },
  versionText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: theme.spacing.sm,
  },
}));
