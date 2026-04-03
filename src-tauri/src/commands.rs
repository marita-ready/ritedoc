use crate::activation;
use crate::cartridge_updater;
use crate::csv_parser;
use crate::llm_integration;
use crate::models::*;
use crate::pipeline;
use crate::self_fix;
use tauri::State;

// ===== Activation Commands =====

/// Check if the app is activated (local check only, no network)
#[tauri::command]
pub async fn check_activation(
    state: State<'_, AppState>,
) -> Result<activation::ActivationState, String> {
    match activation::check_local_activation(&state.app_data_dir) {
        Some(activation_state) => {
            let mut activated = state.is_activated.lock().map_err(|e| e.to_string())?;
            *activated = true;
            Ok(activation_state)
        }
        None => Ok(activation::ActivationState {
            is_activated: false,
            key_code: String::new(),
            hardware_fingerprint: String::new(),
            subscription_type: String::new(),
            activated_at: String::new(),
        }),
    }
}

/// Activate the app with a key (ONE HTTPS call to Supabase)
#[tauri::command]
pub async fn activate_key(
    key_code: String,
    state: State<'_, AppState>,
) -> Result<activation::ActivationResult, String> {
    let result = activation::activate_with_supabase(
        &key_code,
        &state.app_data_dir,
        &state.supabase_config.url,
        &state.supabase_config.anon_key,
    )
    .await;

    if result.success {
        let mut activated = state.is_activated.lock().map_err(|e| e.to_string())?;
        *activated = true;
    }

    Ok(result)
}

/// Get the hardware fingerprint for display/debugging
#[tauri::command]
pub async fn get_hardware_fingerprint() -> Result<String, String> {
    Ok(activation::generate_hardware_fingerprint())
}

// ===== Cartridge Update Commands =====

/// Get the cartridge update date display string for the Settings info line.
/// Returns e.g. "2 Apr 2026" if an update has been applied, or "current" if never updated.
/// No version number is exposed to the client.
#[tauri::command]
pub async fn get_cartridge_version(
    state: State<'_, AppState>,
) -> Result<String, String> {
    Ok(cartridge_updater::get_update_date_display(&state.app_data_dir))
}

/// Silent background cartridge update — checks and applies if available.
/// Called automatically on startup after activation passes.
/// All errors are swallowed; the client never sees any update activity.
/// Returns the current version string after the operation (whether updated or not).
#[tauri::command]
pub async fn silent_update_cartridges(
    state: State<'_, AppState>,
) -> Result<String, String> {
    let app_data_dir = state.app_data_dir.clone();
    let cartridge_dir = state.resource_dir.join("cartridges");
    let supabase_url = state.supabase_config.url.clone();
    let supabase_anon_key = state.supabase_config.anon_key.clone();

    // If Supabase is not configured, silently skip
    if supabase_url.is_empty() || supabase_anon_key.is_empty() {
        return Ok(cartridge_updater::get_current_version(&app_data_dir));
    }

    // Check for updates — if anything fails, silently fall through
    let check = cartridge_updater::check_for_updates(
        &app_data_dir,
        &supabase_url,
        &supabase_anon_key,
    )
    .await;

    if check.update_available {
        // Apply silently — errors are ignored, existing cartridge remains intact
        let apply = cartridge_updater::apply_update(
            &app_data_dir,
            &cartridge_dir,
            &supabase_url,
            &supabase_anon_key,
        )
        .await;

        if apply.success {
            log::info!(
                "Cartridge silently updated ({}) — all files SHA-256 verified",
                apply.updated_date
            );
            // Return the date display string — no version number exposed to frontend
            return Ok(apply.updated_date);
        }
        // apply failed — fall through to return current display date
        log::info!("Silent cartridge update failed (network/server issue) — using existing cartridge");
    }

    // Return date display (or "current" if never updated)
    Ok(cartridge_updater::get_update_date_display(&app_data_dir))
}

// ===== CSV & Processing Commands =====

/// Parse a CSV file and return the detected platform and note count
#[tauri::command]
pub async fn parse_csv(
    file_path: String,
    state: State<'_, AppState>,
) -> Result<CsvParseResult, String> {
    let result = csv_parser::parse_csv_file(&file_path)?;

    let mode_label = {
        let hw = state.hardware_profile.lock().map_err(|e| e.to_string())?;
        hw.as_ref()
            .map(|h| h.mode.label().to_string())
            .unwrap_or_else(|| "Standard Mode".to_string())
    };

    let batch = BatchState {
        total_notes: result.total_count,
        processed_count: 0,
        notes: Vec::new(),
        source_platform: result.platform.clone(),
        start_time: chrono::Utc::now().to_rfc3339(),
        is_complete: false,
        processing_mode: mode_label,
    };

    let mut batch_state = state.batch_state.lock().map_err(|e| e.to_string())?;
    *batch_state = Some(batch);

    Ok(result)
}

