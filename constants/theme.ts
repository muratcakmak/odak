/**
 * Reko Theme Constants
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

  // Glass effect tints
  glass: {
    regular: "rgba(255, 255, 255, 0.1)",
    clear: "rgba(255, 255, 255, 0.05)",
    tinted: "rgba(100, 149, 237, 0.2)",
  },
};

// Shared colors (same in both modes)
export const sharedColors = {
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

  // System colors (iOS)
  system: {
    blue: {
      light: "#007AFF",
      dark: "#0A84FF",
    },
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

export type ColorScheme = "light" | "dark";

export function getColors(colorScheme: ColorScheme) {
  const modeColors = colorScheme === "dark" ? darkColors : lightColors;
  return {
    ...modeColors,
    ...sharedColors,
  };
}

export type AppTheme = {
  colors: typeof lightColors & typeof sharedColors;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  typography: typeof typography;
  animation: typeof animation;
  isDark: boolean;
};

// Don't export the 'theme' object directly as it was confused between light/dark map
// Instead export the tokens directly which we already do.
export default {
  lightColors,
  darkColors,
  sharedColors,
  spacing,
  borderRadius,
  typography,
  animation,
};
