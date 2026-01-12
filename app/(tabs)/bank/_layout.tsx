import { Stack } from "expo-router";
import { useUnistyles } from "react-native-unistyles";
import { hasLiquidGlassSupport } from "../../../utils/capabilities";

export default function BankLayout() {
  const { rt, theme } = useUnistyles();
  const isLiquidGlass = hasLiquidGlassSupport();

  return (
    <Stack
      screenOptions={{
        // iOS native large title
        headerLargeTitle: true,
        headerBlurEffect: isLiquidGlass
          ? undefined
          : (rt.themeName === "dark" ? "systemChromeMaterialDark" : "systemChromeMaterialLight"),
        // Large title text styling - use black on iOS 26 light mode (liquid glass has white bg)
        headerLargeTitleStyle: {
          color: isLiquidGlass && rt.themeName === "light"
            ? "#000000"
            : theme.colors.textPrimary,
        },
        headerTintColor: isLiquidGlass && rt.themeName === "light"
          ? "#000000"
          : theme.colors.textPrimary,
        headerTransparent: isLiquidGlass,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Stats",
        }}
      />
      <Stack.Screen
        name="history"
        options={{
          title: "History",
          headerLargeTitle: false,
        }}
      />
    </Stack>
  );
}
