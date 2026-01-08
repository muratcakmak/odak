import { useState, useEffect, useCallback } from "react";
import { StyleSheet, View, Text, ScrollView, Pressable, ImageBackground, Modal, TextInput, Platform, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import Ionicons from "@expo/vector-icons/Ionicons";
import Svg, { Circle } from "react-native-svg";
import { DatePicker, Host, ContextMenu, Button, Divider } from "@expo/ui/swift-ui";
import { datePickerStyle } from "@expo/ui/swift-ui/modifiers";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import Animated, { FadeIn, FadeOut, Layout, Easing } from "react-native-reanimated";
import { getSinceEvents, addSinceEvent, type SinceEvent, getSinceViewMode, setSinceViewMode, saveImageLocally, type ViewMode } from "../../utils/storage";
import { useTheme } from "../../hooks/useTheme";

// Sort options
type SortType = "date_asc" | "date_desc" | "title_asc" | "title_desc";

function formatDate(date: Date) {
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  return date.toLocaleDateString("en-US", options);
}

function getDaysSince(date: Date) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

// Progress ring component
function ProgressRing({ progress, size = 44 }: { progress: number; size?: number }) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <Svg width={size} height={size}>
      <Circle
        stroke="rgba(255, 255, 255, 0.3)"
        fill="none"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
      />
      <Circle
        stroke="#FFFFFF"
        fill="none"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}

