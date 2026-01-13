import { Stack } from "expo-router";
import { EventDetailScreen } from "../../../../components/EventDetailScreen";

export default function GlobalEventDetailScreen() {
    return (
        <>
            {/* @ts-ignore */}
            <Stack.Screen options={{ hidesBottomBarWhenPushed: true }} />
            <EventDetailScreen />
        </>
    );
}
