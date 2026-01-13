# Odak Project Rules

## Package Manager
- **ALWAYS use bun** — never npm, yarn, or npx
- Commands: `bun install`, `bun add`, `bunx`
- TypeScript: `bunx tsc --noEmit`
- Lint: `bunx biome check`

## Styling (Unistyles v3)
- Import `StyleSheet` from `react-native-unistyles` only
- NO hardcoded colors, spacing, or font sizes
- Use theme callbacks: `StyleSheet.create((theme) => ({...}))`
- Get runtime theme: `const { theme } = useUnistyles()`

## Animations (120fps)
- Use `react-native-reanimated` for ALL animations
- Run on UI thread with worklets
- NO `Animated` from react-native

## iOS Version Handling
- iOS 26+: Liquid Glass (`expo-glass-effect`)
- iOS 18-25: BlurView fallback
- Older/Android: Solid color
- Check with `hasLiquidGlassSupport()` from `utils/capabilities.ts`
- Swift: Use `#if compiler(>=6.2)` AND `#available(iOS 26.0, *)`

## Development Tools
- iOS Simulator MCP available for UI testing
- Metro bundler at `localhost:8081`
- Log stream at `localhost:8081/logs`
- Use MCP tools: `screenshot`, `ui_tap`, `ui_swipe`, `ui_describe_all`
