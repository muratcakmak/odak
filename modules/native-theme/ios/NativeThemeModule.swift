import ExpoModulesCore
import UIKit

public class NativeThemeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NativeTheme")

    // Set the native interface style at runtime
    Function("setMode") { (mode: String) in
      let style: UIUserInterfaceStyle

      switch mode {
      case "dark":
        style = .dark
      case "light":
        style = .light
      default:
        style = .unspecified
      }

      DispatchQueue.main.async {
        // Update all windows for all active scenes
        UIApplication.shared.connectedScenes
          .compactMap { $0 as? UIWindowScene }
          .flatMap { $0.windows }
          .forEach { window in
            window.overrideUserInterfaceStyle = style
          }
      }
    }
  }
}


