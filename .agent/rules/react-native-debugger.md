# React Native Debugger Rules

1. **Log First Debugging**: When debugging a crash, error, or unexpected behavior, ALWAYS start by reading the recent console logs.
2. **Access Method**: Use the 'react-native-debugger' workflow to fetch logs. Do NOT ask the user to copy-paste logs unless the MCP fails.
3. **App Discovery**: Always check for connected apps first. If multiple apps are connected, ask the user or infer the correct one based on the context.
4. **Contextual Analysis**: Correlate the log timestamps with the reported issue to isolate relevant entries.
