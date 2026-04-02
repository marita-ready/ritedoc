pub mod activation;
pub mod cartridge_updater;
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
            let state = models::AppState::new(app_data_dir.clone(), resource_path);

            // Check local activation status on startup
            match activation::check_local_activation(&app_data_dir) {
                Some(activation_state) => {
                    log::info!(
                        "App is activated: key={}, subscription={}",
                        &activation_state.key_code[..8.min(activation_state.key_code.len())],
                        activation_state.subscription_type
                    );
                    let mut activated = state.is_activated.lock().unwrap();
                    *activated = true;
                }
                None => {
                    log::info!("App is not yet activated — activation screen will be shown");
                }
            }

            // Run hardware detection on startup
            match llm_integration::detect_hardware() {
                Ok(profile) => {
                    log::info!(
                        "Hardware detected: {} ({:.1}GB RAM, {} cores, GPU: {})",
                        profile.mode.label(),
                        profile.ram_gb,
                        profile.cpu_cores,
                        profile.has_gpu
                    );
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
            // Activation
            commands::check_activation,
            commands::activate_key,
            commands::get_hardware_fingerprint,
            // Cartridge updates
            commands::check_cartridge_updates,
            commands::apply_cartridge_update,
            commands::get_cartridge_version,
            // CSV & Processing
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
