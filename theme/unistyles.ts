/**
 * Unistyles Configuration
 *
 * IMPORTANT: This file must have NO imports from app code to avoid circular deps.
 * It's imported first in index.ts before expo-router loads any routes.
 */
import { StyleSheet } from 'react-native-unistyles';
import { MMKV } from 'react-native-mmkv';
import { Appearance } from 'react-native';

// Create a dedicated MMKV instance for theme reading only
// This avoids importing from utils/storage which has circular dependencies
const themeStorage = new MMKV();

/**
 * Reko Theme Tokens
 *
 * Light and Dark mode support with Liquid Glass aesthetics
 */
export const lightColors = {
    // Base colors
    background: "#FFFFFF",
    surface: "#F2F2F7",
    surfaceElevated: "#FFFFFF",

    // Text colors
    textPrimary: "#000000",
    textSecondary: "#00000099",
    textTertiary: "#00000060",
    textMuted: "#00000040",

    // Card backgrounds
    card: "#FFFFFF",
    cardBorder: "#00000010",

    // System grays
    systemGray: "#8E8E93",
    systemGray2: "#AEAEB2",
    systemGray3: "#C7C7CC",
    systemGray4: "#D1D1D6",
    systemGray5: "#E5E5EA",
    systemGray6: "#F2F2F7",

    // System accents
    systemBlue: "#007AFF",
    systemGreen: "#34C759",
    systemOrange: "#FF9500",
    systemYellow: "#FFCC00",
    systemRed: "#FF3B30",
    systemPink: "#FF2D55",
    systemPurple: "#AF52DE",
    systemTeal: "#5AC8FA",
    systemCyan: "#32ADE6",
    systemIndigo: "#5856D6",
    systemMint: "#00C7BE",
    systemBrown: "#A2845E",

    // Controls
    divider: "#E5E5EA",
    inputBg: "#F2F2F7",
    controlTrackOff: "#E9E9EB",
    controlTrackOn: "#34C759",

    // Overlays
    overlay: {
        light: "rgba(0, 0, 0, 0.3)",
        medium: "rgba(0, 0, 0, 0.4)",
        strong: "rgba(0, 0, 0, 0.5)",
    },

    // Glass effect tints
    glass: {
        regular: "rgba(0, 0, 0, 0.05)",
        clear: "rgba(0, 0, 0, 0.02)",
        tinted: "rgba(100, 149, 237, 0.1)",
    },
};

export const darkColors = {
    // Base colors
    background: "#000000",
    surface: "#111111",
    surfaceElevated: "#1A1A1A",

    // Text colors
    textPrimary: "#FFFFFF",
    textSecondary: "#FFFFFF99",
    textTertiary: "#FFFFFF60",
    textMuted: "#FFFFFF40",

    // Card backgrounds
    card: "#1C1C1E",
    cardBorder: "#ffffffc5",

    // System grays
    systemGray: "#8E8E93",
    systemGray2: "#5C5C5E",
    systemGray3: "#48484A",
    systemGray4: "#3A3A3C",
    systemGray5: "#2C2C2E",
    systemGray6: "#1C1C1E",

    // System accents
    systemBlue: "#0A84FF",
    systemGreen: "#30D158",
    systemOrange: "#FF9F0A",
    systemYellow: "#FFD60A",
    systemRed: "#FF453A",
    systemPink: "#FF375F",
    systemPurple: "#BF5AF2",
    systemTeal: "#5AC8FA",
    systemCyan: "#64D2FF",
    systemIndigo: "#5856D6",
    systemMint: "#00C7BE",
    systemBrown: "#A2845E",

    // Controls
    divider: "#3A3A3C",
    inputBg: "#2C2C2E",
    controlTrackOff: "#3A3A3C",
    controlTrackOn: "#30D158",

    // Overlays
    overlay: {
        light: "rgba(0, 0, 0, 0.3)",
        medium: "rgba(0, 0, 0, 0.4)",
        strong: "rgba(0, 0, 0, 0.5)",
    },

    // Glass effect tints
    glass: {
        regular: "rgba(255, 255, 255, 0.1)",
        clear: "rgba(255, 255, 255, 0.05)",
        tinted: "rgba(100, 149, 237, 0.2)",
    },
};

