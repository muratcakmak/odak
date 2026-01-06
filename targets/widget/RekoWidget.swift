import WidgetKit
import SwiftUI

// MARK: - Data Models

struct RekoEventData: Codable, Identifiable {
    let id: String
    let title: String
    let date: String  // ISO string for ahead events
    let startDate: String?  // ISO string for since events
    let image: String?

    var targetDate: Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let dateStr = startDate ?? (date.isEmpty ? nil : date) {
            return formatter.date(from: dateStr) ?? ISO8601DateFormatter().date(from: dateStr)
        }
        return nil
    }
}

// MARK: - Timeline Entry

struct RekoEventEntry: TimelineEntry {
    let date: Date
    let event: RekoEventData?
    let daysCount: Int
    let isCountdown: Bool

    static var placeholder: RekoEventEntry {
        RekoEventEntry(
            date: Date(),
            event: RekoEventData(id: "placeholder", title: "My Event", date: "", startDate: nil, image: nil),
            daysCount: 42,
            isCountdown: true
        )
    }
}

// MARK: - Storage Helper

struct RekoStorage {
    static let appGroupId = "group.com.omc345.reko"

    static func loadAheadEvents() -> [RekoEventData] {
        guard let userDefaults = UserDefaults(suiteName: appGroupId) else {
            return []
        }

        guard let jsonString = userDefaults.string(forKey: "ahead_events"),
              let data = jsonString.data(using: .utf8) else {
            return []
        }

        do {
            return try JSONDecoder().decode([RekoEventData].self, from: data)
        } catch {
            print("Failed to decode ahead events: \(error)")
            return []
        }
    }

    static func loadSinceEvents() -> [RekoEventData] {
        guard let userDefaults = UserDefaults(suiteName: appGroupId) else {
            return []
        }

        guard let jsonString = userDefaults.string(forKey: "since_events"),
              let data = jsonString.data(using: .utf8) else {
            return []
        }

        do {
            return try JSONDecoder().decode([RekoEventData].self, from: data)
        } catch {
            print("Failed to decode since events: \(error)")
            return []
        }
    }
}

// MARK: - Timeline Provider

struct RekoEventProvider: TimelineProvider {
    typealias Entry = RekoEventEntry

    func placeholder(in context: Context) -> RekoEventEntry {
        return .placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping (RekoEventEntry) -> Void) {
        let entry = getFirstEventEntry()
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<RekoEventEntry>) -> Void) {
        var entries: [RekoEventEntry] = []
        let now = Date()

        // Generate entries for the next 24 hours
        for hourOffset in 0..<24 {
            guard let entryDate = Calendar.current.date(byAdding: .hour, value: hourOffset, to: now) else { continue }
            let entry = getFirstEventEntry(on: entryDate)
            entries.append(entry)
        }

        let timeline = Timeline(entries: entries, policy: .atEnd)
        completion(timeline)
    }

    private func getFirstEventEntry(on date: Date = Date()) -> RekoEventEntry {
        // Try ahead events first
        let aheadEvents = RekoStorage.loadAheadEvents()
        if let firstAhead = aheadEvents.first, let targetDate = firstAhead.targetDate {
            let days = calculateDays(from: date, to: targetDate, isCountdown: true)
            return RekoEventEntry(date: date, event: firstAhead, daysCount: days, isCountdown: true)
        }

        // Try since events
        let sinceEvents = RekoStorage.loadSinceEvents()
        if let firstSince = sinceEvents.first, let targetDate = firstSince.targetDate {
            let days = calculateDays(from: targetDate, to: date, isCountdown: false)
            return RekoEventEntry(date: date, event: firstSince, daysCount: days, isCountdown: false)
        }

        // No events
        return RekoEventEntry(date: date, event: nil, daysCount: 0, isCountdown: true)
    }

    private func calculateDays(from: Date, to: Date, isCountdown: Bool) -> Int {
        let calendar = Calendar.current
        let fromStart = calendar.startOfDay(for: from)
        let toStart = calendar.startOfDay(for: to)
        let components = calendar.dateComponents([.day], from: fromStart, to: toStart)
        return max(0, components.day ?? 0)
    }
}

// MARK: - Widget Views

struct RekoWidgetSmallView: View {
    let entry: RekoEventEntry

