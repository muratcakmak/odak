import { useState, useEffect } from "react";
import { StyleSheet, View, Text, ScrollView, Pressable, ImageBackground, Modal, TextInput, Platform, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassView } from "expo-glass-effect";
import { hasLiquidGlassSupport } from "../../utils/capabilities";
import Ionicons from "@expo/vector-icons/Ionicons";
import { DatePicker, Host, ContextMenu, Button, Divider } from "@expo/ui/swift-ui";
import { datePickerStyle } from "@expo/ui/swift-ui/modifiers";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import Animated, { FadeIn, FadeOut, Layout, Easing } from "react-native-reanimated";
import { getAheadEvents, addAheadEvent, getAheadViewMode, setAheadViewMode, saveImageLocally, type AheadEvent, type ViewMode } from "../../utils/storage";
import { useUnistyles } from "react-native-unistyles";

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

// Event card with image background
function EventCard({
  title,
  date,
  image,
  onPress,
  compact = false,
  cardBackgroundColor,
}: {
  title: string;
  date: Date;
  image?: string;
  onPress?: () => void;
  compact?: boolean;
  cardBackgroundColor: string;
}) {
  const { theme } = useUnistyles();
  const styles = createStyles(theme);
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
          <View style={[styles.gridCard, { backgroundColor: cardBackgroundColor }]}>
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
        <View style={[styles.eventCard, { backgroundColor: cardBackgroundColor }]}>
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
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (title: string, date: Date, image?: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1); // Default to tomorrow
    return date;
  });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { theme } = useUnistyles();
  const styles = createStyles(theme);
  // Replicating colors logic locally for modal elements if needed or using theme directly
  const inputBg = theme.colors.surface;

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
      <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <HeaderButton onPress={onClose}>
            <Text style={[styles.modalHeaderButton, { color: "#007AFF" }]}>Cancel</Text>
          </HeaderButton>
          <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>New Event</Text>
          <HeaderButton onPress={handleAdd} disabled={!title.trim()}>
            <Text style={[styles.modalHeaderButton, { color: title.trim() ? "#007AFF" : theme.colors.textSecondary }]}>
              Add
            </Text>
          </HeaderButton>
        </View>

        {/* Form */}
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Photo Picker */}
          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Event Photo</Text>
            <Pressable onPress={pickImage} style={[styles.photoPicker, { backgroundColor: inputBg }]}>
              {selectedImage ? (
                <Image source={{ uri: selectedImage }} style={styles.selectedPhoto} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="image-outline" size={32} color={theme.colors.textSecondary} />
                  <Text style={[styles.photoPlaceholderText, { color: theme.colors.textSecondary }]}>
                    Tap to select photo
                  </Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* Title Input */}
          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Event Title</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: inputBg, color: theme.colors.textPrimary }]}
              placeholder="Enter event title..."
              placeholderTextColor={theme.colors.textSecondary}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Date Picker */}
          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Event Date</Text>
            {Platform.OS === "ios" ? (
              <Host style={styles.datePickerHost}>
                <DatePicker
                  selection={selectedDate}
                  onDateChange={setSelectedDate}
                  range={{ start: new Date(Date.now() + 24 * 60 * 60 * 1000) }}
                  modifiers={[datePickerStyle("graphical")]}
                />
              </Host>
            ) : (
              <Pressable style={[styles.dateButton, { backgroundColor: inputBg }]}>
                <Text style={{ color: theme.colors.textPrimary }}>{selectedDate.toLocaleDateString()}</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function AheadScreen() {
  const { theme } = useUnistyles();
  const styles = createStyles(theme);

  const [events, setEvents] = useState<AheadEvent[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sortType, setSortType] = useState<SortType>("date_asc");
  const [viewMode, setViewMode] = useState<ViewMode>(() => getAheadViewMode());

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
  const handleAddEvent = async (title: string, date: Date, image?: string) => {
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
  };

  // Open add modal (calendar button opens date picker modal)
  const openAddModal = () => setShowAddModal(true);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={["top"]}>
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
                      setAheadViewMode("grid");
                    }}
                  />
                  <Button
                    label="List View"
                    systemImage={viewMode === "list" ? "checkmark" : undefined}
                    onPress={() => {
                      setViewMode("list");
                      setAheadViewMode("list");
                    }}
                  />
                  <Divider />
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

        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Time ahead</Text>

        <PillButton style={styles.rightPillButton} onPress={openAddModal}>
          <Ionicons name="calendar-outline" size={20} color={theme.colors.textPrimary} />
          <Text style={[styles.plusBadge, { color: theme.colors.textPrimary }]}>+</Text>
          <View style={[styles.buttonDivider, { backgroundColor: theme.colors.cardBorder }]} />
          <Ionicons name="add" size={24} color={theme.colors.textPrimary} />
        </PillButton>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {events.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={theme.colors.textPrimary} style={{ opacity: 0.3 }} />
            <Text style={[styles.emptyText, { color: theme.colors.textPrimary }]}>No upcoming events</Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.textPrimary }]}>
              Tap the + button to add an event
            </Text>
          </View>
        ) : (
          <View style={viewMode === "grid" ? styles.gridContainer : styles.listContainer}>
            {sortedEvents.map((event) => (
              <Animated.View
                key={`${event.id}-${viewMode}`}
                layout={Layout.duration(250).easing(Easing.out(Easing.quad))}
                entering={FadeIn.duration(200).easing(Easing.out(Easing.quad))}
                exiting={FadeOut.duration(150).easing(Easing.in(Easing.quad))}
                style={viewMode === "grid" ? styles.gridCardWrapper : undefined}
              >
                <EventCard
                  title={event.title}
                  date={event.dateObj}
                  image={event.image}
                  onPress={() => router.push(`/event/${event.id}`)}
                  compact={viewMode === "grid"}
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
    </SafeAreaView>
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
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: "600",
  },
  pillButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.xl,
    flexDirection: "row",
    alignItems: "center",
  },
  rightPillButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.xl,
    flexDirection: "row",
    alignItems: "center",
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
    // backgroundColor handled in component via prop? no, handled here via theme.colors.cardBorder in component or style?
    // The component used style override for color. Let's make it theme aware in component.
    marginHorizontal: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingTop: 0,
    paddingBottom: 120,
  },
  eventCard: {
    height: 160,
    borderRadius: theme.borderRadius.lg,
    overflow: "hidden",
    marginBottom: theme.spacing.md,
  },
  eventCardImage: {
    borderRadius: theme.borderRadius.lg,
  },
  noImageText: {
    color: theme.colors.textPrimary,
  },
  eventCardOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    justifyContent: "flex-end",
  },
  eventCardContent: {
    padding: theme.spacing.md,
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
    marginBottom: theme.spacing.md,
  },
  gridCard: {
    height: 160,
    borderRadius: theme.borderRadius.md,
    overflow: "hidden",
  },
  gridCardImage: {
    borderRadius: theme.borderRadius.md,
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
