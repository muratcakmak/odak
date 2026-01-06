import { useColorScheme } from "react-native";
import {
  getColors,
  spacing,
  borderRadius,
  typography,
  animation,
  type ColorScheme,
} from "../constants/theme";

export function useTheme() {
  const systemColorScheme = useColorScheme();
  const colorScheme: ColorScheme = systemColorScheme || "dark";
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
