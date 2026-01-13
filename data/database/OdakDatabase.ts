/**
 * Odak Database
 *
 * SQLite database wrapper for the Odak focus app.
 * Handles schema initialization, migrations, and provides type-safe access.
 *
 * Design principles:
 * - Schema version tracking for migrations
 * - Generated columns for efficient date-based queries
 * - Indexes for common access patterns
 */

import * as SQLite from 'expo-sqlite';
import { ACHIEVEMENT_DEFINITIONS } from '../../domain/models/Achievement';

// Schema version - increment when schema changes
const SCHEMA_VERSION = 1;

// Database filename
const DB_NAME = 'odak.db';

// Singleton instance
let dbInstance: SQLite.SQLiteDatabase | null = null;

// ============================================================================
// Schema DDL
// ============================================================================

const SCHEMA_DDL = `
-- Schema version tracking for migrations
CREATE TABLE IF NOT EXISTS schema_info (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now')),
  description TEXT
);

-- Focus sessions table (migrated from MMKV)
CREATE TABLE IF NOT EXISTS focus_sessions (
  id TEXT PRIMARY KEY,
  preset_id TEXT NOT NULL CHECK (preset_id IN ('quick', 'standard', 'deep')),
  started_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  completed_at TEXT,
  was_completed INTEGER NOT NULL DEFAULT 0,
  total_minutes INTEGER NOT NULL,
  -- Generated columns for efficient queries
  date_key TEXT GENERATED ALWAYS AS (substr(started_at, 1, 10)) STORED,
  week_key TEXT GENERATED ALWAYS AS (strftime('%Y-W%W', started_at)) STORED,
  month_key TEXT GENERATED ALWAYS AS (substr(started_at, 1, 7)) STORED
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_sessions_date_key ON focus_sessions(date_key);
CREATE INDEX IF NOT EXISTS idx_sessions_week_key ON focus_sessions(week_key);
CREATE INDEX IF NOT EXISTS idx_sessions_month_key ON focus_sessions(month_key);
CREATE INDEX IF NOT EXISTS idx_sessions_preset ON focus_sessions(preset_id);
CREATE INDEX IF NOT EXISTS idx_sessions_completed ON focus_sessions(was_completed, date_key);

-- Daily aggregates (materialized for performance)
CREATE TABLE IF NOT EXISTS daily_stats (
  date_key TEXT PRIMARY KEY,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  completed_sessions INTEGER NOT NULL DEFAULT 0,
  total_minutes INTEGER NOT NULL DEFAULT 0,
  quick_sessions INTEGER NOT NULL DEFAULT 0,
  standard_sessions INTEGER NOT NULL DEFAULT 0,
  deep_sessions INTEGER NOT NULL DEFAULT 0,
  met_goal INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_daily_stats_met_goal ON daily_stats(met_goal, date_key);

-- Achievement definitions (static, seeded at app start)
CREATE TABLE IF NOT EXISTS achievement_definitions (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  criteria_type TEXT NOT NULL,
  criteria_value INTEGER NOT NULL,
  criteria_unit TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_hidden INTEGER NOT NULL DEFAULT 0
);

-- User achievement progress and unlocks
CREATE TABLE IF NOT EXISTS user_achievements (
  achievement_id TEXT PRIMARY KEY REFERENCES achievement_definitions(id),
  current_progress INTEGER NOT NULL DEFAULT 0,
  target_value INTEGER NOT NULL,
  is_unlocked INTEGER NOT NULL DEFAULT 0,
  unlocked_at TEXT,
  progress_updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Streak tracking (single row table)
CREATE TABLE IF NOT EXISTS streak_data (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  current_streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  last_active_date TEXT,
  streak_start_date TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Focus profile/settings (single row table)
CREATE TABLE IF NOT EXISTS focus_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version INTEGER NOT NULL DEFAULT 1,
  daily_goal INTEGER NOT NULL DEFAULT 4,
  auto_break_enabled INTEGER NOT NULL DEFAULT 1,
  show_minutes_remaining INTEGER NOT NULL DEFAULT 1,
  sound_enabled INTEGER NOT NULL DEFAULT 1,
  vibration_enabled INTEGER NOT NULL DEFAULT 1,
  break_duration_minutes INTEGER NOT NULL DEFAULT 5,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Active timer state (for app resume)
CREATE TABLE IF NOT EXISTS active_timer (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  session_id TEXT,
  phase TEXT CHECK (phase IN ('focusing', 'break')),
  preset_id TEXT CHECK (preset_id IN ('quick', 'standard', 'deep')),
  started_at TEXT,
  ends_at TEXT,
  total_minutes INTEGER,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

// ============================================================================
// Views for common queries
// ============================================================================

const VIEWS_DDL = `
-- Weekly statistics view
CREATE VIEW IF NOT EXISTS weekly_stats AS
SELECT
  week_key,
  COUNT(*) as total_sessions,
  SUM(was_completed) as completed_sessions,
  SUM(CASE WHEN was_completed = 1 THEN total_minutes ELSE 0 END) as total_minutes,
  COUNT(DISTINCT date_key) as active_days,
  ROUND(100.0 * SUM(was_completed) / NULLIF(COUNT(*), 0), 1) as completion_rate
FROM focus_sessions
GROUP BY week_key;

