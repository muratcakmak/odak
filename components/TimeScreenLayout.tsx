import { View, ScrollView, Text, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
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

    // Sticky content rendered below header but above scrollable content
    stickyHeader?: React.ReactNode;
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
    stickyHeader,
}: TimeScreenLayoutProps) {
    const { theme } = useUnistyles();
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: showHeader ? insets.top : 0 }]}>
            {/* Header - hidden when using native transparent header */}
            {showHeader && (
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        {headerLeft}
                    </View>

                    <Text style={styles.headerTitle}>{title}</Text>

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
                {/* Sticky Header - rendered at top of scroll content */}
                {stickyHeader}
                {isEmpty ? (
                    <View style={styles.emptyState}>
                        <Ionicons name={emptyStateIcon as any} size={48} color={theme.colors.textMuted} />
                        <Text style={styles.emptyText}>{emptyStateText}</Text>
                        {emptyStateSubtext && (
                            <Text style={styles.emptySubtext}>
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

const styles = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.sm,
        paddingBottom: theme.spacing.md,
    },
    headerLeft: {
        flexDirection: "row",
        gap: theme.spacing.sm,
        width: 60,
    },
    headerRight: {
        flexDirection: "row",
        gap: theme.spacing.sm,
        justifyContent: "flex-end",
        width: 60,
    },
    headerTitle: {
        fontSize: theme.typography.sizes.lg,
        fontWeight: theme.typography.weights.semibold,
        color: theme.colors.textPrimary,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: theme.spacing.lg,
        paddingTop: 0,
        paddingBottom: 120,
    },
    listContainer: {
        flexDirection: "column",
        paddingTop: theme.spacing.md,
    },
    gridContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        paddingTop: theme.spacing.md,
    },
    emptyState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 100,
    },
    emptyText: {
        fontSize: theme.typography.sizes.xl,
        fontWeight: theme.typography.weights.semibold,
        marginTop: theme.spacing.md,
        color: theme.colors.textTertiary,
    },
    emptySubtext: {
        fontSize: theme.typography.sizes.md,
        marginTop: theme.spacing.sm,
        color: theme.colors.textMuted,
    },
    emptyIcon: {
        color: theme.colors.textMuted,
    },
}));
