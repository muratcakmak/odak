import { useState, useRef, useEffect } from "react";
import { StyleSheet, View, Text, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { getUserProfile, useAccentColor, type AccentColor, getLifespan } from "../../utils/storage";
import { useUnistyles } from "react-native-unistyles";
import { accentColors } from "../../constants/theme";
import { AdaptivePillButton } from "../../components/ui";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { LifeInsights } from "../../components/LifeInsights";

// Precise Countdown Component
function PreciseCountdown({ 
  birthDate, 
  lifespan, 
  textColor, 
  secondaryTextColor 
}: { 
  birthDate: Date; 
  lifespan: number;
  textColor: string;
  secondaryTextColor: string;
}) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    let animationFrame: number;

    const update = () => {
      const now = new Date();
      const endOfLife = new Date(birthDate);
      endOfLife.setFullYear(birthDate.getFullYear() + lifespan);

      const diffMs = endOfLife.getTime() - now.getTime();
      // Convert to years with high precision (approximate year length)
      const yearsLeft = diffMs / (1000 * 60 * 60 * 24 * 365.25);

      setTimeLeft(yearsLeft.toFixed(9));
      animationFrame = requestAnimationFrame(update);
    };

    update();
    return () => cancelAnimationFrame(animationFrame);
  }, [birthDate, lifespan]);

  return (
    <View style={styles.countdownContainer}>
      <Ionicons name="leaf-outline" size={24} color={secondaryTextColor} style={styles.laurelIcon} />
      <View style={styles.countdownContent}>
        <Text style={[styles.countdownValue, { color: textColor }]}>{timeLeft}</Text>
        <Text style={[styles.countdownLabel, { color: secondaryTextColor }]}>years left</Text>
      </View>
      <Ionicons name="leaf-outline" size={24} color={secondaryTextColor} style={[styles.laurelIcon, { transform: [{ scaleX: -1 }] }]} />
    </View>
  );
}

