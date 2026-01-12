/**
 * Bank Screen
 *
 * Displays completed focus sessions grouped by day.
 * Sessions are stored locally and persist across app restarts.
 */

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUnistyles } from 'react-native-unistyles';

import { getFocusHistory, storage } from '../../../utils/storage';
import { getPreset } from '../../../domain';
import type { FocusSession } from '../../../domain/types';

// Group sessions by day
function groupSessionsByDay(sessions: FocusSession[]): { title: string; data: FocusSession[] }[] {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  const groups: Record<string, FocusSession[]> = {};

  // Sort sessions by startedAt descending (most recent first)
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );

  for (const session of sorted) {
    const date = new Date(session.startedAt).toDateString();
    const key = date === today ? 'Today' : date === yesterday ? 'Yesterday' : formatDateHeader(date);

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(session);
  }

  // Convert to section list format, maintaining order (Today first)
  const orderedKeys = Object.keys(groups).sort((a, b) => {
    if (a === 'Today') return -1;
    if (b === 'Today') return 1;
    if (a === 'Yesterday') return -1;
    if (b === 'Yesterday') return 1;
    return 0; // Keep other dates in their current order
  });

  return orderedKeys.map((title) => ({
    title,
    data: groups[title],
  }));
}

// Format date for section header (e.g., "Mon, Jan 15")
function formatDateHeader(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// Format time for session (e.g., "2:30 PM")
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function BankScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();

  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Load sessions on mount and when storage changes
  useEffect(() => {
    setSessions(getFocusHistory());

    const listener = storage.addOnValueChangedListener((key) => {
      if (key === 'focus_history') {
        setSessions(getFocusHistory());
      }
    });

    return () => listener.remove();
  }, []);

  // Group sessions by day
  const sections = useMemo(() => groupSessionsByDay(sessions), [sessions]);

  // Pull to refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setSessions(getFocusHistory());
    setRefreshing(false);
  }, []);

  // Render session item
  const renderItem = useCallback(
    ({ item }: { item: FocusSession }) => {
      const preset = getPreset(item.presetId);

      return (
        <View
          style={[
            styles.sessionCard,
            {
              backgroundColor: theme.isDark
                ? 'rgba(255,255,255,0.05)'
                : 'rgba(0,0,0,0.03)',
            },
          ]}
        >
          <View style={styles.sessionInfo}>
            <Text style={[styles.presetName, { color: theme.colors.textPrimary }]}>
              {preset.name}
            </Text>
            <Text style={[styles.sessionMeta, { color: theme.colors.textTertiary }]}>
              {item.totalMinutes} min • {formatTime(item.startedAt)}
            </Text>
          </View>

          <View style={styles.sessionStatus}>
            {item.wasCompleted ? (
              <View style={[styles.statusBadge, { backgroundColor: theme.colors.systemGreen }]}>
                <Text style={styles.statusText}>✓</Text>
              </View>
            ) : (
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: theme.colors.systemOrange },
                ]}
              >
                <Text style={styles.statusText}>–</Text>
              </View>
            )}
          </View>
        </View>
      );
    },
    [theme]
  );

  // Render section header
  const renderSectionHeader = useCallback(
    ({ section }: { section: { title: string } }) => (
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
          {section.title}
        </Text>
      </View>
    ),
    [theme]
  );

  // Empty state
  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyState}>
        <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
          No sessions yet
        </Text>
        <Text style={[styles.emptySubtitle, { color: theme.colors.textTertiary }]}>
          Complete a focus session to see it here
        </Text>
      </View>
    ),
    [theme]
  );

  // Tab bar height estimate
  const tabBarHeight = 90;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Bank</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textTertiary }]}>
          {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
        </Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: tabBarHeight + insets.bottom },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.textTertiary}
          />
        }
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  sectionHeader: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  sessionInfo: {
    flex: 1,
  },
  presetName: {
    fontSize: 17,
    fontWeight: '600',
  },
  sessionMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  sessionStatus: {},
  statusBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
});
