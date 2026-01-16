import WidgetKit
import SwiftUI
import AppIntents
import UIKit

// MARK: - Data Models

struct OdakEventData: Codable, Identifiable, Hashable {
    let id: String
    let title: String
    let date: String?
    let startDate: String?
    let image: String?

    var targetDate: Date? {
        guard let dateStr = startDate ?? date, !dateStr.isEmpty else {
            return nil
        }

        let formatOptions: [ISO8601DateFormatter.Options] = [
            [.withInternetDateTime, .withFractionalSeconds],
            [.withInternetDateTime],
            [.withFullDate, .withFullTime, .withTimeZone],
            [.withFullDate]
        ]

        for options in formatOptions {
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = options
            if let date = formatter.date(from: dateStr) {
                return date
            }
        }

        let fallbackFormatter = DateFormatter()
        fallbackFormatter.locale = Locale(identifier: "en_US_POSIX")
        let formats = [
            "yyyy-MM-dd'T'HH:mm:ss.SSSZ",
            "yyyy-MM-dd'T'HH:mm:ssZ",
            "yyyy-MM-dd'T'HH:mm:ss",
            "yyyy-MM-dd"
        ]
        for format in formats {
            fallbackFormatter.dateFormat = format
            if let date = fallbackFormatter.date(from: dateStr) {
                return date
            }
        }

        return nil
    }
}

// MARK: - Storage Helper

struct OdakStorage {
    static let appGroupId = "group.com.omc345.odak"

    static func loadAheadEvents() -> [OdakEventData] {
        guard let userDefaults = UserDefaults(suiteName: appGroupId),
              let jsonString = userDefaults.string(forKey: "ahead_events"),
              let data = jsonString.data(using: .utf8) else { return [] }
        return (try? JSONDecoder().decode([OdakEventData].self, from: data)) ?? []
    }

    static func loadSinceEvents() -> [OdakEventData] {
        guard let userDefaults = UserDefaults(suiteName: appGroupId),
              let jsonString = userDefaults.string(forKey: "since_events"),
              let data = jsonString.data(using: .utf8) else { return [] }
        return (try? JSONDecoder().decode([OdakEventData].self, from: data)) ?? []
    }

    /// Load and downsample image for widget display
    /// - Parameters:
    ///   - event: The event containing the image path
    ///   - maxSize: Maximum size for the thumbnail (to save memory)
    /// - Returns: Downsampled UIImage or nil
    static func loadImage(for event: OdakEventData, maxSize: CGSize) -> UIImage? {
        guard let imagePath = event.image, !imagePath.isEmpty else { return nil }

        guard let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupId) else {
            return nil
        }

        let filename: String
        if imagePath.contains("/") {
            filename = (imagePath as NSString).lastPathComponent
        } else {
            filename = imagePath
        }

        let imageURL = containerURL.appendingPathComponent("images").appendingPathComponent(filename)

        guard FileManager.default.fileExists(atPath: imageURL.path),
              let imageData = try? Data(contentsOf: imageURL),
              let originalImage = UIImage(data: imageData) else {
            return nil
        }

        // CRITICAL: Downsample to save memory - widgets have 30MB limit
        // Using preparingThumbnail is more memory-efficient than loading full image
        if let thumbnail = originalImage.preparingThumbnail(of: maxSize) {
            return thumbnail
        }

        // Fallback: manual resize if preparingThumbnail fails
        let scale = min(maxSize.width / originalImage.size.width, maxSize.height / originalImage.size.height)
        if scale < 1.0 {
            let newSize = CGSize(width: originalImage.size.width * scale, height: originalImage.size.height * scale)
            UIGraphicsBeginImageContextWithOptions(newSize, false, 1.0)
            originalImage.draw(in: CGRect(origin: .zero, size: newSize))
            let resized = UIGraphicsGetImageFromCurrentImageContext()
            UIGraphicsEndImageContext()
            return resized
        }

        return originalImage
    }

    /// Get appropriate image size based on widget family
    static func imageSizeForFamily(_ family: WidgetFamily) -> CGSize {
        switch family {
        case .systemSmall:
            return CGSize(width: 200, height: 200)
        case .systemMedium:
            return CGSize(width: 400, height: 200)
        case .systemLarge:
            return CGSize(width: 400, height: 400)
        default:
            return CGSize(width: 300, height: 300)
        }
    }
}

// MARK: - App Entities

