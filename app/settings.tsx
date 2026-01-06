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
import { DatePicker, Host } from "@expo/ui/swift-ui";
import { router } from "expo-router";
import {
  getUserProfile,
  saveUserProfile,
  type UserProfile,
} from "../utils/storage";

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
        <Text style={styles.settingsLabel}>{label}</Text>
        {subtitle && <Text style={styles.settingsSubtitle}>{subtitle}</Text>}
      </View>
      {showSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: "#E9E9EB", true: "#34C759" }}
        />
      ) : (
        <View style={styles.settingsRight}>
          {value && <Text style={styles.settingsValue}>{value}</Text>}
          {showPlus && <PlusBadge />}
          {showChevron && (
            <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
          )}
          {value && !showChevron && !showPlus && (
            <Ionicons
              name="chevron-expand"
              size={16}
              color="#C7C7CC"
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

  // Load profile from MMKV on mount
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
  }, []);

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

  const colors = {
    background: "#F2F2F7",
    cardBg: "#FFFFFF",
    text: "#000000",
    secondaryText: "#8E8E93",
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

        {/* Life Profile Section */}
        <Text style={styles.sectionTitle}>Life profile</Text>
        <View style={styles.settingsCard}>
          <SettingsRow
            icon="person"
            iconBg="#007AFF"
            label="Your name"
            value={profile.name || ""}
            onPress={() => {
              setTempName(profile.name || "");
              setShowNameInput(true);
            }}
          />
          <View style={styles.settingsDivider} />
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
          />
          <View style={styles.settingsDivider} />
          <SettingsRow
            icon="body"
            iconBg="#34C759"
            label="See your life in..."
            value="Years"
          />
          <View style={styles.settingsDivider} />
          <SettingsRow
            icon="sparkles"
            iconBg="#FF3B30"
            label="What's your lifespan?"
            value="75 years"
            showPlus
          />
          <View style={styles.settingsDivider} />
          <Text style={styles.cardFooter}>
            The name and birthday is used for the Life view, which is based on a
            default life expectancy of 75 years.
          </Text>
        </View>

        {/* Appearance Section */}
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.settingsCard}>
          <SettingsRow
            icon="color-palette"
            iconBg="#AF52DE"
            label="Theme"
            value="White"
          />
          <View style={styles.settingsDivider} />
          <SettingsRow
            icon="contrast"
            iconBg="#FF9500"
            label="Background"
            value="Device"
          />
          <View style={styles.settingsDivider} />
          <SettingsRow
            icon="apps"
            iconBg="#FF9500"
            label="Symbols"
            value="Dots"
            showPlus
          />
          <View style={styles.settingsDivider} />
          <SettingsRow
            icon="eye-off"
            iconBg="#FF3B30"
            label="Hide You section"
            showSwitch
            switchValue={hideYouSection}
            onSwitchChange={setHideYouSection}
          />
          <View style={styles.settingsDivider} />
          <Text style={styles.cardFooter}>
            The theme and background selected will be used to display the app
            symbols. Plus members can change the dots to other symbols as
            squares, stars, hearts and more.
          </Text>
        </View>

        {/* Notifications Section */}
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.settingsCard}>
          <SettingsRow
            icon="notifications"
            iconBg="#A2845E"
            label="Enable notifications (beta)"
            showPlus
          />
          <View style={styles.settingsDivider} />
          <Text style={styles.cardFooter}>
            Daily notifications are sent at 9:00 AM. Frequent notifications are
            sent at 10% intervals, and occasional notifications at 25%
            intervals. This feature is still in beta and might crash or not be
            accurate.
          </Text>
        </View>

        {/* About Reko Section */}
        <Text style={styles.sectionTitle}>About Reko</Text>
        <View style={styles.settingsCard}>
          <SettingsRow
            icon="gift"
            iconBg="#FF6B6B"
            label="Give Reko+ for free"
            showChevron
          />
          <View style={styles.settingsDivider} />
          <SettingsRow
            icon="sparkles"
            iconBg="#AF52DE"
            label="Discover the app"
            showChevron
          />
          <View style={styles.settingsDivider} />
          <SettingsRow
            icon="cube"
            iconBg="#007AFF"
            label="What's new?!"
            showChevron
          />
          <View style={styles.settingsDivider} />
          <SettingsRow
            icon="layers"
            iconBg="#FF6B6B"
            label="How to add widgets"
            showChevron
          />
          <View style={styles.settingsDivider} />
          <SettingsRow
            icon="star"
            iconBg="#FFCC00"
            label="Rate & review Reko"
            showChevron
          />
          <View style={styles.settingsDivider} />
          <SettingsRow
            icon="paper-plane"
            iconBg="#007AFF"
            label="Contact developer"
            subtitle="Ask for support, get help, or send feedback"
            showChevron
          />
        </View>

        {/* Version Footer */}
        <Text style={styles.versionText}>v2025.10.4 · Coded in NZ · © cntxt</Text>
      </ScrollView>

      {/* Name Input Modal */}
      <Modal visible={showNameInput} animationType="fade" transparent>
        <Pressable
          style={styles.overlayBackground}
          onPress={() => setShowNameInput(false)}
        >
          <Pressable
            style={styles.inputModal}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.inputModalTitle}>Your Name</Text>
            <TextInput
              style={styles.inputModalInput}
              value={tempName}
              onChangeText={setTempName}
              placeholder="Enter your name"
              placeholderTextColor="#8E8E93"
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
        <View style={styles.datePickerModal}>
          <View style={styles.datePickerHeader}>
            <Text style={styles.datePickerTitle}>When were you born?</Text>
            <Pressable style={styles.doneButton} onPress={handleSaveDate}>
              <Text style={styles.doneButtonText}>Done</Text>
            </Pressable>
          </View>
          {Platform.OS === "ios" && (
            <Host style={styles.datePickerHost}>
              <DatePicker
                selection={tempDate}
                onDateChange={setTempDate}
                range={{ end: new Date() }}
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
