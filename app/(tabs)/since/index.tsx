import { useState, useEffect } from "react";
import { StyleSheet, View, Text, ScrollView, Pressable, ImageBackground, Modal, TextInput, Platform, Image, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { DatePicker, Host } from "@expo/ui/swift-ui";
import { datePickerStyle } from "@expo/ui/swift-ui/modifiers";
import * as ImagePicker from "expo-image-picker";
import { Link, router, Stack } from "expo-router";
import Animated, { FadeIn, FadeOut, Layout, Easing } from "react-native-reanimated";
import { getSinceEvents, addSinceEvent, deleteSinceEvent, getSinceViewMode, setSinceViewMode, saveImageLocally, type SinceEvent, type ViewMode } from "../../../utils/storage";
import { useUnistyles } from "react-native-unistyles";
// Shared Components
import { TimeScreenLayout } from "../../../components/TimeScreenLayout";
import { TimeCard } from "../../../components/TimeCard";
import { AdaptivePillButton } from "../../../components/ui";

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
      aspect: [1, 1], // Since cards are often square/compact, but list is wide. 1:1 is safe for cropping.
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const bg = theme.colors.background;
  const textColor = theme.colors.textPrimary;
  const secondaryTextColor = theme.colors.textSecondary;
  const inputBg = theme.colors.surface;

  const HeaderButton = ({ onPress, disabled, children }: { onPress: () => void; disabled?: boolean; children: React.ReactNode }) => (
    <AdaptivePillButton onPress={onPress} disabled={disabled} style={styles.headerGlassButton}>
      {children}
    </AdaptivePillButton>
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
              <View style={styles.datePickerContainer}>
                <Host style={styles.datePickerHost}>
                  <DatePicker
                    selection={selectedDate}
                    onDateChange={setSelectedDate}
                    range={{
                      start: new Date(Date.now() - 50 * 365 * 24 * 60 * 60 * 1000), // 50 years ago
                      end: new Date()
                    }}
                    modifiers={[datePickerStyle("graphical")]}
                  />
                </Host>
              </View>
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

  // Delete event with confirmation
  const handleDeleteEvent = (id: string, title: string) => {
    Alert.alert(
      "Delete Event",
      `Are you sure you want to delete "${title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteSinceEvent(id);
            setEvents((prev) => prev.filter((e) => e.id !== id));
          },
        },
      ]
    );
  };

  // Navigate to event detail
  const handleShowEvent = (id: string) => {
    router.push(`/event/${id}`);
  };

  // Open add modal
  const openAddModal = () => setShowAddModal(true);

  // View mode and sort handlers for menu
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    setSinceViewMode(mode);
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Native header using experimental Stack.Header API */}
      <Stack.Header>
        <Stack.Header.Title>Time since</Stack.Header.Title>

        {/* Left side - Filter/Sort menu */}
        <Stack.Header.Left>
          <Stack.Header.Menu icon="line.3.horizontal.decrease.circle">
            <Stack.Header.MenuAction
              icon={viewMode === "grid" ? "checkmark" : undefined}
              onPress={() => handleViewModeChange("grid")}
            >
              Grid View
            </Stack.Header.MenuAction>
            <Stack.Header.MenuAction
              icon={viewMode === "list" ? "checkmark" : undefined}
              onPress={() => handleViewModeChange("list")}
            >
              List View
            </Stack.Header.MenuAction>
            <Stack.Header.MenuAction
              icon={sortType === "date_asc" ? "checkmark" : undefined}
              onPress={() => setSortType("date_asc")}
            >
              Longest First
            </Stack.Header.MenuAction>
            <Stack.Header.MenuAction
              icon={sortType === "date_desc" ? "checkmark" : undefined}
              onPress={() => setSortType("date_desc")}
            >
              Recent First
            </Stack.Header.MenuAction>
            <Stack.Header.MenuAction
              icon={sortType === "title_asc" ? "checkmark" : undefined}
              onPress={() => setSortType("title_asc")}
            >
              Title A-Z
            </Stack.Header.MenuAction>
            <Stack.Header.MenuAction
              icon={sortType === "title_desc" ? "checkmark" : undefined}
              onPress={() => setSortType("title_desc")}
            >
              Title Z-A
            </Stack.Header.MenuAction>
          </Stack.Header.Menu>
        </Stack.Header.Left>

        {/* Right side - Calendar and Add buttons in ONE glass container */}
        <Stack.Header.Right>
          <Stack.Header.Button
            icon="calendar.badge.plus"
            onPress={openAddModal}
          />
          <Stack.Header.Button
            icon="plus"
            onPress={openAddModal}
          />
        </Stack.Header.Right>
      </Stack.Header>

      <TimeScreenLayout
        title="Time since"
        showHeader={false}
        viewMode={viewMode}
        isEmpty={events.length === 0}
        emptyStateText="No habits yet"
        emptyStateSubtext="Tap the + button to track a habit"
        emptyStateIcon="time-outline"
      >
        {sortedEvents.map((event) => {
          const daysSince = getDaysSince(event.dateObj);
          return (
            <Animated.View
              key={`${event.id}-${viewMode}`}
              layout={Layout.duration(250).easing(Easing.out(Easing.quad))}
              entering={FadeIn.duration(200).easing(Easing.out(Easing.quad))}
              exiting={FadeOut.duration(150).easing(Easing.in(Easing.quad))}
              style={viewMode === "grid" ? styles.gridCardWrapper : styles.listCardWrapper}
            >
              <Link href={`/event/${event.id}`} style={styles.cardLink}>
                <Link.Trigger style={styles.cardTrigger}>
                  <TimeCard
                    title={event.title}
                    daysValue={daysSince + " days"} // Or just number? Screenshot showed "In 26 days". For since: "206 days"?
                    // User screenshot was Ahead. Since usually says "51 days".
                    // Let's stick to daysValue="50 days" for consistency with "In 26 days"
                    daysLabel="since"
                    subtitle={formatDate(event.dateObj)}
                    image={event.image}
                    compact={viewMode === "grid"}
                  />
                </Link.Trigger>
                <Link.Preview />
                <Link.Menu>
                  <Link.MenuAction title="Show" icon="eye" onPress={() => handleShowEvent(event.id)} />
                  <Link.MenuAction
                    title="Delete"
                    icon="trash"
                    destructive
                    onPress={() => handleDeleteEvent(event.id, event.title)}
                  />
                </Link.Menu>
              </Link>
            </Animated.View>
          );
        })}
      </TimeScreenLayout>

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
  gridCardWrapper: {
    width: "47%",
    marginBottom: theme.spacing.md,
  },
  listCardWrapper: {
    width: "100%",
    marginBottom: theme.spacing.md,
  },
  cardLink: {
    width: "100%",
  },
  cardTrigger: {
    width: "100%",
  },
  // Modal Styles
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
  datePickerContainer: {
    overflow: "visible",
    minHeight: 400,
  },
  datePickerHost: {
    width: "100%",
    height: 400,
  },
  dateButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
});
