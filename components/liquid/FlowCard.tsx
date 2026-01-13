import { Canvas, Fill, Shader, Skia, vec, RoundedRect } from "@shopify/react-native-skia";
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";
import { View, Text, useWindowDimensions } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

interface FlowCardProps {
  title: string;
  elapsed: string;
  daysCount: number;
  color?: string;
  width?: number;
  height?: number;
}

// Flow stream shader - liquid flowing upward representing time accumulation
// Using separate r, g, b floats instead of vec3 to avoid uniform size issues
const FLOW_SHADER = Skia.RuntimeEffect.Make(`
  uniform float time;
  uniform vec2 size;
  uniform float colorR;
  uniform float colorG;
  uniform float colorB;

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

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }

  vec4 main(vec2 pos) {
    vec2 uv = pos / size;
    vec3 liquidColor = vec3(colorR, colorG, colorB);

    // Create flowing streams moving upward
    float flowSpeed = 0.5;
    float flowY = fract(uv.y - time * flowSpeed);

    // Multiple stream layers
    float stream1 = fbm(vec2(uv.x * 4.0, flowY * 8.0 - time * 2.0));
    float stream2 = fbm(vec2(uv.x * 6.0 + 0.5, flowY * 6.0 - time * 1.5));
    float stream3 = fbm(vec2(uv.x * 8.0 + 1.0, flowY * 10.0 - time * 2.5));

    // Combine streams
    float streams = stream1 * 0.4 + stream2 * 0.35 + stream3 * 0.25;

    // Create vertical flow patterns
    float verticalFlow = sin(uv.x * 12.0 + sin(uv.y * 4.0 + time)) * 0.5 + 0.5;
    float flowPattern = streams * verticalFlow;

    // Edge fade for organic look
    float edgeFade = smoothstep(0.0, 0.1, uv.x) * smoothstep(1.0, 0.9, uv.x);

    // Rising bubbles effect
    float bubbles = 0.0;
    for (float i = 0.0; i < 5.0; i++) {
      vec2 bubblePos = vec2(
        fract(uv.x * 3.0 + i * 0.2),
        fract(uv.y - time * (0.3 + i * 0.1) + i * 0.3)
      );
      float bubble = smoothstep(0.08, 0.0, length(bubblePos - vec2(0.5)));
      bubbles += bubble * 0.15;
    }

    // Color gradient
    vec3 topColor = liquidColor * 1.4;
    vec3 bottomColor = liquidColor * 0.6;
    vec3 color = mix(bottomColor, topColor, uv.y);

    // Add flow highlights
    color += vec3(0.2, 0.3, 0.4) * flowPattern * 0.5;
    color += vec3(0.4, 0.5, 0.6) * bubbles;

    // Shimmer effect
    float shimmer = sin(uv.x * 20.0 + time * 4.0) * sin(uv.y * 15.0 - time * 3.0);
    color += liquidColor * shimmer * 0.1;

    // Alpha with flow pattern
    float alpha = (0.3 + flowPattern * 0.5) * edgeFade;
    alpha += bubbles;
    alpha = clamp(alpha, 0.0, 0.85);

    return vec4(color, alpha);
  }
`)!;

export function FlowCard({
  title,
  elapsed,
  daysCount,
  color,
  width: customWidth,
  height: customHeight,
}: FlowCardProps) {
  const dimensions = useWindowDimensions();
  const width = customWidth ?? dimensions.width - 40;
  const height = customHeight ?? 200;
  const { theme } = useUnistyles();

  const time = useSharedValue(0);

  const parseColor = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255,
      ];
    }
    return [0.06, 0.73, 0.51]; // Default green
  };

  const liquidColor = color ?? theme.colors.liquid.green;
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
      size: vec(width, height),
      colorR: r,
      colorG: g,
      colorB: b,
    }),
    [time, width, height, r, g, b]
  );

  return (
    <View style={[styles.container, { width, height }]}>
      <Canvas style={styles.absoluteFill}>
        <RoundedRect x={0} y={0} width={width} height={height} r={24} color={theme.colors.surfaceDark} />
        <Fill>
          <Shader source={FLOW_SHADER} uniforms={uniforms} />
        </Fill>
      </Canvas>
      <View style={styles.content}>
        <Text style={styles.daysCount}>{daysCount}</Text>
        <Text style={styles.daysLabel}>days</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.elapsed}>{elapsed}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    borderRadius: theme.borderRadius.lg,
    overflow: "hidden",
    backgroundColor: theme.colors.surfaceDark,
  },
  absoluteFill: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  daysCount: {
    fontSize: theme.typography.sizes.hero,
    fontWeight: theme.typography.weights.ultraLight,
    color: theme.colors.onImage.primary,
    textShadowColor: theme.colors.shadow.medium,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  daysLabel: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.light,
    color: theme.colors.onImage.ghost,
    marginTop: -theme.spacing.sm,
    textShadowColor: theme.colors.shadow.medium,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  title: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.light,
    color: theme.colors.onImage.primary,
    marginTop: theme.spacing.md,
    textShadowColor: theme.colors.shadow.medium,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  elapsed: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.onImage.ghost,
    marginTop: theme.spacing.xs,
    textShadowColor: theme.colors.shadow.medium,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
}));
