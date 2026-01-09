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
import { router } from "expo-router";
import {
  getUserProfile,
  saveUserProfile,
  getLifeUnit,
  setLifeUnit,
  getBackgroundMode,
  setBackgroundMode,
  getAccentColor,
  setAccentColor,
  type UserProfile,
  type LifeUnit,
  type BackgroundMode,
  type AccentColor,
} from "../utils/storage";
import { useUnistyles, UnistylesRuntime } from "react-native-unistyles";

// Plus badge component
function PlusBadge() {
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
  textColor = "#000000",
  secondaryTextColor = "#8E8E93",
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
}) {
  return (
    <Pressable
      style={styles.settingsRow}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.settingsIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon as any} size={16} color="#FFFFFF" />
      </View>
      <View style={styles.settingsLabelContainer}>
        <Text style={[styles.settingsLabel, { color: textColor }]}>{label}</Text>
        {subtitle && <Text style={[styles.settingsSubtitle, { color: secondaryTextColor }]}>{subtitle}</Text>}
      </View>
      {showSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: "#E9E9EB", true: "#34C759" }}
        />
      ) : (
        <View style={styles.settingsRight}>
          {value && <Text style={[styles.settingsValue, { color: secondaryTextColor }]}>{value}</Text>}
          {showPlus && <PlusBadge />}
          {showChevron && (
            <Ionicons name="chevron-forward" size={16} color={secondaryTextColor} />
          )}
          {value && !showChevron && !showPlus && (
            <Ionicons
              name="chevron-expand"
              size={16}
              color={secondaryTextColor}
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
  const [lifeUnit, setLifeUnitState] = useState<LifeUnit>("years");
  const [backgroundMode, setBackgroundModeState] = useState<BackgroundMode>("device");
  const [accentColorState, setAccentColorState] = useState<AccentColor>("blue");

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
    setAccentColorState(getAccentColor());
  }, []);

  const handleLifeUnitChange = (unit: LifeUnit) => {
    setLifeUnitState(unit);
    setLifeUnit(unit);
  };

  const formatLifeUnit = (unit: LifeUnit): string => {
    switch (unit) {
      case "years": return "Years";
      case "months": return "Months";
      case "weeks": return "Weeks";
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
    setAccentColorState(color);
    setAccentColor(color);
  };

  const formatAccentColor = (color: AccentColor): string => {
    return color.charAt(0).toUpperCase() + color.slice(1);
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

  const { theme } = useUnistyles();
  const isDark = theme.colors.background === '#000000' || theme.colors.background === '#111111'; // Simple dark check
  const themeColors = theme.colors;

  const colors = {
    background: themeColors.background,
    cardBg: themeColors.card,
    text: themeColors.textPrimary,
    secondaryText: themeColors.textSecondary,
    inputBg: isDark ? "#2C2C2E" : "#F2F2F7",
    divider: isDark ? "#38383A" : "#E5E5EA",
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

        {/* Life Profile Section */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <Text style={{ color: colors.secondaryText, fontSize: 10 }}>
            Debug: Unistyles={UnistylesRuntime.themeName}, Mode={backgroundMode}, Adaptive={String(UnistylesRuntime.hasAdaptiveThemes)}
          </Text>
        </View>
        <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>Life profile</Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.cardBg }]}>
          <SettingsRow
            icon="person"
            iconBg="#007AFF"
            label="Your name"
            value={profile.name || ""}
            onPress={() => {
              setTempName(profile.name || "");
              setShowNameInput(true);
            }}
            textColor={colors.text}
            secondaryTextColor={colors.secondaryText}
          />
          <View style={[styles.settingsDivider, { backgroundColor: colors.divider }]} />
          <SettingsRow
            icon="gift"
            iconBg="#AF52DE"
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
            textColor={colors.text}
            secondaryTextColor={colors.secondaryText}
          />
          <View style={[styles.settingsDivider, { backgroundColor: colors.divider }]} />
          {/* Life Unit Row with Context Menu */}
          <View style={styles.settingsRow}>
            <View style={[styles.settingsIcon, { backgroundColor: "#34C759" }]}>
              <Ionicons name="body" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.settingsLabelContainer}>
              <Text style={[styles.settingsLabel, { color: colors.text }]}>See your life in...</Text>
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
                    <Button
                      label="Weeks"
                      systemImage={lifeUnit === "weeks" ? "checkmark" : undefined}
                      onPress={() => handleLifeUnitChange("weeks")}
                    />
                  </ContextMenu.Items>
                  <ContextMenu.Trigger>
                    <View style={styles.settingsRight}>
                      <Text style={[styles.settingsValue, { color: colors.secondaryText }]}>{formatLifeUnit(lifeUnit)}</Text>
                      <Ionicons name="chevron-expand" size={16} color={colors.secondaryText} style={{ marginLeft: 4 }} />
                    </View>
                  </ContextMenu.Trigger>
                </ContextMenu>
              </Host>
            ) : (
              <View style={styles.settingsRight}>
                <Text style={[styles.settingsValue, { color: colors.secondaryText }]}>{formatLifeUnit(lifeUnit)}</Text>
                <Ionicons name="chevron-expand" size={16} color={colors.secondaryText} style={{ marginLeft: 4 }} />
              </View>
            )}
          </View>
          <View style={[styles.settingsDivider, { backgroundColor: colors.divider }]} />
          <SettingsRow
            icon="sparkles"
            iconBg="#FF3B30"
            label="What's your lifespan?"
            value="75 years"
            showPlus
            textColor={colors.text}
            secondaryTextColor={colors.secondaryText}
          />
          <View style={[styles.settingsDivider, { backgroundColor: colors.divider }]} />
          <Text style={[styles.cardFooter, { color: colors.secondaryText }]}>
            The name and birthday is used for the Life view, which is based on a
            default life expectancy of 75 years.
          </Text>
        </View>

        {/* Appearance Section */}
        <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>Appearance</Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.cardBg }]}>
          {/* Theme Row with Context Menu */}
          <View style={styles.settingsRow}>
            <View style={[styles.settingsIcon, { backgroundColor: "#AF52DE" }]}>
              <Ionicons name="color-palette" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.settingsLabelContainer}>
              <Text style={[styles.settingsLabel, { color: colors.text }]}>Theme</Text>
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
                      <Text style={[styles.settingsValue, { color: colors.secondaryText }]}>{formatAccentColor(accentColorState)}</Text>
                      <Ionicons name="chevron-expand" size={16} color={colors.secondaryText} style={{ marginLeft: 4 }} />
                    </View>
                  </ContextMenu.Trigger>
                </ContextMenu>
              </Host>
            ) : (
              <View style={styles.settingsRight}>
                <Text style={[styles.settingsValue, { color: colors.secondaryText }]}>{formatAccentColor(accentColorState)}</Text>
                <Ionicons name="chevron-expand" size={16} color={colors.secondaryText} style={{ marginLeft: 4 }} />
              </View>
            )}
          </View>
          <View style={[styles.settingsDivider, { backgroundColor: colors.divider }]} />
          {/* Background Row with Context Menu */}
          <View style={styles.settingsRow}>
            <View style={[styles.settingsIcon, { backgroundColor: "#FF9500" }]}>
              <Ionicons name="contrast" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.settingsLabelContainer}>
              <Text style={[styles.settingsLabel, { color: colors.text }]}>Background</Text>
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
                      <Text style={[styles.settingsValue, { color: colors.secondaryText }]}>{formatBackgroundMode(backgroundMode)}</Text>
                      <Ionicons name="chevron-expand" size={16} color={colors.secondaryText} style={{ marginLeft: 4 }} />
                    </View>
                  </ContextMenu.Trigger>
                </ContextMenu>
              </Host>
            ) : (
              <View style={styles.settingsRight}>
                <Text style={[styles.settingsValue, { color: colors.secondaryText }]}>{formatBackgroundMode(backgroundMode)}</Text>
                <Ionicons name="chevron-expand" size={16} color={colors.secondaryText} style={{ marginLeft: 4 }} />
              </View>
            )}
          </View>
          <View style={[styles.settingsDivider, { backgroundColor: colors.divider }]} />
          <SettingsRow
            icon="apps"
            iconBg="#FF9500"
            label="Symbols"
            value="Dots"
            showPlus
            textColor={colors.text}
            secondaryTextColor={colors.secondaryText}
          />
          <View style={[styles.settingsDivider, { backgroundColor: colors.divider }]} />
          <SettingsRow
            icon="eye-off"
            iconBg="#FF3B30"
            label="Hide You section"
            showSwitch
            switchValue={hideYouSection}
            onSwitchChange={setHideYouSection}
            textColor={colors.text}
            secondaryTextColor={colors.secondaryText}
          />
          <View style={[styles.settingsDivider, { backgroundColor: colors.divider }]} />
          <Text style={[styles.cardFooter, { color: colors.secondaryText }]}>
            The theme and background selected will be used to display the app
            symbols. Plus members can change the dots to other symbols as
            squares, stars, hearts and more.
          </Text>
        </View>

        {/* Notifications Section */}
        <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>Notifications</Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.cardBg }]}>
          <SettingsRow
            icon="notifications"
            iconBg="#A2845E"
            label="Enable notifications (beta)"
            showPlus
            textColor={colors.text}
            secondaryTextColor={colors.secondaryText}
          />
          <View style={[styles.settingsDivider, { backgroundColor: colors.divider }]} />
          <Text style={[styles.cardFooter, { color: colors.secondaryText }]}>
            Daily notifications are sent at 9:00 AM. Frequent notifications are
            sent at 10% intervals, and occasional notifications at 25%
            intervals. This feature is still in beta and might crash or not be
            accurate.
          </Text>
        </View>

        {/* About Reko Section */}
        <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>About Reko</Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.cardBg }]}>
          <SettingsRow
            icon="gift"
            iconBg="#FF6B6B"
            label="Give Reko+ for free"
            showChevron
            textColor={colors.text}
            secondaryTextColor={colors.secondaryText}
          />
          <View style={[styles.settingsDivider, { backgroundColor: colors.divider }]} />
          <SettingsRow
            icon="sparkles"
            iconBg="#AF52DE"
            label="Discover the app"
            showChevron
            textColor={colors.text}
            secondaryTextColor={colors.secondaryText}
          />
          <View style={[styles.settingsDivider, { backgroundColor: colors.divider }]} />
          <SettingsRow
            icon="cube"
            iconBg="#007AFF"
            label="What's new?!"
            showChevron
            textColor={colors.text}
            secondaryTextColor={colors.secondaryText}
          />
          <View style={[styles.settingsDivider, { backgroundColor: colors.divider }]} />
          <SettingsRow
            icon="layers"
            iconBg="#FF6B6B"
            label="How to add widgets"
            showChevron
            textColor={colors.text}
            secondaryTextColor={colors.secondaryText}
          />
          <View style={[styles.settingsDivider, { backgroundColor: colors.divider }]} />
          <SettingsRow
            icon="star"
            iconBg="#FFCC00"
            label="Rate & review Reko"
            showChevron
            textColor={colors.text}
            secondaryTextColor={colors.secondaryText}
          />
          <View style={[styles.settingsDivider, { backgroundColor: colors.divider }]} />
          <SettingsRow
            icon="paper-plane"
            iconBg="#007AFF"
            label="Contact developer"
            subtitle="Ask for support, get help, or send feedback"
            textColor={colors.text}
            secondaryTextColor={colors.secondaryText}
            showChevron
          />
        </View>

        {/* Version Footer */}
        <Text style={[styles.versionText, { color: colors.secondaryText }]}>v2025.10.4 · Coded in NZ · © cntxt</Text>
      </ScrollView>

      {/* Name Input Modal */}
      <Modal visible={showNameInput} animationType="fade" transparent>
        <Pressable
          style={styles.overlayBackground}
          onPress={() => setShowNameInput(false)}
        >
          <Pressable
            style={[styles.inputModal, { backgroundColor: colors.cardBg }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.inputModalTitle, { color: colors.text }]}>Your Name</Text>
            <TextInput
              style={[styles.inputModalInput, { backgroundColor: colors.inputBg, color: colors.text }]}
              value={tempName}
              onChangeText={setTempName}
              placeholder="Enter your name"
              placeholderTextColor={colors.secondaryText}
              autoFocus
            />
            <View style={styles.inputModalButtons}>
              <Pressable
                style={styles.inputModalButton}
                onPress={() => setShowNameInput(false)}
              >
                <Text style={{ color: "#007AFF", fontSize: 17 }}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.inputModalButton} onPress={handleSaveName}>
                <Text
                  style={{ color: "#007AFF", fontSize: 17, fontWeight: "600" }}
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
        presentationStyle="formSheet"
      >
        <View style={[styles.datePickerModal, { backgroundColor: colors.cardBg }]}>
          <View style={styles.datePickerHeader}>
            <Text style={[styles.datePickerTitle, { color: colors.text }]}>When were you born?</Text>
            <Pressable style={[styles.doneButton, { backgroundColor: colors.inputBg }]} onPress={handleSaveDate}>
              <Text style={[styles.doneButtonText, { color: colors.text }]}>Done</Text>
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
              />
            </Host>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  // Premium banner
  premiumBanner: {
    backgroundColor: "#FF9500",
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
    color: "#FFFFFF",
    marginBottom: 4,
  },
  premiumSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
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
    backgroundColor: "#FF6B6B",
  },
  otherAppContent: {
    flex: 1,
  },
  otherAppLabel: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 4,
  },
  otherAppTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  otherAppSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 18,
  },
  otherAppIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  // Section title
  sectionTitle: {
    fontSize: 13,
    color: "#8E8E93",
    marginBottom: 8,
    marginLeft: 16,
    textTransform: "uppercase",
  },
  // Settings card
  settingsCard: {
    backgroundColor: "#FFFFFF",
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
    color: "#000000",
  },
  settingsSubtitle: {
    fontSize: 12,
    color: "#8E8E93",
    marginTop: 2,
  },
  settingsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  settingsValue: {
    fontSize: 16,
    color: "#8E8E93",
  },
  settingsDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E5E5EA",
    marginLeft: 56,
  },
  cardFooter: {
    fontSize: 13,
    color: "#8E8E93",
    lineHeight: 18,
    padding: 16,
    paddingTop: 12,
  },
  // Plus badge
  plusBadge: {
    backgroundColor: "#FF9500",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  plusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  // Version text
  versionText: {
    fontSize: 13,
    color: "#8E8E93",
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 8,
  },
  // Input modal
  overlayBackground: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  inputModal: {
    backgroundColor: "#FFFFFF",
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
    color: "#000000",
  },
  inputModalInput: {
    backgroundColor: "#F2F2F7",
    borderRadius: 10,
    padding: 12,
    fontSize: 17,
    marginBottom: 16,
    color: "#000000",
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
    backgroundColor: "#FFFFFF",
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
    color: "#000000",
  },
  doneButton: {
    backgroundColor: "#F2F2F7",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  doneButtonText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#000000",
  },
  datePickerHost: {
    width: "100%",
    height: 400,
    paddingHorizontal: 16,
  },
});
