import { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  TextInput,
  Platform,
  Switch,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { DatePicker, Host, ContextMenu, Button } from "@expo/ui/swift-ui";
import { datePickerStyle, tint } from "@expo/ui/swift-ui/modifiers";
import { router } from "expo-router";
import {
  getUserProfile,
  saveUserProfile,
  getLifeUnit,
  setLifeUnit,
  getBackgroundMode,
  setBackgroundMode,
  setAccentColor,
  type UserProfile,
  type LifeUnit,
  type BackgroundMode,
  type AccentColor,
  useAccentColor,
  getLifeSymbol,
  setLifeSymbol,
  type LifeSymbol,
  useLifeSymbol,
  getLifespan,
  setLifespan,
  getFocusSettings,
  saveFocusSettings,
} from "../utils/storage";
import type { FocusSettings } from "../domain/types";
import { useUnistyles, UnistylesRuntime } from "react-native-unistyles";

// Plus badge component
function PlusBadge() {
  const { theme } = useUnistyles();
  const styles = createStyles(theme);

  return (
    <View style={styles.plusBadge}>
      <Text style={styles.plusBadgeText}>Plus</Text>
    </View>
  );
}

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
  const styles = createStyles(theme);
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

export default function SettingsScreen() {
  const [profile, setProfile] = useState<{
    name: string;
    birthDate: Date | null;
  }>({ name: "", birthDate: null });
  const [showNameInput, setShowNameInput] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempName, setTempName] = useState("");
  const [tempDate, setTempDate] = useState(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 25);
    return date;
  });
  const [hideYouSection, setHideYouSection] = useState(false);
  const accentColorState = useAccentColor();
  const lifeSymbolState = useLifeSymbol();
  const [lifespan, setLifespanState] = useState<number>(75);
  const [lifeUnit, setLifeUnitState] = useState<LifeUnit>("years");
  const [showLifespanInput, setShowLifespanInput] = useState(false);
  const [tempLifespan, setTempLifespan] = useState("75");
  const [backgroundMode, setBackgroundModeState] = useState<BackgroundMode>("device");
  const [focusSettings, setFocusSettingsState] = useState<FocusSettings>(getFocusSettings);

  // Load profile and preferences from MMKV on mount
  useEffect(() => {
    const storedProfile = getUserProfile();
    if (storedProfile) {
      setProfile({
        name: storedProfile.name,
        birthDate: storedProfile.birthDate
          ? new Date(storedProfile.birthDate)
          : null,
      });
      setTempName(storedProfile.name);
      if (storedProfile.birthDate) {
        setTempDate(new Date(storedProfile.birthDate));
      }
    }
    setLifeUnitState(getLifeUnit());
    setBackgroundModeState(getBackgroundMode());
    setLifespanState(getLifespan());
    setTempLifespan(String(getLifespan()));
  }, []);

  const handleLifeUnitChange = (unit: LifeUnit) => {
    setLifeUnitState(unit);
    setLifeUnit(unit);
  };

  // Focus settings handlers
  const updateFocusSetting = <K extends keyof FocusSettings>(
    key: K,
    value: FocusSettings[K]
  ) => {
    const updated = { ...focusSettings, [key]: value };
    setFocusSettingsState(updated);
    saveFocusSettings(updated);
  };

  const formatLifeUnit = (unit: LifeUnit): string => {
    switch (unit) {
      case "years": return "Years";
      case "months": return "Months";
    }
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

  const handleLifeSymbolChange = (symbol: LifeSymbol) => {
    setLifeSymbol(symbol);
  };

  const formatLifeSymbol = (symbol: LifeSymbol): string => {
    return symbol.charAt(0).toUpperCase() + symbol.slice(1);
  };

  const handleSaveName = () => {
    if (tempName.trim()) {
      const newProfile = { ...profile, name: tempName.trim() };
      setProfile(newProfile);
      saveUserProfile({
        name: newProfile.name,
        birthDate: newProfile.birthDate?.toISOString() || "",
      });
      setShowNameInput(false);
    }
  };

  const handleSaveDate = () => {
    const newProfile = { ...profile, birthDate: tempDate };
    setProfile(newProfile);
    saveUserProfile({
      name: newProfile.name,
      birthDate: tempDate.toISOString(),
    });
    setShowDatePicker(false);
  };

  const handleSaveLifespan = () => {
    const years = parseInt(tempLifespan, 10);
    if (!isNaN(years) && years > 0 && years <= 120) {
      setLifespanState(years);
      setLifespan(years);
      setShowLifespanInput(false);
    }
  };

  const { theme } = useUnistyles();
  const styles = createStyles(theme);
  const colors = theme.colors;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

        {/* Life Profile Section */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
          </Text>
        </View>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Life profile</Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
          <SettingsRow
            icon="person"
            iconBg={colors.systemBlue}
            label="Your name"
            value={profile.name || ""}
            onPress={() => {
              setTempName(profile.name || "");
              setShowNameInput(true);
            }}
            textColor={colors.textPrimary}
            secondaryTextColor={colors.textSecondary}
          />
          <View style={[styles.settingsDivider, { backgroundColor: colors.divider }]} />
          <SettingsRow
            icon="gift"
            iconBg={colors.systemPurple}
            label="Your birthday"
            value={
              profile.birthDate
                ? profile.birthDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
                : "Not set"
            }
            onPress={() => setShowDatePicker(true)}
            textColor={colors.textPrimary}
            secondaryTextColor={colors.textSecondary}
            rightIcon="chevron-expand"
          />
          <View style={[styles.settingsDivider, { backgroundColor: colors.divider }]} />
          {/* Life Unit Row with Context Menu */}
          <View style={styles.settingsRow}>
            <View style={[styles.settingsIcon, { backgroundColor: colors.systemGreen }]}>
              <Ionicons name="body" size={16} color={colors.onImage.primary} />
            </View>
            <View style={styles.settingsLabelContainer}>
              <Text style={[styles.settingsLabel, { color: colors.textPrimary }]}>See your life in...</Text>
            </View>
            {Platform.OS === "ios" ? (
              <Host style={{ height: 24 }}>
                <ContextMenu activationMethod="singlePress">
                  <ContextMenu.Items>
                    <Button
                      label="Years"
                      systemImage={lifeUnit === "years" ? "checkmark" : undefined}
                      onPress={() => handleLifeUnitChange("years")}
                    />
                    <Button
                      label="Months"
                      systemImage={lifeUnit === "months" ? "checkmark" : undefined}
                      onPress={() => handleLifeUnitChange("months")}
                    />
                  </ContextMenu.Items>
                  <ContextMenu.Trigger>
                    <View style={styles.settingsRight}>
                      <Text style={[styles.settingsValue, { color: colors.textSecondary }]}>{formatLifeUnit(lifeUnit)}</Text>
                      <Ionicons name="chevron-expand" size={16} color={colors.textSecondary} style={{ marginLeft: 4 }} />
                    </View>
                  </ContextMenu.Trigger>
                </ContextMenu>
              </Host>
            ) : (
              <View style={styles.settingsRight}>
                <Text style={[styles.settingsValue, { color: colors.textSecondary }]}>{formatLifeUnit(lifeUnit)}</Text>
                <Ionicons name="chevron-expand" size={16} color={colors.textSecondary} style={{ marginLeft: 4 }} />
              </View>
            )}
          </View>
          <View style={[styles.settingsDivider, { backgroundColor: colors.divider }]} />
          <SettingsRow
            icon="sparkles"
            iconBg={colors.systemRed}
            label="What's your lifespan?"
            value={`${lifespan} years`}
            onPress={() => setShowLifespanInput(true)}
            textColor={colors.textPrimary}
            secondaryTextColor={colors.textSecondary}
          />
          <View style={[styles.settingsDivider, { backgroundColor: colors.divider }]} />
          <Text style={[styles.cardFooter, { color: colors.textSecondary }]}>
            The name and birthday is used for the Life view, which is based on a
            default life expectancy of {lifespan} years.
          </Text>
        </View>

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
                      label="White"
                      systemImage={accentColorState === "white" ? "checkmark" : undefined}
                      onPress={() => handleAccentColorChange("white")}
                    />
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
          <View style={[styles.settingsDivider, { backgroundColor: colors.divider }]} />
          {/* Symbols Row with Context Menu */}
          <View style={styles.settingsRow}>
            <View style={[styles.settingsIcon, { backgroundColor: colors.systemOrange }]}>
              <Ionicons name="apps" size={16} color={colors.onImage.primary} />
            </View>
            <View style={styles.settingsLabelContainer}>
              <Text style={[styles.settingsLabel, { color: colors.textPrimary }]}>Symbols</Text>
            </View>
            {Platform.OS === "ios" ? (
              <Host style={{ height: 24 }}>
                <ContextMenu activationMethod="singlePress">
                  <ContextMenu.Items>
                    <Button
                      label="Hash"
                      systemImage={lifeSymbolState === "hash" ? "checkmark" : undefined}
                      onPress={() => handleLifeSymbolChange("hash")}
                    />
                    <Button
                      label="X"
                      systemImage={lifeSymbolState === "x" ? "checkmark" : undefined}
                      onPress={() => handleLifeSymbolChange("x")}
                    />
                    <Button
                      label="Hearts"
                      systemImage={lifeSymbolState === "hearts" ? "checkmark" : undefined}
                      onPress={() => handleLifeSymbolChange("hearts")}
                    />
                    <Button
                      label="Hexagons"
                      systemImage={lifeSymbolState === "hexagons" ? "checkmark" : undefined}
                      onPress={() => handleLifeSymbolChange("hexagons")}
                    />
                    <Button
                      label="Diamonds"
                      systemImage={lifeSymbolState === "diamonds" ? "checkmark" : undefined}
                      onPress={() => handleLifeSymbolChange("diamonds")}
                    />
                    <Button
                      label="Stars"
                      systemImage={lifeSymbolState === "stars" ? "checkmark" : undefined}
                      onPress={() => handleLifeSymbolChange("stars")}
                    />
                    <Button
                      label="Squares"
                      systemImage={lifeSymbolState === "squares" ? "checkmark" : undefined}
                      onPress={() => handleLifeSymbolChange("squares")}
                    />
                    <Button
                      label="Dots"
                      systemImage={lifeSymbolState === "dots" ? "checkmark" : undefined}
                      onPress={() => handleLifeSymbolChange("dots")}
                    />
                  </ContextMenu.Items>
                  <ContextMenu.Trigger>
                    <View style={styles.settingsRight}>
                      <Text style={[styles.settingsValue, { color: colors.textSecondary }]}>{formatLifeSymbol(lifeSymbolState)}</Text>
                      <Ionicons name="chevron-expand" size={16} color={colors.textSecondary} style={{ marginLeft: 4 }} />
                    </View>
                  </ContextMenu.Trigger>
                </ContextMenu>
              </Host>
            ) : (
              <View style={styles.settingsRight}>
                <Text style={[styles.settingsValue, { color: colors.textSecondary }]}>{formatLifeSymbol(lifeSymbolState)}</Text>
                <Ionicons name="chevron-expand" size={16} color={colors.textSecondary} style={{ marginLeft: 4 }} />
              </View>
            )}
          </View>
        </View>

        {/* Focus Section */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Focus</Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
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

        {/* TODO: Enable notifications after beta testing */}
        {/* Notifications Section */}
        {/* <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Notifications</Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
          <SettingsRow
            icon="notifications"
            iconBg={colors.systemBrown}
            label="Enable notifications (beta)"
            showPlus
            textColor={colors.textPrimary}
            secondaryTextColor={colors.textSecondary}
          />
          <View style={[styles.settingsDivider, { backgroundColor: colors.divider }]} />
          <Text style={[styles.cardFooter, { color: colors.textSecondary }]}>
            Daily notifications are sent at 9:00 AM. Frequent notifications are
            sent at 10% intervals, and occasional notifications at 25%
            intervals. This feature is still in beta and might crash or not be
            accurate.
          </Text>
        </View> */}

        {/* TODO: Enable Reko section after beta testing */}
        {/* About Reko Section */}
        {/* <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>About Reko</Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
          <SettingsRow
            icon="gift"
            iconBg={colors.priority.high}
            label="Give Reko+ for free"
            showChevron
            textColor={colors.textPrimary}
            secondaryTextColor={colors.textSecondary}
          />
          <View style={[styles.settingsDivider, { backgroundColor: colors.divider }]} />
          <SettingsRow
            icon="sparkles"
            iconBg={colors.systemPurple}
            label="Discover the app"
            showChevron
            textColor={colors.textPrimary}
            secondaryTextColor={colors.textSecondary}
          />
          <View style={[styles.settingsDivider, { backgroundColor: colors.divider }]} />
          <SettingsRow
            icon="cube"
            iconBg={colors.systemBlue}
            label="What's new?!"
            showChevron
            textColor={colors.textPrimary}
            secondaryTextColor={colors.textSecondary}
          />
          <View style={[styles.settingsDivider, { backgroundColor: colors.divider }]} />
          <SettingsRow
            icon="layers"
            iconBg={colors.priority.high}
            label="How to add widgets"
            showChevron
            textColor={colors.textPrimary}
            secondaryTextColor={colors.textSecondary}
          />
          <View style={[styles.settingsDivider, { backgroundColor: colors.divider }]} />
          <SettingsRow
            icon="star"
            iconBg={colors.systemYellow}
            label="Rate & review Rekoll"
            showChevron
            textColor={colors.textPrimary}
            secondaryTextColor={colors.textSecondary}
          />
          <View style={[styles.settingsDivider, { backgroundColor: colors.divider }]} />
          <SettingsRow
            icon="paper-plane"
            iconBg={colors.systemBlue}
            label="Contact developer"
            subtitle="Ask for support, get help, or send feedback"
            textColor={colors.textPrimary}
            secondaryTextColor={colors.textSecondary}
            showChevron
          />
        </View> */}

        {/* Version Footer */}
        <Text style={[styles.versionText, { color: colors.textSecondary }]}>v2026.01.09 · © omc345</Text>
      </ScrollView>

      {/* Name Input Modal */}
      <Modal visible={showNameInput} animationType="fade" transparent>
        <Pressable
          style={styles.overlayBackground}
          onPress={() => setShowNameInput(false)}
        >
          <Pressable
            style={[styles.inputModal, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.inputModalTitle, { color: colors.textPrimary }]}>Your Name</Text>
            <TextInput
              style={[styles.inputModalInput, { backgroundColor: colors.inputBg, color: colors.textPrimary }]}
              value={tempName}
              onChangeText={setTempName}
              placeholder="Enter your name"
              placeholderTextColor={colors.textSecondary}
              autoFocus
            />
            <View style={styles.inputModalButtons}>
              <Pressable
                style={styles.inputModalButton}
                onPress={() => setShowNameInput(false)}
              >
                <Text style={{ color: colors.systemBlue, fontSize: 17 }}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.inputModalButton} onPress={handleSaveName}>
                <Text
                  style={{ color: colors.systemBlue, fontSize: 17, fontWeight: "600" }}
                >
                  Save
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Lifespan Input Modal */}
      <Modal visible={showLifespanInput} animationType="fade" transparent>
        <Pressable
          style={styles.overlayBackground}
          onPress={() => setShowLifespanInput(false)}
        >
          <Pressable
            style={[styles.inputModal, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.inputModalTitle, { color: colors.textPrimary }]}>Lifespan Target</Text>
            <TextInput
              style={[styles.inputModalInput, { backgroundColor: colors.inputBg, color: colors.textPrimary }]}
              value={tempLifespan}
              onChangeText={setTempLifespan}
              placeholder="Enter years (e.g. 80)"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              autoFocus
            />
            <View style={styles.inputModalButtons}>
              <Pressable
                style={styles.inputModalButton}
                onPress={() => setShowLifespanInput(false)}
              >
                <Text style={{ color: colors.systemBlue, fontSize: 17 }}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.inputModalButton} onPress={handleSaveLifespan}>
                <Text
                  style={{ color: colors.systemBlue, fontSize: 17, fontWeight: "600" }}
                >
                  Save
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.datePickerModal, { backgroundColor: colors.card }]}>
          <View style={styles.datePickerHeader}>
            <Text style={[styles.datePickerTitle, { color: colors.textPrimary }]}>When were you born?</Text>
            <Pressable style={[styles.doneButton, { backgroundColor: colors.inputBg }]} onPress={handleSaveDate}>
              <Text style={[styles.doneButtonText, { color: colors.textPrimary }]}>Done</Text>
            </Pressable>
          </View>
          {Platform.OS === "ios" && (
            <Host style={styles.datePickerHost}>
              <DatePicker
                selection={tempDate}
                onDateChange={setTempDate}
                range={{
                  start: new Date(1900, 0, 1),
                  end: new Date()
                }}
                modifiers={[datePickerStyle("graphical"), tint(colors.systemBlue)]}
              />
            </Host>
          )}
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  // Premium banner
  premiumBanner: {
    backgroundColor: theme.colors.systemOrange,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    overflow: "hidden",
  },
  premiumBannerContent: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.onImage.primary,
    marginBottom: 4,
  },
  premiumSubtitle: {
    fontSize: 14,
    color: theme.colors.onImage.secondary,
    lineHeight: 20,
  },
  premiumIcon: {
    position: "absolute",
    right: 16,
    top: "50%",
    marginTop: -20,
  },
  // Other app banner
  otherAppBanner: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    flexDirection: "row",
    overflow: "hidden",
    backgroundColor: theme.colors.priority.high,
  },
  otherAppContent: {
    flex: 1,
  },
  otherAppLabel: {
    fontSize: 13,
    color: theme.colors.onImage.muted,
    marginBottom: 4,
  },
  otherAppTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.onImage.primary,
    marginBottom: 4,
  },
  otherAppSubtitle: {
    fontSize: 13,
    color: theme.colors.onImage.muted,
    lineHeight: 18,
  },
  otherAppIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: theme.colors.onImage.ultraFaint,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  // Section title
  sectionTitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    marginLeft: 16,
    textTransform: "uppercase",
  },
  // Settings card
  settingsCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    marginBottom: 24,
    overflow: "hidden",
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  settingsIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  settingsLabelContainer: {
    flex: 1,
  },
  settingsLabel: {
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  settingsSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  settingsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  settingsValue: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  settingsDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.divider,
    marginLeft: 56,
  },
  cardFooter: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    padding: 16,
    paddingTop: 12,
  },
  // Plus badge
  plusBadge: {
    backgroundColor: theme.colors.systemOrange,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  plusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.onImage.primary,
  },
  // Version text
  versionText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 8,
  },
  // Input modal
  overlayBackground: {
    flex: 1,
    backgroundColor: theme.colors.overlay.medium,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  inputModal: {
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    padding: 20,
    width: "100%",
    maxWidth: 300,
  },
  inputModalTitle: {
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
    color: theme.colors.textPrimary,
  },
  inputModalInput: {
    backgroundColor: theme.colors.inputBg,
    borderRadius: 10,
    padding: 12,
    fontSize: 17,
    marginBottom: 16,
    color: theme.colors.textPrimary,
  },
  inputModalButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  inputModalButton: {
    padding: 12,
  },
  // Date picker modal
  datePickerModal: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  datePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 20,
  },
  datePickerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  doneButton: {
    backgroundColor: theme.colors.inputBg,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  doneButtonText: {
    fontSize: 15,
    fontWeight: "500",
    color: theme.colors.textPrimary,
  },
  datePickerHost: {
    width: "100%",
    height: 480,
    paddingHorizontal: 16,
  },
});
