mod activation;
mod cartridges;
mod commands;
mod csv_parser;
mod db;
mod form_generator;
mod pipeline;
mod quality_scan;
mod safety_scan;
mod scrubber;

use db::Database;
use pipeline::CartridgeConfig;
use tauri::Manager;

// ─────────────────────────────────────────────
//  Rewrite Note command (single note)
// ─────────────────────────────────────────────

#[tauri::command]
async fn rewrite_note(
    db: tauri::State<'_, Database>,
    raw_text: String,
    cartridge_id: i64,
    mode: Option<String>, // "quick" | "deep" — defaults to "deep"
) -> Result<pipeline::PipelineResult, String> {
    // 1. Look up the cartridge's config_json
    let config_json = {
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        conn.query_row(
            "SELECT config_json FROM cartridges WHERE id = ?1",
            rusqlite::params![cartridge_id],
            |row| row.get::<_, String>(0),
        )
        .map_err(|e| format!("Cartridge not found: {}", e))?
    };

    // 2. Parse the cartridge config
    let config = CartridgeConfig::from_json(&config_json);

    // 3. Read Nanoclaw server URL from settings (default: http://localhost:8080)
    let server_url = {
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        let result = conn.query_row(
            "SELECT value FROM settings WHERE key = 'llama_server_url'",
            [],
            |row| row.get::<_, String>(0),
        );
        match result {
            Ok(val) if !val.is_empty() => val,
            _ => "http://localhost:8080".to_string(),
        }
    };

    // 4. Run the selected mode through the full pipeline
    let selected_mode = mode.unwrap_or_else(|| "deep".to_string());
    pipeline::process_note(&raw_text, &config, &server_url, &selected_mode, None).await
}

// ─────────────────────────────────────────────
//  Batch Rewrite command
//  Processes each note independently — non-blocking.
//  Emits "batch-progress" Tauri events after each note.
// ─────────────────────────────────────────────

#[tauri::command]
async fn rewrite_batch(
    db: tauri::State<'_, Database>,
    app_handle: tauri::AppHandle,
    notes: Vec<pipeline::BatchNoteInput>,
    cartridge_id: i64,
    mode: Option<String>,
) -> Result<Vec<pipeline::BatchNoteResult>, String> {
    // 1. Look up the cartridge's config_json
    let config_json = {
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        conn.query_row(
            "SELECT config_json FROM cartridges WHERE id = ?1",
            rusqlite::params![cartridge_id],
            |row| row.get::<_, String>(0),
        )
        .map_err(|e| format!("Cartridge not found: {}", e))?
    };

    // 2. Parse the cartridge config
    let config = CartridgeConfig::from_json(&config_json);

    // 3. Read Nanoclaw server URL from settings
    let server_url = {
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        let result = conn.query_row(
            "SELECT value FROM settings WHERE key = 'llama_server_url'",
            [],
            |row| row.get::<_, String>(0),
        );
        match result {
            Ok(val) if !val.is_empty() => val,
            _ => "http://localhost:8080".to_string(),
        }
    };

    // 4. Process batch — non-blocking, each note independent
    let selected_mode = mode.unwrap_or_else(|| "deep".to_string());
    let results =
        pipeline::process_batch(notes, &config, &server_url, &selected_mode, &app_handle).await;

    Ok(results)
}

// ─────────────────────────────────────────────
//  CSV Import command
//  Parses a CSV file from the local filesystem,
//  auto-detects the platform, and returns parsed notes.
// ─────────────────────────────────────────────

#[tauri::command]
fn import_csv(file_path: String) -> Result<csv_parser::CsvParseResult, String> {
    csv_parser::parse_csv_file(&file_path)
}

// ─────────────────────────────────────────────
//  Activation commands — 100% offline
//  No Supabase. No network calls. No phone-home.
// ─────────────────────────────────────────────

#[tauri::command]
fn activate_licence(
    app_handle: tauri::AppHandle,
    key_code: String,
) -> Result<activation::ActivationResult, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {}", e))?;
    Ok(activation::activate_offline(&key_code, &app_data_dir))
}

#[tauri::command]
fn check_activation(
    app_handle: tauri::AppHandle,
) -> Result<Option<activation::ActivationState>, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {}", e))?;
    Ok(activation::check_local_activation(&app_data_dir))
}

#[tauri::command]
fn deactivate_licence(app_handle: tauri::AppHandle) -> Result<(), String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {}", e))?;
    activation::deactivate(&app_data_dir)
}

// ─────────────────────────────────────────────
//  Hardware Profile command
//  Returns CPU, RAM, machine ID, fingerprint,
//  and recommended processing mode (turbo/standard).
// ─────────────────────────────────────────────

#[tauri::command]
fn get_hardware_profile() -> activation::HardwareProfile {
    activation::detect_hardware()
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

            // ── Seed default cartridges (no-op if already seeded) ─
            if let Err(e) = cartridges::seed_default_cartridges(&database) {
                log::warn!("Failed to seed cartridges: {}", e);
            }

            app.manage(database);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Cartridges (app configuration)
            commands::create_cartridge,
            commands::get_cartridges,
            commands::get_active_cartridges,
            commands::update_cartridge_active,
            // Settings (app preferences only — NOT client data)
            commands::get_setting,
            commands::set_setting,
            // Rewrite pipeline (single note — Quick or Deep mode)
            rewrite_note,
            // Batch rewrite pipeline (multiple notes — non-blocking)
            rewrite_batch,
            // CSV import (offline — reads local file)
            import_csv,
            // Activation (100% offline — no Supabase, no network)
            activate_licence,
            check_activation,
            deactivate_licence,
            // Hardware profile (local detection)
            get_hardware_profile,
        ])
        .run(tauri::generate_context!())
        .expect("error while running RiteDoc");
}
