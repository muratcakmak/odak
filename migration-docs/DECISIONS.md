# Odak — Decisions

This document tracks architectural and product decisions for Odak.

---

## 2025-01-11 — Countdown visibility
**Decision:** Default UI hides prominent countdown; optional small minutes remaining is user-toggle.

**Why:** Reduces anxiety and checking; preserves "time as texture."

**Tradeoff:** Some users prefer explicit numbers; we provide an opt-in.

---

## 2025-01-11 — Timer truth
**Decision:** Timer truth is derived from timestamps (`startedAt`/`endsAt`), not tick loops.

**Why:** Reliable across background/restart; deterministic state recovery.

**Tradeoff:** Slightly more complex than naive interval timer.

---

## 2025-01-11 — High-friction quit
**Decision:** No pause button by default; long-press seal (2s) + confirmation to end early.

**Why:** Maintains commitment ritual; reduces casual abandonment.

**Tradeoff:** May frustrate users in emergencies; accessible alternative available via VoiceOver.

---

## 2025-01-11 — Dot grid sizing
**Decision:** Grid dimensions match preset duration: 2×5 (10 min), 5×5 (25 min), 5×10 (50 min).

**Why:** Visual consistency; one dot = one minute; easy mental math.

**Tradeoff:** Fixed grids mean custom durations need grid calculation logic (round to nearest grid-friendly number or variable column count).

---

## 2025-01-11 — Break duration
**Decision:** Default break is 5 minutes (1×5 grid).

**Why:** Standard Pomodoro ratio (5:25); short enough to maintain momentum.

**Tradeoff:** Power users may want longer breaks; customization available in settings.

---

## 2025-01-11 — Charging threshold
**Decision:** Hold-to-start threshold is 2.5 seconds.

**Why:** Long enough to prevent accidental starts; short enough to feel responsive.

**Tradeoff:** Some users may find it too slow; VoiceOver users get an immediate "Start" button.

---

## 2025-01-11 — Rekoll design inheritance
**Decision:** Odak inherits Rekoll visual language (orange accent, white surfaces, dot grids, rounded cards).

**Why:** Proven aesthetic; consistent brand across products; reduces design decisions.

**Tradeoff:** Less visual differentiation from Rekoll; accepted for v1 to ship faster.

**Details:**
- Orange accent: HSL 38° 92% 50% (`#FF9500` light / `#FF9F0A` dark)
- Border radius: 16px (1rem)
- Typography: San Francisco (iOS), Inter (web)
- Spacing: 8px baseline grid

---

## 2025-01-11 — Local-first persistence
**Decision:** All data stored locally using MMKV (iOS) or localStorage (web). No cloud sync.

**Why:** Privacy-first; no accounts needed; offline-first experience.

**Tradeoff:** Users lose data if device is lost; export/import provided as backup mechanism.

---

## 2025-01-11 — Break mode visual
**Decision:** Break phase uses full orange background with white dots and text.

**Why:** Creates clear visual distinction between focus and break states; impossible to confuse.

**Tradeoff:** High contrast may be jarring for some users; Reduce Motion users see instant transition.

---

## 2025-01-13 — Live Activity implementation
**Decision:** Implement iOS Live Activities using `expo-live-activity` for Dynamic Island and Lock Screen countdown display.

**Why:** Real-time countdown visibility without opening app; native iOS integration; clear visual feedback during focus/break sessions.

**Details:**
- Focus theme: White background, orange progress bar
- Break theme: Orange background, white text
- Automatic lifecycle: starts on focus begin, transitions on break, ends on completion
- Settings toggle to enable/disable
- Uses timestamp-based countdown (`progressBar.date`) for accurate native rendering

**Tradeoff:** iOS 16.2+ only; requires Development Build (not Expo Go); adds Swift widget extension complexity.

---

## Future Decisions (Pending)

### Widget update frequency
**Options:**
1. Per-minute updates (reliable, battery-efficient)
2. Timeline-based with system refresh (iOS default)
3. ~~Live Activity for real-time (iOS 16.1+)~~ — Implemented

**Current status:** Using option 2 for widgets; Live Activity implemented for real-time countdown.

### Notification strategy
**Options:**
1. Single notification at session end
2. 5-minute warning before end
3. Custom intervals

**Current status:** Using option 1; keep it simple.

### Custom durations
**Options:**
1. Allow any duration (with dynamic grid calculation)
2. Preset multipliers only (15, 20, 30, 45, 60)
3. Strict presets only

**Current status:** Using option 3; may relax in v1.1.
