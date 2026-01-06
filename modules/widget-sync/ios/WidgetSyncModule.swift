import ExpoModulesCore
import WidgetKit

public class WidgetSyncModule: Module {
    public func definition() -> ModuleDefinition {
        Name("WidgetSync")

        // Set item to App Group UserDefaults
        Function("setItem") { (key: String, value: String, appGroupId: String) in
            guard let userDefaults = UserDefaults(suiteName: appGroupId) else {
                return false
            }
            userDefaults.set(value, forKey: key)
            userDefaults.synchronize()
            return true
        }

        // Get item from App Group UserDefaults
        Function("getItem") { (key: String, appGroupId: String) -> String? in
            guard let userDefaults = UserDefaults(suiteName: appGroupId) else {
                return nil
            }
            return userDefaults.string(forKey: key)
        }

        // Remove item from App Group UserDefaults
        Function("removeItem") { (key: String, appGroupId: String) in
            guard let userDefaults = UserDefaults(suiteName: appGroupId) else {
                return false
            }
            userDefaults.removeObject(forKey: key)
            userDefaults.synchronize()
            return true
        }

        // Reload all widget timelines
        Function("reloadAllTimelines") {
            if #available(iOS 14.0, *) {
                WidgetCenter.shared.reloadAllTimelines()
            }
        }

        // Reload specific widget timeline by kind
        Function("reloadTimeline") { (kind: String) in
            if #available(iOS 14.0, *) {
                WidgetCenter.shared.reloadTimelines(ofKind: kind)
            }
        }
    }
}
