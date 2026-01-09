import { useMemo, useEffect } from "react";
import { View, Text, StyleSheet, LayoutChangeEvent } from "react-native";
import { Canvas, Rect, RoundedRect, Path, Skia, LinearGradient, vec, Group, Circle, Text as SkText, useFont } from "@shopify/react-native-skia";
import Animated, { FadeInDown, Keyframe, useSharedValue, withTiming, useDerivedValue, Easing, withDelay, withSpring } from "react-native-reanimated";
import Ionicons from "@expo/vector-icons/Ionicons";

interface LifeInsightsProps {
    ageYears: number;
    lifespan: number;
    accentColor: string;
    isDark: boolean;
    themeColors: any;
}

// ------------------------------------------------------------------
// DATA MODELS & HELPERS
// ------------------------------------------------------------------

// Custom minimal "bump" animation (starts 3px lower)
const SubtleEntry = new Keyframe({
    0: {
        opacity: 0,
        transform: [{ translateY: 3 }],
    },
    100: {
        opacity: 1,
        transform: [{ translateY: 0 }],
        easing: Easing.out(Easing.quad),
    },
}).duration(300);

// Relationships Curve Helper
// Returns estimated hours/day or "intensity" (0-100) of time spent with group at given age
const getRelationshipValue = (group: string, age: number): number => {
    switch (group) {
        case "Parents":
            if (age < 12) return 85;
            if (age < 18) return 60;
            if (age < 25) return 15;
            return 5;
        case "Partner":
            if (age < 18) return 0;
            if (age < 25) return 30; // dating
            return 65; // living together
        case "Family":
            // Assumes having kids around 30
            if (age < 30) return 0;
            if (age < 48) return 55; // raising them
            return 15; // empty nest
        case "Friends":
            if (age < 12) return 30;
            if (age < 25) return 60; // peak social
            if (age < 40) return 20;
            return 15;
        case "Co-workers":
            if (age < 20) return 5;
            if (age < 60) return 50; // career height
            return 5;
        case "Alone":
            if (age < 18) return 15;
            if (age < 25) return 25;
            if (age < 50) return 35;
            return 60; // increases with age
        default: return 0;
    }
};