// Apple-style accent colors (works in both light and dark modes)
export const accentColors = {
    white: {
        primary: "#FFFFFF",
        secondary: "#F5F5F7",
    },
    blue: {
        primary: "#007AFF",
        secondary: "#0A84FF",
    },
    green: {
        primary: "#34C759",
        secondary: "#30D158",
    },
    orange: {
        primary: "#FF9500",
        secondary: "#FF9F0A",
    },
    yellow: {
        primary: "#FFCC00",
        secondary: "#FFD60A",
    },
    pink: {
        primary: "#FF2D55",
        secondary: "#FF375F",
    },
    red: {
        primary: "#FF3B30",
        secondary: "#FF453A",
    },
    mint: {
        primary: "#00C7BE",
        secondary: "#63E6E2",
    },
    purple: {
        primary: "#AF52DE",
        secondary: "#BF5AF2",
    },
    brown: {
        primary: "#A2845E",
        secondary: "#AC8E68",
    },
} as const;

export type AccentColorName = keyof typeof accentColors;

export const sharePalette = {
    White: { dot: "#000000", lightBg: "#F5F5F7", passedDark: "#3A3A3C", passedLight: "#C7C7CC" },
    Blue: { dot: "#007AFF", lightBg: "#E8F4FD", passedDark: "#1C3A5F", passedLight: "#B3D4FC" },
    Green: { dot: "#34C759", lightBg: "#E8F8EC", passedDark: "#1C4D2A", passedLight: "#B3E8C2" },
    Orange: { dot: "#FF9500", lightBg: "#FFF4E6", passedDark: "#5F3A1C", passedLight: "#FFDDB3" },
    Yellow: { dot: "#FFCC00", lightBg: "#FFFBE6", passedDark: "#5F4D1C", passedLight: "#FFECB3" },
    Pink: { dot: "#FF2D55", lightBg: "#FFE8EC", passedDark: "#5F1C2A", passedLight: "#FFB3C2" },
    Red: { dot: "#FF3B30", lightBg: "#FFE8E7", passedDark: "#5F1C1C", passedLight: "#FFB3B0" },
    Mint: { dot: "#00C7BE", lightBg: "#E6FAF9", passedDark: "#1C4D4A", passedLight: "#B3F0ED" },
    Purple: { dot: "#AF52DE", lightBg: "#F5E8FA", passedDark: "#3D1C5F", passedLight: "#E0B3F0" },
    Brown: { dot: "#A2845E", lightBg: "#F5F0E8", passedDark: "#4D3A2A", passedLight: "#D4C4B0" },
} as const;

