# React Native Guide MCP Rules

Always prioritize using the 'react-native-guide' MCP server for any React Native specific tasks. Follow these rules:

1. **Automatic Analysis**: When opening a React Native component for the first time in a task, proactively call 'analyze_component' to identify immediate improvements.
2. **Performance Monitoring**: If the codebase contains lists ('FlashList', 'FlatList') or complex animations, always run 'analyze_codebase_performance' with 'focus_areas=["list_rendering", "animations"]'.
3. **Proactive Remediation**: Before manually fixing a complex React Native bug, try 'remediate_code' with 'remediation_level="expert"' to see the recommended solution.
4. **Testing Standards**: Always generate tests for new components using 'generate_component_test' with 'include_accessibility=true'.
5. **Architecture Alignment**: Consult 'architecture_advice' before introducing new state management or navigation patterns.
6. **Code Quality**: Ensure 'analyze_codebase_comprehensive' returns no critical issues for 'security', 'performance', and 'deprecated_features' before completing a task.
7. **Best Practices**: Prefer functional components and hooks over class components. Use '@shopify/flash-list' for large lists and 'expo-image' for optimized images.
8. **Post-Task Checklist**: Upon completing a task, always perform a 'health check' by running 'analyze_codebase_comprehensive' to verify there are no new performance or security regressions.
