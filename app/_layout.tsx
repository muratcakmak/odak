import "../theme/unistyles";
import { useEffect } from "react";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { hasLiquidGlassSupport } from "../utils/capabilities";
import { syncAllEventsToWidget } from "../utils/storage";
import { useUnistyles, UnistylesRuntime } from "react-native-unistyles";
import { getBackgroundMode } from "../utils/storage";

export default function RootLayout() {
  const colorScheme = useColorScheme() || "dark";
  // Use Unistyles
  const { theme } = useUnistyles();
  const isDark = colorScheme === 'dark'; // Or theme.colors.background check, but standard hook is fine here for status bar
  const colors = theme.colors;

  // Sync events to widget storage on app start
  useEffect(() => {
    syncAllEventsToWidget();

    // Sync Unistyles theme with stored preference
    const mode = getBackgroundMode();
    if (mode === 'device') {
      UnistylesRuntime.setAdaptiveThemes(true);
    } else {
      UnistylesRuntime.setAdaptiveThemes(false);
      UnistylesRuntime.setTheme(mode);
    }
  }, []);

  const useGlass = hasLiquidGlassSupport();

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <ThemeProvider
        value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
      >
        <StatusBar style={isDark ? "light" : "dark"} />

        <Stack>
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="share"
            options={{
              headerTransparent: true,
              title: "",
              presentation: useGlass ? "formSheet" : "modal",
              sheetGrabberVisible: true,
              sheetAllowedDetents: [0.6],
              contentStyle: {
                backgroundColor: useGlass
                  ? "transparent"
                  : colors.surfaceElevated, // Safer fallback than 'card'
              },
              headerBlurEffect: useGlass
                ? undefined
                : isDark ? "systemMaterialDark" : "systemMaterialLight",
            }}
          />
          <Stack.Screen
            name="event/[id]"
            options={{
              headerTransparent: true,
              title: "",
              presentation: useGlass ? "formSheet" : "modal",
              sheetGrabberVisible: true,
              sheetAllowedDetents: [0.8, 1.0],
              contentStyle: {
                backgroundColor: useGlass
                  ? "transparent"
                  : colors.background,
              },
              headerBlurEffect: useGlass
                ? undefined
                : isDark ? "systemMaterialDark" : "systemMaterialLight",
            }}
          />
          <Stack.Screen
            name="settings"
            options={{
              headerTransparent: true,
              headerShown: false,
              title: "",
              presentation: useGlass ? "formSheet" : "modal",
              sheetGrabberVisible: true,
              sheetAllowedDetents: [0.6, 1.0],
              contentStyle: {
                backgroundColor: useGlass
                  ? "transparent"
                  : colors.surface,
              },
            }}
          />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
