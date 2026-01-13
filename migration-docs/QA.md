# Odak — QA Checklist

## Focus
- [ ] Hold-to-start completes at ~2.5s
- [ ] Releasing early resets with no session started
- [ ] On start, timer is correct after app background/foreground
- [ ] Dot decay changes once per minute (no seconds noise)
- [ ] Optional small numeric remaining minutes toggle works

## Break the seal
- [ ] No obvious pause button (unless accessibility mode)
- [ ] Long-press seal triggers confirm
- [ ] Ending early cancels notifications/live activity updates
- [ ] Ending early does NOT bank a “completed” session

## Completion
- [ ] Focus completion deposits into Bank
- [ ] Transition to Break happens correctly
- [ ] Auto-start break toggle works

## Bank
- [ ] Sessions show correct time + preset
- [ ] Today grouped first
- [ ] Daily stack view renders correctly
- [ ] Persistence survives restart

## Stats
- [ ] Today totals match Bank entries
- [ ] Last 7 days view doesn’t lag / over-render

## Settings
- [ ] Duration edits apply to next sessions (define behavior clearly if mid-session changes are allowed)
- [ ] Export JSON downloads/shares and re-imports correctly
- [ ] Import validation rejects invalid payloads safely

## Accessibility
- [ ] VoiceOver can start a session without long-press confusion
- [ ] Reduce Motion removes flourish
- [ ] Text scales without clipping

## System
- [ ] Notifications only request permission when enabled
- [ ] Notification fires at end of focus/break

## Live Activity (iOS 16.2+)
- [ ] Live Activity appears on Dynamic Island when focus starts
- [ ] Countdown displays correctly on Lock Screen
- [ ] Focus theme: white background, orange progress
- [ ] Break theme: orange background, white text
- [ ] Activity transitions smoothly from focus to break
- [ ] Activity ends with "Complete" message after break
- [ ] Activity ends with "Ended Early" if session broken
- [ ] Skipping break ends activity immediately
- [ ] Settings toggle enables/disables Live Activity
- [ ] Tapping Live Activity opens app via deep link
- [ ] Countdown continues accurately when app backgrounded
- [ ] Orphaned activities cleaned up on app restart
