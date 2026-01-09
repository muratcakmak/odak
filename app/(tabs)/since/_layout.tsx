import { Stack } from "expo-router";
import { hasLiquidGlassSupport } from "../../../utils/capabilities";
import { useUnistyles } from "react-native-unistyles";

export default function SinceLayout() {
  const { rt } = useUnistyles();
  // get color scheme from unistyles
  const isLiquidGlassAvailable = hasLiquidGlassSupport();

  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerStyle: {
          backgroundColor: "transparent",
        },
        // When liquid glass is available, let the system handle blur natively
        // Otherwise, use systemMaterial blur for older iOS
        headerBlurEffect: isLiquidGlassAvailable
          ? undefined
          : rt.themeName === "dark"
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
          headerShown: false,
          presentation: "card",
          contentStyle: { backgroundColor: "#000000" },
          tabBarStyle: { display: "none" },
        }}
      />
    </Stack>
  );
}
