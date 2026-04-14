use serde::{Deserialize, Serialize};
use tauri::State;

use crate::db::Database;

// ─────────────────────────────────────────────
//  Data models
// ─────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Cartridge {
    pub id: i64,
    pub name: String,
    pub service_type: String,
    pub description: String,
    pub config_json: String,
    pub is_active: bool,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[allow(dead_code)]
pub struct Setting {
    pub id: i64,
    pub key: String,
    pub value: String,
}

// ─────────────────────────────────────────────
//  Cartridges
// ─────────────────────────────────────────────

#[tauri::command]
pub fn create_cartridge(
    db: State<'_, Database>,
    name: String,
    service_type: Option<String>,
    description: Option<String>,
    config_json: Option<String>,
    is_active: Option<bool>,
) -> Result<Cartridge, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let svc = service_type.unwrap_or_default();
    let desc = description.unwrap_or_default();
    let config = config_json.unwrap_or_else(|| "{}".to_string());
    let active: i32 = if is_active.unwrap_or(true) { 1 } else { 0 };

    conn.execute(
        "INSERT INTO cartridges (name, service_type, description, config_json, is_active) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![name, svc, desc, config, active],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();

    let cartridge = conn
        .query_row(
            "SELECT id, name, service_type, description, config_json, is_active, created_at FROM cartridges WHERE id = ?1",
            rusqlite::params![id],
            |row| {
                let active_int: i32 = row.get(5)?;
                Ok(Cartridge {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    service_type: row.get(2)?,
                    description: row.get(3)?,
                    config_json: row.get(4)?,
                    is_active: active_int != 0,
                    created_at: row.get(6)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(cartridge)
}

#[tauri::command]
pub fn get_cartridges(db: State<'_, Database>) -> Result<Vec<Cartridge>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, name, service_type, description, config_json, is_active, created_at FROM cartridges ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let cartridges = stmt
        .query_map([], |row| {
            let active_int: i32 = row.get(5)?;
            Ok(Cartridge {
                id: row.get(0)?,
                name: row.get(1)?,
                service_type: row.get(2)?,
                description: row.get(3)?,
                config_json: row.get(4)?,
                is_active: active_int != 0,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(cartridges)
}

#[tauri::command]
pub fn get_active_cartridges(db: State<'_, Database>) -> Result<Vec<Cartridge>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, name, service_type, description, config_json, is_active, created_at FROM cartridges WHERE is_active = 1 ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let cartridges = stmt
        .query_map([], |row| {
            let active_int: i32 = row.get(5)?;
            Ok(Cartridge {
                id: row.get(0)?,
                name: row.get(1)?,
                service_type: row.get(2)?,
                description: row.get(3)?,
                config_json: row.get(4)?,
                is_active: active_int != 0,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(cartridges)
}

/// Toggle a cartridge's active/inactive state.
#[tauri::command]
pub fn update_cartridge_active(
    db: State<'_, Database>,
    id: i64,
    is_active: bool,
) -> Result<bool, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let active: i32 = if is_active { 1 } else { 0 };
    conn.execute(
        "UPDATE cartridges SET is_active = ?1 WHERE id = ?2",
        rusqlite::params![active, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(true)
}

// ─────────────────────────────────────────────
//  Settings (app preferences only — NOT client data)
// ─────────────────────────────────────────────

#[tauri::command]
pub fn get_setting(db: State<'_, Database>, key: String) -> Result<Option<String>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let result = conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        rusqlite::params![key],
        |row| row.get::<_, String>(0),
    );

    match result {
        Ok(value) => Ok(Some(value)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn set_setting(db: State<'_, Database>, key: String, value: String) -> Result<bool, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        rusqlite::params![key, value],
    )
    .map_err(|e| e.to_string())?;

    Ok(true)
}
