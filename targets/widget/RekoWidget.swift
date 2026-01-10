import WidgetKit
import SwiftUI
import AppIntents

// MARK: - Data Models

struct RekoEventData: Codable, Identifiable, Hashable {
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

struct RekoStorage {
    static let appGroupId = "group.com.omc345.rekoll"

    static func loadAheadEvents() -> [RekoEventData] {
        guard let userDefaults = UserDefaults(suiteName: appGroupId),
              let jsonString = userDefaults.string(forKey: "ahead_events"),
              let data = jsonString.data(using: .utf8) else { return [] }
        return (try? JSONDecoder().decode([RekoEventData].self, from: data)) ?? []
    }

    static func loadSinceEvents() -> [RekoEventData] {
        guard let userDefaults = UserDefaults(suiteName: appGroupId),
              let jsonString = userDefaults.string(forKey: "since_events"),
              let data = jsonString.data(using: .utf8) else { return [] }
        return (try? JSONDecoder().decode([RekoEventData].self, from: data)) ?? []
    }

    /// Load image from the App Group shared container
    static func loadImage(for event: RekoEventData) -> UIImage? {
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
        let events = RekoStorage.loadAheadEvents()
        return events.filter { identifiers.contains($0.id) }.map { AheadEventEntity(id: $0.id, title: $0.title) }
    }

    func suggestedEntities() async throws -> [AheadEventEntity] {
        return RekoStorage.loadAheadEvents().map { AheadEventEntity(id: $0.id, title: $0.title) }
    }

    func defaultResult() async -> AheadEventEntity? {
        guard let first = RekoStorage.loadAheadEvents().first else { return nil }
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
        let events = RekoStorage.loadSinceEvents()
        return events.filter { identifiers.contains($0.id) }.map { SinceEventEntity(id: $0.id, title: $0.title) }
    }

    func suggestedEntities() async throws -> [SinceEventEntity] {
        return RekoStorage.loadSinceEvents().map { SinceEventEntity(id: $0.id, title: $0.title) }
    }

    func defaultResult() async -> SinceEventEntity? {
        guard let first = RekoStorage.loadSinceEvents().first else { return nil }
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

struct RekoEventEntry: TimelineEntry {
    let date: Date
    let event: RekoEventData?
    let daysCount: Int
    let isCountdown: Bool
    let backgroundImage: UIImage?

    static func placeholder(isCountdown: Bool) -> RekoEventEntry {
        RekoEventEntry(date: Date(), event: RekoEventData(id: "placeholder", title: "Event", date: "", startDate: nil, image: nil), daysCount: 42, isCountdown: isCountdown, backgroundImage: nil)
    }
}

// MARK: - Ahead Timeline Provider

struct AheadEventProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> RekoEventEntry { .placeholder(isCountdown: true) }

    func snapshot(for configuration: SelectAheadEventIntent, in context: Context) async -> RekoEventEntry {
        return getEntry(for: configuration)
    }

    func timeline(for configuration: SelectAheadEventIntent, in context: Context) async -> Timeline<RekoEventEntry> {
        var entries: [RekoEventEntry] = []
        let now = Date()
        for hour in 0..<24 {
            if let date = Calendar.current.date(byAdding: .hour, value: hour, to: now) {
                entries.append(getEntry(for: configuration, on: date))
            }
        }
        return Timeline(entries: entries, policy: .atEnd)
    }

    private func getEntry(for config: SelectAheadEventIntent, on date: Date = Date()) -> RekoEventEntry {
        let events = RekoStorage.loadAheadEvents()
        let event: RekoEventData? = config.event.flatMap { entity in events.first { $0.id == entity.id } } ?? events.first

        guard let event = event else {
            return RekoEventEntry(date: date, event: nil, daysCount: 0, isCountdown: true, backgroundImage: nil)
        }

        // Calculate days - use 0 if date parsing fails
        var days = 0
        if let targetDate = event.targetDate {
            days = Calendar.current.dateComponents([.day], from: Calendar.current.startOfDay(for: date), to: Calendar.current.startOfDay(for: targetDate)).day ?? 0
        }

        let backgroundImage = RekoStorage.loadImage(for: event)
        return RekoEventEntry(date: date, event: event, daysCount: max(0, days), isCountdown: true, backgroundImage: backgroundImage)
    }
}

// MARK: - Since Timeline Provider

struct SinceEventProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> RekoEventEntry { .placeholder(isCountdown: false) }

