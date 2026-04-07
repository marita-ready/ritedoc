mod commands;
mod db;

use db::Database;
use tauri::Manager;

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
            // Resolve the app data directory via Tauri's path API.
            // This places the DB in a platform-appropriate location:
            //   macOS  : ~/Library/Application Support/com.ritedoc.app/
            //   Linux  : ~/.local/share/com.ritedoc.app/
            //   Windows: C:\Users\<user>\AppData\Roaming\com.ritedoc.app\
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to resolve app data directory");

            let db_path = app_data_dir.join("ritedoc.db");

            log::info!("Database path: {:?}", db_path);

            let database =
                Database::new(&db_path).expect("Failed to initialise SQLite database");

            // Store the Database handle as managed Tauri state so every
            // command can access it via State<'_, Database>.
            app.manage(database);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Notes
            commands::create_note,
            commands::get_notes,
            commands::get_note_by_id,
            commands::update_note,
            commands::delete_note,
            // Cartridges
            commands::create_cartridge,
            commands::get_cartridges,
            commands::get_active_cartridges,
            // Settings
            commands::get_setting,
            commands::set_setting,
            // Goals
            commands::create_goal,
            commands::get_goals,
            commands::update_goal,
        ])
        .run(tauri::generate_context!())
        .expect("error while running RiteDoc");
}
