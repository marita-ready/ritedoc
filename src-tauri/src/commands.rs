use serde::{Deserialize, Serialize};
use tauri::State;

use crate::db::Database;

// ─────────────────────────────────────────────
//  Data models
// ─────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Note {
    pub id: i64,
    pub raw_text: String,
    pub rewritten_text: String,
    pub cartridge_id: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
}

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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Goal {
    pub id: i64,
    pub participant_name: String,
    pub goal_text: String,
    pub status: String,
    pub notes: String,
    pub created_at: String,
    pub updated_at: String,
}

// ─────────────────────────────────────────────
//  Notes CRUD
// ─────────────────────────────────────────────

#[tauri::command]
pub fn create_note(
    db: State<'_, Database>,
    raw_text: String,
    rewritten_text: Option<String>,
    cartridge_id: Option<i64>,
) -> Result<Note, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let rewritten = rewritten_text.unwrap_or_default();

    conn.execute(
        "INSERT INTO notes (raw_text, rewritten_text, cartridge_id) VALUES (?1, ?2, ?3)",
        rusqlite::params![raw_text, rewritten, cartridge_id],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();

    let note = conn
        .query_row(
            "SELECT id, raw_text, rewritten_text, cartridge_id, created_at, updated_at FROM notes WHERE id = ?1",
            rusqlite::params![id],
            |row| {
                Ok(Note {
                    id: row.get(0)?,
                    raw_text: row.get(1)?,
                    rewritten_text: row.get(2)?,
                    cartridge_id: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(note)
}

#[tauri::command]
pub fn get_notes(db: State<'_, Database>) -> Result<Vec<Note>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, raw_text, rewritten_text, cartridge_id, created_at, updated_at FROM notes ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let notes = stmt
        .query_map([], |row| {
            Ok(Note {
                id: row.get(0)?,
                raw_text: row.get(1)?,
                rewritten_text: row.get(2)?,
                cartridge_id: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(notes)
}

#[tauri::command]
pub fn get_note_by_id(db: State<'_, Database>, id: i64) -> Result<Note, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let note = conn
        .query_row(
            "SELECT id, raw_text, rewritten_text, cartridge_id, created_at, updated_at FROM notes WHERE id = ?1",
            rusqlite::params![id],
            |row| {
                Ok(Note {
                    id: row.get(0)?,
                    raw_text: row.get(1)?,
                    rewritten_text: row.get(2)?,
                    cartridge_id: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            },
        )
        .map_err(|e| format!("Note not found: {}", e))?;

    Ok(note)
}

#[tauri::command]
pub fn update_note(
    db: State<'_, Database>,
    id: i64,
    raw_text: Option<String>,
    rewritten_text: Option<String>,
    cartridge_id: Option<i64>,
) -> Result<Note, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    // Fetch the existing note first
    let existing = conn
        .query_row(
            "SELECT id, raw_text, rewritten_text, cartridge_id, created_at, updated_at FROM notes WHERE id = ?1",
            rusqlite::params![id],
            |row| {
                Ok(Note {
                    id: row.get(0)?,
                    raw_text: row.get(1)?,
                    rewritten_text: row.get(2)?,
                    cartridge_id: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            },
        )
        .map_err(|e| format!("Note not found: {}", e))?;

    let new_raw = raw_text.unwrap_or(existing.raw_text);
    let new_rewritten = rewritten_text.unwrap_or(existing.rewritten_text);
    let new_cartridge = cartridge_id.or(existing.cartridge_id);

    conn.execute(
        "UPDATE notes SET raw_text = ?1, rewritten_text = ?2, cartridge_id = ?3, updated_at = datetime('now') WHERE id = ?4",
        rusqlite::params![new_raw, new_rewritten, new_cartridge, id],
    )
    .map_err(|e| e.to_string())?;

    // Return the updated note
    let note = conn
        .query_row(
            "SELECT id, raw_text, rewritten_text, cartridge_id, created_at, updated_at FROM notes WHERE id = ?1",
            rusqlite::params![id],
            |row| {
                Ok(Note {
                    id: row.get(0)?,
                    raw_text: row.get(1)?,
                    rewritten_text: row.get(2)?,
                    cartridge_id: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(note)
}

#[tauri::command]
pub fn delete_note(db: State<'_, Database>, id: i64) -> Result<bool, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let rows_affected = conn
        .execute("DELETE FROM notes WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;

    if rows_affected == 0 {
        return Err(format!("Note with id {} not found", id));
    }

    Ok(true)
}

// ─────────────────────────────────────────────
//  Cartridges CRUD
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

// ─────────────────────────────────────────────
//  Settings CRUD
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

// ─────────────────────────────────────────────
//  Goals CRUD
// ─────────────────────────────────────────────

#[tauri::command]
pub fn create_goal(
    db: State<'_, Database>,
    participant_name: String,
    goal_text: String,
    status: Option<String>,
    notes: Option<String>,
) -> Result<Goal, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let goal_status = status.unwrap_or_else(|| "active".to_string());
    let goal_notes = notes.unwrap_or_default();

    conn.execute(
        "INSERT INTO goals (participant_name, goal_text, status, notes) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![participant_name, goal_text, goal_status, goal_notes],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();

    let goal = conn
        .query_row(
            "SELECT id, participant_name, goal_text, status, notes, created_at, updated_at FROM goals WHERE id = ?1",
            rusqlite::params![id],
            |row| {
                Ok(Goal {
                    id: row.get(0)?,
                    participant_name: row.get(1)?,
                    goal_text: row.get(2)?,
                    status: row.get(3)?,
                    notes: row.get(4)?,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(goal)
}

#[tauri::command]
pub fn get_goals(db: State<'_, Database>) -> Result<Vec<Goal>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, participant_name, goal_text, status, notes, created_at, updated_at FROM goals ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let goals = stmt
        .query_map([], |row| {
            Ok(Goal {
                id: row.get(0)?,
                participant_name: row.get(1)?,
                goal_text: row.get(2)?,
                status: row.get(3)?,
                notes: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(goals)
}

#[tauri::command]
pub fn update_goal(
    db: State<'_, Database>,
    id: i64,
    participant_name: Option<String>,
    goal_text: Option<String>,
    status: Option<String>,
    notes: Option<String>,
) -> Result<Goal, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    // Fetch existing goal
    let existing = conn
        .query_row(
            "SELECT id, participant_name, goal_text, status, notes, created_at, updated_at FROM goals WHERE id = ?1",
            rusqlite::params![id],
            |row| {
                Ok(Goal {
                    id: row.get(0)?,
                    participant_name: row.get(1)?,
                    goal_text: row.get(2)?,
                    status: row.get(3)?,
                    notes: row.get(4)?,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                })
            },
        )
        .map_err(|e| format!("Goal not found: {}", e))?;

    let new_name = participant_name.unwrap_or(existing.participant_name);
    let new_text = goal_text.unwrap_or(existing.goal_text);
    let new_status = status.unwrap_or(existing.status);
    let new_notes = notes.unwrap_or(existing.notes);

    conn.execute(
        "UPDATE goals SET participant_name = ?1, goal_text = ?2, status = ?3, notes = ?4, updated_at = datetime('now') WHERE id = ?5",
        rusqlite::params![new_name, new_text, new_status, new_notes, id],
    )
    .map_err(|e| e.to_string())?;

    // Return the updated goal
    let goal = conn
        .query_row(
            "SELECT id, participant_name, goal_text, status, notes, created_at, updated_at FROM goals WHERE id = ?1",
            rusqlite::params![id],
            |row| {
                Ok(Goal {
                    id: row.get(0)?,
                    participant_name: row.get(1)?,
                    goal_text: row.get(2)?,
                    status: row.get(3)?,
                    notes: row.get(4)?,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(goal)
}