    func snapshot(for configuration: SelectSinceEventIntent, in context: Context) async -> RekoEventEntry {
        return getEntry(for: configuration)
    }

    func timeline(for configuration: SelectSinceEventIntent, in context: Context) async -> Timeline<RekoEventEntry> {
        var entries: [RekoEventEntry] = []
        let now = Date()
        for hour in 0..<24 {
            if let date = Calendar.current.date(byAdding: .hour, value: hour, to: now) {
                entries.append(getEntry(for: configuration, on: date))
            }
        }
        return Timeline(entries: entries, policy: .atEnd)
    }

    private func getEntry(for config: SelectSinceEventIntent, on date: Date = Date()) -> RekoEventEntry {
        let events = RekoStorage.loadSinceEvents()
        let event: RekoEventData? = config.event.flatMap { entity in events.first { $0.id == entity.id } } ?? events.first

        guard let event = event else {
            return RekoEventEntry(date: date, event: nil, daysCount: 0, isCountdown: false, backgroundImage: nil)
        }

        // Calculate days - use 0 if date parsing fails
        var days = 0
        if let targetDate = event.targetDate {
            days = Calendar.current.dateComponents([.day], from: Calendar.current.startOfDay(for: targetDate), to: Calendar.current.startOfDay(for: date)).day ?? 0
        }

        let backgroundImage = RekoStorage.loadImage(for: event)
        return RekoEventEntry(date: date, event: event, daysCount: max(0, days), isCountdown: false, backgroundImage: backgroundImage)
    }
}

// MARK: - Widget Views

struct WidgetSmallView: View {
    let entry: RekoEventEntry
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
    let entry: RekoEventEntry
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
    let entry: RekoEventEntry
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
                    Text("Add an event in Rekoll")
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

struct RekollWidgetEntryView: View {
    var entry: RekoEventEntry
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

struct RekoAheadWidget: Widget {
    let kind = "RekoAheadWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: SelectAheadEventIntent.self, provider: AheadEventProvider()) { entry in
            RekollWidgetEntryView(entry: entry)
                .widgetURL(entry.event != nil ? URL(string: "reko://event/\(entry.event!.id)") : URL(string: "reko://"))
        }
        .configurationDisplayName("Countdown")
        .description("Track days until your event")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

// MARK: - Since Widget

struct RekoSinceWidget: Widget {
    let kind = "RekoSinceWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: SelectSinceEventIntent.self, provider: SinceEventProvider()) { entry in
            RekollWidgetEntryView(entry: entry)
                .widgetURL(entry.event != nil ? URL(string: "reko://event/\(entry.event!.id)") : URL(string: "reko://"))
        }
        .configurationDisplayName("Milestone")
        .description("Track days since your event")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

// MARK: - Year/Month Timeline Entry

struct ProgressEntry: TimelineEntry {
    let date: Date
    let daysPassed: Int
    let daysTotal: Int
    let daysLeft: Int
    let label: String // "2026" for year, "January" for month

    var progress: Double {
        guard daysTotal > 0 else { return 0 }
        return Double(daysPassed) / Double(daysTotal)
    }
}

// MARK: - Year Timeline Provider

struct YearProvider: TimelineProvider {
    func placeholder(in context: Context) -> ProgressEntry {
        ProgressEntry(date: Date(), daysPassed: 180, daysTotal: 365, daysLeft: 185, label: "2026")
    }

