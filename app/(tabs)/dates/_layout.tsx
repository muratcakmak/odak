import { Stack } from "expo-router";
import { hasLiquidGlassSupport } from "../../../utils/capabilities";
import { useUnistyles } from "react-native-unistyles";

// Ensure dates index is in navigation history when deep linking to child routes
export const unstable_settings = {
  initialRouteName: "index",
};

export default function DatesLayout() {
  const isGlassAvailable = hasLiquidGlassSupport();
  const { rt, theme } = useUnistyles();

  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerStyle: {
          backgroundColor: theme.colors.transparent,
        },
        // Neutral tint color for header icons
        headerTintColor: theme.colors.textPrimary,
        // When liquid glass is available, let the system handle blur natively
        // Otherwise, use systemMaterial blur for older iOS
        headerBlurEffect: isGlassAvailable ? undefined : rt.themeName === "dark"
          ? "systemMaterialDark"
          : "systemMaterialLight",
        headerLargeTitle: false,
        headerTitleAlign: "center",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="event/[id]"
        options={{
          presentation: "card",
          headerShown: false,
        }}
      />
    </Stack>
  );
}
