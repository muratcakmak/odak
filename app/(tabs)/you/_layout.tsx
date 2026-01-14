import { Stack } from "expo-router";
import { hasLiquidGlassSupport } from "../../../utils/capabilities";
import { useUnistyles } from "react-native-unistyles";
import { AWARD_DETAIL_COLORS } from "../../../components/awards";

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
        // Neutral tint color for header icons - on liquid glass light mode, text is dark
        headerTintColor: theme.colors.textPrimary,
        // When liquid glass is available, let the system handle blur natively
        // Otherwise, use system chrome material blur
        headerBlurEffect: isGlassAvailable
          ? undefined
          : rt.themeName === "dark"
            ? "systemChromeMaterialDark"
            : "systemChromeMaterialLight",
        // Large title text styling
        headerLargeTitleStyle: {
          color: theme.colors.textPrimary,
        },
        headerLargeTitle: false,
        headerTitleAlign: "center",
      }}
    >
      <Stack.Screen name="index" options={{ headerTitle: "" }} />
      <Stack.Screen
        name="awards"
        options={{
          headerTitle: "Awards",
          headerLargeTitle: true,
        }}
      />
      <Stack.Screen
        name="award/[id]"
        options={{
          headerTitle: "",
          headerStyle: { backgroundColor: AWARD_DETAIL_COLORS.background },
          headerTintColor: AWARD_DETAIL_COLORS.textPrimary,
          headerTransparent: false,
        }}
      />
    </Stack>
  );
}
