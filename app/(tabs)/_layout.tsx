import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useUnistyles } from "react-native-unistyles";
import { useAccentColor, useBackgroundMode } from "../../utils/storage";
import { hasLiquidGlassSupport } from "../../utils/capabilities";


export default function TabLayout() {
  const { rt, theme } = useUnistyles();
  const accentColorName = useAccentColor();
  const backgroundMode = useBackgroundMode();
  const accent = theme.colors.accent[accentColorName];
  const isDark = rt.themeName === "dark";
  // Use secondary color for dark mode for better visibility
  const accentColor = isDark ? accent.secondary : accent.primary;

  // On iOS 26+ with Liquid Glass, the system handles blur automatically
  // On iOS 18, we need explicit blur effect
  const blurEffect = hasLiquidGlassSupport()
    ? undefined
    : (isDark ? "systemThickMaterialDark" : "systemThickMaterialLight");

  // Inactive tint color - adapts to theme
  const inactiveTintColor = theme.colors.textSecondary;

  return (
    <NativeTabs
      // Key forces re-render when theme, accent, or background mode changes
      key={`tabs-${isDark ? 'dark' : 'light'}-${accentColorName}-${backgroundMode}`}
      tintColor={accentColor}
      inactiveTintColor={inactiveTintColor}
      blurEffect={blurEffect}
      disableTransparentOnScrollEdge={true}
    >
      <NativeTabs.Trigger name="focus">
        <NativeTabs.Trigger.Label>Focus</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="circle.grid.3x3.fill"
          drawable="ic_grid"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="dates">
        <NativeTabs.Trigger.Label>Dates</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="calendar"
          drawable="ic_calendar"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="bank">
        <NativeTabs.Trigger.Label>Stats</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="chart.bar.fill"
          drawable="ic_chart"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="you">
        <NativeTabs.Trigger.Label>You</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="viewfinder"
          drawable="ic_viewfinder"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
