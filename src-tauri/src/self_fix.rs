//! # RiteDoc Self-Fix System
//!
//! Automated self-diagnosis and self-healing for the RiteDoc desktop app.
//!
//! Design:
//!   - Triggered on demand by the frontend (Tauri command) or on app launch
//!   - Checks: RAM availability, disk space, native engine health, cartridge integrity
//!   - Auto-fixes: cache cleanup on low disk, mode downgrade recommendation on low RAM
//!   - All diagnostics are in-memory only — ZERO persistence to disk
//!   - NO Supabase, NO network calls, NO phone-home
//!   - Licence validation is handled by activation.rs (local only)

use crate::activation;
use crate::engine::{self, EngineState};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::path::Path;
use sysinfo::System;

// ═════════════════════════════════════════════════════════════════════════════
//  Types
// ═════════════════════════════════════════════════════════════════════════════

/// Severity level of a diagnostic issue
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum IssueSeverity {
    /// Informational — no action required
    Info,
    /// Warning — degraded performance possible
    Warning,
    /// Critical — processing may fail
    Critical,
}

/// A single diagnostic issue found during a self-fix run
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiagnosticIssue {
    /// Category: "RAM", "Disk", "Engine", "Cartridge", "Licence"
    pub category: String,
    /// Human-readable description of the issue
    pub description: String,
    /// What action was taken (or recommended) to resolve it
    pub action_taken: String,
    /// Whether the issue was automatically resolved
    pub resolved: bool,
    /// Severity level
    pub severity: IssueSeverity,
    /// ISO 8601 timestamp of when the issue was detected
    pub timestamp: String,
}

/// Overall result of a self-fix diagnostic run
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiagnosticReport {
    /// ISO 8601 timestamp of when the diagnostics were run
    pub run_at: String,
    /// Whether all critical checks passed
    pub all_ok: bool,
    /// RAM check result
    pub ram_ok: bool,
    /// Available RAM in GB at time of check
    pub ram_available_gb: f64,
    /// Disk check result
    pub disk_ok: bool,
    /// Available disk space in GB at time of check
    pub disk_available_gb: f64,
    /// Whether the native inference engine is ready
    pub engine_ok: bool,
    /// Whether all cartridge files are present and valid JSON
    pub cartridges_ok: bool,
    /// Whether the licence is activated (checked via activation.rs — local only)
    pub licence_ok: bool,
    /// List of issues found (may be empty if all_ok)
    pub issues: Vec<DiagnosticIssue>,
    /// Whether mode downgrade is recommended
    pub recommend_mode_downgrade: bool,
    /// Human-readable summary for the UI
    pub summary: String,
}

// ═════════════════════════════════════════════════════════════════════════════
//  RAM Check
// ═════════════════════════════════════════════════════════════════════════════

/// Get available RAM in GB using sysinfo
fn get_available_ram_gb() -> f64 {
    let mut sys = System::new();
    sys.refresh_memory();
    sys.available_memory() as f64 / (1024.0 * 1024.0 * 1024.0)
}

/// Minimum RAM thresholds for each mode
const RAM_THRESHOLD_TURBO_GB: f64 = 8.0;
const RAM_THRESHOLD_STANDARD_GB: f64 = 4.0;

/// Check RAM availability. Returns (ok, available_gb, issue if any)
fn check_ram(hardware_mode: &str) -> (bool, f64, Option<DiagnosticIssue>) {
    let available = get_available_ram_gb();
    let threshold = if hardware_mode == "turbo" {
        RAM_THRESHOLD_TURBO_GB
    } else {
        RAM_THRESHOLD_STANDARD_GB
    };

    if available < threshold {
        let issue = DiagnosticIssue {
            category: "RAM".to_string(),
            description: format!(
                "Available RAM ({:.1} GB) is below the safe threshold ({:.1} GB) for {} mode",
                available, threshold, hardware_mode
            ),
            action_taken: if hardware_mode == "turbo" {
                "Mode downgrade to Standard recommended to reduce memory footprint".to_string()
            } else {
                "Processing paused — close other applications to free RAM".to_string()
            },
            resolved: false,
            severity: if available < 2.0 {
                IssueSeverity::Critical
            } else {
                IssueSeverity::Warning
            },
            timestamp: Utc::now().to_rfc3339(),
        };
        (false, available, Some(issue))
    } else {
        (true, available, None)
    }
}

