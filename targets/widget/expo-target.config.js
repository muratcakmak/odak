/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: "widget",
  name: "RekoWidget",
  bundleIdentifier: ".widget",
  deploymentTarget: "17.0",
  entitlements: {
    "com.apple.security.application-groups": ["group.com.omc345.reko"],
  },
  frameworks: ["SwiftUI", "WidgetKit"],
};
