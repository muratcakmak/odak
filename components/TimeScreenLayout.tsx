import { View, StyleSheet, ScrollView, Text, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUnistyles } from "react-native-unistyles";
import { Host, ContextMenu, Button, Divider } from "@expo/ui/swift-ui";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated, { FadeIn, FadeOut, Layout, Easing } from "react-native-reanimated";
import { AdaptivePillButton } from "./ui";


export interface TimeScreenLayoutProps {
    title: string;
    headerRight?: React.ReactNode;
    headerLeft?: React.ReactNode;
    children: React.ReactNode;

    // Empty state
    isEmpty?: boolean;
    emptyStateIcon?: string;
    emptyStateText?: string;
    emptyStateSubtext?: string;

    // View Mode for grids
    viewMode?: "list" | "grid";
    onViewModeChange?: (mode: "list" | "grid") => void;

    // Sorting (Optional)
    sortType?: string;
    onSortChange?: (type: any) => void;
    sortOptions?: { label: string; value: string; }[];

    // Header visibility - set to false when using native transparent header
    showHeader?: boolean;
}


export function TimeScreenLayout({
    title,
    headerRight,
    headerLeft,
    children,
    isEmpty,
    emptyStateIcon = "time-outline",
    emptyStateText = "No items",
    emptyStateSubtext,
    viewMode,
    showHeader = true,
}: TimeScreenLayoutProps) {
    const { theme } = useUnistyles();
    const styles = createStyles(theme);
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: showHeader ? insets.top : 0 }]}>
            {/* Header - hidden when using native transparent header */}
            {showHeader && (
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        {headerLeft}
                    </View>

                    <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>{title}</Text>

                    <View style={styles.headerRight}>
                        {headerRight}
                    </View>
                </View>
            )}

            {/* Content */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                contentInsetAdjustmentBehavior={showHeader ? undefined : "automatic"}
                showsVerticalScrollIndicator={false}
            >
                {isEmpty ? (
                    <View style={styles.emptyState}>
                        <Ionicons name={emptyStateIcon as any} size={48} color={theme.colors.textPrimary} style={{ opacity: 0.3 }} />
                        <Text style={[styles.emptyText, { color: theme.colors.textPrimary }]}>{emptyStateText}</Text>
                        {emptyStateSubtext && (
                            <Text style={[styles.emptySubtext, { color: theme.colors.textPrimary }]}>
                                {emptyStateSubtext}
                            </Text>
                        )}
                    </View>
                ) : (
                    <View style={viewMode === "grid" ? styles.gridContainer : styles.listContainer}>
                        {children}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const createStyles = (theme: any) => StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: theme.spacing.lg, // 20
        paddingTop: theme.spacing.sm, // 8
        paddingBottom: theme.spacing.md, // 16
    },
    headerLeft: {
        flexDirection: "row",
        gap: theme.spacing.sm,
        width: 60, // Fixed width for alignment
    },
    headerRight: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        justifyContent: 'flex-end',
        width: 60, // Fixed width for alignment
    },
    headerTitle: {
        fontSize: theme.typography.sizes.lg, // 17
        fontWeight: "600",
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: theme.spacing.lg,
        paddingTop: 0,
        paddingBottom: 120,
    },
    // Containers
    listContainer: {
        flexDirection: "column",
        paddingTop: 16,
    },
    gridContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        paddingTop: 16,
    },
    // Empty State
    emptyState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 100,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: "600",
        marginTop: 16,
        opacity: 0.5,
    },
    emptySubtext: {
        fontSize: 14,
        marginTop: 8,
        opacity: 0.3,
    },
});
