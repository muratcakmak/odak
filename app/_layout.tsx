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
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import { hasLiquidGlassSupport } from "../utils/capabilities";
import { syncAllEventsToWidget } from "../utils/storage";
import { useUnistyles, UnistylesRuntime } from "react-native-unistyles";
import { getBackgroundMode } from "../utils/storage";

export default function RootLayout() {
  // Read stored mode synchronously to prevent theme flash
  const storedMode = getBackgroundMode();
  const deviceScheme = useColorScheme() || "dark";

  // Determine effective theme BEFORE first render
  const effectiveTheme = storedMode === 'device' ? deviceScheme : storedMode;
  const isDark = effectiveTheme === 'dark';

  // Use Unistyles
  const { theme } = useUnistyles();

  // Sync events to widget storage on app start
  useEffect(() => {
    syncAllEventsToWidget();

    // Sync Unistyles theme with stored preference
    if (storedMode === 'device') {
      UnistylesRuntime.setAdaptiveThemes(true);
    } else {
      UnistylesRuntime.setAdaptiveThemes(false);
      UnistylesRuntime.setTheme(storedMode);
    }
  }, [storedMode]);

  const useGlass = hasLiquidGlassSupport();

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ThemeProvider
          value={isDark ? DarkTheme : DefaultTheme}
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
                    ? theme.colors.transparent
                    : theme.colors.surfaceElevated, // Safer fallback than 'card'
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
                    ? theme.colors.transparent
                    : theme.colors.surface,
                },
              }}
            />

            <Stack.Screen
              name="countdown/[id]"
              options={{
                headerShown: false,
                presentation: "card",
                contentStyle: { backgroundColor: theme.colors.background },
              }}
            />
            <Stack.Screen
              name="milestone/[id]"
              options={{
                headerShown: false,
                presentation: "card",
                contentStyle: { backgroundColor: theme.colors.background },
              }}
            />
          </Stack>
        </ThemeProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
