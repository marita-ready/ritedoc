//! # RiteDoc Diagnostic Reporter
//!
//! Sends a diagnostic report to the Cloudflare Worker dashboard endpoint.
//!
//! Design:
//!   - EXPLICIT USER ACTION ONLY — never automatic, never silent
//!   - Collects: hardware profile, self-fix results, app version, cartridge version,
//!     error logs from the current session
//!   - NEVER collects: note content, participant data, CSV data, any PII
//!   - Uses the same HMAC-SHA256 authentication as regulation_sync.rs
//!   - Sends to POST /api/diagnostics on the Cloudflare Worker
//!   - Dashboard stores the report in the automation_log D1 table
//!   - If offline, returns a clear error — no silent failure

use crate::activation;
use crate::engine::EngineState;
use crate::regulation_sync;
use crate::self_fix;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::path::Path;

// ═════════════════════════════════════════════════════════════════════════════
//  Constants
// ═════════════════════════════════════════════════════════════════════════════

/// Cloudflare Worker endpoint for diagnostic reporting
const DIAGNOSTICS_ENDPOINT: &str = "https://regulation-sync.readycompliant.com/api/diagnostics";

/// App version — must match Cargo.toml version
const APP_VERSION: &str = env!("CARGO_PKG_VERSION");

/// HMAC shared secret — same as regulation_sync.rs (compiled into binary)
const HMAC_SHARED_SECRET: &[u8] = b"rdoc_hmac_secret_2026_v1_production_key";

// ═════════════════════════════════════════════════════════════════════════════
//  Types
// ═════════════════════════════════════════════════════════════════════════════

/// The diagnostic payload sent to the Cloudflare Worker.
/// Contains ONLY technical/system data — zero note content, zero PII.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiagnosticPayload {
    /// App version (e.g. "1.0.0")
    pub app_version: String,
    /// ISO 8601 timestamp of when the report was generated
    pub reported_at: String,
    /// Hardware profile (CPU, RAM, mode — no personal data)
    pub hardware: HardwareSnapshot,
    /// Self-fix diagnostic results
    pub diagnostics: DiagnosticsSnapshot,
    /// Cartridge/regulation sync version
    pub cartridge_version: String,
    /// Whether the licence is activated (boolean only — no key transmitted)
    pub licence_activated: bool,
    /// Subscription type (e.g. "standard", "professional") — no key
    pub subscription_type: String,
    /// Session error log (last N errors from the current session — no note content)
    pub session_errors: Vec<SessionError>,
    /// HMAC authentication hash (see regulation_sync::generate_hmac_auth)
    pub hmac: String,
    /// Unix timestamp used to generate the HMAC (for replay protection)
    pub timestamp: i64,
    /// Nonce for replay protection
    pub nonce: String,
}

/// Hardware snapshot — technical specs only, no personal data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HardwareSnapshot {
    pub cpu_brand: String,
    pub cpu_cores: usize,
    pub ram_gb: u64,
    pub recommended_mode: String,
    /// Hardware fingerprint (hashed — not the raw machine ID)
    pub fingerprint: String,
}

/// Diagnostics snapshot — results of the self-fix run
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiagnosticsSnapshot {
    pub all_ok: bool,
    pub ram_ok: bool,
    pub ram_available_gb: f64,
    pub disk_ok: bool,
    pub disk_available_gb: f64,
    pub engine_ok: bool,
    pub cartridges_ok: bool,
    pub licence_ok: bool,
    pub issue_count: usize,
    pub issue_categories: Vec<String>,
    pub summary: String,
}

/// A single session error entry — no note content, no participant data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionError {
    /// ISO 8601 timestamp
    pub timestamp: String,
    /// Error category (e.g. "pipeline", "csv_parser", "activation")
    pub category: String,
    /// Error message (must not contain note content or PII)
    pub message: String,
}

/// Result of sending a diagnostic report
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiagnosticReportResult {
    pub success: bool,
    pub message: String,
    /// Report ID assigned by the server (if successful)
    pub report_id: Option<String>,
    /// Timestamp of when the report was sent
    pub sent_at: String,
}

// ═════════════════════════════════════════════════════════════════════════════
//  HMAC Authentication (reuses regulation_sync pattern)
// ═════════════════════════════════════════════════════════════════════════════