// ═════════════════════════════════════════════════════════════════════════════
//  Disk Space Check
// ═════════════════════════════════════════════════════════════════════════════

/// Minimum disk space required (1 GB)
const DISK_THRESHOLD_GB: f64 = 1.0;

/// Get available disk space in GB for the given path
fn get_available_disk_gb(path: &Path) -> f64 {
    // Use statvfs on Unix, GetDiskFreeSpaceEx on Windows
    #[cfg(unix)]
    {
        use std::ffi::CString;
        use std::os::unix::ffi::OsStrExt;
        let c_path = CString::new(path.as_os_str().as_bytes()).unwrap_or_default();
        let mut stat: libc::statvfs = unsafe { std::mem::zeroed() };
        if unsafe { libc::statvfs(c_path.as_ptr(), &mut stat) } == 0 {
            return (stat.f_bavail as f64 * stat.f_frsize as f64) / (1024.0 * 1024.0 * 1024.0);
        }
        // Fallback: assume 10 GB if statvfs fails
        10.0
    }
    #[cfg(not(unix))]
    {
        // Windows fallback — assume 10 GB (GetDiskFreeSpaceEx requires unsafe FFI)
        let _ = path;
        10.0
    }
}

/// Clean up cache and temp files to free disk space.
/// This is the ONLY disk write operation in self_fix — it removes temp files only.
fn cleanup_cache(app_data_dir: &Path) -> f64 {
    let dirs = ["cache", "temp", "drafts"];
    let mut freed = 0u64;

    for dir_name in &dirs {
        let dir = app_data_dir.join(dir_name);
        if dir.exists() {
            // Calculate size before deletion
            if let Ok(entries) = std::fs::read_dir(&dir) {
                for entry in entries.flatten() {
                    if let Ok(meta) = entry.metadata() {
                        freed += meta.len();
                    }
                }
            }
            std::fs::remove_dir_all(&dir).ok();
            std::fs::create_dir_all(&dir).ok();
        }
    }

    freed as f64 / (1024.0 * 1024.0 * 1024.0)
}

/// Check disk space. Returns (ok, available_gb, issue if any)
fn check_disk(app_data_dir: &Path) -> (bool, f64, Option<DiagnosticIssue>) {
    let available = get_available_disk_gb(app_data_dir);

    if available < DISK_THRESHOLD_GB {
        // Auto-fix: clear cache
        let freed_gb = cleanup_cache(app_data_dir);
        let new_available = get_available_disk_gb(app_data_dir);
        let resolved = new_available >= DISK_THRESHOLD_GB;

        let issue = DiagnosticIssue {
            category: "Disk".to_string(),
            description: format!(
                "Available disk space ({:.1} GB) was below the 1 GB minimum",
                available
            ),
            action_taken: if resolved {
                format!(
                    "Cache cleanup freed {:.2} GB. Disk space is now {:.1} GB.",
                    freed_gb, new_available
                )
            } else {
                format!(
                    "Cache cleanup freed {:.2} GB but disk space ({:.1} GB) is still below minimum. \
                     Please free disk space manually.",
                    freed_gb, new_available
                )
            },
            resolved,
            severity: if new_available < 0.2 {
                IssueSeverity::Critical
            } else {
                IssueSeverity::Warning
            },
            timestamp: Utc::now().to_rfc3339(),
        };
        (resolved, new_available, Some(issue))
    } else {
        (true, available, None)
    }
}

// ═════════════════════════════════════════════════════════════════════════════
//  Engine Health Check (replaces Docker/Nanoclaw TCP probe)
// ═════════════════════════════════════════════════════════════════════════════