/// Process a single note through the pipeline
#[tauri::command]
pub async fn process_note(
    note_json: String,
    state: State<'_, AppState>,
) -> Result<ProcessNoteResponse, String> {
    let raw_note: RawNote =
        serde_json::from_str(&note_json).map_err(|e| format!("Failed to parse note: {}", e))?;

    let cartridges = load_all_cartridges(&state.resource_dir)?;
    let mode = get_processing_mode(&state);

    let processed = pipeline::process_single_note(&raw_note, &cartridges, &mode)?;

    let has_missing = !processed.missing_data.is_empty();
    let missing_items = processed.missing_data.clone();

    let mut batch_state = state.batch_state.lock().map_err(|e| e.to_string())?;
    if let Some(ref mut batch) = *batch_state {
        batch.processed_count += 1;
        batch.notes.push(processed.clone());
        if batch.processed_count >= batch.total_notes {
            batch.is_complete = true;
        }
    }

    Ok(ProcessNoteResponse {
        note: processed,
        has_missing_data: has_missing,
        missing_items,
    })
}

/// Process all notes in a batch
#[tauri::command]
pub async fn process_batch(
    file_path: String,
    state: State<'_, AppState>,
) -> Result<BatchProgress, String> {
    let csv_result = csv_parser::parse_csv_file(&file_path)?;
    let cartridges = load_all_cartridges(&state.resource_dir)?;
    let mode = get_processing_mode(&state);

    let mut processed_notes = Vec::new();
    let total = csv_result.notes.len();

    for raw_note in &csv_result.notes {
        match pipeline::process_single_note(raw_note, &cartridges, &mode) {
            Ok(processed) => processed_notes.push(processed),
            Err(e) => {
                eprintln!("Error processing note {}: {}", raw_note.id, e);
            }
        }
    }

    pipeline::sort_notes_by_status(&mut processed_notes);

    let mut batch_state = state.batch_state.lock().map_err(|e| e.to_string())?;
    *batch_state = Some(BatchState {
        total_notes: total,
        processed_count: processed_notes.len(),
        notes: processed_notes.clone(),
        source_platform: csv_result.platform,
        start_time: chrono::Utc::now().to_rfc3339(),
        is_complete: true,
        processing_mode: mode.label().to_string(),
    });

    Ok(BatchProgress {
        processed: processed_notes.len(),
        total,
        latest_notes: processed_notes,
        is_complete: true,
    })
}

/// Get hardware profile
#[tauri::command]
pub async fn get_hardware_profile(
    state: State<'_, AppState>,
) -> Result<HardwareProfile, String> {
    let mut hw = state.hardware_profile.lock().map_err(|e| e.to_string())?;
    if hw.is_none() {
        let profile = llm_integration::detect_hardware()?;
        *hw = Some(profile.clone());
        return Ok(profile);
    }
    Ok(hw.clone().unwrap())
}

/// Get self-fix status
#[tauri::command]
pub async fn get_self_fix_status(
    state: State<'_, AppState>,
) -> Result<SelfFixState, String> {
    let hw = state.hardware_profile.lock().map_err(|e| e.to_string())?;
    let mut sf = state.self_fix_state.lock().map_err(|e| e.to_string())?;
    *sf = self_fix::run_diagnostics(&sf, &hw, &state.app_data_dir);
    Ok(sf.clone())
}

/// Submit missing data for a note
#[tauri::command]
pub async fn submit_missing_data(
    note_id: String,
    field_name: String,
    value: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut batch_state = state.batch_state.lock().map_err(|e| e.to_string())?;
    if let Some(ref mut batch) = *batch_state {
        if let Some(note) = batch.notes.iter_mut().find(|n| n.id == note_id) {
            for item in &mut note.missing_data {
                if item.field_name == field_name {
                    item.submitted_value = Some(value.clone());
                    note.rewritten_note = note.rewritten_note.replace(&item.placeholder, &value);
                }
            }
            let all_resolved = note.missing_data.iter().all(|md| md.submitted_value.is_some());
            if all_resolved && note.red_flags.is_empty() {
                note.traffic_light = TrafficLight::Green;
            }
        }
    }
    Ok(())
}

/// Export all processed notes as CSV
#[tauri::command]
pub async fn export_csv(state: State<'_, AppState>) -> Result<String, String> {
    let batch_state = state.batch_state.lock().map_err(|e| e.to_string())?;
    match &*batch_state {
        Some(batch) => pipeline::export_notes_to_csv(&batch.notes),
        None => Err("No batch has been processed yet.".to_string()),
    }
}

