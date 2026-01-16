import WidgetKit
import SwiftUI
import AppIntents

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

    static func loadImage(for event: OdakEventData) -> UIImage? {
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
              let image = UIImage(data: imageData) else {
            return nil
        }

        return image
    }
}

// MARK: - App Entities

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
        DisplayRepresentation(title: "\(title)")
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
        isCountdown ? "In \(daysCount) days" : "\(daysCount) days ago"
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
            event: OdakEventData(id: "placeholder", title: isCountdown ? "My Event" : "Milestone", date: "2026-03-01", startDate: "2025-01-01", image: nil),
            daysCount: isCountdown ? 42 : 100,
            isCountdown: isCountdown,
            backgroundImage: nil
        )
    }
}

// MARK: - Timeline Providers

struct AheadEventProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> OdakEventEntry { .placeholder(isCountdown: true) }

    func snapshot(for configuration: SelectAheadEventIntent, in context: Context) async -> OdakEventEntry {
        getEntry(for: configuration)
    }

    func timeline(for configuration: SelectAheadEventIntent, in context: Context) async -> Timeline<OdakEventEntry> {
        let now = Date()
        let entries = (0..<24).compactMap { hour -> OdakEventEntry? in
            guard let date = Calendar.current.date(byAdding: .hour, value: hour, to: now) else { return nil }
            return getEntry(for: configuration, on: date)
        }
        return Timeline(entries: entries, policy: .atEnd)
    }

    private func getEntry(for config: SelectAheadEventIntent, on date: Date = Date()) -> OdakEventEntry {
        let events = OdakStorage.loadAheadEvents()
        let event = config.event.flatMap { selected in events.first { $0.id == selected.id } } ?? events.first
        return makeEntry(for: event, on: date, isCountdown: true)
    }

    private func makeEntry(for event: OdakEventData?, on date: Date, isCountdown: Bool) -> OdakEventEntry {
        guard let event = event else {
            return OdakEventEntry(date: date, event: nil, daysCount: 0, isCountdown: isCountdown, backgroundImage: nil)
        }
        let days = event.targetDate.map {
            Calendar.current.dateComponents([.day], from: Calendar.current.startOfDay(for: date), to: Calendar.current.startOfDay(for: $0)).day ?? 0
        } ?? 0
        return OdakEventEntry(date: date, event: event, daysCount: max(0, days), isCountdown: isCountdown, backgroundImage: OdakStorage.loadImage(for: event))
    }
}

struct SinceEventProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> OdakEventEntry { .placeholder(isCountdown: false) }

    func snapshot(for configuration: SelectSinceEventIntent, in context: Context) async -> OdakEventEntry {
        getEntry(for: configuration)
    }

    func timeline(for configuration: SelectSinceEventIntent, in context: Context) async -> Timeline<OdakEventEntry> {
        let now = Date()
        let entries = (0..<24).compactMap { hour -> OdakEventEntry? in
            guard let date = Calendar.current.date(byAdding: .hour, value: hour, to: now) else { return nil }
            return getEntry(for: configuration, on: date)
        }
        return Timeline(entries: entries, policy: .atEnd)
    }

    private func getEntry(for config: SelectSinceEventIntent, on date: Date = Date()) -> OdakEventEntry {
        let events = OdakStorage.loadSinceEvents()
        let event = config.event.flatMap { selected in events.first { $0.id == selected.id } } ?? events.first
        return makeEntry(for: event, on: date, isCountdown: false)
    }

    private func makeEntry(for event: OdakEventData?, on date: Date, isCountdown: Bool) -> OdakEventEntry {
        guard let event = event else {
            return OdakEventEntry(date: date, event: nil, daysCount: 0, isCountdown: isCountdown, backgroundImage: nil)
        }
        let days = event.targetDate.map {
            Calendar.current.dateComponents([.day], from: Calendar.current.startOfDay(for: $0), to: Calendar.current.startOfDay(for: date)).day ?? 0
        } ?? 0
        return OdakEventEntry(date: date, event: event, daysCount: max(0, days), isCountdown: isCountdown, backgroundImage: OdakStorage.loadImage(for: event))
    }
}

