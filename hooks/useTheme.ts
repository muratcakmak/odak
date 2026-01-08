import { useState, useEffect } from "react";
import { useColorScheme } from "react-native";
import {
  getColors,
  spacing,
  borderRadius,
  typography,
  animation,
  type ColorScheme,
} from "../constants/theme";
import { getBackgroundMode, storage, type BackgroundMode } from "../utils/storage";

export function useTheme() {
  const systemColorScheme = useColorScheme();
  const [backgroundMode, setBackgroundModeState] = useState<BackgroundMode>(() => getBackgroundMode());

  // Listen for storage changes
  useEffect(() => {
    const listener = storage.addOnValueChangedListener((key) => {
      if (key === "background_mode") {
        setBackgroundModeState(getBackgroundMode());
      }
    });
    return () => listener.remove();
  }, []);

  // Determine actual color scheme based on background mode
  let colorScheme: ColorScheme;
  if (backgroundMode === "device") {
    colorScheme = systemColorScheme === "light" || systemColorScheme === "dark" ? systemColorScheme : "dark";
  } else {
    colorScheme = backgroundMode === "dark" ? "dark" : "light";
  }

  const isDark = colorScheme === "dark";
  const colors = getColors(colorScheme);

  return {
    colorScheme,
    isDark,
    colors,
    spacing,
    borderRadius,
    typography,
    animation,
  };
}

export type Theme = ReturnType<typeof useTheme>;
