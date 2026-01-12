import WidgetKit
import SwiftUI
import AppIntents

// MARK: - Data Models

struct OdakEventData: Codable, Identifiable, Hashable {
    let id: String
    let title: String
    let date: String?      // Used by AheadEvent
    let startDate: String? // Used by SinceEvent
    let image: String?

    var targetDate: Date? {
        // Try startDate first (SinceEvent), then date (AheadEvent)
        guard let dateStr = startDate ?? date, !dateStr.isEmpty else {
            return nil
        }

        // Try multiple ISO8601 format options for robust parsing
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

        // Fallback: try DateFormatter with common formats
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

    /// Load image from the App Group shared container
    static func loadImage(for event: OdakEventData) -> UIImage? {
        guard let imagePath = event.image, !imagePath.isEmpty else { return nil }

        // Get the App Group container URL
        guard let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupId) else {
            return nil
        }

        // The image path could be:
        // 1. Just a filename (relative) - look in /images/ folder
        // 2. A full file:// URL - extract filename and look in /images/ folder
        let filename: String
        if imagePath.contains("/") {
            // Extract just the filename from the path
            filename = (imagePath as NSString).lastPathComponent
        } else {
            filename = imagePath
        }

        let imageURL = containerURL.appendingPathComponent("images").appendingPathComponent(filename)

        guard FileManager.default.fileExists(atPath: imageURL.path),
              let imageData = try? Data(contentsOf: imageURL),
              let image = UIImage(data: imageData) else {
            return nil
        }

        return image
    }
}

// MARK: - App Entity for Ahead Events

struct AheadEventEntity: AppEntity {
    var id: String
    var title: String

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Countdown Event"
    static var defaultQuery = AheadEventQuery()

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(title)")
    }

    init(id: String, title: String) {
        self.id = id
        self.title = title
    }
}

struct AheadEventQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [AheadEventEntity] {
        let events = OdakStorage.loadAheadEvents()
        return events.filter { identifiers.contains($0.id) }.map { AheadEventEntity(id: $0.id, title: $0.title) }
    }

    func suggestedEntities() async throws -> [AheadEventEntity] {
        return OdakStorage.loadAheadEvents().map { AheadEventEntity(id: $0.id, title: $0.title) }
    }

    func defaultResult() async -> AheadEventEntity? {
        guard let first = OdakStorage.loadAheadEvents().first else { return nil }
        return AheadEventEntity(id: first.id, title: first.title)
    }
}

// MARK: - App Entity for Since Events

struct SinceEventEntity: AppEntity {
    var id: String
    var title: String

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Milestone Event"
    static var defaultQuery = SinceEventQuery()

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(title)")
    }

    init(id: String, title: String) {
        self.id = id
        self.title = title
    }
}

struct SinceEventQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [SinceEventEntity] {
        let events = OdakStorage.loadSinceEvents()
        return events.filter { identifiers.contains($0.id) }.map { SinceEventEntity(id: $0.id, title: $0.title) }
    }

    func suggestedEntities() async throws -> [SinceEventEntity] {
        return OdakStorage.loadSinceEvents().map { SinceEventEntity(id: $0.id, title: $0.title) }
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

    static func placeholder(isCountdown: Bool) -> OdakEventEntry {
        let title = isCountdown ? "My Event" : "Milestone"
        let daysValue = isCountdown ? 42 : 100
        return OdakEventEntry(
            date: Date(),
            event: OdakEventData(id: "placeholder", title: title, date: "2026-03-01", startDate: "2025-01-01", image: nil),
            daysCount: daysValue,
            isCountdown: isCountdown,
            backgroundImage: nil
        )
    }
}

// MARK: - Ahead Timeline Provider

