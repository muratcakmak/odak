import React from "react";
import { StyleSheet, View, Text, Pressable, ImageBackground, StyleProp, ViewStyle } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Image } from "expo-image";
import { useUnistyles } from "react-native-unistyles";
import { hasLiquidGlassSupport } from "../utils/capabilities";
import { GlassView } from "expo-glass-effect";

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

    const cardInnerStyle = [
        containerStyle,
        !image && { backgroundColor: cardBackgroundColor || theme.colors.card }
    ];

    const InnerComponent = (
        <View style={cardInnerStyle}>
            {image ? (
                <ImageBackground
                    source={{ uri: image }}
                    style={styles.imageBackground}
                    imageStyle={styles.imageStyle}
                >
                    <View style={styles.darkGradientOverlay} />
                    {content}
                </ImageBackground>
            ) : (
                content
            )}
        </View>
    );

    if (onPress) {
        return (
            <Pressable onPress={onPress} style={({ pressed }) => [style, pressed && { opacity: 0.9 }]}>
                {InnerComponent}
            </Pressable>
        );
    }

    return <View style={style}>{InnerComponent}</View>;
}

const createStyles = (theme: any) => StyleSheet.create({
    cardList: {
        width: "100%",
        height: 180, // Fatter list items
        borderRadius: theme.borderRadius.xl,
        overflow: "hidden",
    },
    cardGrid: {
        width: "100%",
        height: 130, // Smaller for grid
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
        backgroundColor: 'rgba(0,0,0,0.3)',
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
        color: "#FFFFFF",
        textShadowColor: "rgba(0, 0, 0, 0.3)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    daysValueGrid: {
        fontSize: 24, // Smaller for grid
        fontWeight: "800",
        color: "#FFFFFF",
        textShadowColor: "rgba(0, 0, 0, 0.3)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    titleList: {
        fontSize: 18,
        fontWeight: "700",
        color: "#FFFFFF",
        textShadowColor: "rgba(0, 0, 0, 0.3)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    titleGrid: {
        fontSize: 15, // Smaller for grid
        fontWeight: "700",
        color: "#FFFFFF",
        textShadowColor: "rgba(0, 0, 0, 0.3)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    subtitleList: {
        fontSize: 14,
        fontWeight: "500",
        color: "rgba(255, 255, 255, 0.9)",
        textShadowColor: "rgba(0, 0, 0, 0.3)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
        marginTop: 2,
    },
    subtitleGrid: {
        fontSize: 12, // Smaller for grid
        fontWeight: "500",
        color: "rgba(255, 255, 255, 0.9)",
        textShadowColor: "rgba(0, 0, 0, 0.3)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
        marginTop: 2,
    },
});
