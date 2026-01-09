import { useState, useEffect } from "react";
import { StyleSheet, View, Text, ScrollView, Pressable, ImageBackground, Modal, TextInput, Platform, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassView } from "expo-glass-effect";
import { hasLiquidGlassSupport } from "../../utils/capabilities";
import Ionicons from "@expo/vector-icons/Ionicons";
import Svg, { Circle } from "react-native-svg";
import { DatePicker, Host, ContextMenu, Button, Divider } from "@expo/ui/swift-ui";
import { datePickerStyle } from "@expo/ui/swift-ui/modifiers";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import Animated, { FadeIn, FadeOut, Layout, Easing } from "react-native-reanimated";
import { getSinceEvents, addSinceEvent, type SinceEvent, getSinceViewMode, setSinceViewMode, saveImageLocally, type ViewMode } from "../../utils/storage";
import { useUnistyles } from "react-native-unistyles";

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

// Pill button with glass effect
function PillButton({
  children,
  onPress,
  style,
  fallbackColor,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
  fallbackColor?: string;
}) {
  const { theme } = useUnistyles();
  const isGlassAvailable = hasLiquidGlassSupport();

  if (isGlassAvailable) {
    return (
      <Pressable onPress={onPress}>
        <GlassView style={style} isInteractive>
          {children}
        </GlassView>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} style={[{ backgroundColor: fallbackColor || theme.colors.card }, style]}>
      {children}
    </Pressable>
  );
}

// Info banner component
function InfoBanner({ onPress }: { onPress?: () => void }) {
  const { theme } = useUnistyles();
  const styles = createStyles(theme);
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
  cardBackgroundColor,
}: {
  title: string;
  startDate: Date;
  image?: string;
  showProgress?: boolean;
  onPress?: () => void;
  compact?: boolean;
  cardBackgroundColor: string;
}) {
  const { theme } = useUnistyles();
  const styles = createStyles(theme);
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
          <View style={[styles.sinceCardList, { backgroundColor: cardBackgroundColor }]}>
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
        <View style={[styles.sinceCard, { backgroundColor: cardBackgroundColor }]}>
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
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (title: string, date: Date, image?: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => new Date()); // Default to today
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { theme } = useUnistyles();
  const styles = createStyles(theme);

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

  // Styles using theme directly since creating local style object is tedious for dynamic colors if not using StyleSheet
  // Actually, we can just use inline styles with theme.colors
  const bg = theme.colors.background;
  const textColor = theme.colors.textPrimary;
  const secondaryTextColor = theme.colors.textSecondary;
  const inputBg = theme.colors.surface;

  // Use PillButton for modal header buttons
  const HeaderButton = ({ onPress, disabled, children }: { onPress: () => void; disabled?: boolean; children: React.ReactNode }) => (
    <PillButton onPress={onPress} disabled={disabled} style={styles.headerGlassButton}>
      {children}
    </PillButton>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: bg }]}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <HeaderButton onPress={onClose}>
            <Text style={[styles.modalHeaderButton, { color: "#007AFF" }]}>Cancel</Text>
          </HeaderButton>
          <Text style={[styles.modalTitle, { color: textColor }]}>New Habit</Text>
          <HeaderButton onPress={handleAdd} disabled={!title.trim()}>
            <Text style={[styles.modalHeaderButton, { color: title.trim() ? "#007AFF" : secondaryTextColor }]}>
              Add
            </Text>
          </HeaderButton>
        </View>

        {/* Form */}
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Photo Picker */}
          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: secondaryTextColor }]}>Habit Photo</Text>
            <Pressable onPress={pickImage} style={[styles.photoPicker, { backgroundColor: inputBg }]}>
              {selectedImage ? (
                <Image source={{ uri: selectedImage }} style={styles.selectedPhoto} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="image-outline" size={32} color={secondaryTextColor} />
                  <Text style={[styles.photoPlaceholderText, { color: secondaryTextColor }]}>
                    Tap to select photo
                  </Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* Title Input */}
          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: secondaryTextColor }]}>Habit Title</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: inputBg, color: textColor }]}
              placeholder="Enter habit title..."
              placeholderTextColor={secondaryTextColor}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Date Picker */}
          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: secondaryTextColor }]}>Start Date</Text>
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
              <Pressable style={[styles.dateButton, { backgroundColor: inputBg }]}>
                <Text style={{ color: textColor }}>{selectedDate.toLocaleDateString()}</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function SinceScreen() {
  const { theme } = useUnistyles();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<SinceEvent[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sortType, setSortType] = useState<SortType>("date_desc");
  const [viewMode, setViewMode] = useState<ViewMode>(() => getSinceViewMode());

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
  const handleAddEvent = async (title: string, date: Date, image?: string) => {
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
  };

  // Open add modal
  const openAddModal = () => setShowAddModal(true);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
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
                    <PillButton style={styles.pillButton}>
                      <Ionicons name="options-outline" size={20} color={theme.colors.textPrimary} />
                    </PillButton>
                  </View>
                </ContextMenu.Trigger>
              </ContextMenu>
            </Host>
          ) : (
            <PillButton style={styles.pillButton}>
              <Ionicons name="options-outline" size={20} color={theme.colors.textPrimary} />
            </PillButton>
          )}
        </View>

        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Time since</Text>

        <PillButton onPress={openAddModal} style={styles.pillButton}>
          <Ionicons name="add" size={24} color={theme.colors.textPrimary} />
        </PillButton>
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
            <Ionicons name="time-outline" size={48} color={theme.colors.textPrimary} style={{ opacity: 0.3 }} />
            <Text style={[styles.emptyText, { color: theme.colors.textPrimary }]}>No habits yet</Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.textPrimary }]}>
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
                  cardBackgroundColor={theme.colors.surface}
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
      />
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
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
    backgroundColor: theme.colors.surface,
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
    backgroundColor: theme.colors.surface,
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
