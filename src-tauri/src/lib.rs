pub mod activation;
pub mod cartridge_updater;
pub mod csv_parser;
pub mod pii_scrubber;
pub mod llm_integration;
pub mod pipeline;
pub mod models;
pub mod commands;
pub mod self_fix;
pub mod connector;
pub mod token_store;
pub mod online_mode;

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
            let state = models::AppState::new(app_data_dir.clone(), resource_path.clone());

            // Check local activation status on startup
            let is_activated = match activation::check_local_activation(&app_data_dir) {
                Some(activation_state) => {
                    log::info!(
                        "App is activated: key={}, subscription={}",
                        &activation_state.key_code[..8.min(activation_state.key_code.len())],
                        activation_state.subscription_type
                    );
                    let mut activated = state.is_activated.lock().unwrap();
                    *activated = true;
                    true
                }
                None => {
                    log::info!("App is not yet activated — activation screen will be shown");
                    false
                }
            };

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

            // If already activated, trigger a silent background cartridge update.
            // This runs asynchronously after the window loads — the user never sees it.
            // All errors are silently swallowed; the existing cartridge remains intact.
            if is_activated {
                let supabase_url = std::env::var("SUPABASE_URL").unwrap_or_default();
                let supabase_anon_key = std::env::var("SUPABASE_ANON_KEY").unwrap_or_default();

                if !supabase_url.is_empty() && !supabase_anon_key.is_empty() {
                    let data_dir = app_data_dir.clone();
                    let cartridge_dir = resource_path.join("cartridges");

                    // Spawn a detached async task — fire and forget
                    tauri::async_runtime::spawn(async move {
                        let check = cartridge_updater::check_for_updates(
                            &data_dir,
                            &supabase_url,
                            &supabase_anon_key,
                        )
                        .await;

                        if check.update_available {
                            let result = cartridge_updater::apply_update(
                                &data_dir,
                                &cartridge_dir,
                                &supabase_url,
                                &supabase_anon_key,
                            )
                            .await;

                            if result.success {
                                log::info!(
                                    "Cartridge silently updated to version {} on startup",
                                    result.version
                                );
                            } else {
                                log::info!(
                                    "Silent cartridge update skipped (network/server unavailable) — using existing cartridge"
                                );
                            }
                        } else {
                            log::info!("Cartridge is up to date ({})", check.current_version);
                        }
                    });
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Activation
            commands::check_activation,
            commands::activate_key,
            commands::get_hardware_fingerprint,
            // Cartridge — version info only (updates are automatic and silent)
            commands::get_cartridge_version,
            commands::silent_update_cartridges,
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
            // Platform Connector Interface
            commands::get_connected_platforms,
            commands::get_online_mode_status,
            commands::enable_online_mode,
            commands::disable_online_mode,
            commands::toggle_online_mode,
            commands::disconnect_platform,
            commands::get_stored_platform_credentials,
        ])
        .run(tauri::generate_context!())
        .expect("error while running RiteDoc application");
}