struct AheadEventProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> OdakEventEntry { .placeholder(isCountdown: true) }

    func snapshot(for configuration: SelectAheadEventIntent, in context: Context) async -> OdakEventEntry {
        return getEntry(for: configuration)
    }

    func timeline(for configuration: SelectAheadEventIntent, in context: Context) async -> Timeline<OdakEventEntry> {
        var entries: [OdakEventEntry] = []
        let now = Date()
        for hour in 0..<24 {
            if let date = Calendar.current.date(byAdding: .hour, value: hour, to: now) {
                entries.append(getEntry(for: configuration, on: date))
            }
        }
        return Timeline(entries: entries, policy: .atEnd)
    }

    private func getEntry(for config: SelectAheadEventIntent, on date: Date = Date()) -> OdakEventEntry {
        let events = OdakStorage.loadAheadEvents()

        // First try to find the configured event
        if let selectedEntity = config.event,
           let matchedEvent = events.first(where: { $0.id == selectedEntity.id }) {
            return makeEntry(for: matchedEvent, on: date)
        }

        // Fallback to first event if available
        if let firstEvent = events.first {
            return makeEntry(for: firstEvent, on: date)
        }

        return OdakEventEntry(date: date, event: nil, daysCount: 0, isCountdown: true, backgroundImage: nil)
    }

    private func makeEntry(for event: OdakEventData, on date: Date) -> OdakEventEntry {
        var days = 0
        if let targetDate = event.targetDate {
            days = Calendar.current.dateComponents([.day], from: Calendar.current.startOfDay(for: date), to: Calendar.current.startOfDay(for: targetDate)).day ?? 0
        }
        let backgroundImage = OdakStorage.loadImage(for: event)
        return OdakEventEntry(date: date, event: event, daysCount: max(0, days), isCountdown: true, backgroundImage: backgroundImage)
    }
}

// MARK: - Since Timeline Provider

struct SinceEventProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> OdakEventEntry { .placeholder(isCountdown: false) }

    func snapshot(for configuration: SelectSinceEventIntent, in context: Context) async -> OdakEventEntry {
        return getEntry(for: configuration)
    }

    func timeline(for configuration: SelectSinceEventIntent, in context: Context) async -> Timeline<OdakEventEntry> {
        var entries: [OdakEventEntry] = []
        let now = Date()
        for hour in 0..<24 {
            if let date = Calendar.current.date(byAdding: .hour, value: hour, to: now) {
                entries.append(getEntry(for: configuration, on: date))
            }
        }
        return Timeline(entries: entries, policy: .atEnd)
    }

    private func getEntry(for config: SelectSinceEventIntent, on date: Date = Date()) -> OdakEventEntry {
        let events = OdakStorage.loadSinceEvents()

        // First try to find the configured event
        if let selectedEntity = config.event,
           let matchedEvent = events.first(where: { $0.id == selectedEntity.id }) {
            return makeEntry(for: matchedEvent, on: date)
        }

        // Fallback to first event if available
        if let firstEvent = events.first {
            return makeEntry(for: firstEvent, on: date)
        }

        return OdakEventEntry(date: date, event: nil, daysCount: 0, isCountdown: false, backgroundImage: nil)
    }

    private func makeEntry(for event: OdakEventData, on date: Date) -> OdakEventEntry {
        var days = 0
        if let targetDate = event.targetDate {
            days = Calendar.current.dateComponents([.day], from: Calendar.current.startOfDay(for: targetDate), to: Calendar.current.startOfDay(for: date)).day ?? 0
        }
        let backgroundImage = OdakStorage.loadImage(for: event)
        return OdakEventEntry(date: date, event: event, daysCount: max(0, days), isCountdown: false, backgroundImage: backgroundImage)
    }
}

// MARK: - Widget Views

struct WidgetSmallView: View {
    let entry: OdakEventEntry
    @Environment(\.colorScheme) var colorScheme

    var accentColor: Color {
        entry.isCountdown ? .orange : .blue
    }

    var hasImage: Bool {
        entry.backgroundImage != nil
    }