export default function YouScreen() {
  const { theme } = useUnistyles();
  const themeColors = theme.colors;
  const insets = useSafeAreaInsets();
  const isDark = theme.colors.background === '#000000' || theme.colors.background === '#111111';

  // Local accent color logic
  const accentColorName = useAccentColor();
  const accent = accentColors[accentColorName];
  const accentColor = isDark ? accent.secondary : accent.primary;
  // Initialize state synchronously to prevent CLS (flash of "No Profile")
  const [profile, setProfile] = useState<{ name: string; birthDate: Date | null }>(() => {
    const stored = getUserProfile();
    return stored ? { name: stored.name, birthDate: stored.birthDate ? new Date(stored.birthDate) : null } : { name: "", birthDate: null };
  });

  // Initialize lifespan synchronously
  const [lifespan, setLifespanValue] = useState(() => getLifespan());

  const lastLoadedProfileRef = useRef<string | null>(null);

  const colors = {
    background: themeColors.background,
    text: themeColors.textPrimary,
    secondaryText: themeColors.textSecondary,
    cardBg: themeColors.card,
  };

  // Haptic feedback helper
  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Still use FocusEffect to update if changed (e.g. returning from Settings)
  useFocusEffect(() => {
    // We fetch again to check for updates
    const storedProfile = getUserProfile();
    const storedLifespan = getLifespan();

    // Always sync lifespan if changed
    setLifespanValue(prev => prev !== storedLifespan ? storedLifespan : prev);

    if (storedProfile) {
      const profileKey = `${storedProfile.name}-${storedProfile.birthDate || ''}-${storedLifespan}`;
      if (lastLoadedProfileRef.current !== profileKey) {
        lastLoadedProfileRef.current = profileKey;
        // Only set state if actually different to avoid unnecessary re-renders
        setProfile(prev => {
          const newDate = storedProfile.birthDate ? new Date(storedProfile.birthDate) : null;
          if (prev.name === storedProfile.name && prev.birthDate?.getTime() === newDate?.getTime()) {
            return prev;
          }
          return {
            name: storedProfile.name,
            birthDate: newDate,
          };
        });
      }
    } else {
      lastLoadedProfileRef.current = null;
      setProfile(prev => prev.name ? { name: "", birthDate: null } : prev);
    }
  });

  const hasProfile = profile.name && profile.birthDate;

  // Animated values for profile card
  const cardRotation = useSharedValue(-5);
  const cardScale = useSharedValue(1);

  // Animated style for profile card
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: cardScale.value },
      { rotate: `${cardRotation.value}deg` },
    ],
  }));

  // Handle card tap - random tilt with spring animation
  const handleCardTap = () => {
    triggerHaptic();
    const newRotation = Math.random() * 10 - 5;
    cardRotation.value = withSpring(newRotation, {
      damping: 10,
      stiffness: 100,
    });
    cardScale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withSpring(1, { damping: 10, stiffness: 200 })
    );
  };

  const calculateAge = (birthDate: Date) => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const calculateExactAge = (birthDate: Date) => {
    const today = new Date();
    const diff = today.getTime() - birthDate.getTime();
    return diff / (1000 * 60 * 60 * 24 * 365.25);
  };

  const openSettings = () => {
    router.push("/settings");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <AdaptivePillButton onPress={openSettings} style={styles.pillButton}>
          <Ionicons name="settings-outline" size={20} color={colors.text} />
        </AdaptivePillButton>
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        alwaysBounceVertical={true}
      >
        <View style={styles.profileSection}>
          {/* Profile Card */}
          <Pressable onPress={handleCardTap}>
            <Animated.View style={[styles.profileCard, { backgroundColor: accentColor }, cardAnimatedStyle]}>
              <Ionicons name="person" size={80} color="rgba(255, 255, 255, 0.6)" />
            </Animated.View>
          </Pressable>

          {hasProfile && profile.birthDate ? (
            <>
              <Text style={[styles.profileName, { color: colors.text }]}>{profile.name}</Text>

              {/* Precise Countdown */}
              <PreciseCountdown 
                birthDate={profile.birthDate} 
                lifespan={lifespan}
                textColor={colors.text}
                secondaryTextColor={colors.secondaryText}
              />

              {/* Graphs */}
              <View style={styles.graphsContainer}>
                <LifeInsights
                  ageYears={calculateExactAge(profile.birthDate)}
                  lifespan={lifespan}
                  accentColor={accentColor}
                  isDark={isDark}
                  themeColors={themeColors}
                />
              </View>
            </>
          ) : (
            <>
              <Text style={[styles.descriptionText, { color: colors.secondaryText }]}>
                Set up your profile to unlock personalized insights and visual reflections based on your age and lifespan.
              </Text>
              <Pressable style={[styles.setupButton, { backgroundColor: accentColor }]} onPress={openSettings}>
                <Text style={styles.setupButtonText}>Set up your profile</Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 0,
    zIndex: 10,
  },
  headerSpacer: {
    flex: 1,
  },
  pillButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  scrollContent: {
    paddingBottom: 100,
  },
  profileSection: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  profileCard: {
    width: 140, // Smaller profile card to fit charts
    height: 140,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 20,
  },
  profileName: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
  },
  profileAge: {
    fontSize: 17,
    marginTop: 8,
    marginBottom: 24,
  },
  descriptionText: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginTop: 20,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  setupButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 14,
    width: "100%",
    alignItems: "center",
  },
  setupButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  countdownContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 40,
  },
  countdownContent: {
    alignItems: "center",
  },
  countdownValue: {
    fontSize: 28, // Large ticker
    fontWeight: "800",
    fontVariant: ["tabular-nums"], // Monospaced numbers prevent jitter
  },
  countdownLabel: {
    fontSize: 15,
    fontWeight: "500",
    marginTop: 4,
  },
  laurelIcon: {
    opacity: 0.8,
  },
  graphsContainer: {
    width: "100%",
  }
});
