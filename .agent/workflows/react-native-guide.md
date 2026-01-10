---
description: How to use the react-native-guide MCP server for codebase optimization and debugging
---

// turbo-all
1. Identify the task type (Performance, Debugging, Refactoring, or Architecture).
2. Use `check_for_updates` to ensure the server is latest.
3. For performance issues:
   - Run `optimize_performance` with the target `scenario`.
   - Run `analyze_codebase_performance` for a global view.
4. For bugs/crashes:
   - Run `debug_issue` with the `error_message` and `issue_type`.
   - Run `remediate_code` on the suspected file for automatic fixes.
5. For refactoring components:
   - Run `analyze_component` to get best practices feedback.
   - Use `refactor_component` with `refactor_type="comprehensive"`.
6. For new features or structural changes:
   - Use `architecture_advice` detailing features and app complexity.
7. Always run `analyze_codebase_comprehensive` after major changes to ensure quality and security.
8. **Verification Hook**: After completing any implementation plan, run `analyze_codebase_performance` as a final "health check" to ensure no new regressions were introduced.
