import { MMKV } from "react-native-mmkv";
import { Paths, File, Directory } from "expo-file-system";
import { Platform } from "react-native";
import WidgetSync from "../modules/widget-sync";

// Initialize MMKV storage
export const storage = new MMKV();

// Widget sync helper - writes to UserDefaults for widget access
function syncToWidgetStorage(key: string, data: string): void {
  if (Platform.OS === "ios") {
    try {
      WidgetSync.setItem(key, data);
    } catch {
      // Widget sync not available, continue silently
    }
  }
}

// Refresh widget timelines after data changes
export function refreshWidgets(): void {
  if (Platform.OS === "ios") {
    try {
      WidgetSync.reloadAllTimelines();
    } catch {
      // Widget refresh not available
    }
  }
}

// Image storage directory
const getImageDir = () => new Directory(Paths.document, "images");

// Ensure image directory exists
async function ensureImageDir() {
  const imageDir = getImageDir();
  if (!imageDir.exists) {
    imageDir.create();
  }
}

// Save image locally and return local URI
export async function saveImageLocally(uri: string): Promise<string> {
  await ensureImageDir();
  const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
  const sourceFile = new File(uri);
  const destFile = new File(getImageDir(), filename);
  sourceFile.copy(destFile);
  return destFile.uri;
}

// Delete local image
export async function deleteLocalImage(uri: string): Promise<void> {
  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Ignore errors if file doesn't exist
  }
}

// Event types
export interface AheadEvent {
  id: string;
  title: string;
  date: string; // ISO string
  image?: string;
}

export interface SinceEvent {
  id: string;
  title: string;
  startDate: string; // ISO string
  image?: string;
}

// Storage keys
const AHEAD_EVENTS_KEY = "ahead_events";
const SINCE_EVENTS_KEY = "since_events";

// Ahead Events
export function getAheadEvents(): AheadEvent[] {
  const data = storage.getString(AHEAD_EVENTS_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveAheadEvents(events: AheadEvent[]): void {
  const json = JSON.stringify(events);
  storage.set(AHEAD_EVENTS_KEY, json);
  syncToWidgetStorage(AHEAD_EVENTS_KEY, json);
  refreshWidgets();
}

export function addAheadEvent(event: Omit<AheadEvent, "id">): AheadEvent {
  const events = getAheadEvents();
  const newEvent: AheadEvent = {
    ...event,
    id: Date.now().toString(),
  };
  events.push(newEvent);
  saveAheadEvents(events);
  return newEvent;
}

export function deleteAheadEvent(id: string): void {
  const events = getAheadEvents();
  const filtered = events.filter((e) => e.id !== id);
  saveAheadEvents(filtered);
}

// Since Events
export function getSinceEvents(): SinceEvent[] {
  const data = storage.getString(SINCE_EVENTS_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveSinceEvents(events: SinceEvent[]): void {
  const json = JSON.stringify(events);
  storage.set(SINCE_EVENTS_KEY, json);
  syncToWidgetStorage(SINCE_EVENTS_KEY, json);
  refreshWidgets();
}

export function addSinceEvent(event: Omit<SinceEvent, "id">): SinceEvent {
  const events = getSinceEvents();
  const newEvent: SinceEvent = {
    ...event,
    id: Date.now().toString(),
  };
  events.push(newEvent);
  saveSinceEvents(events);
  return newEvent;
}

export function deleteSinceEvent(id: string): void {
  const events = getSinceEvents();
  const filtered = events.filter((e) => e.id !== id);
  saveSinceEvents(filtered);
}

// User Profile
export interface UserProfile {
  name: string;
  birthDate: string; // ISO string
}

const USER_PROFILE_KEY = "user_profile";

export function getUserProfile(): UserProfile | null {
  const data = storage.getString(USER_PROFILE_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function saveUserProfile(profile: UserProfile): void {
  storage.set(USER_PROFILE_KEY, JSON.stringify(profile));
}

export function deleteUserProfile(): void {
  storage.delete(USER_PROFILE_KEY);
}

// Sync existing events to widget storage (call on app start)
export function syncAllEventsToWidget(): void {
  if (Platform.OS !== "ios") return;

  try {
    // Sync ahead events
    const aheadEvents = getAheadEvents();
    if (aheadEvents.length > 0) {
      syncToWidgetStorage(AHEAD_EVENTS_KEY, JSON.stringify(aheadEvents));
    }

    // Sync since events
    const sinceEvents = getSinceEvents();
    if (sinceEvents.length > 0) {
      syncToWidgetStorage(SINCE_EVENTS_KEY, JSON.stringify(sinceEvents));
    }

    // Refresh widgets
    refreshWidgets();
    console.log("[WidgetSync] Synced events to widget storage:", {
      ahead: aheadEvents.length,
      since: sinceEvents.length,
    });
  } catch (error) {
    console.log("[WidgetSync] Failed to sync:", error);
  }
}

// Life Unit Preference
export type LifeUnit = "years" | "months" | "weeks";

const LIFE_UNIT_KEY = "life_unit";

export function getLifeUnit(): LifeUnit {
  const unit = storage.getString(LIFE_UNIT_KEY);
  return (unit as LifeUnit) || "years";
}

export function setLifeUnit(unit: LifeUnit): void {
  storage.set(LIFE_UNIT_KEY, unit);
}

// View Mode Preferences
export type ViewMode = "list" | "grid";

const VIEW_MODE_AHEAD_KEY = "view_mode_ahead";
const VIEW_MODE_SINCE_KEY = "view_mode_since";

export function getAheadViewMode(): ViewMode {
  const mode = storage.getString(VIEW_MODE_AHEAD_KEY);
  return (mode as ViewMode) || "list";
}

export function setAheadViewMode(mode: ViewMode): void {
  storage.set(VIEW_MODE_AHEAD_KEY, mode);
}

export function getSinceViewMode(): ViewMode {
  const mode = storage.getString(VIEW_MODE_SINCE_KEY);
  return (mode as ViewMode) || "grid"; // Default to grid for since (like the original)
}

export function setSinceViewMode(mode: ViewMode): void {
  storage.set(VIEW_MODE_SINCE_KEY, mode);
}

// Background Preference
export type BackgroundMode = "dark" | "light" | "device";

const BACKGROUND_MODE_KEY = "background_mode";

export function getBackgroundMode(): BackgroundMode {
  const mode = storage.getString(BACKGROUND_MODE_KEY);
  return (mode as BackgroundMode) || "device";
}

export function setBackgroundMode(mode: BackgroundMode): void {
  storage.set(BACKGROUND_MODE_KEY, mode);
}