    var body: some View {
        VStack(spacing: 4) {
            if let event = entry.event {
                Text(event.title)
                    .font(.caption)
                    .fontWeight(.medium)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(hasImage ? .white : (colorScheme == .dark ? .white : .primary))
                    .shadow(color: hasImage ? .black.opacity(0.5) : .clear, radius: 2, x: 0, y: 1)

                Text("\(entry.daysCount)")
                    .font(.system(size: 44, weight: .bold, design: .rounded))
                    .foregroundStyle(hasImage ? .white : accentColor)
                    .shadow(color: hasImage ? .black.opacity(0.5) : .clear, radius: 2, x: 0, y: 1)

                Text(entry.isCountdown ? "days left" : "days ago")
                    .font(.caption2)
                    .foregroundStyle(hasImage ? .white.opacity(0.8) : .secondary)
                    .shadow(color: hasImage ? .black.opacity(0.5) : .clear, radius: 2, x: 0, y: 1)
            } else {
                Image(systemName: "calendar.badge.plus")
                    .font(.largeTitle)
                    .foregroundStyle(.secondary)
                Text("Add event")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .containerBackground(for: .widget) {
            if let bgImage = entry.backgroundImage {
                ZStack {
                    Image(uiImage: bgImage)
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                    Color.black.opacity(0.4)
                }
            } else {
                colorScheme == .dark ? Color.black : Color.white
            }
        }
    }
}

struct WidgetMediumView: View {
    let entry: OdakEventEntry
    @Environment(\.colorScheme) var colorScheme

    var accentColor: Color {
        entry.isCountdown ? .orange : .blue
    }

    var hasImage: Bool {
        entry.backgroundImage != nil
    }

    var body: some View {
        HStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                Text(entry.isCountdown ? "COUNTDOWN" : "SINCE")
                    .font(.caption2)
                    .fontWeight(.bold)
                    .foregroundStyle(hasImage ? .white.opacity(0.8) : accentColor)
                    .shadow(color: hasImage ? .black.opacity(0.5) : .clear, radius: 2, x: 0, y: 1)

                if let event = entry.event {
                    Text(event.title)
                        .font(.headline)
                        .foregroundStyle(hasImage ? .white : (colorScheme == .dark ? .white : .primary))
                        .lineLimit(2)
                        .shadow(color: hasImage ? .black.opacity(0.5) : .clear, radius: 2, x: 0, y: 1)

                    Spacer()

                    if let targetDate = event.targetDate {
                        Text(targetDate, style: .date)
                            .font(.caption)
                            .foregroundStyle(hasImage ? .white.opacity(0.8) : .secondary)
                            .shadow(color: hasImage ? .black.opacity(0.5) : .clear, radius: 2, x: 0, y: 1)
                    }
                } else {
                    Text("No event")
                        .font(.headline)
                        .foregroundStyle(.secondary)
                    Spacer()
                }
            }

            Spacer()

            VStack {
                Text("\(entry.daysCount)")
                    .font(.system(size: 48, weight: .bold, design: .rounded))
                    .foregroundStyle(hasImage ? .white : accentColor)
                    .shadow(color: hasImage ? .black.opacity(0.5) : .clear, radius: 2, x: 0, y: 1)

                Text("days")
                    .font(.caption)
                    .foregroundStyle(hasImage ? .white.opacity(0.8) : .secondary)
                    .shadow(color: hasImage ? .black.opacity(0.5) : .clear, radius: 2, x: 0, y: 1)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .containerBackground(for: .widget) {
            if let bgImage = entry.backgroundImage {
                ZStack {
                    Image(uiImage: bgImage)
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                    Color.black.opacity(0.4)
                }
            } else {
                colorScheme == .dark ? Color.black : Color.white
            }
        }
    }
}

struct WidgetLargeView: View {
    let entry: OdakEventEntry
    @Environment(\.colorScheme) var colorScheme

    var accentColor: Color {
        entry.isCountdown ? .orange : .blue
    }

    var hasImage: Bool {
        entry.backgroundImage != nil
    }

    var progressValue: CGFloat {
        let maxDays: CGFloat = 365
        let progress = CGFloat(entry.daysCount) / maxDays
        return entry.isCountdown ? (1.0 - min(1.0, progress)) : min(1.0, progress)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(entry.isCountdown ? "COUNTDOWN" : "SINCE")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundStyle(hasImage ? .white.opacity(0.8) : accentColor)
                    .shadow(color: hasImage ? .black.opacity(0.5) : .clear, radius: 2, x: 0, y: 1)

                Spacer()

                Image(systemName: entry.isCountdown ? "hourglass" : "clock.arrow.circlepath")
                    .foregroundStyle(hasImage ? .white.opacity(0.8) : accentColor)
                    .shadow(color: hasImage ? .black.opacity(0.5) : .clear, radius: 2, x: 0, y: 1)
            }

            if let event = entry.event {
                Text(event.title)
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundStyle(hasImage ? .white : (colorScheme == .dark ? .white : .primary))
                    .lineLimit(2)
                    .shadow(color: hasImage ? .black.opacity(0.5) : .clear, radius: 2, x: 0, y: 1)

                Spacer()

                HStack(alignment: .bottom) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("\(entry.daysCount)")
                            .font(.system(size: 64, weight: .bold, design: .rounded))
                            .foregroundStyle(hasImage ? .white : accentColor)
                            .shadow(color: hasImage ? .black.opacity(0.5) : .clear, radius: 2, x: 0, y: 1)

                        Text(entry.isCountdown ? "days remaining" : "days elapsed")
                            .font(.subheadline)
                            .foregroundStyle(hasImage ? .white.opacity(0.8) : .secondary)
                            .shadow(color: hasImage ? .black.opacity(0.5) : .clear, radius: 2, x: 0, y: 1)
                    }

                    Spacer()

                    if let targetDate = event.targetDate {
                        VStack(alignment: .trailing, spacing: 2) {
                            Text(entry.isCountdown ? "Target" : "Started")
                                .font(.caption2)
                                .foregroundStyle(hasImage ? .white.opacity(0.7) : .secondary)
                                .shadow(color: hasImage ? .black.opacity(0.5) : .clear, radius: 2, x: 0, y: 1)
                            Text(targetDate, style: .date)
                                .font(.caption)
                                .fontWeight(.medium)
                                .foregroundStyle(hasImage ? .white : (colorScheme == .dark ? .white : .primary))
                                .shadow(color: hasImage ? .black.opacity(0.5) : .clear, radius: 2, x: 0, y: 1)
                        }
                    }
                }

                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(hasImage ? Color.white.opacity(0.3) : (colorScheme == .dark ? Color.white.opacity(0.2) : Color.black.opacity(0.1)))
                            .frame(height: 8)

                        RoundedRectangle(cornerRadius: 4)
                            .fill(hasImage ? Color.white : accentColor)
                            .frame(width: max(8, geometry.size.width * progressValue), height: 8)
                    }
                }
                .frame(height: 8)
            } else {
                Spacer()
                VStack {
                    Image(systemName: "calendar.badge.plus")
                        .font(.system(size: 48))
                        .foregroundStyle(.secondary)
                    Text("Add an event in Odak")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity)
                Spacer()
            }
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .containerBackground(for: .widget) {
            if let bgImage = entry.backgroundImage {
                ZStack {
                    Image(uiImage: bgImage)
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                    Color.black.opacity(0.4)
                }
            } else {
                colorScheme == .dark ? Color.black : Color.white
            }
        }
    }
}

