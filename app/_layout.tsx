import { useEffect } from "react";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { syncAllEventsToWidget } from "../utils/storage";

export default function RootLayout() {
  const colorScheme = useColorScheme() || "dark";

  // Sync events to widget storage on app start
  useEffect(() => {
    syncAllEventsToWidget();
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <ThemeProvider
        value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
      >
        <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />

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
                  : "#1C1C1E",
              },
              headerBlurEffect: isLiquidGlassAvailable()
                ? undefined
                : "dark",
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
                  : "#000000",
              },
              headerBlurEffect: isLiquidGlassAvailable()
                ? undefined
                : colorScheme === "dark"
                  ? "dark"
                  : "light",
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
                  : "#F2F2F7",
              },
            }}
          />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
});
