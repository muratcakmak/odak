# Claude.md — Odak Repo Assistant Guide

You are working inside the **Odak** repository (a Pomodoro-style focus app). Your job is to help implement features and refactors while preserving the product philosophy:

- **Time as texture** (dot grids, minimal digits)
- **Hold to start** (commitment threshold)
- **High-friction quit** (break the seal)
- **Local-first** (persist sessions and settings locally)

---

## Non-Negotiables

### Bun is the default package manager
- **Always use `bun`** for installing, running, and managing packages
- **DO NOT use npm, yarn, or npx** — always use bun equivalents
- Lock file: `bun.lock` (not package-lock.json or yarn.lock)
- Commands: `bun install`, `bun add <pkg>`, `bun run <script>`, `bunx <bin>`
- TypeScript checks: `bunx tsc --noEmit`
- Linting: `bunx biome check`

### Unistyles v3 is the only styling system
- **No inline hex colors** — all colors must come from theme tokens
- **No StyleSheet from react-native** — use `StyleSheet` from `react-native-unistyles`
- **No hardcoded values** — spacing, typography, border radius all from theme

### 120fps animations are mandatory
- Use `react-native-reanimated` for all animations
- Run animations on the UI thread with worklets
- Never use `Animated` from react-native (use Reanimated)
- Use `useSharedValue`, `useAnimatedStyle`, `withTiming`, `withSpring`
- Prefer `runOnJS` only when absolutely necessary for JS callbacks

### iOS 26 Liquid Glass with iOS 18 fallback
- iOS 26+: Full Liquid Glass (`GlassView` from `expo-glass-effect`)
- iOS 18-25: `BlurView` fallback (`expo-blur`)
- Older iOS / Android: Solid color background
- Use `hasLiquidGlassSupport()` from `utils/capabilities.ts` to check
- Swift code must use `#if compiler(>=6.2)` AND `#available(iOS 26.0, *)`
- Always provide fallback chain in components (see `AdaptiveCard`, `GlassHeaderButton`)

### Development Tools
- iOS Simulator MCP available for UI testing and screenshots
- Metro bundler runs at `localhost:8081`
- Log stream available at `localhost:8081/logs`
- MCP tools: `screenshot`, `ui_tap`, `ui_swipe`, `ui_describe_all`

---

## Tech Stack

```
expo: ^55.0.0 (canary)
react-native: ^0.83.0
react: 19.2.0
react-native-unistyles: ^3.0.21
react-native-reanimated: ~4.2.0
react-native-gesture-handler: ~2.28.0
react-native-mmkv: ^3.2.0
expo-sqlite: for persistence
@shopify/react-native-skia: 2.2.12
expo-glass-effect: liquid glass UI
```

---

## Unistyles Pattern

### Creating Styles (Theme-Aware)
```typescript
import { StyleSheet, useUnistyles } from "react-native-unistyles";

// Define styles with theme callback (module level)
const styles = StyleSheet.create((theme) => ({
  container: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  title: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
  },
}));

// In component - get theme for dynamic values
function MyComponent() {
  const { theme } = useUnistyles();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.systemBlue }]}>
        Hello
      </Text>
    </View>
  );
}
```

### Theme Tokens Available
```typescript
// Colors
theme.colors.background      // #FFFFFF / #000000
theme.colors.surface         // #F2F2F7 / #111111
theme.colors.card            // #FFFFFF / #1C1C1E
theme.colors.textPrimary     // #000000 / #FFFFFF
theme.colors.textSecondary   // rgba variants
theme.colors.systemOrange    // #FF9500 / #FF9F0A
theme.colors.accent.orange.primary  // named accents

// Spacing (8px grid)
theme.spacing.xs   // 4
theme.spacing.sm   // 8
theme.spacing.md   // 16
theme.spacing.lg   // 24
theme.spacing.xl   // 32

// Typography
theme.typography.sizes.xs     // 10
theme.typography.sizes.sm     // 12
theme.typography.sizes.md     // 14
theme.typography.sizes.lg     // 16
theme.typography.sizes.xl     // 20
theme.typography.sizes.display // 48
theme.typography.weights.regular  // "400"
theme.typography.weights.semibold // "600"

// Border Radius
theme.borderRadius.sm   // 8
theme.borderRadius.md   // 16
theme.borderRadius.lg   // 24
theme.borderRadius.full // 9999
```

### What NOT to do
```typescript
// WRONG: Hardcoded colors
backgroundColor: "#FF9500"
color: "rgba(0, 0, 0, 0.5)"

// WRONG: StyleSheet from react-native
import { StyleSheet } from "react-native";

// WRONG: Hardcoded spacing/sizes
padding: 16
fontSize: 14
borderRadius: 8

// WRONG: Old pattern with factory function
const createStyles = (theme) => StyleSheet.create({...});

// WRONG: useStyles (doesn't exist in v3)
const { styles } = useStyles();
```

