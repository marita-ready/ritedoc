use rusqlite::{Connection, Result as SqliteResult};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

/// Holds a thread-safe reference to the SQLite connection.
pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    /// Open (or create) the SQLite database at the given path and run migrations.
    pub fn new(db_path: &PathBuf) -> SqliteResult<Self> {
        // Ensure the parent directory exists
        if let Some(parent) = db_path.parent() {
            fs::create_dir_all(parent).expect("Failed to create database directory");
        }

        let conn = Connection::open(db_path)?;

        // Enable WAL mode for better concurrent read performance
        conn.execute_batch("PRAGMA journal_mode=WAL;")?;
        conn.execute_batch("PRAGMA foreign_keys=ON;")?;

        let db = Database {
            conn: Mutex::new(conn),
        };

        db.run_migrations()?;

        Ok(db)
    }

    /// Create all tables if they do not already exist.
    fn run_migrations(&self) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS notes (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                raw_text        TEXT NOT NULL DEFAULT '',
                rewritten_text  TEXT NOT NULL DEFAULT '',
                cartridge_id    INTEGER,
                created_at      TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (cartridge_id) REFERENCES cartridges(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS cartridges (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                name            TEXT NOT NULL,
                service_type    TEXT NOT NULL DEFAULT '',
                description     TEXT NOT NULL DEFAULT '',
                config_json     TEXT NOT NULL DEFAULT '{}',
                is_active       INTEGER NOT NULL DEFAULT 1,
                created_at      TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS settings (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                key             TEXT NOT NULL UNIQUE,
                value           TEXT NOT NULL DEFAULT ''
            );

            CREATE TABLE IF NOT EXISTS goals (
                id                  INTEGER PRIMARY KEY AUTOINCREMENT,
                participant_name    TEXT NOT NULL DEFAULT '',
                goal_text           TEXT NOT NULL DEFAULT '',
                status              TEXT NOT NULL DEFAULT 'active',
                notes               TEXT NOT NULL DEFAULT '',
                created_at          TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
            );

            -- Index for common queries
            CREATE INDEX IF NOT EXISTS idx_notes_cartridge_id ON notes(cartridge_id);
            CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at);
            CREATE INDEX IF NOT EXISTS idx_cartridges_is_active ON cartridges(is_active);
            CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
            CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
            ",
        )?;

        Ok(())
    }
}
