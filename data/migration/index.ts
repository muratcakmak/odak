/**
 * Migration Module
 *
 * Public API for data migrations.
 */

export {
  isMigrationNeeded,
  hasExistingData,
  runMigration,
  MIGRATION_VERSION,
  MIGRATION_FLAG_KEY,
} from './MmkvToSqliteMigration';
export type { MigrationResult } from './MmkvToSqliteMigration';
