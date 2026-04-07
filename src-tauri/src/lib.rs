mod commands;
mod db;
mod pipeline;

use db::Database;
use tauri::Manager;

// ─────────────────────────────────────────────
//  Rewrite Note command (wraps the 3-agent pipeline)
// ─────────────────────────────────────────────

#[tauri::command]
async fn rewrite_note(
    db: tauri::State<'_, Database>,
    raw_text: String,
    cartridge_id: i64,
) -> Result<pipeline::PipelineResult, String> {
    // 1. Look up the cartridge to get its config_json
    let config_json = {
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        conn.query_row(
            "SELECT config_json FROM cartridges WHERE id = ?1",
            rusqlite::params![cartridge_id],
            |row| row.get::<_, String>(0),
        )
        .map_err(|e| format!("Cartridge not found: {}", e))?
    };

    // 2. Read the model name from settings (default: "llama3.2")
    let model = {
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        let result = conn.query_row(
            "SELECT value FROM settings WHERE key = 'ollama_model'",
            [],
            |row| row.get::<_, String>(0),
        );
        match result {
            Ok(val) if !val.is_empty() => val,
            _ => "llama3.2".to_string(),
        }
    };

    // 3. Read the Ollama URL from settings (default: localhost)
    let ollama_url = {
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        let result = conn.query_row(
            "SELECT value FROM settings WHERE key = 'ollama_url'",
            [],
            |row| row.get::<_, String>(0),
        );
        match result {
            Ok(val) if !val.is_empty() => val,
            _ => "http://localhost:11434".to_string(),
        }
    };

    // 4. Run the 3-agent pipeline
    pipeline::run_pipeline(&raw_text, &config_json, &model, &ollama_url).await
}

// ─────────────────────────────────────────────
//  App entry point
// ─────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // ── Logging (debug builds only) ──────────────────────
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // ── Database initialisation ──────────────────────────
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to resolve app data directory");

            let db_path = app_data_dir.join("ritedoc.db");

            log::info!("Database path: {:?}", db_path);

            let database =
                Database::new(&db_path).expect("Failed to initialise SQLite database");

            app.manage(database);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Cartridges (app configuration)
            commands::create_cartridge,
            commands::get_cartridges,
            commands::get_active_cartridges,
            // Settings (app preferences)
            commands::get_setting,
            commands::set_setting,
            // Rewrite pipeline
            rewrite_note,
        ])
        .run(tauri::generate_context!())
        .expect("error while running RiteDoc");
}
