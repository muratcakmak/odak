---
description: Development workflow for Odak focus timer app
---

// turbo-all
1. Before writing code:
   - Read relevant files to understand patterns
   - Check `theme/unistyles.ts` for available tokens

2. When creating components:
   - Import StyleSheet from `react-native-unistyles`
   - Use theme callback pattern for styles
   - Use Reanimated for any animation

3. When using glass effects:
   - Check `hasLiquidGlassSupport()` first
   - Provide fallback chain (Glass → Blur → Solid)

4. Before committing:
   - Run `bunx tsc --noEmit`
   - Run `bunx biome check`
   - Verify no hardcoded hex colors

5. Domain logic changes:
   - Update state machine in `domain/TimerEngine.ts`
   - Use timestamps for time truth, not tick loops

6. Testing & Debugging:
   - Use iOS Simulator MCP tools for UI interaction
   - Metro bundler runs at localhost:8081
   - Stream logs available at localhost:8081/logs
   - Take screenshots with `mcp__ios-simulator__screenshot`
   - Tap/swipe with `mcp__ios-simulator__ui_tap`, `ui_swipe`
