import { Canvas, Fill, Shader, Skia, vec, RoundedRect } from "@shopify/react-native-skia";
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";
import { StyleSheet, View, Text, useWindowDimensions } from "react-native";

interface LiquidCardProps {
  title: string;
  subtitle?: string;
  fillLevel: number; // 0-1, representing the liquid fill percentage
  color?: string; // Primary color for the liquid
  width?: number;
  height?: number;
}

// Liquid wave shader with sine wave ripples
// Using separate r, g, b floats instead of vec3 to avoid uniform size issues
const LIQUID_SHADER = Skia.RuntimeEffect.Make(`
  uniform float time;
  uniform float fillLevel;
  uniform vec2 size;
  uniform float colorR;
  uniform float colorG;
  uniform float colorB;

  // Simple noise function
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  // Wave function with multiple harmonics for natural liquid motion
  float wave(float x, float freq, float amp, float speed, float phase) {
    return sin(x * freq + time * speed + phase) * amp;
  }

  vec4 main(vec2 pos) {
    vec2 uv = pos / size;
    vec3 liquidColor = vec3(colorR, colorG, colorB);

    // Invert Y so fill comes from bottom
    float y = 1.0 - uv.y;

    // Multiple sine waves for natural liquid surface
    float waveX = uv.x * 6.28318; // Full wave across width
    float ripple =
      wave(waveX, 2.0, 0.015, 2.5, 0.0) +
      wave(waveX, 4.0, 0.008, 3.5, 1.57) +
      wave(waveX, 6.0, 0.005, 4.5, 3.14) +
      wave(waveX, 8.0, 0.003, 5.5, 0.78);

    // Add subtle noise for organic feel
    float noiseVal = noise(vec2(uv.x * 5.0, time * 0.5)) * 0.008;

    // Surface line with ripples
    float surfaceY = fillLevel + ripple + noiseVal;

    // Soft edge for the liquid surface
    float edge = smoothstep(surfaceY - 0.02, surfaceY + 0.02, y);

    // Liquid body gradient
    float depth = clamp((y - surfaceY) / fillLevel, 0.0, 1.0);

    // Color gradient from top to bottom of liquid
    vec3 topColor = liquidColor * 1.3; // Lighter at surface
    vec3 bottomColor = liquidColor * 0.7; // Darker at bottom
    vec3 color = mix(topColor, bottomColor, depth * 0.6);

    // Surface highlight (specular)
    float highlight = smoothstep(0.02, 0.0, abs(y - surfaceY));
    color += vec3(0.3, 0.4, 0.5) * highlight;

    // Caustic-like shimmer inside liquid
    float shimmer = 0.5 + 0.5 * sin(uv.x * 20.0 + time * 3.0 + uv.y * 10.0);
    shimmer *= 0.5 + 0.5 * sin(uv.x * 15.0 - time * 2.0 + uv.y * 8.0);
    color += liquidColor * shimmer * 0.1 * (1.0 - edge);

    // Alpha: fully visible in liquid, transparent above
    float alpha = (1.0 - edge) * 0.85;

    // Add glow at the surface
    float glow = exp(-abs(y - surfaceY) * 30.0) * 0.4;
    alpha = max(alpha, glow);

    return vec4(color, alpha);
  }
`)!;

import { useUnistyles } from "react-native-unistyles";

// ... existing imports ...

export function LiquidCard({
  title,
  subtitle,
  fillLevel,
  color, // Optional override
  width: customWidth,
  height: customHeight,
}: LiquidCardProps) {
  const dimensions = useWindowDimensions();
  const width = customWidth ?? dimensions.width - 40;
  const height = customHeight ?? 300;

  // Use Unistyles
  const { theme } = useUnistyles();
  const styles = createStyles(theme, width, height);

  // Use theme color if no override provided
  const liquidColor = color ?? theme.colors.liquid.blue;

  const time = useSharedValue(0);

  // ... (color parsing and shader logic remains the same) ...
  const parseColor = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255,
      ];
    }
    return [0.29, 0.62, 1.0]; // Default blue
  };

  const [r, g, b] = parseColor(liquidColor);

  useEffect(() => {
    time.value = withRepeat(
      withTiming(1000, { duration: 100000, easing: Easing.linear }),
      -1
    );
  }, [time]);

  const uniforms = useDerivedValue(
    () => ({
      time: time.value,
      fillLevel: fillLevel,
      size: vec(width, height),
      colorR: r,
      colorG: g,
      colorB: b,
    }),
    [time, fillLevel, width, height, r, g, b]
  );

  const percentage = Math.round(fillLevel * 100);

  return (
    <View style={styles.container}>
      <Canvas style={StyleSheet.absoluteFill}>
        <RoundedRect x={0} y={0} width={width} height={height} r={24} color={theme.colors.surfaceElevated} />
        <Fill>
          <Shader source={LIQUID_SHADER} uniforms={uniforms} />
        </Fill>
      </Canvas>
      <View style={styles.content}>
        <Text style={styles.percentage}>{percentage}%</Text>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

// Manual StyleSheet creation using Unistyles theme
const createStyles = (theme: any, width: number, height: number) => StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: theme.colors.surfaceElevated,
    width,
    height,
  },
  content: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  percentage: {
    fontSize: theme.typography.sizes.hero,
    fontWeight: "100",
    color: theme.colors.textPrimary,
    textShadowColor: theme.colors.textMuted,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  title: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: "300",
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.sm,
    textShadowColor: theme.colors.textMuted,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    textShadowColor: theme.colors.textMuted,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
