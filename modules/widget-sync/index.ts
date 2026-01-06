import { Platform } from "react-native";

// Safely try to load the native module
let WidgetSync: any = null;
if (Platform.OS === "ios") {
  try {
    const { requireNativeModule } = require("expo-modules-core");
    WidgetSync = requireNativeModule("WidgetSync");
  } catch (e) {
    console.log("[WidgetSync] Native module not available:", e);
  }
}

export const APP_GROUP_ID = "group.com.omc345.reko";

/**
 * Set an item in the App Group UserDefaults for widget access
 */
export function setItem(key: string, value: string): boolean {
  if (!WidgetSync) return false;
  return WidgetSync.setItem(key, value, APP_GROUP_ID);
}

/**
 * Get an item from the App Group UserDefaults
 */
export function getItem(key: string): string | null {
  if (!WidgetSync) return null;
  return WidgetSync.getItem(key, APP_GROUP_ID);
}

/**
 * Remove an item from the App Group UserDefaults
 */
export function removeItem(key: string): boolean {
  if (!WidgetSync) return false;
  return WidgetSync.removeItem(key, APP_GROUP_ID);
}

/**
 * Reload all widget timelines to refresh data
 */
export function reloadAllTimelines(): void {
  WidgetSync?.reloadAllTimelines?.();
}

/**
 * Reload a specific widget timeline by kind
 */
export function reloadTimeline(kind: string): void {
  WidgetSync?.reloadTimeline?.(kind);
}

export default {
  setItem,
  getItem,
  removeItem,
  reloadAllTimelines,
  reloadTimeline,
  APP_GROUP_ID,
};