    func getSnapshot(in context: Context, completion: @escaping (ProgressEntry) -> Void) {
        completion(getEntry(for: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ProgressEntry>) -> Void) {
        var entries: [ProgressEntry] = []
        let now = Date()

        // Update at midnight each day
        for day in 0..<7 {
            if let date = Calendar.current.date(byAdding: .day, value: day, to: now) {
                entries.append(getEntry(for: date))
            }
        }

        // Refresh at midnight
        let tomorrow = Calendar.current.startOfDay(for: Calendar.current.date(byAdding: .day, value: 1, to: now)!)
        completion(Timeline(entries: entries, policy: .after(tomorrow)))
    }

    private func getEntry(for date: Date) -> ProgressEntry {
        let calendar = Calendar.current
        let year = calendar.component(.year, from: date)

        // Get start and end of year
        let startOfYear = calendar.date(from: DateComponents(year: year, month: 1, day: 1))!
        let endOfYear = calendar.date(from: DateComponents(year: year + 1, month: 1, day: 1))!

        let daysTotal = calendar.dateComponents([.day], from: startOfYear, to: endOfYear).day ?? 365
        let daysPassed = calendar.dateComponents([.day], from: startOfYear, to: date).day ?? 0
        let daysLeft = max(0, daysTotal - daysPassed)

        return ProgressEntry(
            date: date,
            daysPassed: daysPassed,
            daysTotal: daysTotal,
            daysLeft: daysLeft,
            label: "\(year)"
        )
    }
}

// MARK: - Month Timeline Provider

struct MonthProvider: TimelineProvider {
    func placeholder(in context: Context) -> ProgressEntry {
        ProgressEntry(date: Date(), daysPassed: 15, daysTotal: 31, daysLeft: 16, label: "January")
    }

    func getSnapshot(in context: Context, completion: @escaping (ProgressEntry) -> Void) {
        completion(getEntry(for: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ProgressEntry>) -> Void) {
        var entries: [ProgressEntry] = []
        let now = Date()

        for day in 0..<7 {
            if let date = Calendar.current.date(byAdding: .day, value: day, to: now) {
                entries.append(getEntry(for: date))
            }
        }

        let tomorrow = Calendar.current.startOfDay(for: Calendar.current.date(byAdding: .day, value: 1, to: now)!)
        completion(Timeline(entries: entries, policy: .after(tomorrow)))
    }

    private func getEntry(for date: Date) -> ProgressEntry {
        let calendar = Calendar.current

        // Get month name
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM"
        let monthName = formatter.string(from: date)

        // Get days in month
        let range = calendar.range(of: .day, in: .month, for: date)!
        let daysTotal = range.count
        let daysPassed = calendar.component(.day, from: date)
        let daysLeft = max(0, daysTotal - daysPassed)

        return ProgressEntry(
            date: date,
            daysPassed: daysPassed,
            daysTotal: daysTotal,
            daysLeft: daysLeft,
            label: monthName
        )
    }
}

// MARK: - Dot Grid View

struct DotGridView: View {
    let daysPassed: Int
    let daysTotal: Int
    let columns: Int
    let dotSize: CGFloat
    let spacing: CGFloat

    var rows: Int {
        Int(ceil(Double(daysTotal) / Double(columns)))
    }