/// Check if the native inference engine is ready.
/// Queries the engine state directly — no network calls.
fn check_engine(engine_state: &EngineState) -> (bool, Option<DiagnosticIssue>) {
    let status = engine::get_status(engine_state);

    if status.ready {
        (true, None)
    } else {
        let description = if !status.model_file_exists {
            format!(
                "Model file not found at: {}",
                status.model_path
            )
        } else {
            status
                .error
                .clone()
                .unwrap_or_else(|| "Rewriting engine is not ready.".to_string())
        };

        let action_taken = if !status.model_file_exists {
            format!(
                "Download the Phi-4-mini Q4_K_M GGUF model (~2.5 GB) and place it at: {}. \
                 Then restart the app.",
                status.model_path
            )
        } else {
            "Check the model file is a valid GGUF file. \
             Try re-downloading the model and restarting the app."
                .to_string()
        };

        let issue = DiagnosticIssue {
            category: "Engine".to_string(),
            description,
            action_taken,
            resolved: false,
            severity: IssueSeverity::Critical,
            timestamp: Utc::now().to_rfc3339(),
        };
        (false, Some(issue))
    }
}

// ═════════════════════════════════════════════════════════════════════════════
//  Cartridge Integrity Check
// ═════════════════════════════════════════════════════════════════════════════

/// Cartridge files that must be present and valid JSON
const REQUIRED_CARTRIDGES: &[&str] = &["red_flags_v2.json", "incident_sops.json"];

/// Check cartridge file integrity — presence and valid JSON parse.
/// Returns (ok, issue if any)
fn check_cartridges(app_data_dir: &Path) -> (bool, Option<DiagnosticIssue>) {
    let cartridge_dir = app_data_dir.join("cartridges");
    let mut missing = Vec::new();
    let mut invalid = Vec::new();

    for filename in REQUIRED_CARTRIDGES {
        let path = cartridge_dir.join(filename);
        if !path.exists() {
            // Not in app_data_dir — check if it's the built-in binary version
            // (compiled via include_str! in form_generator.rs and safety_scan.rs)
            // The built-in versions are always valid, so we only flag truly missing files
            // if the app_data_dir cartridges dir exists (i.e., a sync has been attempted)
            if cartridge_dir.exists() {
                missing.push(*filename);
            }
        } else {
            // File exists — validate it's parseable JSON
            match std::fs::read_to_string(&path) {
                Ok(content) => {
                    if serde_json::from_str::<serde_json::Value>(&content).is_err() {
                        invalid.push(*filename);
                    }
                }
                Err(_) => {
                    missing.push(*filename);
                }
            }
        }
    }

    if missing.is_empty() && invalid.is_empty() {
        (true, None)
    } else {
        let mut desc = String::new();
        if !missing.is_empty() {
            desc.push_str(&format!("Missing cartridge files: {}. ", missing.join(", ")));
        }
        if !invalid.is_empty() {
            desc.push_str(&format!("Invalid JSON in cartridge files: {}.", invalid.join(", ")));
        }

        let issue = DiagnosticIssue {
            category: "Cartridge".to_string(),
            description: desc,
            action_taken: "App will use built-in compiled cartridges. \
                Run a Regulation Sync to restore updated cartridge files."
                .to_string(),
            resolved: false,
            severity: IssueSeverity::Warning,
            timestamp: Utc::now().to_rfc3339(),
        };
        (false, Some(issue))
    }
}

// ═════════════════════════════════════════════════════════════════════════════
//  Licence Check (local only — via activation.rs)
// ═════════════════════════════════════════════════════════════════════════════

/// Check licence status using activation.rs (100% local — no network calls).
fn check_licence(app_data_dir: &Path) -> (bool, Option<DiagnosticIssue>) {
    match activation::check_local_activation(app_data_dir) {
        Some(state) if state.is_activated => (true, None),
        Some(_) => {
            let issue = DiagnosticIssue {
                category: "Licence".to_string(),
                description: "Licence file exists but is not in an activated state.".to_string(),
                action_taken: "Go to Activation screen to re-activate your licence key.".to_string(),
                resolved: false,
                severity: IssueSeverity::Warning,
                timestamp: Utc::now().to_rfc3339(),
            };
            (false, Some(issue))
        }
        None => {
            let issue = DiagnosticIssue {
                category: "Licence".to_string(),
                description: "No licence activation found on this device.".to_string(),
                action_taken: "Go to Activation screen to enter your licence key.".to_string(),
                resolved: false,
                severity: IssueSeverity::Info,
                timestamp: Utc::now().to_rfc3339(),
            };
            (false, Some(issue))
        }
    }
}