// MARK: - Entry View

struct OdakWidgetEntryView: View {
    var entry: OdakEventEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall: WidgetSmallView(entry: entry)
        case .systemMedium: WidgetMediumView(entry: entry)
        case .systemLarge: WidgetLargeView(entry: entry)
        default: WidgetSmallView(entry: entry)
        }
    }
}

// MARK: - Ahead Widget

struct OdakAheadWidget: Widget {
    let kind = "OdakAheadWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: SelectAheadEventIntent.self, provider: AheadEventProvider()) { entry in
            OdakWidgetEntryView(entry: entry)
                .widgetURL(entry.event != nil ? URL(string: "odak://countdown/\(entry.event!.id)") : URL(string: "odak://dates"))
        }
        .configurationDisplayName("Countdown")
        .description("Track days until your event")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

// MARK: - Since Widget

struct OdakSinceWidget: Widget {
    let kind = "OdakSinceWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: SelectSinceEventIntent.self, provider: SinceEventProvider()) { entry in
            OdakWidgetEntryView(entry: entry)
                .widgetURL(entry.event != nil ? URL(string: "odak://milestone/\(entry.event!.id)") : URL(string: "odak://dates"))
        }
        .configurationDisplayName("Milestone")
        .description("Track days since your event")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

// MARK: - Widget Bundle

@main
struct OdakWidgetBundle: WidgetBundle {
    var body: some Widget {
        OdakAheadWidget()
        OdakSinceWidget()
    }
}