    var body: some View {
        VStack(spacing: spacing) {
            ForEach(0..<rows, id: \.self) { row in
                HStack(spacing: spacing) {
                    ForEach(0..<columns, id: \.self) { col in
                        let dayIndex = row * columns + col
                        if dayIndex < daysTotal {
                            Circle()
                                .fill(dayIndex < daysPassed ? Color.white : Color.white.opacity(0.25))
                                .frame(width: dotSize, height: dotSize)
                        } else {
                            Circle()
                                .fill(Color.clear)
                                .frame(width: dotSize, height: dotSize)
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Year Widget Views

struct YearSmallView: View {
    let entry: ProgressEntry

    var body: some View {
        VStack(spacing: 6) {
            // Dot grid - 19 columns for 365 days, smaller dots to fit
            DotGridView(daysPassed: entry.daysPassed, daysTotal: entry.daysTotal, columns: 19, dotSize: 3.5, spacing: 1.5)

            VStack(spacing: 2) {
                Text(entry.label)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundStyle(.white.opacity(0.7))

                Text("\(entry.daysLeft) days left")
                    .font(.caption2)
                    .foregroundStyle(.white.opacity(0.5))
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .containerBackground(Color.black, for: .widget)
    }
}

struct YearMediumView: View {
    let entry: ProgressEntry

    var body: some View {
        VStack(spacing: 8) {
            // Wider dot grid for medium - 37 columns
            DotGridView(daysPassed: entry.daysPassed, daysTotal: entry.daysTotal, columns: 37, dotSize: 6, spacing: 2)

            HStack {
                Text(entry.label)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(.white.opacity(0.7))

                Spacer()

                Text("\(entry.daysLeft) days left")
                    .font(.subheadline)
                    .foregroundStyle(.white.opacity(0.5))
            }
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .containerBackground(Color.black, for: .widget)
    }
}

struct YearLargeView: View {
    let entry: ProgressEntry

    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Text("YEAR PROGRESS")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundStyle(.white.opacity(0.5))

                Spacer()

                Text("\(Int(entry.progress * 100))%")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundStyle(.white.opacity(0.7))
            }

            Spacer()

            // Large dot grid - 26 columns for better visibility
            DotGridView(daysPassed: entry.daysPassed, daysTotal: entry.daysTotal, columns: 26, dotSize: 8, spacing: 3)

            Spacer()

            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(entry.label)
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundStyle(.white)

                    Text("\(entry.daysPassed) days passed")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.5))
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 2) {
                    Text("\(entry.daysLeft)")
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundStyle(.white)

                    Text("days left")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.5))
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .containerBackground(Color.black, for: .widget)
    }
}

// MARK: - Month Widget Views

struct MonthSmallView: View {
    let entry: ProgressEntry

    var body: some View {
        VStack(spacing: 6) {
            // 6x6 grid for month (max 31 days)
            DotGridView(daysPassed: entry.daysPassed, daysTotal: entry.daysTotal, columns: 6, dotSize: 8, spacing: 4)

            VStack(spacing: 2) {
                Text(entry.label)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundStyle(.white.opacity(0.7))

                Text("\(entry.daysLeft) days left")
                    .font(.caption2)
                    .foregroundStyle(.white.opacity(0.5))
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .containerBackground(Color.black, for: .widget)
    }
}

struct MonthMediumView: View {
    let entry: ProgressEntry

    var body: some View {
        HStack(spacing: 16) {
            // 6x6 grid on left
            DotGridView(daysPassed: entry.daysPassed, daysTotal: entry.daysTotal, columns: 6, dotSize: 10, spacing: 5)

            VStack(alignment: .leading, spacing: 4) {
                Text(entry.label)
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundStyle(.white)

                Spacer()

                Text("\(entry.daysLeft)")
                    .font(.system(size: 40, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)

                Text("days left")
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.5))
            }

            Spacer()
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .containerBackground(Color.black, for: .widget)
    }
}

struct MonthLargeView: View {
    let entry: ProgressEntry

    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Text("MONTH PROGRESS")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundStyle(.white.opacity(0.5))

                Spacer()

                Text("\(Int(entry.progress * 100))%")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundStyle(.white.opacity(0.7))
            }

            Spacer()

            // Larger grid for big widget - 7 columns (like a week)
            DotGridView(daysPassed: entry.daysPassed, daysTotal: entry.daysTotal, columns: 7, dotSize: 16, spacing: 8)

            Spacer()

            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(entry.label)
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundStyle(.white)

                    Text("\(entry.daysPassed) days passed")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.5))
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 2) {
                    Text("\(entry.daysLeft)")
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundStyle(.white)

                    Text("days left")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.5))
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .containerBackground(Color.black, for: .widget)
    }
}

// MARK: - Year Widget Entry View

struct YearWidgetEntryView: View {
    var entry: ProgressEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall: YearSmallView(entry: entry)
        case .systemMedium: YearMediumView(entry: entry)
        case .systemLarge: YearLargeView(entry: entry)
        default: YearSmallView(entry: entry)
        }
    }
}

// MARK: - Month Widget Entry View

struct MonthWidgetEntryView: View {
    var entry: ProgressEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall: MonthSmallView(entry: entry)
        case .systemMedium: MonthMediumView(entry: entry)
        case .systemLarge: MonthLargeView(entry: entry)
        default: MonthSmallView(entry: entry)
        }
    }
}

// MARK: - Year Widget

struct RekoYearWidget: Widget {
    let kind = "RekoYearWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: YearProvider()) { entry in
            YearWidgetEntryView(entry: entry)
                .widgetURL(URL(string: "reko://year"))
        }
        .configurationDisplayName("Year")
        .description("Shows how many days are left in the current year.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

// MARK: - Month Widget

struct RekoMonthWidget: Widget {
    let kind = "RekoMonthWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: MonthProvider()) { entry in
            MonthWidgetEntryView(entry: entry)
                .widgetURL(URL(string: "reko://month"))
        }
        .configurationDisplayName("Month")
        .description("Shows how many days are left in the current month.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

// MARK: - Widget Bundle

@main
struct RekollWidgetBundle: WidgetBundle {
    var body: some Widget {
        RekoAheadWidget()
        RekoSinceWidget()
        RekoYearWidget()
        RekoMonthWidget()
    }
}
