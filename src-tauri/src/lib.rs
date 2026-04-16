mod activation;
mod cartridges;
mod commands;
mod csv_parser;
mod db;
mod engine;
mod form_generator;
mod pipeline;
mod quality_scan;
mod regulation_sync;
mod safety_scan;
mod scrubber;
mod diagnostic_reporter;
mod self_fix;

use db::Database;
use engine::EngineState;
use pipeline::CartridgeConfig;
use tauri::Manager;

// ─────────────────────────────────────────────
//  Rewrite Note command (single note)
// ─────────────────────────────────────────────

#[tauri::command]
async fn rewrite_note(
    db: tauri::State<'_, Database>,
    engine: tauri::State<'_, EngineState>,
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

    // 3. Get the native engine reference
    let engine_ref: &EngineState = &engine;

    // 4. Run the selected mode through the full pipeline
    let selected_mode = mode.unwrap_or_else(|| "deep".to_string());
    pipeline::process_note(&raw_text, &config, engine_ref, &selected_mode, None).await
}

// ─────────────────────────────────────────────
//  Batch Rewrite command
//  Processes each note independently — non-blocking.
//  Emits "batch-progress" Tauri events after each note.
// ─────────────────────────────────────────────

#[tauri::command]
async fn rewrite_batch(
    db: tauri::State<'_, Database>,
    engine: tauri::State<'_, EngineState>,
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

    // 3. Get the native engine reference
    let engine_ref: &EngineState = &engine;

    // 4. Process batch — non-blocking, each note independent
    let selected_mode = mode.unwrap_or_else(|| "deep".to_string());
    let results =
        pipeline::process_batch(notes, &config, engine_ref, &selected_mode, &app_handle).await;

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
//  Engine Status command
//  Returns the current state of the native
//  inference engine (ready, model path, errors).
// ─────────────────────────────────────────────

#[tauri::command]
fn get_engine_status(
    engine: tauri::State<'_, EngineState>,
) -> engine::EngineStatus {
    engine::get_status(&engine)
}

// ─────────────────────────────────────────────
//  Regulation Sync commands
//  Offline-first cartridge update system.
//  Silent check every 90 days. 5 security layers.
//  If offline, app works normally with current cartridges.
// ─────────────────────────────────────────────

#[tauri::command]
fn get_sync_status(
    app_handle: tauri::AppHandle,
) -> Result<regulation_sync::SyncStatus, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {}", e))?;
    Ok(regulation_sync::get_sync_status(&app_data_dir))
}

#[tauri::command]
async fn check_regulation_sync(
    app_handle: tauri::AppHandle,
) -> Result<regulation_sync::SyncCheckResult, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {}", e))?;

    // Get licence key and hardware fingerprint from activation
    let activation = activation::check_local_activation(&app_data_dir);
    let (licence_key, fingerprint) = match activation {
        Some(state) if state.is_activated => (
            state.key_code,
            state.hardware_fingerprint,
        ),
        _ => {
            return Ok(regulation_sync::SyncCheckResult {
                update_available: false,
                current_version: regulation_sync::get_sync_status(&app_data_dir).current_version,
                latest_version: String::new(),
                message: "Licence not activated — regulation sync requires an active licence.".to_string(),
            });
        }
    };

    Ok(regulation_sync::check_for_updates(&app_data_dir, &licence_key, &fingerprint).await)
}

#[tauri::command]
async fn apply_regulation_sync(
    app_handle: tauri::AppHandle,
) -> Result<regulation_sync::SyncApplyResult, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {}", e))?;

    let cartridge_dir = app_data_dir.join("cartridges");

    // Get licence key and hardware fingerprint from activation
    let activation = activation::check_local_activation(&app_data_dir);
    let (licence_key, fingerprint) = match activation {
        Some(state) if state.is_activated => (
            state.key_code,
            state.hardware_fingerprint,
        ),
        _ => {
            return Ok(regulation_sync::SyncApplyResult {
                success: false,
                version: String::new(),
                updated_date: String::new(),
                message: "Licence not activated — regulation sync requires an active licence.".to_string(),
                files_updated: vec![],
            });
        }
    };

    Ok(regulation_sync::apply_update(&app_data_dir, &cartridge_dir, &licence_key, &fingerprint).await)
}

// ─────────────────────────────────────────────
//  Self-Fix Diagnostics command
//  Runs all health checks in-memory.
//  ZERO persistence. ZERO network calls.
// ─────────────────────────────────────────────

#[tauri::command]
fn run_self_fix(
    app_handle: tauri::AppHandle,
    engine: tauri::State<'_, EngineState>,
) -> Result<self_fix::DiagnosticReport, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {}", e))?;

    Ok(self_fix::run_diagnostics(&app_data_dir, &engine))
}

// ─────────────────────────────────────────────
//  Diagnostic Reporter command
//  EXPLICIT USER ACTION ONLY — never automatic.
//  Collects technical data only. Zero PII. Zero note content.
// ─────────────────────────────────────────────

#[tauri::command]
async fn send_diagnostic_report(
    app_handle: tauri::AppHandle,
    engine: tauri::State<'_, EngineState>,
    session_errors: Vec<diagnostic_reporter::SessionError>,
) -> Result<diagnostic_reporter::DiagnosticReportResult, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {}", e))?;

    let payload = diagnostic_reporter::build_payload(&app_data_dir, &engine, session_errors);
    Ok(diagnostic_reporter::send_report(payload).await)
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

            // ── Read settings BEFORE managing database (can't borrow after manage) ─
            let custom_model_path = {
                let conn = database.conn.lock().expect("DB lock failed");
                conn.query_row(
                    "SELECT value FROM settings WHERE key = 'model_path'",
                    [],
                    |row| row.get::<_, String>(0),
                )
                .ok()
            };

            app.manage(database);

            let model_path = engine::resolve_model_path(
                &app_data_dir,
                custom_model_path.as_deref(),
            );

            log::info!("Initialising native inference engine...");
            let engine_state = engine::init_engine(&model_path);
            app.manage(engine_state);

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
            // Engine status (native inference engine health)
            get_engine_status,
            // Regulation sync (offline-first, 5 security layers)
            get_sync_status,
            check_regulation_sync,
            apply_regulation_sync,
            // Self-fix diagnostics (in-memory only, zero persistence)
            run_self_fix,
            // Diagnostic reporter (explicit user action only — never automatic)
            send_diagnostic_report,
        ])
        .run(tauri::generate_context!())
        .expect("error while running RiteDoc");
}
