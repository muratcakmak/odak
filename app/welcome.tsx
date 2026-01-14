
import React from "react";
import { View, Text, ScrollView, Pressable, Dimensions } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { setHasSeenWelcome, useAccentColor } from "../utils/storage";
import * as Haptics from "expo-haptics";

const FEATURE_CARDS = [
    {
        title: "Focus & Stats",
        icon: "timer-outline",
        description: "Boost productivity with a powerful Pomodoro timer. Track deep work sessions, visualize daily progress, and build lasting habits with detailed insights. Monitor your streaks and celebrate your consistency as you achieve your goals.",
    },
    {
        title: "Countdowns",
        icon: "calendar-number-outline",
        description: "Never miss a moment. Track birthdays, anniversaries, and key dates with beautiful countdowns that keep you connected to what matters.",
    },
    {
        title: "Milestones",
        icon: "flag-outline",
        description: "Celebrate your journey. Mark significant events and track your progress towards long-term goals with dedicated milestone trackers.",
    },
    {
        title: "Widgets",
        icon: "layers-outline",
        description: "Personalize your Home and Lock screens with over 20 stunning, fully customizable widgets for instant access to your time views.",
    },
    {
        title: "Customization",
        icon: "options-outline",
        description: "Make Odak truly yours. Choose from custom app icons, themes, and profile details to match your unique style.",
    },
];

export default function WelcomeScreen() {
    const { theme } = useUnistyles();
    const router = useRouter();
    const accentColor = useAccentColor();

    // Map accent color name to theme color value
    const getAccentColorValue = () => {
        const mapping: Record<string, string> = {
            blue: theme.colors.systemBlue,
            green: theme.colors.systemGreen,
            orange: theme.colors.systemOrange,
            yellow: theme.colors.systemYellow,
            pink: theme.colors.systemPink,
            red: theme.colors.systemRed,
            mint: theme.colors.systemCyan, // cyan often used for mint
            purple: theme.colors.systemPurple,
            brown: theme.colors.systemBrown,
        };
        return mapping[accentColor] || theme.colors.systemOrange; // Default fallback
    };

    const activeColor = getAccentColorValue();

    const handleGetStarted = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setHasSeenWelcome(true);
        router.dismiss();
    };

    return (
        <View style={styles.container}>
            {/* Title Section */}
            <View style={styles.header}>
                <Text style={[styles.title, { color: activeColor }]}>Welcome to Odak</Text>
                <Text style={styles.subtitle}>
                    Discover some of the key features of the app and how to get the most of it
                </Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.grid}>
                    {FEATURE_CARDS.map((card, index) => (
                        <View
                            key={index}
                            style={[
                                styles.card,
                                index === 0 && { width: "100%" }
                            ]}
                        >
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardTitle}>{card.title}</Text>
                                <Ionicons
                                    name={card.icon as any}
                                    size={24}
                                    color={activeColor}
                                />
                            </View>
                            <View style={styles.cardBody}>
                                <Text style={styles.cardDescription}>{card.description}</Text>
                            </View>
                        </View>
                    ))}
                </View>
                <View style={styles.footerSpacer} />
            </ScrollView>

            {/* Floating/Fixed Footer Button */}
            <View style={styles.footerContainer}>
                <Pressable
                    style={({ pressed }) => [
                        styles.button,
                        {
                            backgroundColor: activeColor,
                            shadowColor: activeColor,
                            opacity: pressed ? 0.9 : 1,
                            transform: [{ scale: pressed ? 0.98 : 1 }]
                        }
                    ]}
                    onPress={handleGetStarted}
                >
                    <Text style={styles.buttonText}>Get started</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.xl * 1.5,
        paddingBottom: theme.spacing.lg,
        alignItems: "center",
    },
    title: {
        fontSize: 28, // Large title
        fontWeight: theme.typography.weights.bold,
        color: theme.colors.systemOrange, // Matching the "Welcome to Left" orange color style
        marginBottom: theme.spacing.sm,
        textAlign: "center",
    },
    subtitle: {
        fontSize: theme.typography.sizes.md,
        color: theme.colors.textSecondary,
        textAlign: "center",
        lineHeight: 22,
        maxWidth: "80%",
    },
    scrollContent: {
        paddingHorizontal: theme.spacing.md,
        paddingBottom: 100, // Space for footer
    },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12, // Fixed gap for consistency
    },
    card: {
        // Calculate width: (100% - gap) / 2
        width: "48%",
        minWidth: "45%",
        flexGrow: 1,
        backgroundColor: theme.colors.surface || theme.colors.card,
        borderRadius: 20, // Continuous curve feeling
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        marginBottom: 0, // Handled by gap
        // Subtle iOS-style shadow
        shadowColor: theme.colors.shadow.base,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 2,
    },
    cardHeader: {
        padding: 16,
        paddingBottom: 8, // Reduce padding between header and body
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        // height: 85, // Remove fixed height to let text expand naturally
    },
    cardTitle: {
        color: theme.colors.textPrimary, // Use text color instead of white
        fontSize: 17, // iOS Body/Headline size
        fontWeight: "700", // Bold
        flex: 1,
        marginRight: 8,
        letterSpacing: -0.4, // SF Pro tight tracking
    },
    cardBody: {
        padding: 16,
        paddingTop: 0, // Reduce top padding to connect with header
    },
    cardDescription: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        lineHeight: 18,
        letterSpacing: -0.1,
    },
    supportCard: {
        width: "100%",
        marginTop: 12,
        backgroundColor: theme.colors.surface || theme.colors.card,
        borderRadius: 20,
        overflow: "hidden",
        shadowColor: theme.colors.shadow.base,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 2,
    },
    supportHeader: {
        padding: 16,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    footerSpacer: {
        height: 120,
    },
    footerContainer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: theme.spacing.xl,
        paddingTop: theme.spacing.md,
        paddingBottom: theme.spacing.xl + 20,
        backgroundColor: theme.colors.background, // Fallback
        // Ideally use a BlurView here if available, but simple background matches standard sheets often
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: theme.colors.divider,
    },
    button: {
        backgroundColor: theme.colors.systemOrange,
        height: 52, // Standard iOS button height
        borderRadius: 26,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: theme.colors.systemOrange,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 5,
    },
    buttonText: {
        color: "white",
        fontSize: 17,
        fontWeight: "600",
    },
}));