---

## Reanimated Patterns

### Basic Animation
```typescript
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from "react-native-reanimated";

function AnimatedComponent() {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(1.2, { damping: 15 });
  };

  return <Animated.View style={animatedStyle} />;
}
```

### Gesture + Animation
```typescript
import { Gesture, GestureDetector } from "react-native-gesture-handler";

const gesture = Gesture.Tap()
  .onBegin(() => {
    scale.value = withTiming(0.95);
  })
  .onFinalize(() => {
    scale.value = withSpring(1);
  });

return (
  <GestureDetector gesture={gesture}>
    <Animated.View style={animatedStyle} />
  </GestureDetector>
);
```

---

## Domain Layer Pattern

Timer logic lives in `domain/` with pure functions and a state machine:

```typescript
// domain/TimerEngine.ts
export function timerReducer(
  state: TimerState,
  event: TimerEvent,
  settings: FocusSettings
): { state: TimerState; session?: FocusSession }

// State machine phases:
// idle → holdingToStart → focusing → break → idle
// focusing → endedEarly (break the seal)
```

**Key principle**: Timer truth comes from timestamps, not tick loops.
```typescript
// Compute remaining time from timestamps
const remaining = endsAt - Date.now();
```

---

## Storage Layer

- **MMKV** for fast synchronous key-value storage (settings, preferences)
- **SQLite** for structured data (focus sessions, achievements)
- All persisted payloads must include a `version` field for migrations

```typescript
// utils/storage.ts
import { MMKV } from "react-native-mmkv";
const storage = new MMKV();

// data/database.ts
import * as SQLite from "expo-sqlite";
```

---

## File Structure

```
odak/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab navigator
│   │   ├── focus/         # Focus timer screen
│   │   ├── bank/          # Session history
│   │   ├── dates/         # Calendar events
│   │   └── you/           # Profile & achievements
│   ├── _layout.tsx        # Root layout
│   ├── settings.tsx       # Settings modal
│   └── share.tsx          # Share modal
├── components/            # Reusable components
│   ├── focus/             # Timer-specific (DotGrid, SealButton)
│   ├── liquid/            # Glass effect cards
│   └── ui/                # Generic UI components
├── domain/                # Business logic (pure functions)
│   ├── TimerEngine.ts     # State machine
│   ├── types.ts           # Type definitions
│   └── models/            # Domain models
├── theme/
│   └── unistyles.ts       # Theme configuration (MUST load first)
├── data/
│   └── database.ts        # SQLite setup
├── utils/                 # Utilities
│   ├── storage.ts         # MMKV helpers
│   └── capabilities.ts    # Feature detection
└── index.ts               # Entry point (imports theme first)
```

---

## Working Agreements

### Do not change product philosophy without proposing alternatives
If you think a change is beneficial (e.g., adding a big countdown), propose it as an option and keep the default philosophy intact.

### Prefer deterministic time calculations
Never rely on a per-second timer loop as the source of truth.
Use timestamps (`startedAt`, `endsAt`) and compute remaining time from `now`.

### Keep UI minimal and consistent with Rekoll design language
- **White surfaces** with generous whitespace
- **Orange accent**: use `theme.colors.systemOrange`
- **Rounded cards**: use `theme.borderRadius.md` (16px)
- **Dot-grid visual motif**: time as texture
- **Spacing**: use `theme.spacing.*` (8px baseline grid)

---

## Verification Commands

```bash
# TypeScript check
bunx tsc --noEmit

# Lint check
bunx biome check

# Start dev server
bun start

# Build iOS
bun ios
```

---

## Quick Product Glossary

- **Focus**: active commitment block (Quick 10 / Standard 25 / Deep 50 minutes)
- **Break**: release block (default 5 minutes, full orange background)
- **Bank**: historical completed focus sessions (grouped by day)
- **Seal**: high-friction stop control (2s long-press + confirm)
- **Decaying Grid**: dot grid extinguishing one dot per minute
- **Preset**: duration configuration (Quick 2×5, Standard 5×5, Deep 5×10 grids)
- **Hold-to-start**: 2.5s commitment threshold gesture
- **Charging**: visual feedback during hold-to-start (dots fill progressively)

---

## Helpful References

- `migration-docs/PRODUCT.md` — scope and philosophy
- `migration-docs/ENGINEERING.md` — architecture and system constraints
- `migration-docs/QA.md` — manual test cases
- `migration-docs/DECISIONS.md` — architectural decisions log
- `theme/unistyles.ts` — theme tokens and configuration
