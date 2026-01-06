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
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { syncAllEventsToWidget } from "../utils/storage";
import { useTheme } from "../hooks/useTheme";

export default function RootLayout() {
  const colorScheme = useColorScheme() || "dark";
  const { colors, isDark } = useTheme();

  // Sync events to widget storage on app start
  useEffect(() => {
    syncAllEventsToWidget();
  }, []);

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
              presentation: isLiquidGlassAvailable() ? "formSheet" : "modal",
              sheetGrabberVisible: true,
              sheetAllowedDetents: [0.6],
              contentStyle: {
                backgroundColor: isLiquidGlassAvailable()
                  ? "transparent"
                  : colors.card,
              },
              headerBlurEffect: isLiquidGlassAvailable()
                ? undefined
                : isDark ? "dark" : "light",
            }}
          />
          <Stack.Screen
            name="event/[id]"
            options={{
              headerTransparent: true,
              title: "",
              presentation: isLiquidGlassAvailable() ? "formSheet" : "modal",
              sheetGrabberVisible: true,
              sheetAllowedDetents: [0.8, 1.0],
              contentStyle: {
                backgroundColor: isLiquidGlassAvailable()
                  ? "transparent"
                  : colors.background,
              },
              headerBlurEffect: isLiquidGlassAvailable()
                ? undefined
                : isDark ? "dark" : "light",
            }}
          />
          <Stack.Screen
            name="settings"
            options={{
              headerTransparent: true,
              headerShown: false,
              title: "",
              presentation: isLiquidGlassAvailable() ? "formSheet" : "modal",
              sheetGrabberVisible: true,
              sheetAllowedDetents: [0.6, 1.0],
              contentStyle: {
                backgroundColor: isLiquidGlassAvailable()
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
