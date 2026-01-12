import { Stack } from "expo-router";
import { hasLiquidGlassSupport } from "../../../utils/capabilities";
import { useUnistyles } from "react-native-unistyles";

export default function YouLayout() {
  const isGlassAvailable = hasLiquidGlassSupport();
  const { rt, theme } = useUnistyles();

  return (
    <Stack
      screenOptions={{
        headerTransparent: isGlassAvailable,
        headerStyle: {
          // iOS 26+ (Liquid Glass): transparent, iOS 18: solid background
          backgroundColor: isGlassAvailable
            ? theme.colors.transparent
            : theme.colors.background,
        },
        // Neutral tint color for header icons
        headerTintColor: isGlassAvailable && rt.themeName === "light"
          ? "#000000"
          : theme.colors.textPrimary,
        // When liquid glass is available, let the system handle blur natively
        // Otherwise, no blur needed since we have solid background
        headerBlurEffect: isGlassAvailable ? undefined : undefined,
        headerLargeTitle: false,
        headerTitleAlign: "center",
      }}
    >
      <Stack.Screen name="index" options={{ headerTitle: "" }} />
    </Stack>
  );
}
