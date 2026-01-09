import { Platform } from "react-native";

type BackgroundMode = "dark" | "light" | "device";

// Lazily and safely load the native module on iOS
let NativeTheme: any = null;
if (Platform.OS === "ios") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { requireNativeModule } = require("expo-modules-core");
    NativeTheme = requireNativeModule("NativeTheme");
  } catch (e) {
    console.log("[NativeTheme] Native module not available:", e);
  }
}

/**
 * Update the native iOS interface style at runtime.
 *
 * On non-iOS platforms this is a no-op.
 */
export function setNativeThemeMode(mode: BackgroundMode): void {
  if (!NativeTheme) return;
  NativeTheme.setMode(mode);
}

export default {
  setNativeThemeMode,
};