/// Generate HMAC-SHA256 for diagnostic report authentication.
/// Uses the same algorithm as regulation_sync::generate_hmac_auth.
/// The raw licence key is NEVER sent — only the HMAC hash.
fn generate_diagnostic_hmac(
    hardware_fingerprint: &str,
    timestamp: i64,
    nonce: &str,
) -> String {
    // Message: fingerprint:timestamp:nonce (no licence key — fingerprint is sufficient)
    let message = format!("{}:{}:{}", hardware_fingerprint, timestamp, nonce);

    let mut key_padded = [0u8; 64];
    if HMAC_SHARED_SECRET.len() <= 64 {
        key_padded[..HMAC_SHARED_SECRET.len()].copy_from_slice(HMAC_SHARED_SECRET);
    } else {
        let mut hasher = Sha256::new();
        hasher.update(HMAC_SHARED_SECRET);
        let hashed_key = hasher.finalize();
        key_padded[..32].copy_from_slice(&hashed_key);
    }

    let mut ipad = [0x36u8; 64];
    let mut opad = [0x5cu8; 64];
    for i in 0..64 {
        ipad[i] ^= key_padded[i];
        opad[i] ^= key_padded[i];
    }

    let mut inner_hasher = Sha256::new();
    inner_hasher.update(&ipad);
    inner_hasher.update(message.as_bytes());
    let inner_hash = inner_hasher.finalize();

    let mut outer_hasher = Sha256::new();
    outer_hasher.update(&opad);
    outer_hasher.update(&inner_hash);
    let result = outer_hasher.finalize();

    format!("{:x}", result)
}

// ═════════════════════════════════════════════════════════════════════════════
//  Payload Builder
// ═════════════════════════════════════════════════════════════════════════════

/// Build the diagnostic payload from current system state.
/// This is a pure data collection function — no network calls.
///
/// # Arguments
/// * `app_data_dir` — Tauri app data directory
/// * `engine_state` — The native inference engine state
/// * `session_errors` — Error log from the current session (caller provides)
pub fn build_payload(
    app_data_dir: &Path,
    engine_state: &EngineState,
    session_errors: Vec<SessionError>,
) -> DiagnosticPayload {
    let now = Utc::now();
    let timestamp = now.timestamp();
    let nonce = regulation_sync::generate_nonce();

    // ── Hardware profile ──────────────────────────────────────────────────────
    let hw = activation::detect_hardware();
    let hardware = HardwareSnapshot {
        cpu_brand: hw.cpu_brand.clone(),
        cpu_cores: hw.cpu_cores,
        ram_gb: hw.ram_gb,
        recommended_mode: hw.recommended_mode.clone(),
        fingerprint: hw.fingerprint.clone(),
    };

    // ── Self-fix diagnostics ──────────────────────────────────────────────────
    let diag = self_fix::run_diagnostics(app_data_dir, engine_state);
    let issue_categories: Vec<String> = diag
        .issues
        .iter()
        .map(|i| i.category.clone())
        .collect();
    let diagnostics = DiagnosticsSnapshot {
        all_ok: diag.all_ok,
        ram_ok: diag.ram_ok,
        ram_available_gb: diag.ram_available_gb,
        disk_ok: diag.disk_ok,
        disk_available_gb: diag.disk_available_gb,
        engine_ok: diag.engine_ok,
        cartridges_ok: diag.cartridges_ok,
        licence_ok: diag.licence_ok,
        issue_count: diag.issues.len(),
        issue_categories,
        summary: diag.summary,
    };

    // ── Licence status (boolean only — no key transmitted) ────────────────────
    let (licence_activated, subscription_type) =
        match activation::check_local_activation(app_data_dir) {
            Some(state) if state.is_activated => (true, state.subscription_type),
            _ => (false, "none".to_string()),
        };

    // ── Cartridge version ─────────────────────────────────────────────────────
    let sync_status = regulation_sync::get_sync_status(app_data_dir);
    let cartridge_version = sync_status.current_version;

    // ── HMAC authentication ───────────────────────────────────────────────────
    let hmac = generate_diagnostic_hmac(&hw.fingerprint, timestamp, &nonce);

    DiagnosticPayload {
        app_version: APP_VERSION.to_string(),
        reported_at: now.to_rfc3339(),
        hardware,
        diagnostics,
        cartridge_version,
        licence_activated,
        subscription_type,
        session_errors,
        hmac,
        timestamp,
        nonce,
    }
}

// ═════════════════════════════════════════════════════════════════════════════
//  Network Send
// ═════════════════════════════════════════════════════════════════════════════

