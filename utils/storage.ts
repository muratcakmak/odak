import { MMKV } from "react-native-mmkv";
import { Paths, File, Directory } from "expo-file-system";
import { Platform } from "react-native";
import WidgetSync from "../modules/widget-sync";
import NativeTheme from "../modules/native-theme";

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

// Helper: Normalize image storage path
// Stores strictly relative path (filename) to persist across app updates/UUID changes
function makeImageRelative(uri: string | undefined): string | undefined {
  if (!uri) return undefined;

  // If it's already just a filename (no slashes), return it
  if (!uri.includes("/")) return uri;

  // If it's an absolute path to our own image directory, extract filename
  if (uri.includes("/Documents/images/")) {
    return uri.split("/images/").pop();
  }

  // Fallback: if it's some other path, return strictly the filename to be safe
  // This assumes we only store images in our controlled directory
  return uri.split("/").pop();
}

// Helper: Hydrate image path for usage
// Reconstructs valid absolute URI for the current app execution context
function resolveImageUri(path: string | undefined): string | undefined {
  if (!path) return undefined;

  // If it looks like a full URI (e.g. file:// or https://), check validity
  if (path.startsWith("file://") || path.startsWith("http")) {
    // If it's a file URI, it might be stale (old UUID). 
    // We try to rescue it by extracting the filename and checking current storage.
    if (path.startsWith("file://")) {
      const filename = path.split("/").pop();
      if (filename) {
        const currentFile = new File(getImageDir(), filename);
        if (currentFile.exists) {
          return currentFile.uri;
        }
      }
      // If we can't rescue it, return original path (might work if it's temp or persistent in a different way)
      return path;
    }
    return path;
  }

  // If it's just a filename, prepend current directory
  const currentFile = new File(getImageDir(), path);
  return currentFile.uri;
}

// Save image locally and return local URI
// NOTE: Returns ABSOLUTE URI for immediate UI usage.
// You must rely on saveAheadEvents/saveSinceEvents to strip this to relative path for storage.
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
    const events: AheadEvent[] = JSON.parse(data);
    return events.map(event => ({
      ...event,
      image: resolveImageUri(event.image)
    }));
  } catch {
    return [];
  }
}

export function saveAheadEvents(events: AheadEvent[]): void {
  // Store only relative paths
  const cleanEvents = events.map(event => ({
    ...event,
    image: makeImageRelative(event.image)
  }));

  const json = JSON.stringify(cleanEvents);
  storage.set(AHEAD_EVENTS_KEY, json);
  syncToWidgetStorage(AHEAD_EVENTS_KEY, json);
  refreshWidgets();
}

export function addAheadEvent(event: Omit<AheadEvent, "id">): AheadEvent {
  const events = getAheadEvents(); // Returns absolute URIs
  const newEvent: AheadEvent = {
    ...event,
    id: Date.now().toString(),
  };
  events.push(newEvent);
  saveAheadEvents(events); // Strips to relative
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
    const events: SinceEvent[] = JSON.parse(data);
    return events.map(event => ({
      ...event,
      image: resolveImageUri(event.image)
    }));
  } catch {
    return [];
  }
}