/// Get the plain text of a note for clipboard
#[tauri::command]
pub async fn get_note_text(
    note_id: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let batch_state = state.batch_state.lock().map_err(|e| e.to_string())?;
    match &*batch_state {
        Some(batch) => batch
            .notes
            .iter()
            .find(|n| n.id == note_id)
            .map(|n| n.rewritten_note.clone())
            .ok_or_else(|| "Note not found.".to_string()),
        None => Err("No batch has been processed yet.".to_string()),
    }
}

/// Mark a note as done
#[tauri::command]
pub async fn mark_note_done(
    note_id: String,
    is_done: bool,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut batch_state = state.batch_state.lock().map_err(|e| e.to_string())?;
    if let Some(ref mut batch) = *batch_state {
        if let Some(note) = batch.notes.iter_mut().find(|n| n.id == note_id) {
            note.is_done = is_done;
        }
    }
    Ok(())
}

/// Flag a note for review
#[tauri::command]
pub async fn flag_note_review(
    note_id: String,
    is_flagged: bool,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut batch_state = state.batch_state.lock().map_err(|e| e.to_string())?;
    if let Some(ref mut batch) = *batch_state {
        if let Some(note) = batch.notes.iter_mut().find(|n| n.id == note_id) {
            note.is_flagged = is_flagged;
        }
    }
    Ok(())
}

/// Get batch summary
#[tauri::command]
pub async fn get_batch_summary(state: State<'_, AppState>) -> Result<BatchSummary, String> {
    let batch_state = state.batch_state.lock().map_err(|e| e.to_string())?;
    match &*batch_state {
        Some(batch) => {
            let elapsed = chrono::Utc::now()
                .signed_duration_since(
                    chrono::DateTime::parse_from_rfc3339(&batch.start_time)
                        .unwrap_or_else(|_| chrono::Utc::now().into()),
                )
                .num_seconds();
            let minutes = elapsed / 60;
            let seconds = elapsed % 60;
            let time_str = format!("{} minutes {} seconds", minutes, seconds);

            let green_count = batch.notes.iter().filter(|n| matches!(n.traffic_light, TrafficLight::Green)).count();
            let orange_count = batch.notes.iter().filter(|n| matches!(n.traffic_light, TrafficLight::Orange)).count();
            let red_count = batch.notes.iter().filter(|n| matches!(n.traffic_light, TrafficLight::Red)).count();
            let done_count = batch.notes.iter().filter(|n| n.is_done).count();

            Ok(BatchSummary {
                total_notes: batch.total_notes,
                green_count,
                orange_count,
                red_count,
                done_count,
                source_platform: batch.source_platform.clone(),
                processing_mode: batch.processing_mode.clone(),
                processing_time: time_str,
                is_complete: batch.is_complete,
            })
        }
        None => Err("No batch has been processed yet.".to_string()),
    }
}

/// Get participant profile
#[tauri::command]
pub async fn get_participant_profile(
    participant_name: String,
    state: State<'_, AppState>,
) -> Result<Option<ParticipantProfile>, String> {
    let profiles = state
        .participant_profiles
        .lock()
        .map_err(|e| e.to_string())?;
    Ok(profiles.get(&participant_name).cloned())
}

/// Save a participant goal to their profile
#[tauri::command]
pub async fn save_participant_goal(
    participant_name: String,
    goal: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut profiles = state
        .participant_profiles
        .lock()
        .map_err(|e| e.to_string())?;

    let profile = profiles
        .entry(participant_name.clone())
        .or_insert_with(|| ParticipantProfile {
            id: uuid::Uuid::new_v4().to_string(),
            name: participant_name,
            goals: Vec::new(),
            notes_processed: 0,
        });

    if !profile.goals.contains(&goal) {
        profile.goals.push(goal);
    }

    Ok(())
}

// ===== Internal Helpers =====

/// Load all 4 cartridge files
fn load_all_cartridges(resource_dir: &std::path::Path) -> Result<CartridgeSet, String> {
    Ok(CartridgeSet {
        red_flags: load_cartridge(resource_dir, "red_flags_v2.json")
            .or_else(|_| load_cartridge(resource_dir, "red_flags.json"))?,
        rubric: load_cartridge(resource_dir, "rubric_v2.json")
            .or_else(|_| load_cartridge(resource_dir, "rubric.json"))?,
        policies: load_cartridge(resource_dir, "policies.json")
            .unwrap_or_else(|_| serde_json::json!({})),
        system_prompts: load_cartridge(resource_dir, "system_prompts.json")
            .unwrap_or_else(|_| serde_json::json!({})),
    })
}