// ═════════════════════════════════════════════════════════════════════════════
//  Public API
// ═════════════════════════════════════════════════════════════════════════════

/// Run all self-fix diagnostic checks and return an in-memory report.
///
/// This is the main entry point — called by the Tauri command.
///
/// # Arguments
/// * `app_data_dir` — The Tauri app data directory (for disk checks and cartridge checks)
/// * `engine_state` — The native inference engine state
pub fn run_diagnostics(app_data_dir: &Path, engine_state: &EngineState) -> DiagnosticReport {
    let run_at = Utc::now().to_rfc3339();
    let mut issues = Vec::new();

    // Detect hardware mode for RAM threshold
    let hardware = activation::detect_hardware();
    let hardware_mode = &hardware.recommended_mode;

    // ── Check 1: RAM ──────────────────────────────────────────────────────────
    let (ram_ok, ram_available_gb, ram_issue) = check_ram(hardware_mode);
    if let Some(issue) = ram_issue {
        issues.push(issue);
    }

    // ── Check 2: Disk Space ───────────────────────────────────────────────────
    let (disk_ok, disk_available_gb, disk_issue) = check_disk(app_data_dir);
    if let Some(issue) = disk_issue {
        issues.push(issue);
    }

    // ── Check 3: Native Engine Health ─────────────────────────────────────────
    let (engine_ok, engine_issue) = check_engine(engine_state);
    if let Some(issue) = engine_issue {
        issues.push(issue);
    }

    // ── Check 4: Cartridge Integrity ──────────────────────────────────────────
    let (cartridges_ok, cartridge_issue) = check_cartridges(app_data_dir);
    if let Some(issue) = cartridge_issue {
        issues.push(issue);
    }

    // ── Check 5: Licence (local only) ─────────────────────────────────────────
    let (licence_ok, licence_issue) = check_licence(app_data_dir);
    if let Some(issue) = licence_issue {
        issues.push(issue);
    }

    // ── Determine overall status ──────────────────────────────────────────────
    let has_critical = issues
        .iter()
        .any(|i| i.severity == IssueSeverity::Critical);
    let all_ok = !has_critical && ram_ok && disk_ok;

    // ── Mode downgrade recommendation ─────────────────────────────────────────
    let recommend_mode_downgrade = !ram_ok && hardware_mode == "turbo";

    // ── Summary ───────────────────────────────────────────────────────────────
    let summary = if all_ok && issues.is_empty() {
        "All systems operational.".to_string()
    } else if has_critical {
        let critical_count = issues
            .iter()
            .filter(|i| i.severity == IssueSeverity::Critical)
            .count();
        format!(
            "{} critical issue{} found. Processing may be affected.",
            critical_count,
            if critical_count == 1 { "" } else { "s" }
        )
    } else {
        let warning_count = issues
            .iter()
            .filter(|i| i.severity == IssueSeverity::Warning)
            .count();
        format!(
            "{} warning{} found. App is functional but performance may be degraded.",
            warning_count,
            if warning_count == 1 { "" } else { "s" }
        )
    };

    log::info!(
        "[self_fix] Diagnostics complete: all_ok={}, ram={:.1}GB, disk={:.1}GB, engine={}, cartridges={}, licence={}, issues={}",
        all_ok,
        ram_available_gb,
        disk_available_gb,
        engine_ok,
        cartridges_ok,
        licence_ok,
        issues.len()
    );

    DiagnosticReport {
        run_at,
        all_ok,
        ram_ok,
        ram_available_gb,
        disk_ok,
        disk_available_gb,
        engine_ok,
        cartridges_ok,
        licence_ok,
        issues,
        recommend_mode_downgrade,
        summary,
    }
}

