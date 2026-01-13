import React from "react";
import { View, Text, Pressable, ImageBackground, StyleProp, ViewStyle } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

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

const styles = StyleSheet.create((theme) => ({
    cardList: {
        width: "100%",
        height: 170,
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
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: theme.colors.overlay.light,
    },
    overlayList: {
        flex: 1,
        padding: theme.spacing.lg,
        justifyContent: 'space-between',
    },
    overlayGrid: {
        flex: 1,
        padding: theme.spacing.md,
        justifyContent: 'space-between',
    },
    topContent: {
        gap: theme.spacing.xs,
    },
    bottomContent: {
        gap: theme.spacing.xs,
    },
    daysValueList: {
        fontSize: theme.typography.sizes.display - 16,
        fontWeight: theme.typography.weights.bold,
        color: theme.colors.onImage.primary,
        ...theme.effects.textShadow.md,
    },
    daysValueGrid: {
        fontSize: theme.typography.sizes.xxl,
        fontWeight: theme.typography.weights.bold,
        color: theme.colors.onImage.primary,
        ...theme.effects.textShadow.md,
    },
    titleList: {
        fontSize: theme.typography.sizes.lg,
        fontWeight: theme.typography.weights.bold,
        color: theme.colors.onImage.primary,
        ...theme.effects.textShadow.md,
    },
    titleGrid: {
        fontSize: theme.typography.sizes.md + 1,
        fontWeight: theme.typography.weights.bold,
        color: theme.colors.onImage.primary,
        ...theme.effects.textShadow.md,
    },
    subtitleList: {
        fontSize: theme.typography.sizes.md,
        fontWeight: theme.typography.weights.medium,
        color: theme.colors.onImage.secondary,
        ...theme.effects.textShadow.sm,
        marginTop: 2,
    },
    subtitleGrid: {
        fontSize: theme.typography.sizes.sm,
        fontWeight: theme.typography.weights.medium,
        color: theme.colors.onImage.secondary,
        ...theme.effects.textShadow.sm,
        marginTop: 2,
    },
}));
