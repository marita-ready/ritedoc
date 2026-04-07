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
    /// Only configuration/preference tables — RiteDoc stores zero client data.
    fn run_migrations(&self) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute_batch(
            "
            -- Cartridge definitions (app configuration — what service types are available)
            CREATE TABLE IF NOT EXISTS cartridges (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                name            TEXT NOT NULL,
                service_type    TEXT NOT NULL DEFAULT '',
                description     TEXT NOT NULL DEFAULT '',
                config_json     TEXT NOT NULL DEFAULT '{}',
                is_active       INTEGER NOT NULL DEFAULT 1,
                created_at      TEXT NOT NULL DEFAULT (datetime('now'))
            );

            -- App preferences (user name, org, onboarding status — NOT client data)
            CREATE TABLE IF NOT EXISTS settings (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                key             TEXT NOT NULL UNIQUE,
                value           TEXT NOT NULL DEFAULT ''
            );

            -- Indexes
            CREATE INDEX IF NOT EXISTS idx_cartridges_is_active ON cartridges(is_active);
            CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
            ",
        )?;

        Ok(())
    }
}
