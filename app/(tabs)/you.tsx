import { useState, useCallback } from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { getUserProfile } from "../../utils/storage";
import { useTheme } from "../../hooks/useTheme";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from "react-native-reanimated";

// Header pill button
function HeaderPillButton({
  children,
  onPress,
  style,
  fallbackColor,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
  fallbackColor?: string;
}) {
  const isGlassAvailable = isLiquidGlassAvailable();

  if (isGlassAvailable) {
    return (
      <Pressable onPress={onPress}>
        <GlassView style={[styles.pillButton, style]} isInteractive>
          {children}
        </GlassView>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} style={[styles.pillButton, { backgroundColor: fallbackColor || "#1C1C1E" }, style]}>
      {children}
    </Pressable>
  );
}

export default function YouScreen() {
  const { isDark, colors: themeColors } = useTheme();
  const [profile, setProfile] = useState<{ name: string; birthDate: Date | null }>({ name: "", birthDate: null });

  const colors = {
    background: themeColors.background,
    text: themeColors.textPrimary,
    secondaryText: themeColors.textSecondary,
    cardBg: themeColors.card,
  };

  // Haptic feedback helper
  const triggerHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Load profile from MMKV on mount and when returning from settings
  useFocusEffect(
    useCallback(() => {
      const storedProfile = getUserProfile();
      if (storedProfile) {
        setProfile({
          name: storedProfile.name,
          birthDate: storedProfile.birthDate ? new Date(storedProfile.birthDate) : null,
        });
      }
    }, [])
  );

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
  const handleCardTap = useCallback(() => {
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
  }, [triggerHaptic]);

  const calculateAge = (birthDate: Date) => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const openSettings = () => {
    router.push("/settings");
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <HeaderPillButton onPress={openSettings} fallbackColor={colors.cardBg}>
          <Ionicons name="settings-outline" size={20} color={colors.text} />
        </HeaderPillButton>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Profile Card */}
        <Pressable onPress={handleCardTap}>
          <Animated.View style={[styles.profileCard, { backgroundColor: colors.cardBg }, cardAnimatedStyle]}>
            <Ionicons name="person" size={80} color="rgba(255, 255, 255, 0.6)" />
          </Animated.View>
        </Pressable>

        {hasProfile && profile.birthDate ? (
          <>
            <Text style={[styles.profileName, { color: colors.text }]}>{profile.name}</Text>
            <Text style={[styles.profileAge, { color: colors.secondaryText }]}>
              {calculateAge(profile.birthDate)} years old
            </Text>
            <Pressable style={styles.setupButton} onPress={openSettings}>
              <Text style={styles.setupButtonText}>Edit profile</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={[styles.descriptionText, { color: colors.secondaryText }]}>
              Set up your profile to unlock personalized insights and visual reflections based on your age and lifespan.
            </Text>
            <Pressable style={styles.setupButton} onPress={openSettings}>
              <Text style={styles.setupButtonText}>Set up your profile</Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
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
    paddingBottom: 16,
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
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: 40,
  },
  profileCard: {
    width: 180,
    height: 180,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  profileName: {
    fontSize: 28,
    fontWeight: "700",
    marginTop: 24,
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
    marginTop: 40,
    marginBottom: 24,
  },
  setupButton: {
    backgroundColor: "#007AFF",
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
});