struct AheadEventEntity: AppEntity {
    var id: String
    var title: String

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Countdown Event"
    static var defaultQuery = AheadEventQuery()

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: LocalizedStringResource(stringLiteral: title))
    }

    init(id: String, title: String) {
        self.id = id
        self.title = title
    }
}

struct AheadEventQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [AheadEventEntity] {
        OdakStorage.loadAheadEvents().filter { identifiers.contains($0.id) }.map { AheadEventEntity(id: $0.id, title: $0.title) }
    }

    func suggestedEntities() async throws -> [AheadEventEntity] {
        OdakStorage.loadAheadEvents().map { AheadEventEntity(id: $0.id, title: $0.title) }
    }

    func defaultResult() async -> AheadEventEntity? {
        guard let first = OdakStorage.loadAheadEvents().first else { return nil }
        return AheadEventEntity(id: first.id, title: first.title)
    }
}

struct SinceEventEntity: AppEntity {
    var id: String
    var title: String

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Milestone Event"
    static var defaultQuery = SinceEventQuery()

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: LocalizedStringResource(stringLiteral: title))
    }

    init(id: String, title: String) {
        self.id = id
        self.title = title
    }
}

struct SinceEventQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [SinceEventEntity] {
        OdakStorage.loadSinceEvents().filter { identifiers.contains($0.id) }.map { SinceEventEntity(id: $0.id, title: $0.title) }
    }

    func suggestedEntities() async throws -> [SinceEventEntity] {
        OdakStorage.loadSinceEvents().map { SinceEventEntity(id: $0.id, title: $0.title) }
    }

    func defaultResult() async -> SinceEventEntity? {
        guard let first = OdakStorage.loadSinceEvents().first else { return nil }
        return SinceEventEntity(id: first.id, title: first.title)
    }
}

// MARK: - Widget Intents

struct SelectAheadEventIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Select Countdown"
    static var description: IntentDescription = "Choose a countdown event to display"

    @Parameter(title: "Event")
    var event: AheadEventEntity?
}

struct SelectSinceEventIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Select Milestone"
    static var description: IntentDescription = "Choose a milestone event to display"

    @Parameter(title: "Event")
    var event: SinceEventEntity?
}

// MARK: - Timeline Entry

struct OdakEventEntry: TimelineEntry {
    let date: Date
    let event: OdakEventData?
    let daysCount: Int
    let isCountdown: Bool
    let backgroundImage: UIImage?

    var daysText: String {
        switch daysCount {
        case 0:
            return "Today"
        case 1:
            return isCountdown ? "In 1 day" : "1 day ago"
        default:
            return isCountdown ? "In \(daysCount) days" : "\(daysCount) days ago"
        }
    }

    var dateText: String {
        guard let event = event, let targetDate = event.targetDate else { return "" }
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy"
        return formatter.string(from: targetDate)
    }

    static func placeholder(isCountdown: Bool) -> OdakEventEntry {
        OdakEventEntry(
            date: Date(),
            event: OdakEventData(id: "placeholder", title: isCountdown ? "My Event" : "My Milestone", date: nil, startDate: nil, image: nil),
            daysCount: isCountdown ? 42 : 100,
            isCountdown: isCountdown,
            backgroundImage: nil
        )
    }
}

// MARK: - Timeline Providers

