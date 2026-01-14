import "../theme/unistyles";
import { useEffect, useState } from "react";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import { useColorScheme, LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import { hasLiquidGlassSupport } from "../utils/capabilities";
import { syncAllEventsToWidget } from "../utils/storage";
import { useUnistyles, UnistylesRuntime } from "react-native-unistyles";
import { getBackgroundMode, getHasSeenWelcome } from "../utils/storage";
import { router } from "expo-router";
import { initializeDatabase } from "../data/database";

// Ignored logs
LogBox.ignoreLogs([
  'Unsupported top level event type "topSvgLayout" dispatched',
]);

export default function RootLayout() {
  // Read stored mode synchronously to prevent theme flash
  const storedMode = getBackgroundMode();
  const deviceScheme = useColorScheme() || "dark";

  // Determine effective theme BEFORE first render
  const effectiveTheme = storedMode === 'device' ? deviceScheme : storedMode;
  const isDark = effectiveTheme === 'dark';

  // Use Unistyles
  const { theme } = useUnistyles();

  // Database and migration state
  const [isDbReady, setIsDbReady] = useState(false);

  // Initialize database on app start
  useEffect(() => {
    async function initDb() {
      try {
        // Initialize SQLite schema
        await initializeDatabase();
        setIsDbReady(true);
      } catch (error) {
        console.error('[App] Database initialization failed:', error);
        // Still allow app to run - MMKV will continue to work
        setIsDbReady(true);
      }
    }

    initDb();
  }, []);

  // Check for first run and show welcome modal
  useEffect(() => {
    // Small delay to ensure navigation is ready and layout is mounted
    const timeout = setTimeout(() => {
      const hasSeen = getHasSeenWelcome();
      // Force show in development or if not seen
      if (!hasSeen || __DEV__) {
        router.push("/welcome");
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, []);

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

  // Don't render until database is ready to prevent race conditions
  if (!isDbReady) {
    return (
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.background }}>
          <StatusBar style={isDark ? "light" : "dark"} />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }

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
              name="welcome"
              options={{
                headerShown: false,
                presentation: "modal",
              }}
            />

          </Stack>
        </ThemeProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