export function LifeInsights({ ageYears, lifespan, accentColor, isDark, themeColors }: LifeInsightsProps) {
    const colors = {
        text: themeColors.textPrimary,
        secondaryText: themeColors.textSecondary,
        cardBg: themeColors.card,
        cardBorder: themeColors.cardBorder || 'transparent',
    };

    // Animation progress (0 -> 1)
    const progress = useSharedValue(0);

    useEffect(() => {
        // Use spring for a "bouncy" initial bump effect
        progress.value = withDelay(200, withSpring(1, { damping: 12, stiffness: 90 }));
    }, []);

    const stats = useMemo(() => {
        const yearsLeft = Math.max(0, lifespan - ageYears);
        const percentPassed = Math.min(1, Math.max(0, ageYears / lifespan));

        // 1. STAGES (Updated with Adolescence)
        const rawStages = [
            { label: "Childhood", color: "#FF3B30", limit: 12 },
            { label: "Adolescence", color: "#5856D6", limit: 19 },
            { label: "Young Adult", color: "#007AFF", limit: 39 },
            { label: "Middle Age", color: "#34C759", limit: 64 },
            { label: "Later Life", color: "#AF52DE", limit: lifespan },
        ];

        // Process stages dynamically based on lifespan
        // Calculate start/sweep angles or segments for visual representation
        let currentAgeAccumulator = 0;
        const processedStages = rawStages.map((stage, i) => {
            const prevLimit = i === 0 ? 0 : rawStages[i - 1].limit;
            // Clamp stage end to lifespan
            const effectiveEnd = Math.min(lifespan, stage.limit);
            const effectiveStart = Math.min(lifespan, prevLimit);
            const duration = Math.max(0, effectiveEnd - effectiveStart);

            return {
                ...stage,
                duration,
                startYear: effectiveStart,
                endYear: effectiveEnd,
                percent: duration / lifespan
            };
        }).filter(s => s.duration > 0 || s.label === "Later Life");

        // 2. AWAKE / ASLEEP
        // ~33% sleep lifetime average
        const yearsAsleep = ageYears * 0.33;
        const yearsAwake = ageYears * 0.67;
        const yearsLeftAsleep = yearsLeft * 0.33;
        const yearsLeftAwake = yearsLeft * 0.67;

        // 3. ACTIVITIES (Stack: Spent vs Remaining)
        // Scaled to 30 years max for visualization comparison
        const activities = [
            { label: "Sleeping", color: "#5856D6", pct: 0.33 },
            { label: "Working", color: "#007AFF", pct: 0.18 },
            { label: "Relaxing", color: "#34C759", pct: 0.17 },
            { label: "Screen Time", color: "#FF2D55", pct: 0.12 }, // Updated based on research
            { label: "Eating", color: "#FF9500", pct: 0.07 },
            { label: "Socialising", color: "#5AC8FA", pct: 0.06 },
            { label: "Commuting", color: "#8E8E93", pct: 0.04 },
            { label: "Exercising", color: "#AF52DE", pct: 0.03 },
        ];

        // 4. Time with Others
        const relData = [
            "Partner", "Family", "Friends", "Co-workers", "Parents", "Alone"
        ].map(label => ({
            label,
            value: getRelationshipValue(label, ageYears),
            color: label === "Alone" ? "#8E8E93" :
                label === "Partner" ? "#FF2D55" :
                    label === "Family" ? "#FF9500" :
                        label === "Friends" ? "#34C759" :
                            label === "Co-workers" ? "#007AFF" : "#5856D6"
        })).sort((a, b) => b.value - a.value);

        return {
            percentPassed,
            yearsLeft,
            stages: processedStages,
            sleep: { yearsAsleep, yearsAwake, yearsLeftAsleep, yearsLeftAwake },
            activities,
            relationships: relData
        };
    }, [ageYears, lifespan]);

    // Dimensions
    const PIE_RADIUS = 60;
    const PIE_CENTER = { x: 80, y: 80 }; // Canvas 160x160

    return (
        <View style={styles.container}>

            {/* 1. LIFESPAN PROGRESS */}
            <Animated.View entering={SubtleEntry.delay(100)} style={[styles.card, { backgroundColor: colors.cardBg }]}>
                <View style={styles.cardHeader}>
                    <Ionicons name="body" size={20} color={colors.text} style={{ marginRight: 8 }} />
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Lifespan</Text>
                </View>
                <Text style={[styles.cardDescription, { color: colors.secondaryText }]}>
                    {Math.floor(stats.percentPassed * 100)}% passed. {Math.floor(stats.yearsLeft)} years potentially remaining.
                </Text>

                <View style={{ height: 24, width: '100%' }}>
                    <Canvas style={{ flex: 1 }}>
                        {/* Background Path */}
                        <RoundedRect x={0} y={4} width={1000} height={16} r={8} color="rgba(120,120,128,0.16)" />
                        {/* Foreground Path */}
                        <Group>
                            <RoundedRect
                                x={0} y={4}
                                width={useDerivedValue(() => stats.percentPassed * 300 * progress.value + 50 /* approximate width fix dynamically handled layout is hard in canvas without reading layout */)}
                                // Actually, better to just use % width and rely on container clipping or set width prop cleanly
                                // Let's simplify: pass width via prop or assume standard padded width ~330px
                                width={useDerivedValue(() => {
                                    return (stats.percentPassed * 340) * progress.value;
                                })}
                                height={16} r={8} color={accentColor}
                            />
                        </Group>
                    </Canvas>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginTop: 4 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>Age {Math.floor(ageYears)}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.secondaryText }}>Target {lifespan}</Text>
                </View>
            </Animated.View>

            {/* 2. LIFE IN STAGES (Pie Chart) */}
            <Animated.View entering={SubtleEntry.delay(200)} style={[styles.card, { backgroundColor: colors.cardBg }]}>
                <View style={styles.cardHeader}>
                    <Ionicons name="pie-chart" size={20} color={colors.text} style={{ marginRight: 8 }} />
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Life Stages</Text>
                </View>
                <Text style={[styles.cardDescription, { color: colors.secondaryText }]}>
                    Your journey through the chapters of life.
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {/* Legend Side */}
                    <View style={{ flex: 1, gap: 10 }}>
                        {stats.stages.map(s => (
                            <View key={s.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: s.color }} />
                                <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }}>{s.label}</Text>
                                {/* "Current" indicator */}
                                {ageYears >= s.startYear && ageYears < s.endYear && (
                                    <View style={{ backgroundColor: colors.text, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 4 }}>
                                        <Text style={{ fontSize: 9, fontWeight: 'bold', color: colors.cardBg }}>YOU</Text>
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>

                    {/* Skia Pie Chart */}
                    <View style={{ width: 160, height: 160 }}>
                        <Canvas style={{ flex: 1 }}>
                            <Group origin={PIE_CENTER} transform={[{ rotate: -Math.PI / 2 }]}>
                                {stats.stages.map((stage, i) => {
                                    // Calculate angles
                                    const previousDuration = stats.stages.slice(0, i).reduce((acc, s) => acc + s.duration, 0);
                                    const startAngle = (previousDuration / lifespan) * 2 * Math.PI;
                                    const sweepAngle = (stage.duration / lifespan) * 2 * Math.PI;

                                    // Use path for Arc
                                    const path = Skia.Path.Make();
                                    path.addArc({ x: 20, y: 20, width: 120, height: 120 }, (startAngle * 180 / Math.PI), (sweepAngle * 180 / Math.PI));

                                    return (
                                        <Path
                                            key={stage.label}
                                            path={path}
                                            color={stage.color}
                                            style="stroke"
                                            strokeWidth={30}
                                            start={0}
                                            end={progress} // Animate stroke end
                                        />
                                    );
                                })}
                            </Group>
                        </Canvas>
                    </View>
                </View>
            </Animated.View>

            {/* 3. AWAKE & ASLEEP */}
            <Animated.View entering={SubtleEntry.delay(300)} style={[styles.card, { backgroundColor: colors.cardBg }]}>
                <View style={styles.cardHeader}>
                    <Ionicons name="bed" size={20} color={colors.text} style={{ marginRight: 8 }} />
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Awake & Asleep</Text>
                </View>
                <Text style={[styles.cardDescription, { color: colors.secondaryText }]}>
                    Approx. 1/3 of life is spent sleeping.
                </Text>

                <View style={{ height: 40, marginTop: 8 }}>
                    <Canvas style={{ flex: 1 }}>
                        <Group>
                            {/* We need to render 4 blocks: Asleep(Past), Awake(Past), Asleep(Future), Awake(Future) */}
                            {/* Total width assumed ~340 again. */}
                            {(() => {
                                const w = 340;
                                const scale = w / lifespan; // pixels per year

                                const x1 = stats.sleep.yearsAsleep * scale;
                                const x2 = stats.sleep.yearsAwake * scale;
                                const x3 = stats.sleep.yearsLeftAsleep * scale;
                                const x4 = stats.sleep.yearsLeftAwake * scale;

                                // Animate widths
                                const w1 = useDerivedValue(() => x1 * progress.value);
                                const w2 = useDerivedValue(() => x2 * progress.value);
                                const w3 = useDerivedValue(() => x3 * progress.value);
                                const w4 = useDerivedValue(() => x4 * progress.value);

                                let cursor = 0;
                                return (
                                    <>
                                        <Rect x={cursor} y={0} width={w1} height={24} color="#5856D6" r={8} />
                                        <Rect x={useDerivedValue(() => w1.value + 2)} y={0} width={w2} height={24} color="#FF9500" r={8} />
                                        <Rect x={useDerivedValue(() => w1.value + w2.value + 4)} y={0} width={w3} height={24} color="#5856D6" opacity={0.4} r={8} />
                                        <Rect x={useDerivedValue(() => w1.value + w2.value + w3.value + 6)} y={0} width={w4} height={24} color="#E5E5EA" opacity={0.4} r={8} />
                                    </>
                                );
                            })()}
                        </Group>
                    </Canvas>
                    {/* Hacky labels overlay */}
                    <View style={StyleSheet.absoluteFillObject /* align labels? hard without specific layout info */} />
                </View>
                <View style={styles.legendContainer}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: "#5856D6" }]} />
                        <Text style={[styles.legendText, { color: colors.secondaryText }]}>Asleep ({Math.floor(stats.sleep.yearsAsleep + stats.sleep.yearsLeftAsleep)}y)</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: "#FF9500" }]} />
                        <Text style={[styles.legendText, { color: colors.secondaryText }]}>Awake ({Math.floor(stats.sleep.yearsAwake + stats.sleep.yearsLeftAwake)}y)</Text>
                    </View>
                </View>
            </Animated.View>

            {/* 4. WHAT YOU DO (Stacked Bars) */}
            <Animated.View entering={SubtleEntry.delay(400)} style={[styles.card, { backgroundColor: colors.cardBg }]}>
                <View style={styles.cardHeader}>
                    <Ionicons name="list" size={20} color={colors.text} style={{ marginRight: 8 }} />
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Activity Breakdown</Text>
                </View>
                <Text style={[styles.cardDescription, { color: colors.secondaryText }]}>
                    Time spent on key activities (Passed vs Remaining). Scale: 30 Years.
                </Text>

                <View style={{ gap: 12 }}>
                    {stats.activities.map(act => {
                        const totalActivityYears = lifespan * act.pct;
                        const yearsSpent = totalActivityYears * stats.percentPassed;
                        const yearsLeft = totalActivityYears - yearsSpent;

                        // Max Scale 30y
                        const widthTotal = Math.min(100, (totalActivityYears / 30) * 100);
                        const flexSpent = yearsSpent / totalActivityYears;

                        return (
                            <View key={act.label}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text }}>{act.label}</Text>
                                    <Text style={{ fontSize: 12, color: colors.secondaryText }}>{totalActivityYears.toFixed(1)}y</Text>
                                </View>
                                {/* Canvas Bar */}
                                <View style={{ height: 12, width: '100%', backgroundColor: 'rgba(120,120,128,0.1)', borderRadius: 6, overflow: 'hidden' }}>
                                    <View style={{ width: `${widthTotal}%`, height: '100%', flexDirection: 'row', borderRadius: 6, overflow: 'hidden' }}>
                                        {/* Pure View implementation is cleaner for simple stacked bars than Canvas overhead per row */}
                                        <View style={{ flex: flexSpent, backgroundColor: act.color }} />
                                        <View style={{ flex: 1 - flexSpent, backgroundColor: act.color, opacity: 0.3 }} />
                                    </View>
                                </View>
                            </View>
                        );
                    })}
                </View>
            </Animated.View>

            {/* 5. RELATIONSHIPS */}
            <Animated.View entering={SubtleEntry.delay(500)} style={[styles.card, { backgroundColor: colors.cardBg, marginBottom: 40 }]}>
                <View style={styles.cardHeader}>
                    <Ionicons name="people" size={20} color={colors.text} style={{ marginRight: 8 }} />
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Time with Others</Text>
                </View>
                <Text style={[styles.cardDescription, { color: colors.secondaryText }]}>
                    Who you spend time with at age {Math.floor(ageYears)}.
                </Text>

                <View style={{ gap: 16 }}>
                    {stats.relationships.map(rel => (
                        <View key={rel.label}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }}>{rel.label}</Text>
                                <Text style={{ fontSize: 12, color: colors.secondaryText, fontWeight: 'bold' }}>{rel.value > 60 ? 'High' : rel.value > 30 ? 'Medium' : 'Low'}</Text>
                            </View>
                            <View style={{ height: 8, width: '100%', backgroundColor: 'rgba(120,120,128,0.1)', borderRadius: 4 }}>
                                <Animated.View
                                    style={{
                                        height: '100%',
                                        backgroundColor: rel.color,
                                        borderRadius: 4,
                                        width: `${rel.value}%` // This needs to be animated technically
                                    }}
                                />
                            </View>
                        </View>
                    ))}
                </View>
            </Animated.View>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: "100%",
        paddingBottom: 40,
        gap: 16,
    },
    card: {
        borderRadius: 24,
        padding: 20,
        width: "100%",
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: "700",
    },
    cardDescription: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 20,
    },
    legendContainer: {
        flexDirection: 'row',
        gap: 16,
        justifyContent: 'flex-end',
        marginTop: 8
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4
    },
    legendText: {
        fontSize: 12,
        fontWeight: '500'
    }
});