struct AheadEventProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> OdakEventEntry {
        .placeholder(isCountdown: true)
    }

    func snapshot(for configuration: SelectAheadEventIntent, in context: Context) async -> OdakEventEntry {
        // For gallery preview and initial widget display, show real data if available
        let events = OdakStorage.loadAheadEvents()
        let imageSize = OdakStorage.imageSizeForFamily(context.family)

        // If user selected an event, show that
        if let selectedEvent = configuration.event,
           let event = events.first(where: { $0.id == selectedEvent.id }) {
            return makeEntry(for: event, on: Date(), isCountdown: true, imageSize: imageSize)
        }

        // Otherwise show first available event (for gallery preview)
        if let firstEvent = events.first {
            return makeEntry(for: firstEvent, on: Date(), isCountdown: true, imageSize: imageSize)
        }

        // No events - show placeholder
        return .placeholder(isCountdown: true)
    }

    func timeline(for configuration: SelectAheadEventIntent, in context: Context) async -> Timeline<OdakEventEntry> {
        let now = Date()
        let imageSize = OdakStorage.imageSizeForFamily(context.family)
        let entries = (0..<24).compactMap { hour -> OdakEventEntry? in
            guard let date = Calendar.current.date(byAdding: .hour, value: hour, to: now) else { return nil }
            return getEntry(for: configuration, on: date, imageSize: imageSize)
        }
        return Timeline(entries: entries, policy: .atEnd)
    }

    private func getEntry(for config: SelectAheadEventIntent, on date: Date = Date(), imageSize: CGSize) -> OdakEventEntry {
        let events = OdakStorage.loadAheadEvents()
        let event = config.event.flatMap { selected in events.first { $0.id == selected.id } } ?? events.first
        return makeEntry(for: event, on: date, isCountdown: true, imageSize: imageSize)
    }

    private func makeEntry(for event: OdakEventData?, on date: Date, isCountdown: Bool, imageSize: CGSize) -> OdakEventEntry {
        guard let event = event else {
            return OdakEventEntry(date: date, event: nil, daysCount: 0, isCountdown: isCountdown, backgroundImage: nil)
        }
        let days = event.targetDate.map {
            Calendar.current.dateComponents([.day], from: Calendar.current.startOfDay(for: date), to: Calendar.current.startOfDay(for: $0)).day ?? 0
        } ?? 0
        return OdakEventEntry(
            date: date,
            event: event,
            daysCount: max(0, days),
            isCountdown: isCountdown,
            backgroundImage: OdakStorage.loadImage(for: event, maxSize: imageSize)
        )
    }
}

struct SinceEventProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> OdakEventEntry {
        .placeholder(isCountdown: false)
    }

    func snapshot(for configuration: SelectSinceEventIntent, in context: Context) async -> OdakEventEntry {
        // For gallery preview and initial widget display, show real data if available
        let events = OdakStorage.loadSinceEvents()
        let imageSize = OdakStorage.imageSizeForFamily(context.family)

        // If user selected an event, show that
        if let selectedEvent = configuration.event,
           let event = events.first(where: { $0.id == selectedEvent.id }) {
            return makeEntry(for: event, on: Date(), isCountdown: false, imageSize: imageSize)
        }

        // Otherwise show first available event (for gallery preview)
        if let firstEvent = events.first {
            return makeEntry(for: firstEvent, on: Date(), isCountdown: false, imageSize: imageSize)
        }

        // No events - show placeholder
        return .placeholder(isCountdown: false)
    }

    func timeline(for configuration: SelectSinceEventIntent, in context: Context) async -> Timeline<OdakEventEntry> {
        let now = Date()
        let imageSize = OdakStorage.imageSizeForFamily(context.family)
        let entries = (0..<24).compactMap { hour -> OdakEventEntry? in
            guard let date = Calendar.current.date(byAdding: .hour, value: hour, to: now) else { return nil }
            return getEntry(for: configuration, on: date, imageSize: imageSize)
        }
        return Timeline(entries: entries, policy: .atEnd)
    }

    private func getEntry(for config: SelectSinceEventIntent, on date: Date = Date(), imageSize: CGSize) -> OdakEventEntry {
        let events = OdakStorage.loadSinceEvents()
        let event = config.event.flatMap { selected in events.first { $0.id == selected.id } } ?? events.first
        return makeEntry(for: event, on: date, isCountdown: false, imageSize: imageSize)
    }

    private func makeEntry(for event: OdakEventData?, on date: Date, isCountdown: Bool, imageSize: CGSize) -> OdakEventEntry {
        guard let event = event else {
            return OdakEventEntry(date: date, event: nil, daysCount: 0, isCountdown: isCountdown, backgroundImage: nil)
        }
        let days = event.targetDate.map {
            Calendar.current.dateComponents([.day], from: Calendar.current.startOfDay(for: $0), to: Calendar.current.startOfDay(for: date)).day ?? 0
        } ?? 0
        return OdakEventEntry(
            date: date,
            event: event,
            daysCount: max(0, days),
            isCountdown: isCountdown,
            backgroundImage: OdakStorage.loadImage(for: event, maxSize: imageSize)
        )
    }
}

// MARK: - Widget View

struct OdakWidgetView: View {
    let entry: OdakEventEntry
    @Environment(\.widgetFamily) var family
    @Environment(\.colorScheme) var colorScheme

    private var hasImage: Bool { entry.backgroundImage != nil }

    private var sizes: (days: CGFloat, label: CGFloat, date: Font, title: Font, branding: CGFloat) {
        switch family {
        case .systemSmall:
            return (28, 10, .system(size: 10, weight: .medium), .system(size: 13, weight: .bold), 7)
        case .systemLarge:
            return (48, 14, .system(size: 14, weight: .medium), .title2, 10)
        default:
            return (34, 12, .system(size: 12, weight: .medium), .system(size: 16, weight: .bold), 8)
        }
    }

