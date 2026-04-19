/**
 * RiteDoc Mobile App — SQLite Database Module
 *
 * Manages the SQLite database lifecycle:
 * - Opens/creates the database on first access
 * - Runs schema migrations based on a version number (PRAGMA user_version)
 * - Migrates existing notes from AsyncStorage on first launch after upgrade
 *
 * The database is a singleton — all callers share the same connection.
 *
 * Schema version history:
 *   v1 — Initial: notes table with id, originalText, rewrittenText,
 *         createdAt, wordCountOriginal, wordCountRewritten
 */

import {
  openDatabaseAsync,
  type SQLiteDatabase,
} from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Constants ───────────────────────────────────────────────────────
const DB_NAME = 'ritedoc.db';
const CURRENT_SCHEMA_VERSION = 1;

/**
 * The AsyncStorage key used by the old noteStorage implementation.
 * Checked during migration and cleared after successful transfer.
 */
const LEGACY_ASYNC_STORAGE_KEY = '@ritedoc_saved_notes';

// ─── Singleton ───────────────────────────────────────────────────────
let _db: SQLiteDatabase | null = null;
let _initPromise: Promise<SQLiteDatabase> | null = null;

/**
 * Get the shared database instance. Initialises on first call.
 * Subsequent calls return the same instance immediately.
 */
export async function getDatabase(): Promise<SQLiteDatabase> {
  if (_db) return _db;

  // Prevent concurrent initialisation
  if (!_initPromise) {
    _initPromise = initDatabase();
  }

  return _initPromise;
}

// ─── Initialisation ──────────────────────────────────────────────────

async function initDatabase(): Promise<SQLiteDatabase> {
  try {
    const db = await openDatabaseAsync(DB_NAME);

    // Run schema migrations
    await runMigrations(db);

    // Migrate legacy AsyncStorage data (one-time)
    await migrateLegacyData(db);

    _db = db;
    return db;
  } catch (error) {
    _initPromise = null; // Allow retry on next call
    console.error('[database] Failed to initialise database:', error);
    throw error;
  }
}

// ─── Schema migrations ──────────────────────────────────────────────

async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const versionResult = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );
  let currentVersion = versionResult?.user_version ?? 0;

  if (currentVersion >= CURRENT_SCHEMA_VERSION) {
    return; // Already up to date
  }

  // ── Migration v0 → v1: Create initial notes table ─────────────────
  if (currentVersion < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS notes (
        id               TEXT PRIMARY KEY NOT NULL,
        originalText     TEXT NOT NULL DEFAULT '',
        rewrittenText    TEXT NOT NULL DEFAULT '',
        createdAt        TEXT NOT NULL DEFAULT '',
        wordCountOriginal   INTEGER NOT NULL DEFAULT 0,
        wordCountRewritten  INTEGER NOT NULL DEFAULT 0
      );

      -- Index for sorting by most recent first
      CREATE INDEX IF NOT EXISTS idx_notes_createdAt
        ON notes (createdAt DESC);
    `);

    currentVersion = 1;
    console.log('[database] Migration v0 → v1: notes table created');
  }

  // ── Future migrations go here ─────────────────────────────────────
  // if (currentVersion < 2) { ... currentVersion = 2; }

  // Persist the new schema version
  await db.execAsync(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION}`);
}

// ─── Legacy AsyncStorage migration ──────────────────────────────────

/**
 * One-time migration: reads notes from the old AsyncStorage JSON array,
 * inserts them into the SQLite notes table, then removes the key from
 * AsyncStorage so the migration doesn't run again.
 */
async function migrateLegacyData(db: SQLiteDatabase): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(LEGACY_ASYNC_STORAGE_KEY);
    if (!raw) return; // Nothing to migrate

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      // Empty or invalid — just clean up
      await AsyncStorage.removeItem(LEGACY_ASYNC_STORAGE_KEY);
      return;
    }

    // Check if we already have notes in SQLite (avoid double-migration)
    const existing = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM notes'
    );
    if (existing && existing.count > 0) {
      // SQLite already has data — just clean up AsyncStorage
      await AsyncStorage.removeItem(LEGACY_ASYNC_STORAGE_KEY);
      return;
    }

    // Insert each legacy note into SQLite
    await db.withTransactionAsync(async () => {
      for (const note of parsed) {
        if (!note.id || typeof note.id !== 'string') continue;

        await db.runAsync(
          `INSERT OR IGNORE INTO notes
            (id, originalText, rewrittenText, createdAt, wordCountOriginal, wordCountRewritten)
           VALUES (?, ?, ?, ?, ?, ?)`,
          note.id,
          note.originalText ?? '',
          note.rewrittenText ?? '',
          note.createdAt ?? new Date().toISOString(),
          note.wordCountOriginal ?? 0,
          note.wordCountRewritten ?? 0
        );
      }
    });

    // Clean up AsyncStorage
    await AsyncStorage.removeItem(LEGACY_ASYNC_STORAGE_KEY);

    console.log(
      `[database] Migrated ${parsed.length} notes from AsyncStorage to SQLite`
    );
  } catch (error) {
    // Don't throw — migration failure shouldn't block the app.
    // The legacy data remains in AsyncStorage for a future retry.
    console.warn('[database] Legacy migration failed (will retry):', error);
  }
}

// ─── Utilities ───────────────────────────────────────────────────────

/**
 * Close the database connection. Primarily for testing.
 */
export async function closeDatabase(): Promise<void> {
  if (_db) {
    await _db.closeAsync();
    _db = null;
    _initPromise = null;
  }
}
