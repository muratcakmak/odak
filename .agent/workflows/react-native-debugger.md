---
description: How to read real-time logs from the React Native Metro server using the debugger MCP
---

1. Call `getConnectedApps` with `metroServerPort=8081` (or the specific port if different) to find the target application.
2. Identify the correct app from the list (look for the matching bundle description).
3. Call `readConsoleLogsFromApp` with the `app` object returned from step 1.
4. Analyze the returned logs for errors, warnings, or specific debug information.