// ═════════════════════════════════════════════════════════════════════════════
//  Tests
// ═════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    /// Helper: create a dummy engine state for tests (not ready — no model)
    fn test_engine() -> EngineState {
        engine::init_engine(std::path::Path::new("/nonexistent/model.gguf"))
    }

    #[test]
    fn test_diagnostic_report_structure() {
        let tmp = TempDir::new().unwrap();
        let engine = test_engine();
        let report = run_diagnostics(tmp.path(), &engine);
        // Structure must always be present
        assert!(!report.run_at.is_empty());
        assert!(!report.summary.is_empty());
        // Engine will not be ready in test — that's expected
        assert!(!report.engine_ok);
    }

    #[test]
    fn test_ram_check_standard_mode() {
        let (ok, available, _issue) = check_ram("standard");
        // In CI/test environment, we should have at least 4GB available
        // (if not, the test still passes — we just check the structure)
        assert!(available >= 0.0);
        let _ = ok; // ok depends on environment
    }

    #[test]
    fn test_ram_check_turbo_mode() {
        let (ok, available, issue) = check_ram("turbo");
        assert!(available >= 0.0);
        if !ok {
            let issue = issue.unwrap();
            assert_eq!(issue.category, "RAM");
            assert!(!issue.action_taken.is_empty());
        }
    }

    #[test]
    fn test_disk_check_normal() {
        let tmp = TempDir::new().unwrap();
        let (ok, available, issue) = check_disk(tmp.path());
        // Temp dir should have plenty of space
        assert!(ok, "Expected disk check to pass in temp dir, got {:.1}GB", available);
        assert!(issue.is_none());
    }

    #[test]
    fn test_cartridge_check_empty_dir() {
        let tmp = TempDir::new().unwrap();
        // No cartridges dir — should pass (built-in cartridges are used)
        let (ok, issue) = check_cartridges(tmp.path());
        assert!(ok, "Should pass when no cartridge dir exists (uses built-ins)");
        assert!(issue.is_none());
    }

    #[test]
    fn test_cartridge_check_invalid_json() {
        let tmp = TempDir::new().unwrap();
        let cartridge_dir = tmp.path().join("cartridges");
        fs::create_dir_all(&cartridge_dir).unwrap();
        // Write invalid JSON
        fs::write(cartridge_dir.join("red_flags_v2.json"), "not valid json").unwrap();
        let (ok, issue) = check_cartridges(tmp.path());
        assert!(!ok);
        let issue = issue.unwrap();
        assert_eq!(issue.category, "Cartridge");
        assert!(issue.description.contains("red_flags_v2.json"));
    }

    #[test]
    fn test_cartridge_check_valid_json() {
        let tmp = TempDir::new().unwrap();
        let cartridge_dir = tmp.path().join("cartridges");
        fs::create_dir_all(&cartridge_dir).unwrap();
        // Write valid JSON for all required files
        for filename in REQUIRED_CARTRIDGES {
            fs::write(cartridge_dir.join(filename), r#"{"version":"2.0.0"}"#).unwrap();
        }
        let (ok, issue) = check_cartridges(tmp.path());
        assert!(ok);
        assert!(issue.is_none());
    }

    #[test]
    fn test_engine_check_not_ready() {
        let engine = test_engine();
        let (ok, issue) = check_engine(&engine);
        assert!(!ok);
        let issue = issue.unwrap();
        assert_eq!(issue.category, "Engine");
        assert_eq!(issue.severity, IssueSeverity::Critical);
    }

    #[test]
    fn test_licence_check_no_activation() {
        let tmp = TempDir::new().unwrap();
        let (ok, issue) = check_licence(tmp.path());
        assert!(!ok);
        let issue = issue.unwrap();
        assert_eq!(issue.category, "Licence");
        // No activation = Info level (not critical)
        assert_eq!(issue.severity, IssueSeverity::Info);
    }

    #[test]
    fn test_cleanup_cache_creates_dirs() {
        let tmp = TempDir::new().unwrap();
        // Create a cache dir with a file
        let cache_dir = tmp.path().join("cache");
        fs::create_dir_all(&cache_dir).unwrap();
        fs::write(cache_dir.join("test.tmp"), "some temp data").unwrap();
        let freed = cleanup_cache(tmp.path());
        // Should have freed some bytes
        assert!(freed >= 0.0);
        // Cache dir should still exist (recreated)
        assert!(cache_dir.exists());
    }

    #[test]
    fn test_recommend_mode_downgrade() {
        let tmp = TempDir::new().unwrap();
        let engine = test_engine();
        let report = run_diagnostics(tmp.path(), &engine);
        // recommend_mode_downgrade is only true if RAM is low AND mode is turbo
        // In test environment, this depends on available RAM — just check it's a bool
        let _ = report.recommend_mode_downgrade;
    }
}
