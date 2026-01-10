const { withAppDelegate, withInfoPlist } = require("@expo/config-plugins");

/**
 * Expo config plugin to set native theme (overrideUserInterfaceStyle)
 * before React Native renders, preventing theme flash.
 *
 * Reads the stored background_mode from App Group UserDefaults and sets
 * the window's overrideUserInterfaceStyle accordingly.
 */
function withNativeTheme(config, { appGroupId = "group.com.omc345.rekoll" } = {}) {
  // Modify AppDelegate to set theme before React renders
  config = withAppDelegate(config, (config) => {
    const contents = config.modResults.contents;

    // Check if we're dealing with Swift or Objective-C
    const isSwift = config.modResults.language === "swift";

    if (isSwift) {
      config.modResults.contents = modifySwiftAppDelegate(contents, appGroupId);
    } else {
      config.modResults.contents = modifyObjCAppDelegate(contents, appGroupId);
    }

    return config;
  });

  return config;
}

function modifySwiftAppDelegate(contents, appGroupId) {
  // Helper function to get the theme style from UserDefaults
  const helperFunction = `
  // Helper function to get stored theme preference
  private func getStoredThemeStyle() -> UIUserInterfaceStyle {
    guard let userDefaults = UserDefaults(suiteName: "${appGroupId}"),
          let backgroundMode = userDefaults.string(forKey: "background_mode") else {
      return .unspecified
    }

    switch backgroundMode {
    case "dark":
      return .dark
    case "light":
      return .light
    default:
      return .unspecified // "device" - follow system
    }
  }
`;

  // Code to apply theme right after window is created
  const windowThemeCode = `
    // Apply stored theme preference to window immediately
    window?.overrideUserInterfaceStyle = getStoredThemeStyle()
`;

  // Find AppDelegate class and its closing brace (not ReactNativeDelegate)
  const appDelegateClassPattern = /((?:@main\s+)?(?:public\s+)?class\s+AppDelegate[^{]*\{)/;
  const appDelegateMatch = contents.match(appDelegateClassPattern);

  if (appDelegateMatch) {
    // Find the closing brace of AppDelegate class
    const startIndex = appDelegateMatch.index + appDelegateMatch[0].length;
    let braceCount = 1;
    let endIndex = startIndex;

    for (let i = startIndex; i < contents.length && braceCount > 0; i++) {
      if (contents[i] === '{') braceCount++;
      if (contents[i] === '}') braceCount--;
      if (braceCount === 0) endIndex = i;
    }

    // Insert helper function before AppDelegate's closing brace
    contents = contents.slice(0, endIndex) + helperFunction + contents.slice(endIndex);
  }

  // Insert theme code right after window creation
  // Look for: window = UIWindow(frame: UIScreen.main.bounds)
  const windowCreationPattern = /(window\s*=\s*UIWindow\([^)]+\))/;
  const windowMatch = contents.match(windowCreationPattern);
  if (windowMatch) {
    const insertIndex = windowMatch.index + windowMatch[0].length;
    contents = contents.slice(0, insertIndex) + windowThemeCode + contents.slice(insertIndex);
  }

  return contents;
}

function modifyObjCAppDelegate(contents, appGroupId) {
  // For Objective-C AppDelegate
  const themeSetupCode = `
  // Set native theme before React renders to prevent flash
  NSUserDefaults *userDefaults = [[NSUserDefaults alloc] initWithSuiteName:@"${appGroupId}"];
  NSString *backgroundMode = [userDefaults stringForKey:@"background_mode"];
  if (backgroundMode) {
    UIUserInterfaceStyle style = UIUserInterfaceStyleUnspecified;
    if ([backgroundMode isEqualToString:@"dark"]) {
      style = UIUserInterfaceStyleDark;
    } else if ([backgroundMode isEqualToString:@"light"]) {
      style = UIUserInterfaceStyleLight;
    }
    dispatch_async(dispatch_get_main_queue(), ^{
      for (UIWindow *window in [UIApplication sharedApplication].windows) {
        window.overrideUserInterfaceStyle = style;
      }
    });
  }
`;

  // Look for didFinishLaunchingWithOptions
  const didFinishPattern = /didFinishLaunchingWithOptions[^{]*\{/;
  const match = contents.match(didFinishPattern);

  if (match) {
    const insertIndex = match.index + match[0].length;
    contents = contents.slice(0, insertIndex) + themeSetupCode + contents.slice(insertIndex);
  }

  return contents;
}

module.exports = withNativeTheme;