/// Send the diagnostic report to the Cloudflare Worker endpoint.
///
/// This is an EXPLICIT user action — never called automatically.
/// If offline, returns a clear error message.
pub async fn send_report(payload: DiagnosticPayload) -> DiagnosticReportResult {
    let sent_at = Utc::now().to_rfc3339();

    let client = match reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .user_agent(format!("RiteDoc/{}", APP_VERSION))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            return DiagnosticReportResult {
                success: false,
                message: format!("Failed to create HTTP client: {}", e),
                report_id: None,
                sent_at,
            };
        }
    };

    log::info!(
        "[diagnostic_reporter] Sending diagnostic report to {} (app_version={}, engine_ok={}, issues={})",
        DIAGNOSTICS_ENDPOINT,
        payload.app_version,
        payload.diagnostics.engine_ok,
        payload.diagnostics.issue_count,
    );

    match client
        .post(DIAGNOSTICS_ENDPOINT)
        .json(&payload)
        .send()
        .await
    {
        Ok(response) => {
            let status = response.status();
            if status.is_success() {
                // Try to parse a report_id from the response
                let report_id = response
                    .json::<serde_json::Value>()
                    .await
                    .ok()
                    .and_then(|v| v["report_id"].as_str().map(|s| s.to_string()));

                log::info!(
                    "[diagnostic_reporter] Report sent successfully. report_id={:?}",
                    report_id
                );

                DiagnosticReportResult {
                    success: true,
                    message: "Diagnostic report sent successfully.".to_string(),
                    report_id,
                    sent_at,
                }
            } else {
                let body = response.text().await.unwrap_or_default();
                log::warn!(
                    "[diagnostic_reporter] Server returned error {}: {}",
                    status,
                    body
                );
                DiagnosticReportResult {
                    success: false,
                    message: format!(
                        "Server returned an error ({}). Please try again later.",
                        status
                    ),
                    report_id: None,
                    sent_at,
                }
            }
        }
        Err(e) => {
            let msg = if e.is_connect() || e.is_timeout() {
                "Unable to reach the diagnostics server. Check your internet connection and try again.".to_string()
            } else {
                format!("Network error: {}", e)
            };
            log::warn!("[diagnostic_reporter] Send failed: {}", e);
            DiagnosticReportResult {
                success: false,
                message: msg,
                report_id: None,
                sent_at,
            }
        }
    }
}

// ═════════════════════════════════════════════════════════════════════════════
//  Tests
// ═════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;
    use crate::engine;
    use tempfile::TempDir;

    /// Helper: create a dummy engine state for tests (not ready — no model)
    fn test_engine() -> EngineState {
        engine::init_engine(std::path::Path::new("/nonexistent/model.gguf"))
    }

    #[test]
    fn test_build_payload_structure() {
        let tmp = TempDir::new().unwrap();
        let engine = test_engine();
        let payload = build_payload(tmp.path(), &engine, vec![]);

        // Must have app version
        assert_eq!(payload.app_version, APP_VERSION);
        // Must have a timestamp
        assert!(payload.timestamp > 0);
        // Must have a nonce
        assert!(!payload.nonce.is_empty());
        // Must have an HMAC
        assert!(!payload.hmac.is_empty());
        assert_eq!(payload.hmac.len(), 64); // SHA-256 = 32 bytes = 64 hex chars
        // Must have hardware info
        assert!(!payload.hardware.cpu_brand.is_empty() || payload.hardware.cpu_cores > 0);
        // Must NOT contain note content (diagnostics snapshot has no text fields from notes)
        assert!(payload.diagnostics.summary.len() < 500); // Summary is short
    }

    #[test]
    fn test_hmac_is_deterministic() {
        let fingerprint = "abc123def456";
        let timestamp = 1700000000i64;
        let nonce = "test-nonce-001";
        let h1 = generate_diagnostic_hmac(fingerprint, timestamp, nonce);
        let h2 = generate_diagnostic_hmac(fingerprint, timestamp, nonce);
        assert_eq!(h1, h2);
        assert_eq!(h1.len(), 64);
    }

    #[test]
    fn test_hmac_changes_with_different_inputs() {
        let h1 = generate_diagnostic_hmac("fingerprint_a", 1700000000, "nonce1");
        let h2 = generate_diagnostic_hmac("fingerprint_b", 1700000000, "nonce1");
        let h3 = generate_diagnostic_hmac("fingerprint_a", 1700000001, "nonce1");
        let h4 = generate_diagnostic_hmac("fingerprint_a", 1700000000, "nonce2");
        assert_ne!(h1, h2);
        assert_ne!(h1, h3);
        assert_ne!(h1, h4);
    }

    #[test]
    fn test_payload_no_pii() {
        let tmp = TempDir::new().unwrap();
        let engine = test_engine();
        let session_errors = vec![SessionError {
            timestamp: Utc::now().to_rfc3339(),
            category: "pipeline".to_string(),
            message: "LLM timeout after 30s".to_string(),
        }];
        let payload = build_payload(tmp.path(), &engine, session_errors);

        // Verify no PII fields exist in the payload
        let json = serde_json::to_string(&payload).unwrap();
        // These strings should never appear in a diagnostic payload
        assert!(!json.contains("participant"));
        assert!(!json.contains("raw_text"));
        assert!(!json.contains("csv"));
    }

    #[test]
    fn test_session_error_structure() {
        let err = SessionError {
            timestamp: "2026-04-16T10:00:00Z".to_string(),
            category: "activation".to_string(),
            message: "Key format validation failed".to_string(),
        };
        let json = serde_json::to_string(&err).unwrap();
        assert!(json.contains("activation"));
        assert!(json.contains("Key format validation failed"));
    }
}
