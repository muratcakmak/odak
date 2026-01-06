import { useState, useEffect, useCallback } from "react";
import { StyleSheet, View, Text, ScrollView, Pressable, ImageBackground, useColorScheme, Modal, TextInput, Platform, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import Ionicons from "@expo/vector-icons/Ionicons";
import { DatePicker, Host, ContextMenu, Button } from "@expo/ui/swift-ui";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import Animated, { LinearTransition, FadeIn, FadeOut } from "react-native-reanimated";
import { getAheadEvents, addAheadEvent, getAheadViewMode, setAheadViewMode, saveImageLocally, type AheadEvent, type ViewMode } from "../../utils/storage";

// Sort options
type SortType = "date_asc" | "date_desc" | "title_asc" | "title_desc";

function formatDate(date: Date) {
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  return `Starts ${date.toLocaleDateString("en-US", options)}`;
}

function getDaysUntil(date: Date) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
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

// Event card with image background
function EventCard({
  title,
  date,
  image,
  onPress,
  compact = false,
}: {
  title: string;
  date: Date;
  image?: string;
  onPress?: () => void;
  compact?: boolean;
}) {
  const daysUntil = getDaysUntil(date);

  if (compact) {
    return (
      <Pressable onPress={onPress}>
        {image ? (
          <ImageBackground
            source={{ uri: image }}
            style={styles.gridCard}
            imageStyle={styles.gridCardImage}
          >
            <View style={styles.gridCardOverlay}>
              <View style={styles.gridCardContent}>
                <Text style={styles.gridDaysText}>In {daysUntil} days</Text>
                <Text style={styles.gridDateText}>{formatDate(date)}</Text>
                <Text style={styles.gridTitleText} numberOfLines={2}>{title}</Text>
              </View>
            </View>
          </ImageBackground>
        ) : (
          <View style={[styles.gridCard, styles.gridCardNoImage]}>
            <View style={styles.gridCardContent}>
              <Text style={styles.gridDaysText}>In {daysUntil} days</Text>
              <Text style={styles.gridDateText}>{formatDate(date)}</Text>
              <Text style={styles.gridTitleText} numberOfLines={2}>{title}</Text>
            </View>
          </View>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress}>
      {image ? (
        <ImageBackground
          source={{ uri: image }}
          style={styles.eventCard}
          imageStyle={styles.eventCardImage}
        >
          <View style={styles.eventCardOverlay}>
            <View style={styles.eventCardContent}>
              <Text style={styles.eventDaysText}>In {daysUntil} days</Text>
              <Text style={styles.eventDateText}>{formatDate(date)}</Text>
              <Text style={styles.eventTitleText}>{title}</Text>
            </View>
          </View>
        </ImageBackground>
      ) : (
        <View style={[styles.eventCard, styles.eventCardNoImage]}>
          <View style={styles.eventCardContent}>
            <Text style={[styles.eventDaysText, styles.noImageText]}>In {daysUntil} days</Text>
            <Text style={[styles.eventDateText, styles.noImageText]}>{formatDate(date)}</Text>
            <Text style={[styles.eventTitleText, styles.noImageText]}>{title}</Text>
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
  const [selectedDate, setSelectedDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1); // Default to tomorrow
    return date;
  });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const isGlassAvailable = isLiquidGlassAvailable();

  const handleAdd = () => {
    if (title.trim()) {
      onAdd(title.trim(), selectedDate, selectedImage || undefined);
      setTitle("");
      setSelectedDate(() => {
        const date = new Date();
        date.setDate(date.getDate() + 1); // Reset to tomorrow
        return date;
      });
      setSelectedImage(null);
      onClose();
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
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
          <Text style={[styles.modalTitle, { color: colors.text }]}>New Event</Text>
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
            <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>Event Photo</Text>
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
            <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>Event Title</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.inputBg, color: colors.text }]}
              placeholder="Enter event title..."
              placeholderTextColor={colors.secondaryText}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Date Picker */}
          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>Event Date</Text>
            {Platform.OS === "ios" ? (
              <Host style={styles.datePickerHost}>
                <DatePicker
                  selection={selectedDate}
                  onDateChange={setSelectedDate}
                  range={{ start: new Date(Date.now() + 24 * 60 * 60 * 1000) }}
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

export default function AheadScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [events, setEvents] = useState<AheadEvent[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sortType, setSortType] = useState<SortType>("date_asc");
  const [viewMode, setViewMode] = useState<ViewMode>(() => getAheadViewMode());

  // Toggle view mode
  const toggleViewMode = useCallback(() => {
    const newMode = viewMode === "list" ? "grid" : "list";
    setViewMode(newMode);
    setAheadViewMode(newMode);
  }, [viewMode]);

  const colors = {
    background: isDark ? "#000000" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#000000",
  };

  // Sort events based on current sort type
  const sortedEvents = [...events]
    .map((event) => ({
      ...event,
      dateObj: new Date(event.date),
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
          return a.dateObj.getTime() - b.dateObj.getTime();
      }
    });

  // Load events from MMKV
  useEffect(() => {
    const loadEvents = () => {
      const storedEvents = getAheadEvents();
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
    const newEvent = addAheadEvent({
      title,
      date: date.toISOString(),
      image: localImageUri,
    });
    setEvents((prev) => [...prev, newEvent]);
  }, []);

  // Open add modal (calendar button opens date picker modal)
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
                    label="Soonest First"
                    systemImage={sortType === "date_asc" ? "checkmark" : undefined}
                    onPress={() => setSortType("date_asc")}
                  />
                  <Button
                    label="Latest First"
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
          <HeaderPillButton onPress={toggleViewMode}>
            <Ionicons
              name={viewMode === "list" ? "grid-outline" : "list-outline"}
              size={20}
              color={colors.text}
            />
          </HeaderPillButton>
        </View>

        <Text style={[styles.headerTitle, { color: colors.text }]}>Time ahead</Text>

        <HeaderPillButton style={styles.rightPillButton} onPress={openAddModal}>
          <Ionicons name="calendar-outline" size={20} color={colors.text} />
          <Text style={[styles.plusBadge, { color: colors.text }]}>+</Text>
          <View style={styles.buttonDivider} />
          <Ionicons name="add" size={24} color={colors.text} />
        </HeaderPillButton>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {events.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={colors.text} style={{ opacity: 0.3 }} />
            <Text style={[styles.emptyText, { color: colors.text }]}>No upcoming events</Text>
            <Text style={[styles.emptySubtext, { color: colors.text }]}>
              Tap the + button to add an event
            </Text>
          </View>
        ) : (
          <Animated.View
            style={viewMode === "grid" ? styles.gridContainer : styles.listContainer}
            layout={LinearTransition.springify().damping(18).stiffness(120)}
          >
            {sortedEvents.map((event) => (
              <Animated.View
                key={`${event.id}-${viewMode}`}
                layout={LinearTransition.springify().damping(18).stiffness(120)}
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(150)}
                style={viewMode === "grid" ? styles.gridCardWrapper : undefined}
              >
                <EventCard
                  title={event.title}
                  date={event.dateObj}
                  image={event.image}
                  onPress={() => router.push(`/event/${event.id}`)}
                  compact={viewMode === "grid"}
                />
              </Animated.View>
            ))}
          </Animated.View>
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
  rightPillButton: {
    gap: 4,
  },
  plusBadge: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: -4,
    marginTop: -8,
  },
  buttonDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#C7C7CC",
    marginHorizontal: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 0,
  },
  eventCard: {
    height: 160,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
  },
  eventCardImage: {
    borderRadius: 20,
  },
  eventCardNoImage: {
    backgroundColor: "#2C2C2E",
    justifyContent: "flex-end",
  },
  noImageText: {
    color: "#FFFFFF",
  },
  eventCardOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    justifyContent: "flex-end",
  },
  eventCardContent: {
    padding: 16,
  },
  eventDaysText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  eventDateText: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 4,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  eventTitleText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  // List view styles
  listContainer: {
    flexDirection: "column",
  },
  // Grid view styles
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridCardWrapper: {
    width: "48%",
    marginBottom: 16,
  },
  gridCard: {
    height: 160,
    borderRadius: 16,
    overflow: "hidden",
  },
  gridCardImage: {
    borderRadius: 16,
  },
  gridCardNoImage: {
    backgroundColor: "#2C2C2E",
    justifyContent: "flex-end",
  },
  gridCardOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "flex-end",
  },
  gridCardContent: {
    padding: 12,
  },
  gridDaysText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  gridDateText: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 4,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  gridTitleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
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
