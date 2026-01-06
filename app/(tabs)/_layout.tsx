import { NativeTabs } from "expo-router/unstable-native-tabs";

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Reko</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="calendar.day.timeline.left"
          drawable="ic_calendar_grid"
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