export function saveSinceEvents(events: SinceEvent[]): void {
  // Store only relative paths
  const cleanEvents = events.map(event => ({
    ...event,
    image: makeImageRelative(event.image)
  }));

  const json = JSON.stringify(cleanEvents);
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

// Lifespan Preference
const LIFESPAN_KEY = "lifespan";

export function getLifespan(): number {
  const lifespan = storage.getNumber(LIFESPAN_KEY) ?? 0;
  return lifespan > 0 ? lifespan : 75; // Default to 75
}

export function setLifespan(years: number): void {
  storage.set(LIFESPAN_KEY, years);
}

// Sync existing events to widget storage (call on app start)
export function syncAllEventsToWidget(): void {
  if (Platform.OS !== "ios") return;

  try {
    // Sync ahead events
    // NOTE: Widgets might need absolute paths? 
    // But widgets have their own limited file access. Passing image paths might be tricky.
    // Usually widgets use App Group container. 
    // For now, we save relative, but maybe widgets expect full? 
    // Or we just save what we have. getAheadEvents returns Absolute, so we save Absolute to widget.
    // If widget needs to load it, it must be in a shared group. 
    // This is a separate concern but standard syncing sends JSON.
    const aheadEvents = getAheadEvents();
    if (aheadEvents.length > 0) {
      syncToWidgetStorage(AHEAD_EVENTS_KEY, JSON.stringify(aheadEvents));
    }

    // Sync since events
    const sinceEvents = getSinceEvents();
    if (sinceEvents.length > 0) {
      syncToWidgetStorage(SINCE_EVENTS_KEY, JSON.stringify(sinceEvents));
    }

    // Sync background mode for native theme initialization
    const backgroundMode = storage.getString(BACKGROUND_MODE_KEY) || "device";
    syncToWidgetStorage(BACKGROUND_MODE_KEY, backgroundMode);

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
export type LifeUnit = "years" | "months";

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
  // Sync to UserDefaults for native code to read at app launch
  syncToWidgetStorage(BACKGROUND_MODE_KEY, mode);
  // Update native interface style at runtime (iOS)
  NativeTheme.setNativeThemeMode(mode);
}

// Accent Color Preference
export type AccentColor = "white" | "blue" | "green" | "orange" | "yellow" | "pink" | "red" | "mint" | "purple" | "brown";

const ACCENT_COLOR_KEY = "accent_color";

export function getAccentColor(): AccentColor {
  const color = storage.getString(ACCENT_COLOR_KEY);
  return (color as AccentColor) || "blue";
}

export function setAccentColor(color: AccentColor): void {
  storage.set(ACCENT_COLOR_KEY, color);
}

// Reactive hook for accent color
import { useState, useEffect } from "react";

export function useAccentColor(): AccentColor {
  const [color, setColor] = useState<AccentColor>(getAccentColor());

  useEffect(() => {
    // Update state if storage changes elsewhere (though MMKV is synchronous)
    // We listen to the specific key
    const listener = storage.addOnValueChangedListener((key) => {
      if (key === ACCENT_COLOR_KEY) {
        setColor(getAccentColor());
      }
    });

    return () => {
      listener.remove();
    };
  }, []);

  return color;
}

// Life Symbol Preference
export type LifeSymbol = "dots" | "squares" | "stars" | "diamonds" | "hearts" | "hexagons" | "x" | "hash";

const LIFE_SYMBOL_KEY = "life_symbol";

export function getLifeSymbol(): LifeSymbol {
  const symbol = storage.getString(LIFE_SYMBOL_KEY);
  return (symbol as LifeSymbol) || "dots";
}

export function setLifeSymbol(symbol: LifeSymbol): void {
  storage.set(LIFE_SYMBOL_KEY, symbol);
}

export function useLifeSymbol(): LifeSymbol {
  const [symbol, setSymbol] = useState<LifeSymbol>(getLifeSymbol());

  useEffect(() => {
    const listener = storage.addOnValueChangedListener((key) => {
      if (key === LIFE_SYMBOL_KEY) {
        setSymbol(getLifeSymbol());
      }
    });

    return () => {
      listener.remove();
    };
  }, []);

  return symbol;
}

export function useLifeUnit(): LifeUnit {
  const [unit, setUnit] = useState<LifeUnit>(getLifeUnit());

  useEffect(() => {
    const listener = storage.addOnValueChangedListener((key) => {
      if (key === LIFE_UNIT_KEY) {
        setUnit(getLifeUnit());
      }
    });

    return () => {
      listener.remove();
    };
  }, []);

  return unit;
}

// Share Sheet Preferences
const SHARE_THEME_KEY = "share_theme";
const SHARE_COLOR_KEY = "share_color";
const SHARE_SHAPE_KEY = "share_shape";
const SHARE_SHOW_TITLE_KEY = "share_show_title";
const SHARE_SHOW_TIME_LEFT_KEY = "share_show_time_left";
const SHARE_SHOW_APP_KEY = "share_show_app";

export function getSharePreferences() {
  return {
    theme: storage.getString(SHARE_THEME_KEY) || "Dark",
    color: storage.getString(SHARE_COLOR_KEY) || "Red",
    shape: storage.getString(SHARE_SHAPE_KEY) || "Stars",
    showTitle: storage.getBoolean(SHARE_SHOW_TITLE_KEY) ?? true,
    showTimeLeft: storage.getBoolean(SHARE_SHOW_TIME_LEFT_KEY) ?? true,
    showApp: storage.getBoolean(SHARE_SHOW_APP_KEY) ?? true,
  };
}

export function setSharePreferences(prefs: {
  theme?: string;
  color?: string;
  shape?: string;
  showTitle?: boolean;
  showTimeLeft?: boolean;
  showApp?: boolean;
}) {
  if (prefs.theme) storage.set(SHARE_THEME_KEY, prefs.theme);
  if (prefs.color) storage.set(SHARE_COLOR_KEY, prefs.color);
  if (prefs.shape) storage.set(SHARE_SHAPE_KEY, prefs.shape);
  if (prefs.showTitle !== undefined) storage.set(SHARE_SHOW_TITLE_KEY, prefs.showTitle);
  if (prefs.showTimeLeft !== undefined) storage.set(SHARE_SHOW_TIME_LEFT_KEY, prefs.showTimeLeft);
  if (prefs.showApp !== undefined) storage.set(SHARE_SHOW_APP_KEY, prefs.showApp);
}

