use crate::csv_parser;
use crate::llm_integration;
use crate::models::*;
use crate::pipeline;
use crate::self_fix;
use tauri::State;

/// Parse a CSV file and return the detected platform and note count
#[tauri::command]
pub async fn parse_csv(
    file_path: String,
    state: State<'_, AppState>,
) -> Result<CsvParseResult, String> {
    let result = csv_parser::parse_csv_file(&file_path)?;

    let mode_label = {
        let hw = state.hardware_profile.lock().map_err(|e| e.to_string())?;
        hw.as_ref().map(|h| h.mode.label().to_string()).unwrap_or_else(|| "Standard Mode".to_string())
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
            Ok(pipeline::generate_batch_summary(&batch.notes, &time_str))
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