    var body: some View {
        VStack(spacing: 4) {
            if let event = entry.event {
                Text(event.title)
                    .font(.caption)
                    .fontWeight(.medium)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)

                Text("\(entry.daysCount)")
                    .font(.system(size: 44, weight: .bold, design: .rounded))
                    .minimumScaleFactor(0.5)

                Text(entry.isCountdown ? "days left" : "days ago")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            } else {
                Image(systemName: "calendar.badge.plus")
                    .font(.largeTitle)
                    .foregroundStyle(.secondary)
                Text("Add an event")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

struct RekoWidgetMediumView: View {
    let entry: RekoEventEntry

    var body: some View {
        HStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                Text(entry.isCountdown ? "COUNTDOWN" : "SINCE")
                    .font(.caption2)
                    .fontWeight(.semibold)
                    .foregroundStyle(.secondary)

                if let event = entry.event {
                    Text(event.title)
                        .font(.headline)
                        .lineLimit(2)

                    Spacer()

                    if let targetDate = event.targetDate {
                        Text(targetDate, style: .date)
                            .font(.caption)
                            .foregroundStyle(.secondary)
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
                    .minimumScaleFactor(0.5)

                Text("days")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

struct RekoWidgetLargeView: View {
    let entry: RekoEventEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(entry.isCountdown ? "COUNTDOWN" : "SINCE")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(.secondary)

                Spacer()

                Image(systemName: entry.isCountdown ? "hourglass" : "clock.arrow.circlepath")
                    .foregroundStyle(.secondary)
            }

            if let event = entry.event {
                Text(event.title)
                    .font(.title2)
                    .fontWeight(.bold)
                    .lineLimit(2)

                Spacer()

                HStack(alignment: .bottom) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("\(entry.daysCount)")
                            .font(.system(size: 64, weight: .bold, design: .rounded))

                        Text(entry.isCountdown ? "days remaining" : "days elapsed")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    if let targetDate = event.targetDate {
                        VStack(alignment: .trailing, spacing: 2) {
                            Text(entry.isCountdown ? "Target" : "Started")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                            Text(targetDate, style: .date)
                                .font(.caption)
                                .fontWeight(.medium)
                        }
                    }
                }

                // Progress bar
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(.quaternary)
                            .frame(height: 8)

                        RoundedRectangle(cornerRadius: 4)
                            .fill(entry.isCountdown ? Color.orange : Color.blue)
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
                    Text("Add an event in the Reko app")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity)
                Spacer()
            }
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .containerBackground(.fill.tertiary, for: .widget)
    }

    private var progressValue: CGFloat {
        let maxDays: CGFloat = 365
        let progress = CGFloat(entry.daysCount) / maxDays
        return entry.isCountdown ? (1.0 - min(1.0, progress)) : min(1.0, progress)
    }
}

// MARK: - Widget Entry View

struct RekoWidgetEntryView: View {
    var entry: RekoEventEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            RekoWidgetSmallView(entry: entry)
        case .systemMedium:
            RekoWidgetMediumView(entry: entry)
        case .systemLarge:
            RekoWidgetLargeView(entry: entry)
        default:
            RekoWidgetSmallView(entry: entry)
        }
    }
}

// MARK: - Widget Definition

struct RekoWidget: Widget {
    let kind: String = "RekoWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(
            kind: kind,
            provider: RekoEventProvider()
        ) { entry in
            RekoWidgetEntryView(entry: entry)
                .widgetURL(entry.event != nil ? URL(string: "reko://event/\(entry.event!.id)") : URL(string: "reko://"))
        }
        .configurationDisplayName("Reko Event")
        .description("Shows your next countdown or milestone")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

// MARK: - Widget Bundle (Entry Point)

@main
struct RekoWidgetBundle: WidgetBundle {
    var body: some Widget {
        RekoWidget()
    }
}

// MARK: - Preview

#Preview(as: .systemSmall) {
    RekoWidget()
} timeline: {
    RekoEventEntry.placeholder
}

#Preview(as: .systemMedium) {
    RekoWidget()
} timeline: {
    RekoEventEntry.placeholder
}

#Preview(as: .systemLarge) {
    RekoWidget()
} timeline: {
    RekoEventEntry.placeholder
}