-- Monthly statistics view
CREATE VIEW IF NOT EXISTS monthly_stats AS
SELECT
  month_key,
  COUNT(*) as total_sessions,
  SUM(was_completed) as completed_sessions,
  SUM(CASE WHEN was_completed = 1 THEN total_minutes ELSE 0 END) as total_minutes,
  COUNT(DISTINCT date_key) as active_days,
  ROUND(100.0 * SUM(was_completed) / NULLIF(COUNT(*), 0), 1) as completion_rate
FROM focus_sessions
GROUP BY month_key;

-- Preset statistics view
CREATE VIEW IF NOT EXISTS preset_stats AS
SELECT
  preset_id,
  COUNT(*) as total_sessions,
  SUM(was_completed) as completed_sessions,
  SUM(CASE WHEN was_completed = 1 THEN total_minutes ELSE 0 END) as total_minutes,
  ROUND(100.0 * SUM(was_completed) / NULLIF(COUNT(*), 0), 1) as completion_rate
FROM focus_sessions
GROUP BY preset_id;

-- Achievement progress view (for UI)
CREATE VIEW IF NOT EXISTS achievement_progress AS
SELECT
  d.id,
  d.category,
  d.name,
  d.description,
  d.icon,
  d.criteria_type,
  d.criteria_value,
  d.criteria_unit,
  d.sort_order,
  d.is_hidden,
  COALESCE(u.current_progress, 0) as current_progress,
  COALESCE(u.is_unlocked, 0) as is_unlocked,
  u.unlocked_at,
  CASE
    WHEN d.is_hidden = 1 AND COALESCE(u.is_unlocked, 0) = 0 THEN 0
    ELSE 1
  END as is_visible
FROM achievement_definitions d
LEFT JOIN user_achievements u ON d.id = u.achievement_id
ORDER BY d.sort_order;
`;

// ============================================================================
// Database Functions
// ============================================================================

/**
 * Get the database instance (singleton)
 */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync(DB_NAME);
  }
  return dbInstance;
}

/**
 * Initialize the database schema
 * Call this on app startup
 */
export async function initializeDatabase(): Promise<void> {
  const db = getDatabase();

  // Check if schema needs initialization
  const schemaExists = await checkSchemaExists(db);

  if (!schemaExists) {
    console.log('[OdakDatabase] Initializing schema...');

    // Create tables
    await db.execAsync(SCHEMA_DDL);

    // Create views
    await db.execAsync(VIEWS_DDL);

    // Seed achievement definitions
    await seedAchievementDefinitions(db);

    // Initialize streak data row
    await db.runAsync(`
      INSERT OR IGNORE INTO streak_data (id, current_streak, best_streak)
      VALUES (1, 0, 0)
    `);

    // Record schema version
    await db.runAsync(
      `INSERT OR REPLACE INTO schema_info (version, description) VALUES (?, ?)`,
      SCHEMA_VERSION,
      'Initial schema with achievements'
    );

    console.log('[OdakDatabase] Schema initialized successfully');
  } else {
    // Check for schema upgrades
    await upgradeSchemaIfNeeded(db);
  }
}

/**
 * Check if schema already exists
 */
async function checkSchemaExists(db: SQLite.SQLiteDatabase): Promise<boolean> {
  try {
    const result = await db.getFirstAsync<{ version: number }>(
      `SELECT version FROM schema_info ORDER BY version DESC LIMIT 1`
    );
    return result !== null;
  } catch {
    return false;
  }
}

/**
 * Upgrade schema if needed
 */
async function upgradeSchemaIfNeeded(db: SQLite.SQLiteDatabase): Promise<void> {
  const result = await db.getFirstAsync<{ version: number }>(
    `SELECT version FROM schema_info ORDER BY version DESC LIMIT 1`
  );

  const currentVersion = result?.version ?? 0;

  if (currentVersion < SCHEMA_VERSION) {
    console.log(
      `[OdakDatabase] Upgrading schema from v${currentVersion} to v${SCHEMA_VERSION}`
    );
    // Add migration logic here as schema evolves
    // For now, just update the version
    await db.runAsync(
      `INSERT INTO schema_info (version, description) VALUES (?, ?)`,
      SCHEMA_VERSION,
      `Upgrade from v${currentVersion}`
    );
  }
}

/**
 * Seed achievement definitions into database
 */
async function seedAchievementDefinitions(
  db: SQLite.SQLiteDatabase
): Promise<void> {
  const stmt = await db.prepareAsync(`
    INSERT OR REPLACE INTO achievement_definitions (
      id, category, name, description, icon,
      criteria_type, criteria_value, criteria_unit, sort_order, is_hidden
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  try {
    for (const def of ACHIEVEMENT_DEFINITIONS) {
      await stmt.executeAsync([
        def.id,
        def.category,
        def.name,
        def.description,
        def.icon,
        def.criteriaType,
        def.criteriaValue,
        def.criteriaUnit ?? null,
        def.sortOrder,
        def.isHidden ? 1 : 0,
      ]);
    }
  } finally {
    await stmt.finalizeAsync();
  }
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.closeSync();
    dbInstance = null;
  }
}

/**
 * Reset the database (for testing/development)
 */
export async function resetDatabase(): Promise<void> {
  closeDatabase();
  await SQLite.deleteDatabaseAsync(DB_NAME);
  dbInstance = null;
  await initializeDatabase();
}

// ============================================================================
// Export database name for external use
// ============================================================================

export { DB_NAME, SCHEMA_VERSION };
