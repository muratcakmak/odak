import React from "react";
import { StyleSheet, View, Text, Pressable, ImageBackground, StyleProp, ViewStyle } from "react-native";


import { useUnistyles } from "react-native-unistyles";

interface TimeCardProps {
    title: string;
    subtitle?: string;
    daysValue: string | number;
    daysLabel: string;
    image?: string;
    compact?: boolean; // true = Grid, false = List
    onPress?: () => void;
    style?: StyleProp<ViewStyle>;
    cardBackgroundColor?: string; // fallback if no image
    showProgress?: boolean; // For since cards potentially
}

export function TimeCard({
    title,
    subtitle,
    daysValue,
    daysLabel,
    image,
    compact = false,
    onPress,
    style,
    cardBackgroundColor,
    showProgress = false,
}: TimeCardProps) {
    const { theme } = useUnistyles();
    const styles = createStyles(theme);

    const containerStyle = compact ? styles.cardGrid : styles.cardList;
    const content = (
        <View style={compact ? styles.overlayGrid : styles.overlayList}>
            <View style={styles.topContent}>
                <Text style={compact ? styles.daysValueGrid : styles.daysValueList}>{daysValue}</Text>
                {subtitle && <Text style={compact ? styles.subtitleGrid : styles.subtitleList}>{subtitle}</Text>}
            </View>

            <View style={styles.bottomContent}>
                <Text style={compact ? styles.titleGrid : styles.titleList}>{title}</Text>
            </View>
        </View>
    );

    const finalStyle = [
        containerStyle,
        !image && { backgroundColor: cardBackgroundColor || theme.colors.card },
        style // Allow parent overrides to merge correctly
    ];

    if (image) {
        return (
            <ImageBackground
                source={{ uri: image }}
                style={finalStyle}
                imageStyle={styles.imageStyle}
            >
                <View style={styles.darkGradientOverlay} />
                {content}
            </ImageBackground>
        );
    }

    return (
        <View style={finalStyle}>
            {content}
        </View>
    );
}

const createStyles = (theme: any) => StyleSheet.create({
    cardList: {
        width: "100%",
        height: 170, // Medium widget proportions
        borderRadius: theme.borderRadius.xl,
        overflow: "hidden",
    },
    cardGrid: {
        width: "100%",
        height: "100%",
        borderRadius: theme.borderRadius.lg,
        overflow: "hidden",
    },
    imageBackground: {
        flex: 1,
        width: "100%",
        height: "100%",
    },
    imageStyle: {
        resizeMode: 'cover',
    },
    darkGradientOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: theme.colors.overlay.light,
    },
    overlayList: {
        flex: 1,
        padding: 20,
        justifyContent: 'space-between', // Split top and bottom
    },
    overlayGrid: {
        flex: 1,
        padding: 14,
        justifyContent: 'space-between', // Split top and bottom
    },
    topContent: {
        gap: 4,
    },
    bottomContent: {
        gap: 4,
    },
    daysValueList: {
        fontSize: 32, // Large as seen in screenshot "In 30 days"
        fontWeight: "800",
        color: theme.colors.onImage.primary,
        ...theme.effects.textShadow.md,
    },
    daysValueGrid: {
        fontSize: 24, // Smaller for grid
        fontWeight: "800",
        color: theme.colors.onImage.primary,
        ...theme.effects.textShadow.md,
    },
    titleList: {
        fontSize: 18,
        fontWeight: "700",
        color: theme.colors.onImage.primary,
        ...theme.effects.textShadow.md,
    },
    titleGrid: {
        fontSize: 15, // Smaller for grid
        fontWeight: "700",
        color: theme.colors.onImage.primary,
        ...theme.effects.textShadow.md,
    },
    subtitleList: {
        fontSize: 14,
        fontWeight: "500",
        color: theme.colors.onImage.secondary,
        ...theme.effects.textShadow.sm,
        marginTop: 2,
    },
    subtitleGrid: {
        fontSize: 12, // Smaller for grid
        fontWeight: "500",
        color: theme.colors.onImage.secondary,
        ...theme.effects.textShadow.sm,
        marginTop: 2,
    },
});
