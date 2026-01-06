import { MMKV } from "react-native-mmkv";
import { Paths, File, Directory } from "expo-file-system";

// Initialize MMKV storage
export const storage = new MMKV();

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
  storage.set(AHEAD_EVENTS_KEY, JSON.stringify(events));
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
  storage.set(SINCE_EVENTS_KEY, JSON.stringify(events));
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
