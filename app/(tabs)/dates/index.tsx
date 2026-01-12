import { useState, useEffect } from "react";
import { StyleSheet, View, Text, ScrollView, Pressable, Modal, TextInput, Platform, Image, Alert, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { hasLiquidGlassSupport } from "../../../utils/capabilities";
import Ionicons from "@expo/vector-icons/Ionicons";
import { DatePicker, Host, Picker, Text as SwiftUIText } from "@expo/ui/swift-ui";
import { datePickerStyle, tint, pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";
import * as ImagePicker from "expo-image-picker";
import { Link, router, Stack } from "expo-router";
import Animated, { FadeIn, FadeOut, Layout, Easing } from "react-native-reanimated";
import {
  getAheadEvents, addAheadEvent, deleteAheadEvent, getAheadViewMode, setAheadViewMode,
  getSinceEvents, addSinceEvent, deleteSinceEvent, getSinceViewMode, setSinceViewMode,
  saveImageLocally, useAccentColor,
  type AheadEvent, type SinceEvent, type ViewMode
} from "../../../utils/storage";
import { useUnistyles } from "react-native-unistyles";
// Shared Components
import { TimeScreenLayout } from "../../../components/TimeScreenLayout";
import { TimeCard } from "../../../components/TimeCard";
import { AdaptivePillButton } from "../../../components/ui";

// Date mode type
type DateMode = "ahead" | "since";

// Sort options
type SortType = "date_asc" | "date_desc" | "title_asc" | "title_desc";

// Unified event type for display
type DisplayEvent = {
  id: string;
  title: string;
  date: Date;
  image?: string;
  mode: DateMode;
};

function formatDateAhead(date: Date) {
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  return `Starts ${date.toLocaleDateString("en-US", options)}`;
}

function formatDateSince(date: Date) {
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  return date.toLocaleDateString("en-US", options);
}

function getDaysUntil(date: Date) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
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
  mode,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (title: string, date: Date, image?: string) => void;
  mode: DateMode;
}) {
  const [title, setTitle] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => {
    if (mode === "ahead") {
      const date = new Date();
      date.setDate(date.getDate() + 1); // Default to tomorrow
      return date;
    }
    return new Date(); // Default to today for since
  });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { theme } = useUnistyles();
  const styles = createStyles(theme);
  const inputBg = theme.colors.surface;
  const accentColorName = useAccentColor();
  const accentColor = theme.colors.accent[accentColorName].primary;

  // Reset state when mode changes
  useEffect(() => {
    if (visible) {
      setTitle("");
      setSelectedImage(null);
      if (mode === "ahead") {
        const date = new Date();
        date.setDate(date.getDate() + 1);
        setSelectedDate(date);
      } else {
        setSelectedDate(new Date());
      }
    }
  }, [visible, mode]);

  const handleAdd = () => {
    if (title.trim()) {
      onAdd(title.trim(), selectedDate, selectedImage || undefined);
      setTitle("");
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

  const HeaderButton = ({ onPress, disabled, children }: { onPress: () => void; disabled?: boolean; children: React.ReactNode }) => (
    <AdaptivePillButton onPress={onPress} disabled={disabled} style={styles.headerGlassButton}>
      {children}
    </AdaptivePillButton>
  );

  // Date picker range based on mode
  const dateRange = mode === "ahead"
    ? {
      start: new Date(Date.now() + 24 * 60 * 60 * 1000),
      end: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000) // 10 years from now
    }
    : {
      start: new Date(Date.now() - 50 * 365 * 24 * 60 * 60 * 1000), // 50 years ago
      end: new Date()
    };

  const modalTitle = mode === "ahead" ? "New Event" : "New Milestone";
  const titleLabel = mode === "ahead" ? "Event Title" : "Milestone Title";
  const titlePlaceholder = mode === "ahead" ? "Enter event title..." : "Enter milestone title...";
  const dateLabel = mode === "ahead" ? "Event Date" : "Start Date";

  const { height: screenHeight } = useWindowDimensions();
  const datePickerHeight = screenHeight * 0.45; // 45% of screen height

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <HeaderButton onPress={onClose}>
              <Text style={[styles.modalHeaderButton, { color: theme.colors.systemBlue }]}>Cancel</Text>
            </HeaderButton>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>{modalTitle}</Text>
            <HeaderButton onPress={handleAdd} disabled={!title.trim()}>
              <Text style={[styles.modalHeaderButton, { color: title.trim() ? theme.colors.systemBlue : theme.colors.textSecondary }]}>
                Add
              </Text>
            </HeaderButton>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
          >
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.formContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Photo Picker - Full Width Cover */}
              {/* Moved inside ScrollView to allow scrolling away when keyboard is up */}
              <Pressable onPress={pickImage} style={[styles.photoPicker, { backgroundColor: inputBg }]}>
                {selectedImage ? (
                  <Image source={{ uri: selectedImage }} style={styles.selectedPhoto} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Ionicons name="image-outline" size={32} color={theme.colors.textSecondary} />
                    <Text style={[styles.photoPlaceholderText, { color: theme.colors.textSecondary }]}>
                      Add Cover Photo
                    </Text>
                  </View>
                )}
              </Pressable>

              <View style={styles.formControlsContainer}>
                {/* Title Input */}
                <View style={styles.inputSection}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>{titleLabel}</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: inputBg, color: theme.colors.textPrimary }]}
                    placeholder={titlePlaceholder}
                    placeholderTextColor={theme.colors.textSecondary}
                    value={title}
                    onChangeText={setTitle}
                  />
                </View>

                {/* Date Picker */}
                <View style={styles.inputSection}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>{dateLabel}</Text>
                  {Platform.OS === "ios" ? (
                    <View style={[styles.datePickerContainer, { height: datePickerHeight }]}>
                      <Host style={[styles.datePickerHost, { height: datePickerHeight }]}>
                        <DatePicker
                          selection={selectedDate}
                          onDateChange={setSelectedDate}
                          range={dateRange}
                          modifiers={[datePickerStyle("graphical"), tint(accentColor)]}
                        />
                      </Host>
                    </View>
                  ) : (
                    <Pressable style={[styles.dateButton, { backgroundColor: inputBg }]}>
                      <Text style={{ color: theme.colors.textPrimary }}>{selectedDate.toLocaleDateString()}</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

export default function DatesScreen() {
  const { theme } = useUnistyles();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();

  // Mode state (ahead or since)
  const [mode, setMode] = useState<DateMode>("ahead");

  // Events state for both modes
  const [aheadEvents, setAheadEvents] = useState<AheadEvent[]>([]);
  const [sinceEvents, setSinceEvents] = useState<SinceEvent[]>([]);

  const [showAddModal, setShowAddModal] = useState(false);

  // Default sort order differs by mode
  const [aheadSortType, setAheadSortType] = useState<SortType>("date_asc");
  const [sinceSortType, setSinceSortType] = useState<SortType>("date_desc");

  // View mode per screen type
  const [aheadViewMode, setAheadViewModeState] = useState<ViewMode>(() => getAheadViewMode());
  const [sinceViewMode, setSinceViewModeState] = useState<ViewMode>(() => getSinceViewMode());

  // Current values based on mode
  const sortType = mode === "ahead" ? aheadSortType : sinceSortType;
  const setSortType = mode === "ahead" ? setAheadSortType : setSinceSortType;
  const viewMode = mode === "ahead" ? aheadViewMode : sinceViewMode;

  // Convert to display events for unified rendering
  const events = mode === "ahead" ? aheadEvents : sinceEvents;
  const displayEvents: DisplayEvent[] = events.map((event) => ({
    id: event.id,
    title: event.title,
    date: new Date(mode === "ahead" ? (event as AheadEvent).date : (event as SinceEvent).startDate),
    image: event.image,
    mode,
  }));

  // Sort events based on current sort type
  const sortedEvents = [...displayEvents].sort((a, b) => {
    switch (sortType) {
      case "date_asc":
        return a.date.getTime() - b.date.getTime();
      case "date_desc":
        return b.date.getTime() - a.date.getTime();
      case "title_asc":
        return a.title.localeCompare(b.title);
      case "title_desc":
        return b.title.localeCompare(a.title);
      default:
        return mode === "ahead"
          ? a.date.getTime() - b.date.getTime()
          : b.date.getTime() - a.date.getTime();
    }
  });

  // Load events from MMKV
  useEffect(() => {
    setAheadEvents(getAheadEvents());
    setSinceEvents(getSinceEvents());
  }, []);

  // Add new event with local image storage
  const handleAddEvent = async (title: string, date: Date, image?: string) => {
    let localImageUri: string | undefined;
    if (image) {
      localImageUri = await saveImageLocally(image);
    }

    if (mode === "ahead") {
      const newEvent = addAheadEvent({
        title,
        date: date.toISOString(),
        image: localImageUri,
      });
      setAheadEvents((prev) => [...prev, newEvent]);
    } else {
      const newEvent = addSinceEvent({
        title,
        startDate: date.toISOString(),
        image: localImageUri,
      });
      setSinceEvents((prev) => [...prev, newEvent]);
    }
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
            if (mode === "ahead") {
              deleteAheadEvent(id);
              setAheadEvents((prev) => prev.filter((e) => e.id !== id));
            } else {
              deleteSinceEvent(id);
              setSinceEvents((prev) => prev.filter((e) => e.id !== id));
            }
          },
        },
      ]
    );
  };

  // Navigate to event detail
  const handleShowEvent = (id: string) => {
    router.push({ pathname: "/event/[id]", params: { id } });
  };

  // Open add modal
  const openAddModal = () => setShowAddModal(true);

  // View mode handler
  const handleViewModeChange = (newMode: ViewMode) => {
    if (mode === "ahead") {
      setAheadViewModeState(newMode);
      setAheadViewMode(newMode);
    } else {
      setSinceViewModeState(newMode);
      setSinceViewMode(newMode);
    }
  };

  // Mode switch handler
  const handleModeChange = (index: number) => {
    setMode(index === 0 ? "ahead" : "since");
  };

  // Dynamic labels based on mode
  const headerTitle = mode === "ahead" ? "Countdown" : "Milestone";
  const sortLabels = mode === "ahead"
    ? { dateAsc: "Soonest First", dateDesc: "Latest First" }
    : { dateAsc: "Longest First", dateDesc: "Recent First" };
  const emptyStateText = mode === "ahead" ? "No upcoming events" : "No milestones yet";
  const emptyStateSubtext = mode === "ahead"
    ? "Tap the + button to add an event"
    : "Tap the + button to track a milestone";
  const emptyStateIcon = mode === "ahead" ? "calendar-outline" : "time-outline";

  return (
    <View style={{ flex: 1 }}>
      {/* Native header using experimental Stack.Header API */}
      <Stack.Header>
        <Stack.Header.Title>{""}</Stack.Header.Title>
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
              {sortLabels.dateAsc}
            </Stack.Header.MenuAction>
            <Stack.Header.MenuAction
              icon={sortType === "date_desc" ? "checkmark" : undefined}
              onPress={() => setSortType("date_desc")}
            >
              {sortLabels.dateDesc}
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

        {/* Right side - Add button */}
        <Stack.Header.Right>
          <Stack.Header.Button
            icon="plus"
            onPress={openAddModal}
          />
        </Stack.Header.Right>
      </Stack.Header>

      <TimeScreenLayout
        title={headerTitle}
        showHeader={false}
        viewMode={viewMode}
        isEmpty={events.length === 0}
        emptyStateText={emptyStateText}
        emptyStateSubtext={emptyStateSubtext}
        emptyStateIcon={emptyStateIcon}
        stickyHeader={
          <Host style={{ marginHorizontal: 16, marginVertical: 8 }} matchContents>
            <Picker
              selection={mode === "ahead" ? 0 : 1}
              onSelectionChange={(val) => handleModeChange(val as number)}
              modifiers={[pickerStyle("segmented")]}
            >
              <SwiftUIText modifiers={[tag(0)]}>Countdown</SwiftUIText>
              <SwiftUIText modifiers={[tag(1)]}>Milestone</SwiftUIText>
            </Picker>
          </Host>
        }
      >
        {sortedEvents.map((event) => {
          const daysValue = mode === "ahead"
            ? "In " + getDaysUntil(event.date)
            : getDaysSince(event.date) + "";
          const daysLabel = mode === "ahead" ? "days" : "days since";
          const subtitle = mode === "ahead"
            ? formatDateAhead(event.date)
            : formatDateSince(event.date);

          return (
            <Animated.View
              key={`${event.id}-${viewMode}-${mode}`}
              layout={Layout.duration(250).easing(Easing.out(Easing.quad))}
              entering={FadeIn.duration(200).easing(Easing.out(Easing.quad))}
              exiting={FadeOut.duration(150).easing(Easing.in(Easing.quad))}
              style={viewMode === "grid" ? styles.gridCardWrapper : styles.listCardWrapper}
            >
              <Link href={{ pathname: "/event/[id]", params: { id: event.id } }} style={styles.cardLink} asChild>
                <Link.Trigger
                  style={{
                    borderRadius: viewMode === "grid" ? theme.borderRadius.lg : theme.borderRadius.xl,
                    overflow: "hidden",
                  }}
                >
                  <Pressable
                    onPress={() => router.push({ pathname: "/event/[id]", params: { id: event.id } })}
                    onLongPress={() => null}
                    delayLongPress={250}
                  >
                    <TimeCard
                      title={event.title}
                      daysValue={daysValue}
                      daysLabel={daysLabel}
                      subtitle={subtitle}
                      image={event.image}
                      compact={viewMode === "grid"}
                    />
                  </Pressable>
                </Link.Trigger>
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
        mode={mode}
      />
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  gridCardWrapper: {
    width: "47%",
    aspectRatio: 1,
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
    padding: 0,
  },
  formContent: {
    flexGrow: 1,
  },
  formControlsContainer: {
    padding: 20,
  },
  photoPicker: {
    height: 220,
    width: "100%",
    borderRadius: 0,
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
    height: 380,
    position: "relative",
  },
  datePickerHost: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 380,
  },
  dateButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
});
