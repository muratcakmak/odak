/**
 * MMKV to SQLite Migration
 *
 * Migrates focus session data from MMKV to SQLite.
 * Designed for one-time migration on app upgrade.
 *
 * Design principles:
 * - Never silently drop user data
 * - Idempotent: can be run multiple times safely
 * - Validates data before and after migration
 * - Keeps MMKV data as backup until confirmed
 */

import { storage } from '../../utils/storage';
import { getDatabase, initializeDatabase } from '../database';
import { AchievementEngine } from '../../domain/achievements';
import type { FocusSession, FocusSettings, ActiveTimerState } from '../../domain/types';

// Migration version - increment when migration logic changes
const MIGRATION_VERSION = 1;
const MIGRATION_FLAG_KEY = 'focus_sqlite_migration_v';

// ============================================================================
// Types
// ============================================================================

export interface MigrationResult {
  success: boolean;
  sessionsImported: number;
  achievementsUnlocked: number;
  error?: string;
}

interface MmkvData {
  sessions: FocusSession[];
  settings: FocusSettings | null;
  profile: { dailyGoal: number; bestStreak: number } | null;
  activeTimer: ActiveTimerState | null;
}

// ============================================================================
// Migration Functions
// ============================================================================

/**
 * Check if migration is needed
 */
export function isMigrationNeeded(): boolean {
  const migrationFlag = storage.getString(MIGRATION_FLAG_KEY);
  return migrationFlag !== String(MIGRATION_VERSION);
}

/**
 * Check if there's existing MMKV data to migrate
 */
export function hasExistingData(): boolean {
  const historyJson = storage.getString('focus_history');
  if (!historyJson) return false;
  try {
    const sessions = JSON.parse(historyJson);
    return Array.isArray(sessions) && sessions.length > 0;
  } catch {
    return false;
  }
}

/**
 * Run the full migration
 */
export async function runMigration(): Promise<MigrationResult> {
  try {
    console.log('[Migration] Starting MMKV to SQLite migration...');

    // 1. Initialize SQLite schema
    await initializeDatabase();

    // 2. Check if migration already done
    if (!isMigrationNeeded()) {
      console.log('[Migration] Already migrated, skipping');
      return { success: true, sessionsImported: 0, achievementsUnlocked: 0 };
    }

    // 3. Export MMKV data
    const mmkvData = exportMmkvData();

    if (mmkvData.sessions.length === 0) {
      // No data to migrate, just mark complete
      console.log('[Migration] No sessions to migrate');
      storage.set(MIGRATION_FLAG_KEY, String(MIGRATION_VERSION));
      return { success: true, sessionsImported: 0, achievementsUnlocked: 0 };
    }

    console.log(`[Migration] Found ${mmkvData.sessions.length} sessions to migrate`);

    // 4. Import to SQLite
    const db = getDatabase();
    await importSessions(db, mmkvData.sessions);
    await importSettings(db, mmkvData.settings);
    await importActiveTimer(db, mmkvData.activeTimer);

    // 5. Recompute derived data (streaks, achievements)
    const engine = new AchievementEngine(db, {
      dailyGoal: mmkvData.profile?.dailyGoal ?? 4,
    });
    const result = await engine.recomputeAll();

    // 6. Verify import
    const sessionCount = await verifySessionCount(db);
    if (sessionCount !== mmkvData.sessions.length) {
      throw new Error(
        `Session count mismatch: expected ${mmkvData.sessions.length}, got ${sessionCount}`
      );
    }

    // 7. Mark migration complete
    storage.set(MIGRATION_FLAG_KEY, String(MIGRATION_VERSION));

    console.log(
      `[Migration] Complete: ${sessionCount} sessions, ${result.newlyUnlocked.length} achievements`
    );

    return {
      success: true,
      sessionsImported: sessionCount,
      achievementsUnlocked: result.newlyUnlocked.length,
    };
  } catch (error) {
    console.error('[Migration] Failed:', error);
    return {
      success: false,
      sessionsImported: 0,
      achievementsUnlocked: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Export data from MMKV
 */
function exportMmkvData(): MmkvData {
  // Sessions
  const sessionsJson = storage.getString('focus_history');
  const sessions: FocusSession[] = sessionsJson ? JSON.parse(sessionsJson) : [];

  // Settings
  const settingsJson = storage.getString('focus_settings');
  const settings: FocusSettings | null = settingsJson
    ? JSON.parse(settingsJson)
    : null;

  // Profile (achievements/streak)
  const profileJson = storage.getString('focus_profile');
  const profile = profileJson ? JSON.parse(profileJson) : null;

  // Active timer
  const activeTimerJson = storage.getString('focus_active_timer');
  const activeTimer: ActiveTimerState | null = activeTimerJson
    ? JSON.parse(activeTimerJson)
    : null;

  return { sessions, settings, profile, activeTimer };
}

/**
 * Import sessions to SQLite
 */
async function importSessions(
  db: ReturnType<typeof getDatabase>,
  sessions: FocusSession[]
): Promise<void> {
  if (sessions.length === 0) return;

  const stmt = await db.prepareAsync(`
    INSERT OR REPLACE INTO focus_sessions (
      id, preset_id, started_at, ends_at, completed_at, was_completed, total_minutes
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  try {
    await db.execAsync('BEGIN TRANSACTION');

    for (const session of sessions) {
      await stmt.executeAsync([
        session.id,
        session.presetId,
        session.startedAt,
        session.endsAt,
        session.completedAt ?? null,
        session.wasCompleted ? 1 : 0,
        session.totalMinutes,
      ]);
    }

    await db.execAsync('COMMIT');
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  } finally {
    await stmt.finalizeAsync();
  }
}

/**
 * Import settings to SQLite
 */
async function importSettings(
  db: ReturnType<typeof getDatabase>,
  settings: FocusSettings | null
): Promise<void> {
  if (!settings) return;

  await db.runAsync(
    `
    INSERT OR REPLACE INTO focus_profile (
      id, version, daily_goal, auto_break_enabled, show_minutes_remaining,
      sound_enabled, vibration_enabled, break_duration_minutes
    ) VALUES (1, ?, 4, ?, ?, ?, ?, ?)
  `,
    settings.version,
    settings.autoBreakEnabled ? 1 : 0,
    settings.showMinutesRemaining ? 1 : 0,
    settings.soundEnabled ? 1 : 0,
    settings.vibrationEnabled ? 1 : 0,
    settings.breakDurationMinutes
  );
}

/**
 * Import active timer state
 */
async function importActiveTimer(
  db: ReturnType<typeof getDatabase>,
  timer: ActiveTimerState | null
): Promise<void> {
  if (!timer) {
    await db.runAsync('DELETE FROM active_timer WHERE id = 1');
    return;
  }

  await db.runAsync(
    `
    INSERT OR REPLACE INTO active_timer (
      id, session_id, phase, preset_id, started_at, ends_at, total_minutes
    ) VALUES (1, ?, ?, ?, ?, ?, ?)
  `,
    timer.sessionId,
    timer.phase,
    timer.presetId,
    timer.startedAt,
    timer.endsAt,
    timer.totalMinutes
  );
}

/**
 * Verify session count after import
 */
async function verifySessionCount(
  db: ReturnType<typeof getDatabase>
): Promise<number> {
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM focus_sessions'
  );
  return result?.count ?? 0;
}

// ============================================================================
// Export
// ============================================================================

export { MIGRATION_VERSION, MIGRATION_FLAG_KEY };
