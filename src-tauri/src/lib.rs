pub mod csv_parser;
pub mod pii_scrubber;
pub mod llm_integration;
pub mod pipeline;
pub mod models;
pub mod commands;
pub mod self_fix;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // Initialize app data directory
            let app_data_dir = app.path().app_data_dir().unwrap_or_default();
            std::fs::create_dir_all(&app_data_dir).ok();

            // Store cartridge path
            let resource_path = app.path().resource_dir().unwrap_or_default();
            let state = models::AppState::new(app_data_dir, resource_path);

            // Run hardware detection on startup
            match llm_integration::detect_hardware() {
                Ok(profile) => {
                    log::info!("Hardware detected: {} ({:.1}GB RAM, {} cores, GPU: {})",
                        profile.mode.label(), profile.ram_gb, profile.cpu_cores, profile.has_gpu);
                    let mut hw = state.hardware_profile.lock().unwrap();
                    *hw = Some(profile);
                }
                Err(e) => {
                    log::error!("Hardware detection failed: {}", e);
                    // App will still run in Standard mode
                }
            }

            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::parse_csv,
            commands::process_note,
            commands::process_batch,
            commands::submit_missing_data,
            commands::export_csv,
            commands::get_note_text,
            commands::mark_note_done,
            commands::flag_note_review,
            commands::get_batch_summary,
            commands::get_participant_profile,
            commands::save_participant_goal,
            commands::get_hardware_profile,
            commands::get_self_fix_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running RiteDoc application");
}