/// Load a single cartridge configuration file
fn load_cartridge(
    resource_dir: &std::path::Path,
    filename: &str,
) -> Result<serde_json::Value, String> {
    let paths = vec![
        resource_dir.join("cartridges").join(filename),
        resource_dir.join(filename),
        std::path::PathBuf::from(format!("cartridges/{}", filename)),
        std::path::PathBuf::from(format!("src-tauri/cartridges/{}", filename)),
    ];

    for path in &paths {
        if path.exists() {
            let content = std::fs::read_to_string(path)
                .map_err(|e| format!("Failed to read {}: {}", filename, e))?;
            return serde_json::from_str(&content)
                .map_err(|e| format!("Failed to parse {}: {}", filename, e));
        }
    }

    Err(format!("Cartridge file not found: {}", filename))
}

/// Get the current processing mode from hardware profile
fn get_processing_mode(state: &State<'_, AppState>) -> ProcessingMode {
    state
        .hardware_profile
        .lock()
        .ok()
        .and_then(|hw| hw.as_ref().map(|h| h.mode.clone()))
        .unwrap_or(ProcessingMode::Standard)
}

// ============================================================
// PLATFORM CONNECTOR COMMANDS
// ============================================================
//
// These commands expose the connector architecture to the frontend.
// No actual connectors are implemented yet — these commands return
// the interface layer (platform list, online mode status, etc.).

use crate::connector;
use crate::online_mode::OnlineModeReason;
use crate::token_store::TokenStore;

/// Get the list of all supported platforms with their current connection status.
/// Used to populate the "Connected Platforms" section in Settings.
#[tauri::command]
pub async fn get_connected_platforms(
    state: State<'_, AppState>,
) -> Result<Vec<connector::PlatformDescriptor>, String> {
    let platforms = connector::list_all_platforms(&state.app_data_dir);
    Ok(platforms)
}

/// Get the current online mode status.
/// Returns whether online mode is enabled, how long it has been active,
/// and the recent audit log.
#[tauri::command]
pub async fn get_online_mode_status(
    state: State<'_, AppState>,
) -> Result<crate::online_mode::OnlineModeStatus, String> {
    let online_mode = state.online_mode.lock().map_err(|e| e.to_string())?;
    Ok(online_mode.get_status())
}

/// Enable online mode.
/// The user must explicitly call this before any platform connector
/// API calls will be permitted.
///
/// Returns the updated online mode status.
#[tauri::command]
pub async fn enable_online_mode(
    state: State<'_, AppState>,
) -> Result<crate::online_mode::OnlineModeStatus, String> {
    let mut online_mode = state.online_mode.lock().map_err(|e| e.to_string())?;
    online_mode.enable(OnlineModeReason::UserEnabled);
    Ok(online_mode.get_status())
}

/// Disable online mode.
/// Returns the updated online mode status.
#[tauri::command]
pub async fn disable_online_mode(
    state: State<'_, AppState>,
) -> Result<crate::online_mode::OnlineModeStatus, String> {
    let mut online_mode = state.online_mode.lock().map_err(|e| e.to_string())?;
    online_mode.disable(Some("User disabled".to_string()));
    Ok(online_mode.get_status())
}

/// Toggle online mode on/off.
/// Returns the updated online mode status.
#[tauri::command]
pub async fn toggle_online_mode(
    state: State<'_, AppState>,
) -> Result<crate::online_mode::OnlineModeStatus, String> {
    let mut online_mode = state.online_mode.lock().map_err(|e| e.to_string())?;
    online_mode.toggle();
    Ok(online_mode.get_status())
}

/// Disconnect a platform (delete its stored token).
/// Called when the user clicks "Disconnect" in the Connected Platforms section.
///
/// # Arguments
/// * `platform_id` — The platform to disconnect (e.g. "shiftcare")
#[tauri::command]
pub async fn disconnect_platform(
    platform_id: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    // Get the device fingerprint for the token store
    let fingerprint = crate::activation::generate_hardware_fingerprint();
    let store = TokenStore::new(&state.app_data_dir, &fingerprint);

    store
        .delete_token(&platform_id)
        .map_err(|e| e.to_string())?;

    log::info!("Platform disconnected: {}", platform_id);
    Ok(format!("Disconnected from {}", platform_id))
}

/// Get the list of platforms that have stored credentials.
/// Used to show which platforms are "connected" vs "not configured".
#[tauri::command]
pub async fn get_stored_platform_credentials(
    state: State<'_, AppState>,
) -> Result<std::collections::HashMap<String, crate::token_store::TokenMetadata>, String> {
    let fingerprint = crate::activation::generate_hardware_fingerprint();
    let store = TokenStore::new(&state.app_data_dir, &fingerprint);
    Ok(store.list_stored_platforms())
}