// MARK: - Widget View

struct OdakWidgetView: View {
    let entry: OdakEventEntry
    @Environment(\.widgetFamily) var family
    @Environment(\.colorScheme) var colorScheme

    private var hasImage: Bool { entry.backgroundImage != nil }
    
    private var sizes: (days: CGFloat, date: Font, title: Font, branding: CGFloat) {
        switch family {
        case .systemSmall: return (32, .system(size: 11, weight: .medium), .system(size: 14, weight: .bold), 8)
        case .systemLarge: return (56, .title3, .title, 10)
        default: return (42, .subheadline, .title3, 9)
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: family == .systemLarge ? 6 : family == .systemSmall ? 2 : 4) {
            if let event = entry.event {
                // Top: Days + Date
                VStack(alignment: .leading, spacing: family == .systemSmall ? 0 : 2) {
                    Text(entry.daysText)
                        .font(.system(size: sizes.days, weight: .bold, design: .rounded))
                        .foregroundStyle(hasImage ? .white : (colorScheme == .dark ? .white : .primary))
                        .shadow(color: hasImage ? .black.opacity(0.5) : .clear, radius: 2, x: 0, y: 1)
                    
                    Text(entry.dateText)
                        .font(sizes.date)
                        .fontWeight(.medium)
                        .foregroundStyle(hasImage ? .white.opacity(0.9) : .secondary)
                        .shadow(color: hasImage ? .black.opacity(0.5) : .clear, radius: 2, x: 0, y: 1)
                }

                Spacer()

                // Bottom: Title + Branding
                HStack(alignment: .bottom) {
                    Text(event.title)
                        .font(sizes.title)
                        .fontWeight(.bold)
                        .lineLimit(2)
                        .foregroundStyle(hasImage ? .white : (colorScheme == .dark ? .white : .primary))
                        .shadow(color: hasImage ? .black.opacity(0.5) : .clear, radius: 2, x: 0, y: 1)
                    
                    Spacer()
                    
                    Text("odak.omc345.com")
                        .font(.system(size: sizes.branding, weight: .medium))
                        .foregroundStyle(hasImage ? .white.opacity(0.5) : .secondary.opacity(0.5))
                        .shadow(color: hasImage ? .black.opacity(0.3) : .clear, radius: 1, x: 0, y: 1)
                }
            } else {
                emptyState
            }
        }
        .padding(family == .systemSmall ? 12 : 16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .containerBackground(for: .widget) { background }
    }
    
    @ViewBuilder
    private var emptyState: some View {
        if family == .systemLarge {
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
        } else {
            VStack(alignment: .leading) {
                Image(systemName: "calendar.badge.plus")
                    .font(.largeTitle)
                    .foregroundStyle(.secondary)
                Text("Add event")
                    .font(family == .systemSmall ? .caption : .subheadline)
                    .foregroundStyle(.secondary)
            }
            if family != .systemSmall { Spacer() }
        }
    }
    
    @ViewBuilder
    private var background: some View {
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

// MARK: - Widgets

struct OdakAheadWidget: Widget {
    let kind = "OdakAheadWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: SelectAheadEventIntent.self, provider: AheadEventProvider()) { entry in
            OdakWidgetView(entry: entry)
                .widgetURL(entry.event != nil ? URL(string: "odak://dates/event/\(entry.event!.id)") : URL(string: "odak://dates"))
        }
        .configurationDisplayName("Countdown")
        .description("Track days until your event")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

struct OdakSinceWidget: Widget {
    let kind = "OdakSinceWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: SelectSinceEventIntent.self, provider: SinceEventProvider()) { entry in
            OdakWidgetView(entry: entry)
                .widgetURL(entry.event != nil ? URL(string: "odak://dates/event/\(entry.event!.id)") : URL(string: "odak://dates"))
        }
        .configurationDisplayName("Milestone")
        .description("Track days since your event")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}