export const sharedColors = {
    accent: accentColors,
    transparent: "transparent",

    // Accent colors for liquid visualizations
    liquid: {
        blue: "#4A9EFF",
        cyan: "#00D4FF",
        purple: "#8B5CF6",
        pink: "#EC4899",
        red: "#FF6B6B",
        orange: "#F59E0B",
        green: "#10B981",
        teal: "#14B8A6",
    },

    // Priority colors
    priority: {
        high: "#FF6B6B",
        medium: "#F59E0B",
        low: "#10B981",
    },

    // Shadows
    shadow: {
        soft: "rgba(0, 0, 0, 0.3)",
        medium: "rgba(0, 0, 0, 0.5)",
        base: "#000000",
    },

    // Text on dark surfaces/images
    onImage: {
        primary: "#FFFFFF",
        secondary: "rgba(255, 255, 255, 0.9)",
        muted: "rgba(255, 255, 255, 0.8)",
        subtle: "rgba(255, 255, 255, 0.7)",
        faint: "rgba(255, 255, 255, 0.6)",
        ghost: "rgba(255, 255, 255, 0.5)",
        ultraFaint: "rgba(255, 255, 255, 0.2)",
    },

    // Neutral fills for charts
    neutralFill: {
        light: "rgba(120,120,128,0.1)",
        medium: "rgba(120,120,128,0.16)",
    },

    // Dark surfaces used regardless of theme
    surfaceDark: "#111111",
    surfaceDarker: "#1C1C1E",

    // Share UI palette
    share: {
        palette: sharePalette,
        ui: {
            overlay: "rgba(0, 0, 0, 0.5)",
            handle: "#5C5C5E",
            previewCard: "#1C1C1E",
            actionButton: "#2C2C2E",
            textPrimary: "#FFFFFF",
            textSecondary: "#8E8E93",
        },
    },

    // Charts and insights
    chart: {
        lifeStages: {
            childhood: "#FF3B30",
            adolescence: "#5856D6",
            youngAdult: "#007AFF",
            middleAge: "#34C759",
            laterLife: "#AF52DE",
        },
        activities: {
            sleeping: "#5856D6",
            working: "#007AFF",
            relaxing: "#34C759",
            screenTime: "#FF2D55",
            eating: "#FF9500",
            socialising: "#5AC8FA",
            commuting: "#8E8E93",
            exercising: "#AF52DE",
        },
        relationships: {
            alone: "#8E8E93",
            partner: "#FF2D55",
            family: "#FF9500",
            friends: "#34C759",
            coworkers: "#007AFF",
            parents: "#5856D6",
        },
        sleep: {
            asleep: "#5856D6",
            awake: "#FF9500",
            leftover: "#E5E5EA",
        },
    },
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const borderRadius = {
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    full: 9999,
};

export const typography = {
    // San Francisco weights for iOS "vanilla" feel
    weights: {
        ultraLight: "100" as const,
        thin: "200" as const,
        light: "300" as const,
        regular: "400" as const,
        medium: "500" as const,
        semibold: "600" as const,
        bold: "700" as const,
    },

    sizes: {
        xs: 10,
        sm: 12,
        md: 14,
        lg: 16,
        xl: 20,
        xxl: 24,
        display: 48,
        hero: 72,
    },
};

export const animation = {
    // Timing for liquid animations
    liquid: {
        waveDuration: 100000, // Slow continuous wave
        rippleDuration: 2000,
        shimmerDuration: 8000,
    },

    // Spring configs for glass interactions
    spring: {
        gentle: {
            damping: 20,
            stiffness: 100,
        },
        snappy: {
            damping: 15,
            stiffness: 150,
        },
        bouncy: {
            damping: 10,
            stiffness: 200,
        },
    },
};

export const effects = {
    shadow: {
        card: {
            shadowColor: sharedColors.shadow.base,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 10,
        },
    },
    textShadow: {
        sm: {
            textShadowColor: sharedColors.shadow.soft,
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
        },
        md: {
            textShadowColor: sharedColors.shadow.soft,
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 3,
        }
    }
};


export const lightTheme = {
    colors: {
        ...lightColors,
        ...sharedColors,
    },
    spacing,
    borderRadius,
    typography,
    animation,
    effects: {
        ...effects,
        shadow: {
            ...effects.shadow,
            cardGlow: {
                shadowColor: lightColors.textPrimary,
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.1,
                shadowRadius: 20,
                elevation: 10,
            }
        }
    },
    isDark: false,
};

export const darkTheme = {
    colors: {
        ...darkColors,
        ...sharedColors,
    },
    spacing,
    borderRadius,
    typography,
    animation,
    effects: {
        ...effects,
        shadow: {
            ...effects.shadow,
            cardGlow: {
                shadowColor: darkColors.textPrimary,
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.1,
                shadowRadius: 20,
                elevation: 10,
            }
        }
    },
    isDark: true,
};

export const breakpoints = {
    xs: 0,
    sm: 576,
    md: 768,
    lg: 992,
    xl: 1200,
    xxl: 1400,
};

type AppThemes = {
    light: typeof lightTheme;
    dark: typeof darkTheme;
};

type AppBreakpoints = typeof breakpoints;

// Read stored preference synchronously at module load to prevent theme flash
// Uses dedicated themeStorage MMKV instance to avoid circular deps
function getInitialTheme(): 'light' | 'dark' {
    try {
        const storedMode = themeStorage.getString('background_mode') as 'dark' | 'light' | 'device' | undefined;
        const mode = storedMode || 'device';

        if (mode === 'device') {
            const colorScheme = Appearance.getColorScheme();
            return colorScheme === 'light' ? 'light' : 'dark';
        }
        return mode;
    } catch {
        // Fallback if storage read fails
        const colorScheme = Appearance.getColorScheme();
        return colorScheme === 'light' ? 'light' : 'dark';
    }
}

// Override library types
declare module 'react-native-unistyles' {
    export interface UnistylesThemes extends AppThemes { }
    export interface UnistylesBreakpoints extends AppBreakpoints { }
}

// Configure Unistyles with version 3 API
StyleSheet.configure({
    breakpoints,
    themes: {
        light: lightTheme,
        dark: darkTheme,
    },
    settings: {
        initialTheme: getInitialTheme(),
    },
});