    var body: some View {
        GeometryReader { geometry in
            VStack(alignment: .leading, spacing: family == .systemLarge ? 4 : 2) {
                if let event = entry.event {
                    // Top: Days count + Date
                    VStack(alignment: .leading, spacing: 0) {
                        Text(entry.daysText)
                            .font(.system(size: sizes.days, weight: .bold, design: .rounded))
                            .minimumScaleFactor(0.7)
                            .lineLimit(1)
                            .foregroundStyle(hasImage ? .white : (colorScheme == .dark ? .white : .primary))
                            .shadow(color: hasImage ? .black.opacity(0.5) : .clear, radius: 2, x: 0, y: 1)
                            .unredacted() // CRITICAL: Prevents automatic redaction with IntentConfiguration

                        Text(entry.dateText)
                            .font(sizes.date)
                            .foregroundStyle(hasImage ? .white.opacity(0.85) : .secondary)
                            .shadow(color: hasImage ? .black.opacity(0.5) : .clear, radius: 2, x: 0, y: 1)
                            .unredacted()
                    }

                    Spacer()

                    // Bottom: Title + Branding
                    HStack(alignment: .bottom, spacing: 4) {
                        Text(event.title)
                            .font(sizes.title)
                            .lineLimit(family == .systemSmall ? 1 : 2)
                            .foregroundStyle(hasImage ? .white : (colorScheme == .dark ? .white : .primary))
                            .shadow(color: hasImage ? .black.opacity(0.5) : .clear, radius: 2, x: 0, y: 1)
                            .unredacted()

                        Spacer(minLength: 0)

                        if family != .systemSmall {
                            Text("odak.omc345.com")
                                .font(.system(size: sizes.branding, weight: .medium))
                                .foregroundStyle(hasImage ? .white.opacity(0.5) : .secondary.opacity(0.5))
                                .shadow(color: hasImage ? .black.opacity(0.3) : .clear, radius: 1, x: 0, y: 1)
                                .unredacted()
                        }
                    }
                } else {
                    emptyState
                }
            }
            .padding(family == .systemSmall ? 12 : 16)
        }
        .containerBackground(for: .widget) { background }
    }

    @ViewBuilder
    private var emptyState: some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: "plus.circle.fill")
                .font(.system(size: family == .systemSmall ? 24 : 32))
                .foregroundStyle(Color.orange)
                .unredacted()

            VStack(alignment: .leading, spacing: 2) {
                Text("Add Your")
                    .font(.system(size: family == .systemSmall ? 12 : 14, weight: .semibold))
                    .foregroundStyle(.primary)
                    .unredacted()
                Text("First Event")
                    .font(.system(size: family == .systemSmall ? 12 : 14, weight: .semibold))
                    .foregroundStyle(.primary)
                    .unredacted()
            }

            Spacer()

            Text("Tap to open Odak")
                .font(.system(size: family == .systemSmall ? 9 : 10, weight: .medium))
                .foregroundStyle(.secondary)
                .unredacted()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    @ViewBuilder
    private var background: some View {
        if let bgImage = entry.backgroundImage {
            GeometryReader { geometry in
                ZStack {
                    Image(uiImage: bgImage)
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(width: geometry.size.width, height: geometry.size.height)
                        .clipped()
                    Color.black.opacity(0.35)
                }
            }
        } else if entry.event == nil {
            // Orange background for empty state
            Color.orange
        } else {
            colorScheme == .dark ? Color.black : Color.white
        }
    }
}

// MARK: - Widgets

struct OdakAheadWidget: Widget {
    let kind = "OdakAheadWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: SelectAheadEventIntent.self, provider: AheadEventProvider()) { entry in
            OdakWidgetView(entry: entry)
                .widgetURL(URL(string: entry.event.map { "odak://dates/event/\($0.id)" } ?? "odak://dates"))
        }
        .configurationDisplayName("Countdown")
        .description("Track days until your event")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
}

struct OdakSinceWidget: Widget {
    let kind = "OdakSinceWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: SelectSinceEventIntent.self, provider: SinceEventProvider()) { entry in
            OdakWidgetView(entry: entry)
                .widgetURL(URL(string: entry.event.map { "odak://dates/event/\($0.id)" } ?? "odak://dates"))
        }
        .configurationDisplayName("Milestone")
        .description("Track days since your event")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
}
