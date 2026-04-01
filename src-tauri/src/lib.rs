pub mod csv_parser;
pub mod pii_scrubber;
pub mod llm_integration;
pub mod pipeline;
pub mod models;
pub mod commands;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // Initialize app data directory for participant profiles
            let app_data_dir = app.path().app_data_dir().unwrap_or_default();
            std::fs::create_dir_all(&app_data_dir).ok();
            
            // Store cartridge path
            let resource_path = app.path().resource_dir().unwrap_or_default();
            app.manage(models::AppState::new(app_data_dir, resource_path));
            
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running RiteDoc application");
}
