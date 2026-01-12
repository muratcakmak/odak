import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useUnistyles } from "react-native-unistyles";
import { useAccentColor } from "../../utils/storage";
import { hasLiquidGlassSupport } from "../../utils/capabilities";


export default function TabLayout() {
  const { rt, theme } = useUnistyles();
  const accentColorName = useAccentColor();
  const accentColor = theme.colors.accent[accentColorName].primary;
  const isDark = rt.themeName === "dark";

  // On iOS 26+ with Liquid Glass, the system handles blur automatically
  // On iOS 18, we need explicit blur effect
  const blurEffect = hasLiquidGlassSupport()
    ? undefined
    : (isDark ? "systemThickMaterialDark" : "systemThickMaterialLight");

  return (
    <NativeTabs
      tintColor={accentColor}
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
      <NativeTabs.Trigger name="bank">
        <NativeTabs.Trigger.Label>Bank</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="wallet.pass"
          drawable="ic_wallet"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="ahead">
        <NativeTabs.Trigger.Label>Ahead</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="macwindow"
          drawable="ic_window"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="since">
        <NativeTabs.Trigger.Label>Since</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="circle.grid.2x2.fill"
          drawable="ic_grid"
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