// Header pill button
function HeaderPillButton({
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

// Info banner component
function InfoBanner({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <View style={styles.infoBanner}>
        {/* Decorative circles */}
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
        <View style={styles.decorativeCircle3} />

        <View style={styles.infoBannerContent}>
          <View style={styles.infoBannerText}>
            <Text style={styles.infoBannerTitle}>What is Time Since?</Text>
            <Text style={styles.infoBannerSubtitle}>
              Learn about how to build habits and streaks with Time Since
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.7)" />
        </View>
      </View>
    </Pressable>
  );
}

// Event card with image background
function SinceCard({
  title,
  startDate,
  image,
  showProgress,
  onPress,
  compact = true,
}: {
  title: string;
  startDate: Date;
  image?: string;
  showProgress?: boolean;
  onPress?: () => void;
  compact?: boolean;
}) {
  const daysSince = getDaysSince(startDate);

  if (!compact) {
    // List view - full width
    return (
      <Pressable onPress={onPress}>
        {image ? (
          <ImageBackground
            source={{ uri: image }}
            style={styles.sinceCardList}
            imageStyle={styles.sinceCardImage}
          >
            <View style={styles.sinceCardOverlayList}>
              <View style={styles.sinceCardContentList}>
                <Text style={styles.sinceTitleTextList}>{title}</Text>
                <Text style={styles.sinceDateTextList}>{formatDate(startDate)}</Text>
              </View>
              <View style={styles.sinceDaysContainerList}>
                <Text style={styles.sinceDaysTextList}>{daysSince}</Text>
                <Text style={styles.sinceDaysLabelList}>days</Text>
              </View>
            </View>
          </ImageBackground>
        ) : (
          <View style={[styles.sinceCardList, styles.sinceCardNoImage]}>
            <View style={styles.sinceCardOverlayList}>
              <View style={styles.sinceCardContentList}>
                <Text style={styles.sinceTitleTextList}>{title}</Text>
                <Text style={styles.sinceDateTextList}>{formatDate(startDate)}</Text>
              </View>
              <View style={styles.sinceDaysContainerList}>
                <Text style={styles.sinceDaysTextList}>{daysSince}</Text>
                <Text style={styles.sinceDaysLabelList}>days</Text>
              </View>
            </View>
          </View>
        )}
      </Pressable>
    );
  }

  // Grid view - compact
  return (
    <Pressable onPress={onPress}>
      {image ? (
        <ImageBackground
          source={{ uri: image }}
          style={styles.sinceCard}
          imageStyle={styles.sinceCardImage}
        >
          <View style={styles.sinceCardOverlay}>
            <View style={styles.sinceCardContent}>
              <Text style={styles.sinceDaysText}>{daysSince} days</Text>
              <Text style={styles.sinceDateText}>{formatDate(startDate)}</Text>
              <Text style={styles.sinceTitleText}>{title}</Text>
            </View>
            {showProgress && (
              <View style={styles.progressContainer}>
                <ProgressRing progress={0} />
              </View>
            )}
          </View>
        </ImageBackground>
      ) : (
        <View style={[styles.sinceCard, styles.sinceCardNoImage]}>
          <View style={styles.sinceCardOverlay}>
            <View style={styles.sinceCardContent}>
              <Text style={styles.sinceDaysText}>{daysSince} days</Text>
              <Text style={styles.sinceDateText}>{formatDate(startDate)}</Text>
              <Text style={styles.sinceTitleText}>{title}</Text>
            </View>
          </View>
        </View>
      )}
    </Pressable>
  );
}

// Add Event Modal
function AddEventModal({
  visible,
  onClose,
  onAdd,
  isDark,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (title: string, date: Date, image?: string) => void;
  isDark: boolean;
}) {
  const [title, setTitle] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => new Date()); // Default to today
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const isGlassAvailable = isLiquidGlassAvailable();

  const handleAdd = () => {
    if (title.trim()) {
      onAdd(title.trim(), selectedDate, selectedImage || undefined);
      setTitle("");
      setSelectedDate(new Date()); // Reset to today
      setSelectedImage(null);
      onClose();
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const colors = {
    background: isDark ? "#1C1C1E" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#000000",
    secondaryText: isDark ? "#8E8E93" : "#8E8E93",
    inputBg: isDark ? "#2C2C2E" : "#F2F2F7",
  };

  const HeaderButton = ({ onPress, disabled, children }: { onPress: () => void; disabled?: boolean; children: React.ReactNode }) => {
    if (isGlassAvailable) {
      return (
        <Pressable onPress={onPress} disabled={disabled}>
          <GlassView style={styles.headerGlassButton} isInteractive>
            {children}
          </GlassView>
        </Pressable>
      );
    }
    return (
      <Pressable onPress={onPress} disabled={disabled} style={[styles.headerGlassButton, styles.headerButtonFallback]}>
        {children}
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <HeaderButton onPress={onClose}>
            <Text style={[styles.modalHeaderButton, { color: "#007AFF" }]}>Cancel</Text>
          </HeaderButton>
          <Text style={[styles.modalTitle, { color: colors.text }]}>New Habit</Text>
          <HeaderButton onPress={handleAdd} disabled={!title.trim()}>
            <Text style={[styles.modalHeaderButton, { color: title.trim() ? "#007AFF" : colors.secondaryText }]}>
              Add
            </Text>
          </HeaderButton>
        </View>

        {/* Form */}
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Photo Picker */}
          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>Habit Photo</Text>
            <Pressable onPress={pickImage} style={[styles.photoPicker, { backgroundColor: colors.inputBg }]}>
              {selectedImage ? (
                <Image source={{ uri: selectedImage }} style={styles.selectedPhoto} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="image-outline" size={32} color={colors.secondaryText} />
                  <Text style={[styles.photoPlaceholderText, { color: colors.secondaryText }]}>
                    Tap to select photo
                  </Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* Title Input */}
          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>Habit Title</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.inputBg, color: colors.text }]}
              placeholder="Enter habit title..."
              placeholderTextColor={colors.secondaryText}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Date Picker */}
          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>Start Date</Text>
            {Platform.OS === "ios" ? (
              <Host style={styles.datePickerHost}>
                <DatePicker
                  selection={selectedDate}
                  onDateChange={setSelectedDate}
                  range={{ end: new Date() }}
                  modifiers={[datePickerStyle("graphical")]}
                />
              </Host>
            ) : (
              <Pressable style={[styles.dateButton, { backgroundColor: colors.inputBg }]}>
                <Text style={{ color: colors.text }}>{selectedDate.toLocaleDateString()}</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function SinceScreen() {
  const { isDark, colors: themeColors } = useTheme();
  const [events, setEvents] = useState<SinceEvent[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sortType, setSortType] = useState<SortType>("date_desc");
  const [viewMode, setViewMode] = useState<ViewMode>(() => getSinceViewMode());

  const colors = {
    background: themeColors.background,
    text: themeColors.textPrimary,
    surface: themeColors.surface,
  };

  // Sort events based on current sort type
  const sortedEvents = [...events]
    .map((event) => ({
      ...event,
      dateObj: new Date(event.startDate),
    }))
    .sort((a, b) => {
      switch (sortType) {
        case "date_asc":
          return a.dateObj.getTime() - b.dateObj.getTime();
        case "date_desc":
          return b.dateObj.getTime() - a.dateObj.getTime();
        case "title_asc":
          return a.title.localeCompare(b.title);
        case "title_desc":
          return b.title.localeCompare(a.title);
        default:
          return b.dateObj.getTime() - a.dateObj.getTime();
      }
    });

  // Load events from MMKV
  useEffect(() => {
    const loadEvents = () => {
      const storedEvents = getSinceEvents();
      setEvents(storedEvents);
    };
    loadEvents();
  }, []);

  // Add new event with local image storage
  const handleAddEvent = useCallback(async (title: string, date: Date, image?: string) => {
    let localImageUri: string | undefined;
    if (image) {
      localImageUri = await saveImageLocally(image);
    }
    const newEvent = addSinceEvent({
      title,
      startDate: date.toISOString(),
      image: localImageUri,
    });
    setEvents((prev) => [...prev, newEvent]);
  }, []);

  // Open add modal
  const openAddModal = () => setShowAddModal(true);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {Platform.OS === "ios" ? (
            <Host style={{ width: 44, height: 44 }}>
              <ContextMenu activationMethod="singlePress">
                <ContextMenu.Items>
                  <Button
                    label="Grid View"
                    systemImage={viewMode === "grid" ? "checkmark" : undefined}
                    onPress={() => {
                      setViewMode("grid");
                      setSinceViewMode("grid");
                    }}
                  />
                  <Button
                    label="List View"
                    systemImage={viewMode === "list" ? "checkmark" : undefined}
                    onPress={() => {
                      setViewMode("list");
                      setSinceViewMode("list");
                    }}
                  />
                  <Divider />
                  <Button
                    label="Longest First"
                    systemImage={sortType === "date_asc" ? "checkmark" : undefined}
                    onPress={() => setSortType("date_asc")}
                  />
                  <Button
                    label="Recent First"
                    systemImage={sortType === "date_desc" ? "checkmark" : undefined}
                    onPress={() => setSortType("date_desc")}
                  />
                  <Button
                    label="Title A-Z"
                    systemImage={sortType === "title_asc" ? "checkmark" : undefined}
                    onPress={() => setSortType("title_asc")}
                  />
                  <Button
                    label="Title Z-A"
                    systemImage={sortType === "title_desc" ? "checkmark" : undefined}
                    onPress={() => setSortType("title_desc")}
                  />
                </ContextMenu.Items>
                <ContextMenu.Trigger>
                  <View>
                    <HeaderPillButton>
                      <Ionicons name="options-outline" size={20} color={colors.text} />
                    </HeaderPillButton>
                  </View>
                </ContextMenu.Trigger>
              </ContextMenu>
            </Host>
          ) : (
            <HeaderPillButton>
              <Ionicons name="options-outline" size={20} color={colors.text} />
            </HeaderPillButton>
          )}
        </View>

        <Text style={[styles.headerTitle, { color: colors.text }]}>Time since</Text>

        <HeaderPillButton onPress={openAddModal}>
          <Ionicons name="add" size={24} color={colors.text} />
        </HeaderPillButton>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* Cards Grid/List */}
        {events.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={48} color={colors.text} style={{ opacity: 0.3 }} />
            <Text style={[styles.emptyText, { color: colors.text }]}>No habits yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.text }]}>
              Tap the + button to track a habit
            </Text>
          </View>
        ) : (
          <View style={viewMode === "grid" ? styles.cardsGrid : styles.cardsList}>
            {sortedEvents.map((event) => (
              <Animated.View
                key={`${event.id}-${viewMode}`}
                layout={Layout.duration(250).easing(Easing.out(Easing.quad))}
                entering={FadeIn.duration(200).easing(Easing.out(Easing.quad))}
                exiting={FadeOut.duration(150).easing(Easing.in(Easing.quad))}
                style={viewMode === "grid" ? styles.sinceCardWrapper : styles.sinceCardWrapperList}
              >
                <SinceCard
                  title={event.title}
                  startDate={event.dateObj}
                  image={event.image}
                  compact={viewMode === "grid"}
                  onPress={() => router.push(`/event/${event.id}`)}
                />
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Event Modal */}
      <AddEventModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddEvent}
        isDark={isDark}
      />
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
  headerLeft: {
    flexDirection: "row",
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  pillButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  pillButtonFallback: {
    backgroundColor: "#F2F2F7",
  },
  exclamationMark: {
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 1,
    marginTop: -6,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 120,
  },
  // Info Banner
  infoBanner: {
    backgroundColor: "#FF6B6B",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    overflow: "hidden",
  },
  decorativeCircle1: {
    position: "absolute",
    right: -20,
    top: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  decorativeCircle2: {
    position: "absolute",
    right: 20,
    bottom: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  decorativeCircle3: {
    position: "absolute",
    right: 60,
    top: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  infoBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  infoBannerText: {
    flex: 1,
    marginRight: 16,
  },
  infoBannerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  infoBannerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 20,
  },
  // Cards Grid
  cardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  cardsList: {
    flexDirection: "column",
  },
  sinceCardWrapper: {
    width: "48%",
    marginBottom: 16,
  },
  sinceCardWrapperList: {
    width: "100%",
    marginBottom: 12,
  },
  sinceCard: {
    height: 160,
    borderRadius: 20,
    overflow: "hidden",
  },
  sinceCardImage: {
    borderRadius: 20,
  },
  sinceCardNoImage: {
    backgroundColor: "#2C2C2E",
  },
  sinceCardOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    padding: 12,
    justifyContent: "space-between",
  },
  sinceCardContent: {
    flex: 1,
  },
  sinceDaysText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  sinceDateText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.85)",
    marginBottom: 4,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  sinceTitleText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  progressContainer: {
    position: "absolute",
    bottom: 12,
    right: 12,
  },
  // List view styles
  sinceCardList: {
    height: 100,
    borderRadius: 20,
    overflow: "hidden",
  },
  sinceCardOverlayList: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sinceCardContentList: {
    flex: 1,
    justifyContent: "center",
  },
  sinceTitleTextList: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  sinceDateTextList: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.85)",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  sinceDaysContainerList: {
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 16,
  },
  sinceDaysTextList: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  sinceDaysLabelList: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.85)",
    textTransform: "uppercase",
    fontWeight: "600",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    opacity: 0.5,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    opacity: 0.3,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerGlassButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  headerButtonFallback: {
    backgroundColor: "#F2F2F7",
  },
  modalHeaderButton: {
    fontSize: 17,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  modalContent: {
    padding: 20,
  },
  photoPicker: {
    height: 140,
    borderRadius: 12,
    overflow: "hidden",
  },
  selectedPhoto: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  photoPlaceholderText: {
    fontSize: 15,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  textInput: {
    fontSize: 17,
    padding: 16,
    borderRadius: 12,
  },
  datePickerHost: {
    width: "100%",
    height: 350,
  },
  dateButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
});
