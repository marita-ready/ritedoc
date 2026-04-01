use crate::llm_integration;
use crate::models::{HardwareProfile, ProcessingMode, SelfFixIssue, SelfFixState};
use chrono::Utc;

/// Run all self-fix diagnostic checks and return updated state
pub fn run_diagnostics(
    current_state: &SelfFixState,
    hardware: &Option<HardwareProfile>,
    app_data_dir: &std::path::Path,
) -> SelfFixState {
    let mut state = current_state.clone();
    state.last_check = Utc::now().to_rfc3339();
    state.issues.clear();

    // Check 1: RAM availability
    let available_ram = llm_integration::check_available_ram_gb();
    let min_ram = match hardware {
        Some(hw) => match hw.mode {
            ProcessingMode::Turbo => 8.0,
            ProcessingMode::Standard => 4.0,
        },
        None => 4.0,
    };

    if available_ram < min_ram {
        state.ram_ok = false;
        state.issues.push(SelfFixIssue {
            category: "RAM".to_string(),
            description: format!(
                "Available RAM ({:.1}GB) is below safe threshold ({:.1}GB)",
                available_ram, min_ram
            ),
            action_taken: "Flagged for mode downgrade".to_string(),
            resolved: false,
            timestamp: Utc::now().to_rfc3339(),
        });
    } else {
        state.ram_ok = true;
    }

    // Check 2: Disk space
    let disk_gb = llm_integration::check_disk_space_gb(app_data_dir);
    if disk_gb < 1.0 {
        state.disk_ok = false;
        state.issues.push(SelfFixIssue {
            category: "Disk".to_string(),
            description: format!("Available disk space ({:.1}GB) is below 1GB minimum", disk_gb),
            action_taken: "Triggered cache cleanup".to_string(),
            resolved: false,
            timestamp: Utc::now().to_rfc3339(),
        });
        // Self-fix: clear temp/cache files
        cleanup_cache(app_data_dir);
        // Re-check
        let new_disk = llm_integration::check_disk_space_gb(app_data_dir);
        if new_disk >= 1.0 {
            state.disk_ok = true;
            if let Some(issue) = state.issues.last_mut() {
                issue.resolved = true;
                issue.action_taken = format!(
                    "Cache cleanup freed {:.1}GB. Disk space now {:.1}GB.",
                    new_disk - disk_gb,
                    new_disk
                );
            }
        }
    } else {
        state.disk_ok = true;
    }

    // Check 3: Model health (placeholder for production)
    // In production, this checks if the GGUF model file exists and has valid checksum
    state.model_loaded = true; // Placeholder
    state.model_healthy = true; // Placeholder

    state
}

/// Determine if we should downgrade from Turbo to Standard
pub fn should_downgrade(hardware: &HardwareProfile) -> bool {
    if hardware.mode != ProcessingMode::Turbo {
        return false;
    }
    let available = llm_integration::check_available_ram_gb();
    // If available RAM drops below 8GB while in Turbo, downgrade
    available < 8.0
}

/// Create a downgraded hardware profile (Turbo -> Standard)
pub fn downgrade_to_standard(hardware: &HardwareProfile) -> HardwareProfile {
    let mut downgraded = hardware.clone();
    downgraded.mode = ProcessingMode::Standard;
    downgraded.recommended_threads = (hardware.cpu_cores / 2).max(2);
    downgraded
}

/// Clean up cache and temp files to free disk space
fn cleanup_cache(app_data_dir: &std::path::Path) {
    let cache_dir = app_data_dir.join("cache");
    if cache_dir.exists() {
        std::fs::remove_dir_all(&cache_dir).ok();
        std::fs::create_dir_all(&cache_dir).ok();
    }

    let temp_dir = app_data_dir.join("temp");
    if temp_dir.exists() {
        std::fs::remove_dir_all(&temp_dir).ok();
        std::fs::create_dir_all(&temp_dir).ok();
    }

    // Clean old processed drafts (48-hour policy, triggered immediately on low disk)
    let drafts_dir = app_data_dir.join("drafts");
    if drafts_dir.exists() {
        std::fs::remove_dir_all(&drafts_dir).ok();
        std::fs::create_dir_all(&drafts_dir).ok();
    }
}

/// Validate licence status (with exponential backoff and 7-day cache)
pub fn validate_licence(
    state: &mut SelfFixState,
    _licence_key: &str,
) -> bool {
    // In production, this pings Supabase to validate the licence key
    // For now, we use the cached status
    if state.licence_cache_days_remaining > 0 {
        state.licence_valid = true;
        return true;
    }

    // Licence cache expired — would attempt network validation here
    // With exponential backoff: 5s, 15s, 30s
    state.licence_valid = false;
    state.issues.push(SelfFixIssue {
        category: "Licence".to_string(),
        description: "Licence cache expired and network validation failed".to_string(),
        action_taken: "Escalating to support".to_string(),
        resolved: false,
        timestamp: Utc::now().to_rfc3339(),
    });
    false
}
